const fs = require('fs');

const files = [
  'server.ts',
  'src/components/Sidebar.tsx',
  'src/components/Login.tsx',
  'src/components/ProfileModal.tsx',
  'data_admin.json'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/dappersuite@gmail\.com/g, 'dappersfit@gmail.com');
    code = code.replace(/Dapper Suite/g, 'Dappersfit Admin');
    fs.writeFileSync(file, code);
    console.log(`Updated ${file}`);
  }
});
