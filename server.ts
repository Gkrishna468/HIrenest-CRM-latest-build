import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

/**
 * Server-side OAuth logic and Webhook handling for Gmail integration
 * 
 * NOTE: Security operations for the Firestore Database (Admin SDK)
 * normally happen here depending on deployment.
 */

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parser for webhook bodies
  app.use(express.json());

  // API ROUTES
  
  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'hirenest-backend' });
  });

  // 2. Mock Pub/Sub webhook for Gmail Notifications
  // Represents Google Cloud Pub/Sub push subscription endpoint
  app.post('/api/webhooks/gmail', async (req, res) => {
    try {
      const pubsubMessage = req.body.message;
      if (!pubsubMessage) {
        return res.status(400).send('Missing message');
      }

      // decode the pub/sub message payload
      const encodedData = pubsubMessage.data;
      const dataStr = Buffer.from(encodedData, 'base64').toString('utf-8');
      const data = JSON.parse(dataStr);

      const emailAddress = data.emailAddress;
      const historyId = data.historyId;

      console.log(`[Gmail Webhook] Received notification for ${emailAddress}, historyId: ${historyId}`);

      // Here the backend would look up 'gmail_connections' in Firestore
      // Get the encrypted refresh token, instantiate the OAuth client,
      // and call the Gmail history API to get changed messages.
      // Then process them into 'gmail_messages', 'email_threads' and emit 'EMAIL_RECEIVED' to 'system_events'

      res.status(200).send('OK');
    } catch (error) {
      console.error('[Gmail Webhook] Error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // 3. Initiate Gmail OAuth Flow
  // This avoids browser OAuth completely by handling it purely Server-Side.
  app.get('/api/auth/gmail/url', (req, res) => {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Demands a refresh token
      prompt: 'consent', // Forces the consent screen to guarantee refresh token
      scope: scopes,
      // Pass user ID into state to link connection back to user
      state: req.query.userId as string
    });

    res.json({ url });
  });

  // 4. Gmail OAuth Callback
  app.get('/api/auth/gmail/callback', async (req, res) => {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Here we would configure 'gmail_connections' in Firestore
      // using Admin SDK and save tokens.refresh_token (ideally encrypted)
      
      console.log(`[Gmail Auth] Successfully authenticated user: ${profile.data.emailAddress}`);

      // Auto-subscribe to push notifications
      // await gmail.users.watch({
      //   userId: 'me',
      //   requestBody: {
      //     labelIds: ['INBOX'],
      //     topicName: process.env.PUBSUB_TOPIC_NAME
      //   }
      // });

      res.redirect('/settings?gmail_connected=true');
    } catch (error) {
      console.error('[Gmail Auth] Error:', error);
      res.redirect('/settings?gmail_error=failed_to_connect');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
