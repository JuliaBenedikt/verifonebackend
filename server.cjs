// server.cjs
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { createHostedPayment } = require('./createHostedPayment.cjs');
const webhookRouter = require('./controllers/verifone_webhook_firestore.js');

// Initialize Firebase Admin
// Use environment variable for credentials in production, JSON file locally
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Local development - use JSON file
  const serviceAccount = require('./firebaseServiceAccount.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// Register webhook route
app.use('/api', webhookRouter);

app.post('/api/createCheckoutSession', async (req, res) => {
  try {
    // Log the incoming request body
    console.log("Request body:", req.body);

    // Fix: Ensure amount is always a number
    let amount = req.body.amount;
    if (typeof amount === 'object') {
      // If you accidentally get an object, try to extract the number
      amount = amount.value || amount.amount || 0;
    }
    amount = Number(amount);

    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Amount must be a valid number, got: ${JSON.stringify(req.body.amount)}`);
    }

    // Use customerEmail, returnUrl, etc as before
    const customerEmail = req.body.customerEmail || 'guest@sweetspot.is';
    const returnUrl = req.body.returnUrl;

    // Call your Verifone payment logic
    const data = await createHostedPayment(amount, customerEmail, returnUrl);
    res.json(data);
  } catch (err) {
    console.error("Error creating checkout session:", err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(10000, () => {
  console.log('✅ Verifone backend listening on http://localhost:10000');
});
