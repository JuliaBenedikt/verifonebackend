const response = await axios.post(
  'https://emea.live.verifone.cloud/v1/checkout',  // Verifone API endpoint
  {
    amount: amount * 100,  // Convert to cents
    currency: currency,
    customer: {
      fullName: name,
      email: email,
      phone: phone,
      address: { line1: address, city: city, postalCode: postalCode }
    },
    contractId: process.env.PAYMENT_PROVIDER_CONTRACT_ID,  // Ensure your contract ID is correct
    secureId: process.env.SECURE_ID,  // Ensure your secure ID is correct
    successUrl: process.env.SUCCESS_URL, // The URL Verifone redirects to on success
    cancelUrl: process.env.CANCEL_URL  // The URL Verifone redirects to on failure
  },
  {
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,  // Ensure the API Key is correct
      'Content-Type': 'application/json',
    },
  }
);
