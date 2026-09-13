'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin } from '@/lib/api';
import { useAuth } from '@/lib/providers';

const DEMO_USERS = [
  { email: 'demo1@ivy.homes', password: 'bcd04974aa' },
  { email: 'demo2@ivy.homes', password: 'bcd04974aa' },
  { email: 'demo3@ivy.homes', password: 'bcd04974aa' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data.user || { email });
      router.replace('/listings');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(u) {
    setEmail(u.email);
    setPassword(u.password);
    setError('');
  }

  return (
    <main className="login-page">
      <div className="login-box glass-card" style={{ maxWidth: 440 }}>
        {/* Logo */}
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M24 5L44 19V43H30V30H18V43H4V19L24 5Z"
              stroke="url(#lg)" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00d4ff"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          <h1 className="gradient-text">Ivy Homes</h1>
          <p>Premium Real Estate · Hyderabad</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          {error && <div className="login-error" role="alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="email-input">Email address</label>
            <input
              id="email-input"
              className="input"
              type="email"
              placeholder="demo1@ivy.homes"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              className="input"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 4 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="demo-accounts" style={{ marginTop: 24 }}>
          <p>🚀 Quick demo access</p>
          {DEMO_USERS.map(u => (
            <button
              key={u.email}
              className="demo-btn"
              id={`demo-${u.email.split('@')[0]}`}
              onClick={() => fillDemo(u)}
              type="button"
            >
              👤 {u.email}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
