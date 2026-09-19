const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix get replacements
code = code.replace(
  /const mergedMap = new Map<string, any>\(\);[\s\S]*?mockReplacements = Array\.from\(mergedMap\.values\(\)\);/,
  `mockReplacements = cloudItems;`
);

// 2. Fix get products
code = code.replace(
  /const mergedMap = new Map<string, any>\(\);[\s\S]*?mockProducts = Array\.from\(mergedMap\.values\(\)\);\s*saveProductsToFile\(\);/,
  `mockProducts = cloudItems;`
);

// 3. Remove Firebase push from saveOrdersToFile
code = code.replace(
  /async function saveOrdersToFile\(\) \{[\s\S]*?fs\.writeFileSync\(ORDERS_FILE_PATH, JSON\.stringify\(mockOrders, null, 2\), 'utf8'\);[\s\S]*?if \(isFirebaseEnabled && firestoreDb\) \{[\s\S]*?catch[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/,
  `async function saveOrdersToFile() {
  try {
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(mockOrders, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving orders:', err);
  }
}`
);

// 4. Remove Firebase push from saveEmployeesToFile
code = code.replace(
  /async function saveEmployeesToFile\(\) \{[\s\S]*?fs\.writeFileSync\(EMPLOYEES_FILE_PATH, JSON\.stringify\(mockEmployees, null, 2\), 'utf8'\);[\s\S]*?if \(isFirebaseEnabled && firestoreDb\) \{[\s\S]*?catch[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/,
  `async function saveEmployeesToFile() {
  try {
    fs.writeFileSync(EMPLOYEES_FILE_PATH, JSON.stringify(mockEmployees, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving employees:', err);
  }
}`
);

// 5. Remove Firebase push from saveProductsToFile
code = code.replace(
  /async function saveProductsToFile\(\) \{[\s\S]*?fs\.writeFileSync\(PRODUCTS_FILE_PATH, JSON\.stringify\(mockProducts, null, 2\), 'utf8'\);[\s\S]*?if \(isFirebaseEnabled && firestoreDb\) \{[\s\S]*?catch[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/,
  `async function saveProductsToFile() {
  try {
    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(mockProducts, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving products:', err);
  }
}`
);

// 6. Remove Firebase push from saveCustomersToFile
code = code.replace(
  /async function saveCustomersToFile\(\) \{[\s\S]*?fs\.writeFileSync\(CUSTOMERS_FILE_PATH, JSON\.stringify\(mockCustomers, null, 2\), 'utf8'\);[\s\S]*?if \(isFirebaseEnabled && firestoreDb\) \{[\s\S]*?catch[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/,
  `async function saveCustomersToFile() {
  try {
    fs.writeFileSync(CUSTOMERS_FILE_PATH, JSON.stringify(mockCustomers, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving customers:', err);
  }
}`
);

// 7. Remove Firebase push from saveReplacementsToFile
code = code.replace(
  /async function saveReplacementsToFile\(\) \{[\s\S]*?fs\.writeFileSync\(REPLACEMENTS_FILE_PATH, JSON\.stringify\(mockReplacements, null, 2\), 'utf8'\);[\s\S]*?if \(isFirebaseEnabled && firestoreDb\) \{[\s\S]*?catch[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/,
  `async function saveReplacementsToFile() {
  try {
    fs.writeFileSync(REPLACEMENTS_FILE_PATH, JSON.stringify(mockReplacements, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving replacements:', err);
  }
}`
);


fs.writeFileSync('server.ts', code);
console.log('Fixed GET endpoints and save functions');
