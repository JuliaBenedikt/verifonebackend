
const express = require('express');
const cors = require('cors');
const { createHostedPayment } = require('./createHostedPayment.cjs');
const axios = require('axios');

const app = express();


const paymentStore = new Map();


app.use(cors());
app.use(express.json());

app.post('/api/createCheckoutSession', async (req, res) => {
  try {
    console.log("📥 Request:", req.body);

    let amount = req.body.amount;
    if (typeof amount === 'object') {
      amount = amount.value || amount.amount || 0;
    }
    amount = Number(amount);

    if (isNaN(amount) || amount < 0) {
      throw new Error(`Invalid amount: ${JSON.stringify(req.body.amount)}`);
    }

    const customerEmail = req.body.customerEmail || 'guest@sweetspot.is';
    const customerName = req.body.customerName || 'Viðskiptamaður';
    const metadata = req.body.metadata || {};


    const merchantRef = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


    const paymentData = {
      amount,
      customerEmail,
      customerName,
      status: 'pending',
      merchantRef,
      metadata,
      items: metadata.items || [],
      createdAt: new Date().toISOString()
    };

    paymentStore.set(merchantRef, paymentData);
    console.log(`📝 Stored payment: ${merchantRef} for ${customerName}`);


    const baseUrl = 'https://sweetspot.is';
    const callbackParams = new URLSearchParams({
      ref: merchantRef,
      email: customerEmail,
      items: metadata.items ? Buffer.from(JSON.stringify(metadata.items)).toString('base64') : ''
    });

    const returnUrl = `${baseUrl}/payment/callback?${callbackParams.toString()}`;
    console.log('🔗 Return URL:', returnUrl);


    const data = await createHostedPayment(amount, customerEmail, customerName, returnUrl);
    
   
    paymentData.checkoutId = data.id;
    paymentStore.set(merchantRef, paymentData);
   
    if (data.id) {
      paymentStore.set(`checkout_${data.id}`, paymentData);
    }

    res.json({
      ...data,
      merchantRef,
      url: data.checkout_url || data.url,
      id: data.id
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/payment/callback', async (req, res) => {
  console.log('🔄 CALLBACK HIT with query:', req.query);
  
  const { 
    checkout_id,
    transaction_id,
    ref,
    email,
    items,
    status,
   
    'Checkout.Id': checkoutIdAlt,
    'Transaction.Id': transactionIdAlt
  } = req.query;
  
  const finalCheckoutId = checkout_id || checkoutIdAlt || '';
  const finalTransactionId = transaction_id || transactionIdAlt || '';
  
  console.log('Processing callback:', { 
    checkout: finalCheckoutId,
    transaction: finalTransactionId,
    ref,
    email 
  });
  
  try {
 
    let paymentData = null;
    
    if (ref && paymentStore.has(ref)) {
      paymentData = paymentStore.get(ref);
      console.log('Found by ref:', ref);
    } else if (finalCheckoutId && paymentStore.has(`checkout_${finalCheckoutId}`)) {
      paymentData = paymentStore.get(`checkout_${finalCheckoutId}`);
      console.log('Found by checkout ID:', finalCheckoutId);
    }
    

    const redirectParams = new URLSearchParams();
    
 
    redirectParams.set('checkout_id', finalCheckoutId);
    redirectParams.set('transaction_id', finalTransactionId);
    redirectParams.set('ref', ref || '');
    redirectParams.set('status', status || 'success');

    const finalEmail = email || paymentData?.customerEmail || '';
    redirectParams.set('email', finalEmail);
    redirectParams.set('buyerEmail', finalEmail);
    
   
    if (items) {
      redirectParams.set('items', items);
    } else if (paymentData?.items) {
      const itemsBase64 = Buffer.from(JSON.stringify(paymentData.items)).toString('base64');
      redirectParams.set('items', itemsBase64);
    }
    
    
    const redirectUrl = `/#/payment-success?${redirectParams.toString()}`;
    console.log('✅ Redirecting to:', redirectUrl);
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Callback error:', error);
    res.redirect(`/#/payment-error?error=${encodeURIComponent(error.message)}`);
  }
});

app.get('/payment-success', (req, res) => {
  console.log('Fallback success route hit');
  const params = new URLSearchParams(req.query);
  res.redirect(`/#/payment-success?${params.toString()}`);
});

app.get('/payment-callback', (req, res) => {
  console.log('Alternative callback route hit');
  const params = new URLSearchParams(req.query);
  res.redirect(`/#/payment-success?${params.toString()}`);
});


app.get('/api/payment/status/:ref', async (req, res) => {
  const { ref } = req.params;
  console.log('Status check:', ref);
  
  let payment = paymentStore.get(ref) || paymentStore.get(`checkout_${ref}`);
  
  if (payment) {
    res.json({
      status: payment.status,
      customerEmail: payment.customerEmail,
      items: payment.items,
      metadata: payment.metadata
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.get('/api/payment/lookup/:checkoutId', async (req, res) => {
  const { checkoutId } = req.params;
  console.log('Emergency lookup:', checkoutId);
  
  const payment = paymentStore.get(`checkout_${checkoutId}`);
  if (payment) {
    res.json({ found: true, payment });
  } else {
    res.json({ found: false });
  }
});

app.post('/api/verifone/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = JSON.parse(req.body);
    console.log('Webhook received:', payload);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server on port ${PORT}`);
  console.log('Routes:');
  console.log(`  POST /api/createCheckoutSession`);
  console.log(`  GET  /payment/callback`);
  console.log(`  GET  /payment-callback`);
  console.log(`  GET  /api/payment/status/:ref`);
});
