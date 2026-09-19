const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

const newHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Invalid credentials. Please verify your details.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error during login. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };`;

const startIdx = code.indexOf('const handleSubmit = async');
const returnIdx = code.indexOf('return (', startIdx);

if (startIdx !== -1 && returnIdx !== -1) {
  const before = code.substring(0, startIdx);
  const after = code.substring(returnIdx);
  code = before + newHandleSubmit + '\n\n  ' + after;
  fs.writeFileSync('src/components/Login.tsx', code);
  console.log('Fixed Login.tsx successfully!');
} else {
  console.log('Could not find boundaries');
}
