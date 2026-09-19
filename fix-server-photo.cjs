const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Bypass saveBase64Image
code = code.replace(
  /const writtenUrl = saveBase64Image\(payload\.photoBase64, type\);[\s\S]*?savedPhotoUrl = payload\.photoBase64;\s*\}/g,
  `savedPhotoUrl = payload.photoBase64;`
);

code = code.replace(
  /const writtenUrl = saveBase64Image\(payload\.photoBase64, existing\.type \|\| 'rep'\);[\s\S]*?savedPhotoUrl = payload\.photoBase64;\s*\}/g,
  `savedPhotoUrl = payload.photoBase64;`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed server photo handling');
