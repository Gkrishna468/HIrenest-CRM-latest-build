import { google } from 'googleapis';
import { db } from './firebaseAdmin.js';
import { decrypt } from './crypto.js';

export async function processGmailMessage(emailAddress: string, historyId: string) {
  if (!db) {
    console.warn("processGmailMessage: Firestore not initialized");
    return;
  }

  // 1. Fetch connection details from Firestore
  const connectionSnapshot = await db.collection('gmail_connections').where('email', '==', emailAddress).limit(1).get();
  
  if (connectionSnapshot.empty) {
    console.error(`[GmailService] No connection found for ${emailAddress}`);
    return;
  }

  const connectionDoc = connectionSnapshot.docs[0];
  const connectionData = connectionDoc.data();

  // 2. Instantiate OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  // Decrypt refresh token
  const refreshToken = decrypt(connectionData.encryptedRefreshToken);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // 3. Fetch history to get the actual messages changed
  try {
    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: connectionData.historyId,
    });

    const histories = historyRes.data.history || [];
    
    // Update the historyId for next time
    if (historyRes.data.historyId) {
      await connectionDoc.ref.update({
        historyId: historyRes.data.historyId,
        lastSyncAt: new Date().toISOString()
      });
    }

    for (const record of histories) {
      if (record.messagesAdded) {
        for (const messageAdded of record.messagesAdded) {
          const messageId = messageAdded.message?.id;
          if (messageId) {
            await fetchAndStoreMessage(gmail, messageId, connectionDoc.id);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[GmailService] Error fetching history for ${emailAddress}:`, error);
  }
}

async function fetchAndStoreMessage(gmail: any, messageId: string, connectionId: string) {
  if (!db) return;
  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = res.data;
    
    // Check if message already exists
    const existingMsg = await db.collection('gmail_messages').doc(messageId).get();
    if (existingMsg.exists) {
      return; 
    }

    // Parse Headers
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('subject');
    const from = getHeader('from');
    const to = getHeader('to');
    
    // Basic Deterministic Classification
    let emailType = 'internal';
    const sourceDomain = from.split('@')[1]?.toLowerCase();
    
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('profile') || subjectLower.includes('submission') || subjectLower.includes('attached')) {
      emailType = 'vendor';
    } else if (subjectLower.includes('feedback') || subjectLower.includes('interview') || subjectLower.includes('offer')) {
      emailType = 'client';
    }

    // Save Message to Firestore (Immutable Audit Trail)
    const msgData = {
      id: messageId,
      threadId: message.threadId,
      connectionId,
      historyId: message.historyId || '',
      internalDate: new Date(parseInt(message.internalDate || '0')).toISOString(),
      snippet: message.snippet,
      subject,
      from,
      to,
      hasAttachment: !!message.payload?.parts?.find((p: any) => p.filename),
      status: 'unread',
      emailType,
      createdAt: new Date().toISOString()
    };

    await db.collection('gmail_messages').doc(messageId).set(msgData);

    // Create Email Entity Links
    if (emailType === 'vendor') {
      // Dummy logic: Simulate finding a vendor requirement matching the email Subject
      await linkEntityToMessage(messageId, 'vendor', 'ven_001', 0.95);
      await linkEntityToMessage(messageId, 'requirement', 'req_123', 0.85);
    } else if (emailType === 'client') {
      await linkEntityToMessage(messageId, 'client', 'cli_001', 0.95);
    }

    // Parse Attachments (metadata only)
    const parts = message.payload?.parts || [];
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        const attData = {
          attachmentId: part.body.attachmentId,
          messageId,
          connectionId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          status: 'pending', // Awaiting parse in Sprint 2
          createdAt: new Date().toISOString()
        };
        const attRef = await db.collection('email_attachments').add(attData);

        // Emit attachment event
        await emitSystemEvent('ATTACHMENT_RECEIVED', 'email_attachments', attRef.id, {
          filename: attData.filename,
          messageId,
          mimeType: part.mimeType
        });
      }
    }

    // Emit System Event based on classification
    let eventType = 'EMAIL_RECEIVED';
    if (emailType === 'vendor') {
      eventType = 'VENDOR_PROFILE_RECEIVED';
    } else if (emailType === 'client') {
      eventType = 'CLIENT_FEEDBACK_RECEIVED';
    }

    await emitSystemEvent(eventType, 'gmail_messages', messageId, { subject, from, to, sourceDomain: 'GMAIL' });

  } catch (error) {
    console.error(`[GmailService] Error fetching message ${messageId}:`, error);
  }
}

async function linkEntityToMessage(messageId: string, entityType: string, entityId: string, confidence: number) {
  if (!db) return;
  await db.collection('email_entity_links').add({
    messageId,
    entityType,
    entityId,
    confidence,
    createdAt: new Date().toISOString()
  });
}

async function emitSystemEvent(eventType: string, entityCollection: string, entityId: string, metadata: any) {
  if (!db) return;

  const eventData = {
    eventType,
    entityCollection,
    entityId,
    metadata,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await db.collection('system_events').add(eventData);
  console.log(`[SystemEvent] Emitted ${eventType} for ${entityCollection}/${entityId}`);
}
