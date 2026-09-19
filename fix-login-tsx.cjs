const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

// We will replace the handleLogin implementation to call the API instead.
const newHandleLogin = `  const handleLogin = async (e: React.FormEvent) => {
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

code = code.replace(
  /const handleLogin = async \(e: React\.FormEvent\) => \{[\s\S]*?\}\s*\} catch \(err\) \{[\s\S]*?setLoading\(false\);\s*\};\s*\}/,
  newHandleLogin
);

// Second attempt just in case the regex doesn't match perfectly.
if (!code.includes('/api/auth/login')) {
  // Let's do a more robust replacement.
  code = code.replace(
    /const handleLogin = async \(e: React\.FormEvent\) => \{[\s\S]*?  \};\n/,
    newHandleLogin + '\n'
  );
}

fs.writeFileSync('src/components/Login.tsx', code);
console.log('Fixed Login.tsx');
