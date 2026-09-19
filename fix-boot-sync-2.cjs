const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Orders
code = code.replace(
  /const mergedOrdersMap = new Map<string, any>\(\);[\s\S]*?mockOrders = Array\.from\(mergedOrdersMap\.values\(\)\);[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore orders\. Total orders: \$\{mockOrders\.length\}`\);/,
  `mockOrders = ordersList;
      console.log(\`[Firebase] Loaded \${mockOrders.length} orders from Firestore.\`);`
);

// Employees
code = code.replace(
  /const mergedEmployeesMap = new Map<string, any>\(\);[\s\S]*?mockEmployees = Array\.from\(mergedEmployeesMap\.values\(\)\);[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore employees\. Total employees: \$\{mockEmployees\.length\}`\);/,
  `mockEmployees = employeesList;
      console.log(\`[Firebase] Loaded \${mockEmployees.length} employees from Firestore.\`);`
);

// Products
code = code.replace(
  /const mergedProductsMap = new Map<string, any>\(\);[\s\S]*?mockProducts = Array\.from\(mergedProductsMap\.values\(\)\);[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore products\. Total products: \$\{mockProducts\.length\}`\);/,
  `mockProducts = productsList;
      console.log(\`[Firebase] Loaded \${mockProducts.length} products from Firestore.\`);`
);

// Customers
code = code.replace(
  /const mergedCustomersMap = new Map<string, any>\(\);[\s\S]*?mockCustomers = Array\.from\(mergedCustomersMap\.values\(\)\);[\s\S]*?console\.log\(`\[Firebase\] Smart merged local and Firestore customers\. Total customers: \$\{mockCustomers\.length\}`\);/,
  `mockCustomers = customersList;
      console.log(\`[Firebase] Loaded \${mockCustomers.length} customers from Firestore.\`);`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed remainder of boot syncs');
