import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processGmailMessage } from '../../lib/gmailService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

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

    // Process the message (this handles fetching from Gmail and saving to Firestore)
    // Run it asynchronously to avoid webhook timeout
    processGmailMessage(emailAddress, historyId).catch(console.error);

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Gmail Webhook Error]', error);
    res.status(500).send('Internal Server Error');
  }
}
