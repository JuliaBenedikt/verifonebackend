const admin = require('firebase-admin');
const express = require('express');
const axios = require('axios');

const router = express.Router();

// WEBHOOK SAFETY NET: This catches successful payments that didn't complete browser flow
router.post('/verifone-webhook', async (req, res) => {
  const event = req.body;

  console.log('🔔 Verifone Webhook Received:', JSON.stringify(event, null, 2));

  // Verifone might send different event structures, log for debugging
  const checkoutId = event.checkout_id || event.checkoutId || event.orderDetails?.orderId;
  const transactionId = event.transaction_id || event.transactionId;

  if (!checkoutId) {
    console.log('⚠️  No checkout_id in webhook, acknowledging anyway');
    return res.sendStatus(200);
  }

  try {
    // STEP 1: Check if booking already exists (from normal browser flow)
    const bookingQuery = await admin.firestore()
      .collection('bookings')
      .where('paymentCheckoutId', '==', checkoutId)
      .limit(1)
      .get();

    if (!bookingQuery.empty) {
      console.log(`✅ Booking already exists for checkout ${checkoutId}, webhook not needed`);
      return res.sendStatus(200);
    }

    // STEP 2: Booking doesn't exist - this is the backup scenario (like finnurami)
    console.log(`⚠️  WARNING: Payment successful but no booking found for ${checkoutId}`);
    console.log('🛟 SAFETY NET ACTIVATED - Creating booking via webhook');

    // STEP 3: Get pending checkout data
    const checkoutDoc = await admin.firestore()
      .collection('pending_checkouts')
      .doc(checkoutId)
      .get();

    if (!checkoutDoc.exists) {
      console.error(`❌ No pending_checkout found for ${checkoutId}`);
      // Log to failed_bookings for manual intervention
      await admin.firestore().collection('failed_bookings').add({
        checkoutId,
        transactionId,
        error: 'Webhook received but no pending_checkout found',
        webhookData: event,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        requiresManualIntervention: true
      });
      return res.sendStatus(200); // Still acknowledge to Verifone
    }

    const checkoutData = checkoutDoc.data();
    console.log(`📦 Found pending checkout:`, checkoutData);

    // STEP 4: Call the HTTP Cloud Function (verifoneWebhook) to create booking
    // This ensures all the same logic/emails/etc are used
    const cloudFunctionUrl = 'https://us-central1-golfarena-6c786.cloudfunctions.net/verifoneWebhook';

    const requestData = {
      id: checkoutId,
      status: 'APPROVED'
    };

    console.log(`📞 Calling Cloud Function with data:`, requestData);

    const response = await axios.post(cloudFunctionUrl, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log(`✅ Cloud Function response:`, response.data);
    console.log(`🎉 Webhook successfully created booking for ${checkoutId}`);

    return res.sendStatus(200);

  } catch (err) {
    console.error('❌ Webhook processing failed:', err);

    // Log the failure
    try {
      await admin.firestore().collection('failed_bookings').add({
        checkoutId,
        transactionId,
        error: err.toString(),
        webhookData: event,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        requiresManualIntervention: true
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    // Still acknowledge to Verifone to prevent retries
    return res.sendStatus(200);
  }
});

module.exports = router;
