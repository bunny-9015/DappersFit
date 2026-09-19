const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexes = [
  // 1. Orders
  {
    find: /if \(ordersList\.length === 0\) \{[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore orders\. Total: \$\{mockOrders\.length\}`\);\s*await Promise\.all\([\s\S]*?mockOrders\.map\(async \(order\) => \{[\s\S]*?await setDoc\(doc\(firestoreDb, 'orders', String\(order\.id\)\), sanitizeForFirestore\(order\)\);[\s\S]*?\}\)[\s\S]*?\);[\s\S]*?\}/,
    replace: `if (ordersList.length === 0) {
      console.log('[Firebase] Firestore orders collection is empty. Syncing local state to cloud...');
      for (const order of mockOrders) {
        if (order && order.id) {
          await setDoc(doc(firestoreDb, 'orders', String(order.id)), sanitizeForFirestore(order));
        }
      }
    } else {
      mockOrders = ordersList;
      console.log(\`[Firebase] Loaded \${mockOrders.length} orders from Firestore.\`);
    }`
  },
  // 2. Employees
  {
    find: /if \(employeesList\.length === 0\) \{[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore employees\. Total: \$\{mockEmployees\.length\}`\);\s*await Promise\.all\([\s\S]*?mockEmployees\.map\(async \(emp\) => \{[\s\S]*?await setDoc\(doc\(firestoreDb, 'employees', String\(emp\.id\)\), sanitizeForFirestore\(emp\)\);[\s\S]*?\}\)[\s\S]*?\);[\s\S]*?\}/,
    replace: `if (employeesList.length === 0) {
      console.log('[Firebase] Firestore employees collection is empty. Syncing local state to cloud...');
      for (const emp of mockEmployees) {
        if (emp && emp.id) {
          await setDoc(doc(firestoreDb, 'employees', String(emp.id)), sanitizeForFirestore(emp));
        }
      }
    } else {
      mockEmployees = employeesList;
      console.log(\`[Firebase] Loaded \${mockEmployees.length} employees from Firestore.\`);
    }`
  },
  // 3. Products
  {
    find: /if \(productsList\.length === 0\) \{[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore products\. Total: \$\{mockProducts\.length\}`\);\s*await Promise\.all\([\s\S]*?mockProducts\.map\(async \(prod\) => \{[\s\S]*?await setDoc\(doc\(firestoreDb, 'products', String\(prod\.id\)\), sanitizeForFirestore\(prod\)\);[\s\S]*?\}\)[\s\S]*?\);[\s\S]*?\}/,
    replace: `if (productsList.length === 0) {
      console.log('[Firebase] Firestore products collection is empty. Syncing local state to cloud...');
      for (const prod of mockProducts) {
        if (prod && prod.id) {
          await setDoc(doc(firestoreDb, 'products', String(prod.id)), sanitizeForFirestore(prod));
        }
      }
    } else {
      mockProducts = productsList;
      console.log(\`[Firebase] Loaded \${mockProducts.length} products from Firestore.\`);
    }`
  },
  // 4. Customers
  {
    find: /if \(customersList\.length === 0\) \{[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore customers\. Total: \$\{mockCustomers\.length\}`\);\s*await Promise\.all\([\s\S]*?mockCustomers\.map\(async \(cust\) => \{[\s\S]*?await setDoc\(doc\(firestoreDb, 'customers', String\(cust\.id\)\), sanitizeForFirestore\(cust\)\);[\s\S]*?\}\)[\s\S]*?\);[\s\S]*?\}/,
    replace: `if (customersList.length === 0) {
      console.log('[Firebase] Firestore customers collection is empty. Syncing local state to cloud...');
      for (const cust of mockCustomers) {
        if (cust && cust.id) {
          await setDoc(doc(firestoreDb, 'customers', String(cust.id)), sanitizeForFirestore(cust));
        }
      }
    } else {
      mockCustomers = customersList;
      console.log(\`[Firebase] Loaded \${mockCustomers.length} customers from Firestore.\`);
    }`
  },
  // 5. Replacements
  {
    find: /if \(replacementsList\.length === 0\) \{[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore replacements\. Total: \$\{mockReplacements\.length\}`\);\s*await Promise\.all\([\s\S]*?mockReplacements\.map\(async \(rep\) => \{[\s\S]*?await setDoc\(doc\(firestoreDb, 'replacements', String\(rep\.id\)\), sanitizeForFirestore\(rep\)\);[\s\S]*?\}\)[\s\S]*?\);[\s\S]*?\}/,
    replace: `if (replacementsList.length === 0) {
      console.log('[Firebase] Firestore replacements collection is empty. Syncing local state to cloud...');
      for (const rep of mockReplacements) {
        if (rep && rep.id) {
          await setDoc(doc(firestoreDb, 'replacements', String(rep.id)), sanitizeForFirestore(rep));
        }
      }
    } else {
      mockReplacements = replacementsList;
      console.log(\`[Firebase] Loaded \${mockReplacements.length} replacements from Firestore.\`);
    }`
  }
];

let changed = false;
for (const r of regexes) {
  if (r.find.test(code)) {
    code = code.replace(r.find, r.replace);
    changed = true;
  } else {
    console.log("Could not match a boot sync block", r.replace.slice(0, 50));
  }
}

if (changed) {
  fs.writeFileSync('server.ts', code);
  console.log('Fixed boot sync');
} else {
  console.log('No changes made to boot sync');
}

