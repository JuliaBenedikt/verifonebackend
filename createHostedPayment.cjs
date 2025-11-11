// createHostedPayment.cjs - FIXED VERSION
require('dotenv').config();
const axios = require('axios');

async function createHostedPayment(amount, customerEmail, customerName, returnUrl, useGiftCard, useClipCard) {
  const apiKey = process.env.VERIFONE_API_KEY;
  const userId = process.env.VERIFONE_USER_ID;
  const entityId = process.env.VERIFONE_ENTITY_ID;
  const contractId = process.env.VERIFONE_CONTRACT_ID;
  const secure3dsId = process.env.VERIFONE_3DS_CONTRACT_ID;
  const secureCardKey = process.env.VERIFONE_SECURE_CARD_KEY;

  console.log('🔐 3DS Configuration:', {
    secure3dsId: secure3dsId ? 'ENABLED ✅' : 'NOT SET ❌',
    contractId: secure3dsId || 'missing'
  });

  amount = Number(amount);

  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  const merchantReference = `ORDER-${Date.now()}`;

  console.log('🎯 Creating Verifone payment:', {
    amount,
    customerEmail,
    customerName,
    merchantReference
  });

  // Extract values from returnUrl if provided
  let clipsUsed = 0;
  let giftAmount = 0;
  
  if (returnUrl) {
    try {
      const url = new URL(returnUrl);
      clipsUsed = Number(url.searchParams.get('clips')) || 0;
      giftAmount = Number(url.searchParams.get('gift')) || 0;
    } catch (e) {
      console.log('Could not parse returnUrl');
    }
  }

  // Build return URL with email in params (will add checkout_id later)
  const baseUrl = 'https://sweetspot.is';
  const params = new URLSearchParams({
    ref: merchantReference,
    email: customerEmail,
    clips: clipsUsed.toString(),
    gift: giftAmount.toString()
  });
  
  const finalReturnUrl = `${baseUrl}/payment-callback.html?${params.toString()}`;
  
  console.log('📍 Return URL:', finalReturnUrl);

  const data = {
    amount: amount,
    currency_code: 'ISK',
    entity_id: entityId,
    merchant_reference: merchantReference,
    return_url: finalReturnUrl,
    interaction_type: 'HPP',
    
    configurations: {
      card: {
        payment_contract_id: contractId,
        capture_now: true
      }
    },
    
    line_items: [
      {
        name: 'Golf Booking',
        total_amount: amount,
        quantity: 1
      }
    ],
    
    customer_details: {
      entity_id: entityId,
      // ✅ NO EMAIL ANYWHERE
      billing: {
        first_name: customerName || "Viðskiptamaður",
        last_name: ""
        // ✅ NO EMAIL HERE EITHER
      }
    }
  };
  
  console.log('📤 Sending to Verifone:', JSON.stringify(data, null, 2));

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://emea.gsc.verifone.cloud/oidc/checkout-service/v2/checkout',
      data: data,
      headers: {
        'Content-Type': 'application/json',
        ...(secureCardKey ? { 'x-ef-ssc-key': secureCardKey } : {})
      },
      auth: {
        username: userId,
        password: apiKey
      },
      timeout: 30000
    });
    
    console.log('✅ Checkout created:', response.data?.id);
    
    return {
      ...response.data,
      merchant_reference: merchantReference
    };
    
  } catch (error) {
    if (error.response) {
      console.error('Verifone error:', error.response.data);
      throw new Error(JSON.stringify(error.response.data));
    }
    throw error;
  }
}

module.exports = { createHostedPayment };
