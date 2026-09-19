const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /async function saveOrdersToFile\(\) \{\s*try \{\s*fs\.writeFileSync\(ORDERS_FILE_PATH, JSON\.stringify\(mockOrders, null, 2\), 'utf8'\);\s*\} catch \(err\) \{\s*console\.error\('Error saving orders:', err\);\s*\}\s*\}[\s\S]*?\} catch \(err\) \{\s*console\.error\('Error writing orders file:', err\);\s*\}\s*\}/,
  `async function saveOrdersToFile() {
  try {
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(mockOrders, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving orders:', err);
  }
}`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed saveOrdersToFile');
