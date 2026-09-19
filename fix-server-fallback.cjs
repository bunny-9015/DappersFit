const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /return \{ email: 'dappersfit@gmail\.com', password: 'Jail@1974', name: 'Admin User' \};/,
  `return { email: 'dappersuite@gmail.com', password: 'Jail@1974', name: 'Dapper Suite' };`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts fallback');
