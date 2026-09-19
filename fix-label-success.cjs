const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /return res\.json\(\{ labelUrl: finalUrl \}\);/,
  `return res.json({ success: true, labelUrl: finalUrl, labelGenerated: true });`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed label response');
