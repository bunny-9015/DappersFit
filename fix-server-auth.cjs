const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We will add the API routes and admin credentials storage somewhere near the top / routes.

const authBlock = `
const ADMIN_FILE_PATH = path.join(process.cwd(), 'data_admin.json');
function loadAdminCreds() {
  try {
    if (fs.existsSync(ADMIN_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(ADMIN_FILE_PATH, 'utf8'));
    }
  } catch (err) { }
  return { email: 'dappersfit@gmail.com', password: 'Jail@1974', name: 'Admin User' };
}
let adminCreds = loadAdminCreds();

function saveAdminCreds() {
  try {
    fs.writeFileSync(ADMIN_FILE_PATH, JSON.stringify(adminCreds, null, 2), 'utf8');
  } catch (err) { }
}

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (role === 'admin') {
    if (normalizedEmail === adminCreds.email.toLowerCase() && password === adminCreds.password) {
      return res.json({ success: true, user: { name: adminCreds.name, email: adminCreds.email, role: 'admin' } });
    } else {
      const matchedEmp = mockEmployees.find((e: any) => {
        const empEmail = (e.email || '').trim().toLowerCase();
        const empUsername = (e.username || '').trim().toLowerCase();
        return (empEmail === normalizedEmail || empUsername === normalizedEmail) && e.password === password;
      });
      if (matchedEmp) {
        if (matchedEmp.status === 'inactive') {
          return res.status(403).json({ success: false, error: 'Your account has been deactivated.' });
        }
        return res.json({ success: true, user: { id: matchedEmp.id, name: matchedEmp.name, email: matchedEmp.email, role: 'employee' } });
      }
      return res.status(401).json({ success: false, error: 'Invalid administrator email or password.' });
    }
  } else {
    const matchedEmp = mockEmployees.find((e: any) => {
      const empEmail = (e.email || '').trim().toLowerCase();
      const empUsername = (e.username || '').trim().toLowerCase();
      return (empEmail === normalizedEmail || empUsername === normalizedEmail) && e.password === password;
    });
    if (matchedEmp) {
      if (matchedEmp.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'Your account has been deactivated.' });
      }
      return res.json({ success: true, user: { id: matchedEmp.id, name: matchedEmp.name, email: matchedEmp.email, role: 'employee' } });
    }
    return res.status(401).json({ success: false, error: 'Invalid employee credentials.' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  const { role, oldPassword, newPassword, userId, email } = req.body;
  if (role === 'admin') {
    if (oldPassword !== adminCreds.password) {
      return res.status(401).json({ success: false, error: 'Incorrect current password.' });
    }
    adminCreds.password = newPassword;
    saveAdminCreds();
    return res.json({ success: true });
  } else {
    let empIdx = -1;
    if (userId) {
      empIdx = mockEmployees.findIndex((e: any) => e.id === userId);
    } else if (email) {
      empIdx = mockEmployees.findIndex((e: any) => e.email === email);
    }
    
    if (empIdx === -1) return res.status(404).json({ success: false, error: 'Employee not found.' });
    
    if (mockEmployees[empIdx].password !== oldPassword) {
      return res.status(401).json({ success: false, error: 'Incorrect current password.' });
    }
    mockEmployees[empIdx].password = newPassword;
    saveEmployeesToFile();
    // Also sync to firestore if enabled
    if (isFirebaseEnabled && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'employees', String(mockEmployees[empIdx].id)), mockEmployees[empIdx]);
      } catch (err) { }
    }
    return res.json({ success: true });
  }
});
`;

code = code.replace(
  /\/\/ -------------------------------------------------------------\n\/\/ ENDPOINTS/,
  `// -------------------------------------------------------------\n// ENDPOINTS\n\n${authBlock}`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed server auth');
