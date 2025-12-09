// createHostedPayment.cjs

require('dotenv').config();
const axios = require('axios');

async function createHostedPayment(amount, customerEmail, returnUrl, useGiftCard, useClipCard) {
  const apiKey = process.env.VERIFONE_API_KEY;
  const userId = process.env.VERIFONE_USER_ID;
  const entityId = process.env.VERIFONE_ENTITY_ID;
  const contractId = process.env.VERIFONE_CONTRACT_ID;
  const secure3dsId = process.env.VERIFONE_3DS_CONTRACT_ID; // optional
  const secureCardKey = process.env.VERIFONE_SECURE_CARD_KEY;

  // Defensive: Ensure numbers!
  amount = Number(amount);

  // For test/demo: map discount/clip logic here if needed.

  const data = {
    amount: amount,
    currency_code: 'ISK',
    entity_id: entityId,
    merchant_reference: 'ORDER-12345',
    return_url: "https://sweetspot.is/payment-success",
    interaction_type: 'HPP',
    configurations: {
      card: {
        payment_contract_id: contractId
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
      billing: {
        first_name: "Sweet",
        last_name: "Spot",
      }
    }    
  };
  
  // Debug what you actually send
  console.log('BODY SENT TO VERIFONE:', JSON.stringify(data, null, 2));

  try {
    const resp = await axios({
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
      }
    });
    return resp.data;
  } catch (err) {
    if (err.response && err.response.data) {
      console.error('Full Verifone error:', JSON.stringify(err.response.data, null, 2));
      throw new Error(JSON.stringify(err.response.data));
    } else {
      console.error('Error creating checkout session:', err);
      throw err;
    }
  }
}

module.exports = { createHostedPayment };
