const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
code = code.replace(/user@dappersfit\.com/g, 'dappersuite@gmail.com');
code = code.replace(/Active User/g, 'Dapper Suite');
fs.writeFileSync('src/components/Sidebar.tsx', code);

code = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');
code = code.replace(/user@dappersfit\.com/g, 'dappersuite@gmail.com');
code = code.replace(/Active User/g, 'Dapper Suite');
fs.writeFileSync('src/components/ProfileModal.tsx', code);
console.log('Fixed fallbacks');
