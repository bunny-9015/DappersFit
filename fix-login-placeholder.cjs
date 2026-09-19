const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');
code = code.replace(/placeholder="email@dappersfit\.com"/g, 'placeholder="dappersuite@gmail.com"');
fs.writeFileSync('src/components/Login.tsx', code);
console.log('Fixed Login.tsx placeholder');
