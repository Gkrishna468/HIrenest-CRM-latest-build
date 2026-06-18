import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../src/server/firebaseAdmin';
import { encrypt } from '../../../src/server/crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/gmail/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) throw new Error("Could not get email address");

    let encryptedRefreshToken = '';
    if (tokens.refresh_token) {
      encryptedRefreshToken = encrypt(tokens.refresh_token);
    }

    // Auto-subscribe to push notifications
    let historyId = profile.data.historyId || '';
    if (process.env.PUBSUB_TOPIC_NAME) {
      const watchRes = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: ['INBOX'],
          topicName: process.env.PUBSUB_TOPIC_NAME
        }
      });
      historyId = watchRes.data.historyId || historyId;
      console.log(`[Gmail Auth] Watch registration successful for ${emailAddress}`);
    }

    // Save to Firestore
    if (db) {
      const connRef = db.collection('gmail_connections').doc(); 
      await connRef.set({
        userId: userId || 'unknown',
        email: emailAddress,
        status: 'active',
        historyId: historyId,
        encryptedRefreshToken: encryptedRefreshToken,
        watchExpiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Emit GMAIL_CONNECTED event
      await db.collection('system_events').add({
        eventType: 'GMAIL_CONNECTED',
        entityCollection: 'gmail_connections',
        entityId: connRef.id,
        metadata: { email: emailAddress },
        createdAt: new Date().toISOString()
      });
    }

    res.redirect('/settings?gmail_connected=true');
  } catch (error: any) {
    console.error('[Gmail Auth Callback Error]', error);
    res.redirect('/settings?gmail_error=failed_to_connect');
  }
}
