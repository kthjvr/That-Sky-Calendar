const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Helper function to chunk arrays
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Simple function to send notifications
async function sendNotificationToAllUsers(eventData) {
  try {
    console.log('Starting notification send for event:', eventData.title);
    
    // Get all active FCM tokens
    const tokensSnapshot = await db.collection('fcmTokens')
      .where('active', '==', true)
      .get();

    if (tokensSnapshot.empty) {
      console.log('No active tokens found');
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = [];
    tokensSnapshot.forEach(function(doc) {
      tokens.push(doc.data().token);
    });

    console.log('Found tokens:', tokens.length);

    // Create the message
    const messagePayload = {
      notification: {
        title: 'New Sky Event: ' + eventData.title,
        body: eventData.description + ' - ' + eventData.date
      },
      data: {
        eventId: eventData.id,
        url: 'https://thatskyevents.netlify.app/'
      }
    };

    // Send in batches of 500 (FCM limit)
    const batches = chunkArray(tokens, 500);
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const response = await messaging.sendMulticast({
          tokens: batch,
          notification: messagePayload.notification,
          data: messagePayload.data
        });

        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        console.log('Batch ' + (i + 1) + ' - Success: ' + response.successCount + ', Failed: ' + response.failureCount);

        // Log failed tokens
        if (response.responses) {
          response.responses.forEach(function(resp, idx) {
            if (!resp.success && resp.error && resp.error.code === 'messaging/invalid-registration-token') {
              console.warn('Invalid token:', batch[idx]);
            }
          });
        }
      } catch (batchError) {
        console.error('Error sending batch ' + (i + 1) + ':', batchError);
        totalFailure += batch.length;
      }
    }

    console.log('Total - Successfully sent:', totalSuccess);
    console.log('Total - Failed to send:', totalFailure);

    return {
      successCount: totalSuccess,
      failureCount: totalFailure
    };

  } catch (error) {
    console.error('Error in sendNotificationToAllUsers:', error);
    throw error;
  }
}

// Trigger when new event is created
exports.sendEventNotification = functions.region('asia-southeast1').firestore
  .document('events/{eventId}')
  .onCreate(async function(snap, context) {
    console.log('New event created:', context.params.eventId);
    
    const eventData = snap.data();
    const processedEventData = {
      id: context.params.eventId,
      title: eventData.title || 'New Event',
      description: eventData.description || 'A new event has been added',
      date: eventData.date || 'Today'
    };

    try {
      const result = await sendNotificationToAllUsers(processedEventData);
      console.log('Notification sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending notification:', error);
      return { error: error.message };
    }
  });

// Test function
exports.testNotification = functions.region('asia-southeast1').https.onRequest(async function(req, res) {
  // Handle CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Simple API key check (optional - remove if you don't want it)
  const API_KEY = 'BConeDXrXIm-QKaYoWthQG9PVrnOpjV4ABDHEO50d-DzdgCMCpiNOfHd2T5q6UQC6upzZylGDG-GBj-F_bR4Ic0';
  if (req.headers['x-api-key'] && req.headers['x-api-key'] !== API_KEY) {
    res.status(403).json({ success: false, error: 'Unauthorized' });
    return;
  }

  console.log('Test notification requested');

  const testEvent = {
    id: 'test-' + Date.now(),
    title: 'Test Event',
    description: 'This is a test notification',
    date: new Date().toLocaleDateString()
  };

  try {
    const result = await sendNotificationToAllUsers(testEvent);
    res.json({
      success: true,
      message: 'Test notification sent',
      result: result
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});