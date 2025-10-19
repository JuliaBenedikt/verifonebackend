// createHostedPayment.cjs - FIXED FOR REDIRECT ISSUE

require('dotenv').config();
const axios = require('axios');

async function createHostedPayment(amount, customerEmail, returnUrl, useGiftCard, useClipCard) {
  const apiKey = process.env.VERIFONE_API_KEY;
  const userId = process.env.VERIFONE_USER_ID;
  const entityId = process.env.VERIFONE_ENTITY_ID;
  const contractId = process.env.VERIFONE_CONTRACT_ID;
  const secure3dsId = process.env.VERIFONE_3DS_CONTRACT_ID;
  const secureCardKey = process.env.VERIFONE_SECURE_CARD_KEY;

  amount = Number(amount);
  
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  // Generate unique reference
  const merchantReference = `ORDER-${Date.now()}`;
  
  console.log('🎯 Creating Verifone payment:', {
    amount,
    customerEmail,
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

  // CRITICAL: Use the returnUrl provided by Flutter OR construct callback URL
  const baseUrl = 'https://sweetspot.is';
  
  // If returnUrl contains hash, replace it with callback
  let finalReturnUrl = returnUrl;
  if (!returnUrl || returnUrl.includes('#')) {
    // Build proper callback URL
    // After getting response from Verifone
const params = new URLSearchParams({
  ref: merchantReference,
  checkout_id: response.data.id,  // ADD THIS - the actual checkout ID
  email: customerEmail,
  clips: clipsUsed.toString(),
  gift: giftAmount.toString()
});
    finalReturnUrl = `${baseUrl}/payment/callback?${params.toString()}`;
  }

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
        ...(secure3dsId ? { secure3d_contract_id: secure3dsId } : {}),
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
      email: customerEmail,
      billing: {
        first_name: customerEmail.split('@')[0] || "Customer",
        last_name: "Sweetspot",
        email: customerEmail
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
