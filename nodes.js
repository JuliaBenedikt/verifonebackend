const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Set your Verifone details here
const API_KEY = 'wHRFgOPJCBHGermEnoicXmFcOflirAzKztjQ';
const PAYMENT_PROVIDER_CONTRACT_ID = '080a4fcd-8156-461e-8493-8e3a814abed8';
const SUCCESS_URL = 'https://sweetspot.is/success';
const CANCEL_URL = 'https://sweetspot.is/cancel';

app.use(express.json());

// Payment initiation endpoint
app.post('/start-payment', async (req, res) => {
  try {
    const { amount, currency, fullName, email, phone, address, city, postalCode } = req.body;

    // Prepare payment data for Verifone
    const paymentData = {
      amount: amount * 100, // convert to smallest unit (e.g., cents)
      currency: currency,
      customer: {
        fullName,
        email,
        phone,
        address,
        city,
        postalCode,
      },
      contractId: '080a4fcd-8156-461e-8493-8e3a814abed8',
      secureId: 'wHRFgOPJCBHGermEnoicXmFcOflirAzKztjQ',  // optional, use if necessary
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
    };

    const response = await axios.post('https://emea.live.verifone.cloud/v1/checkout', paymentData, {
      headers: {
        'Authorization': `Bearer ${wHRFgOPJCBHGermEnoicXmFcOflirAzKztjQ}`,
        'Content-Type': 'application/json',
      },
    });

    const { checkout_url } = response.data;
    res.status(200).send({ success: true, checkoutUrl: checkout_url });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'An error occurred' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
