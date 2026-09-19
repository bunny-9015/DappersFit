const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /return res\.json\(\{ invoiceUrl: url \}\);/,
  `return res.json({ success: true, invoiceUrl: url });`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed invoice response');
