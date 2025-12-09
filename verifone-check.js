const https = require('https');

https.get('https://emea.live.verifone.cloud', (res) => {
  console.log(`✅ Connected to Verifone! Status: ${res.statusCode}`);
}).on('error', (e) => {
  console.error(`❌ Cannot reach Verifone: ${e.message}`);
});

