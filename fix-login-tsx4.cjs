const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

const newHandleSubmit = `  const [role, setRole] = useState<'admin' | 'employee'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  return (
    <div className="min-h-screen`;

// Find where the state hooks start
const startIdx = code.indexOf("const [role, setRole]");
const returnDivIdx = code.indexOf('return (\n    <div className="min-h-screen');

if (startIdx !== -1 && returnDivIdx !== -1) {
  const before = code.substring(0, startIdx);
  const after = code.substring(returnDivIdx + 'return (\n    <div className="min-h-screen'.length);
  code = before + newHandleSubmit + after;
  fs.writeFileSync('src/components/Login.tsx', code);
  console.log('Fixed Login.tsx cleanly!');
} else {
  console.log('Could not find boundaries again', startIdx, returnDivIdx);
}
