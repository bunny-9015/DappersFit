const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const written = saveBase64Image\(photoBase64, 'photo'\);[\s\S]*?finalUrl = photoBase64;\s*\}/g,
  `finalUrl = photoBase64;`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed photo endpoint in server');
