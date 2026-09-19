const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexes = [
  {
    name: 'saveEmployeesToFile',
    find: /async function saveEmployeesToFile\(\) \{\s*try \{\s*fs\.writeFileSync\(EMPLOYEES_FILE_PATH, JSON\.stringify\(mockEmployees, null, 2\), 'utf8'\);\s*\} catch \(err\) \{\s*console\.error\('Error saving employees:', err\);\s*\}\s*\} catch \(err\) \{\s*console\.error\('Error writing employees file:', err\);\s*\}\s*\}/,
    replace: `async function saveEmployeesToFile() {
  try {
    fs.writeFileSync(EMPLOYEES_FILE_PATH, JSON.stringify(mockEmployees, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving employees:', err);
  }
}`
  },
  {
    name: 'saveProductsToFile',
    find: /async function saveProductsToFile\(\) \{\s*try \{\s*fs\.writeFileSync\(PRODUCTS_FILE_PATH, JSON\.stringify\(mockProducts, null, 2\), 'utf8'\);\s*\} catch \(err\) \{\s*console\.error\('Error saving products:', err\);\s*\}\s*\} catch \(err\) \{\s*console\.error\('Error writing products file:', err\);\s*\}\s*\}/,
    replace: `async function saveProductsToFile() {
  try {
    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(mockProducts, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving products:', err);
  }
}`
  },
  {
    name: 'saveCustomersToFile',
    find: /async function saveCustomersToFile\(\) \{\s*try \{\s*fs\.writeFileSync\(CUSTOMERS_FILE_PATH, JSON\.stringify\(mockCustomers, null, 2\), 'utf8'\);\s*\} catch \(err\) \{\s*console\.error\('Error saving customers:', err\);\s*\}\s*\} catch \(err\) \{\s*console\.error\('Error writing customers file:', err\);\s*\}\s*\}/,
    replace: `async function saveCustomersToFile() {
  try {
    fs.writeFileSync(CUSTOMERS_FILE_PATH, JSON.stringify(mockCustomers, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving customers:', err);
  }
}`
  },
  {
    name: 'saveReplacementsToFile',
    find: /async function saveReplacementsToFile\(\) \{\s*try \{\s*fs\.writeFileSync\(REPLACEMENTS_FILE_PATH, JSON\.stringify\(mockReplacements, null, 2\), 'utf8'\);\s*\} catch \(err\) \{\s*console\.error\('Error saving replacements:', err\);\s*\}\s*\} catch \(err\) \{\s*console\.error\('Error writing replacements file:', err\);\s*\}\s*\}/,
    replace: `async function saveReplacementsToFile() {
  try {
    fs.writeFileSync(REPLACEMENTS_FILE_PATH, JSON.stringify(mockReplacements, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving replacements:', err);
  }
}`
  }
];

let changed = false;
for (const r of regexes) {
  if (r.find.test(code)) {
    code = code.replace(r.find, r.replace);
    changed = true;
    console.log("Fixed " + r.name);
  } else {
    console.log("Could not find " + r.name);
  }
}

fs.writeFileSync('server.ts', code);
