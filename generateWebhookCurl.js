const crypto = require('crypto');

const SECRET = 'whsec_test_123';

const payload = {
    id: "evt_12345",
    type: "payment.succeeded",
    merchantId: "merchant_abc",
    amount: 1000,
    currency: "USD",
    createdAt: new Date().toISOString(),
};

const jsonPayload = JSON.stringify(payload);

// Compute HMAC SHA256 signature
const signature = crypto.createHmac('sha256', SECRET)
    .update(jsonPayload)
    .digest('hex');

console.log('Payload:', jsonPayload);
console.log('Signature:', signature);

const curlCommand = `curl -X POST http://localhost:3000/webhooks/payments \\
  -H "Content-Type: application/json" \\
  -H "x-signature-sha256: ${signature}" \\
  -d '${jsonPayload}'`;

console.log('\nRun this command to test the webhook:');
console.log(curlCommand);
