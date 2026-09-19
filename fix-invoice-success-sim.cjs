const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /res\.json\(\{\s*invoiceUrl: `\/api\/shiprocket\/download-invoice-pdf\?orderId=\$\{encodeURIComponent\(String\(orderId \|\| \(matchingOrder \? matchingOrder\.id : ''\)\)\)\}`\s*\}\);/,
  `res.json({ success: true, invoiceUrl: \`/api/shiprocket/download-invoice-pdf?orderId=\${encodeURIComponent(String(orderId || (matchingOrder ? matchingOrder.id : '')))}\` });`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed invoice response sim');
