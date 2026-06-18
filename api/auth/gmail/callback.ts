import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../_lib/firebaseAdmin';
import { encrypt } from '../../../_lib/crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  const logToFirestore = async (step: string, details?: any) => {
    console.log(step, details || '');
    if (db) {
      try {
        await db.collection('oauth_debug').add({
          step,
          timestamp: new Date().toISOString(),
          details: details || null
        });
      } catch (err) {
        console.error('Failed to log to oauth_debug', err);
      }
    }
  };

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/gmail/callback`
    );

    await logToFirestore("STEP_1_TOKEN_EXCHANGE_START");
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await logToFirestore("STEP_1_TOKEN_EXCHANGE_SUCCESS");

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) throw new Error("Could not get email address");

    let encryptedRefreshToken = '';
    if (tokens.refresh_token) {
      encryptedRefreshToken = encrypt(tokens.refresh_token);
    }

    let historyId = profile.data.historyId || '';

    await logToFirestore("STEP_2_FIRESTORE_WRITE_START");
    let connRefId = '';
    if (!db) {
      throw new Error("Firestore db is not initialized. Cannot save Gmail connection.");
    }

    const connRef = db.collection('gmail_connections').doc(); 
    connRefId = connRef.id;
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
    await logToFirestore("STEP_2_FIRESTORE_WRITE_SUCCESS", { connectionId: connRef.id });

    // Try Watch API but don't fail the whole connection if it fails
    if (process.env.PUBSUB_TOPIC_NAME) {
      await logToFirestore("STEP_3_WATCH_API_START");
      try {
        const watchRes = await gmail.users.watch({
          userId: 'me',
          requestBody: {
            labelIds: ['INBOX'],
            topicName: process.env.PUBSUB_TOPIC_NAME
          }
        });
        historyId = watchRes.data.historyId || historyId;
        console.log(`[Gmail Auth] Watch registration successful for ${emailAddress}`);
        
        if (db && connRefId) {
          await db.collection('gmail_connections').doc(connRefId).update({
            historyId: historyId
          });
        }
        await logToFirestore("STEP_3_WATCH_API_SUCCESS");
      } catch (watchError: any) {
        console.error('[Gmail Auth Watch Error]', watchError);
        await logToFirestore("STEP_3_WATCH_API_FAILED", { error: watchError.message });
        // We still redirect to success since auth and connection write succeeded
      }
    } else {
      await logToFirestore("STEP_3_WATCH_API_SKIPPED_NO_TOPIC");
    }

    res.redirect('/settings?gmail_connected=true');
  } catch (error: any) {
    console.error('[Gmail Auth Callback Error]', error);
    await logToFirestore("STEP_FAILED", { error: error.message });
    res.redirect('/settings?gmail_error=failed_to_connect');
  }
}
