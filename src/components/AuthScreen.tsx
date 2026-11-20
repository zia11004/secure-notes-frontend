import { useState, type FormEvent } from 'react';
import { api, messageOf, type User } from '../api';

interface Props {
  onAuthenticated: (user: User, token: string) => void;
  backendPending?: boolean;
}

/** Registers a regular user or exchanges credentials for a JWT. */
export default function AuthScreen({ onAuthenticated, backendPending = false }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [interests, setInterests] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register' && password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const body = mode === 'register'
        ? { name, email: identifier.trim(), password, confirmPassword, interests: interests.split(',').map((value) => value.trim()).filter(Boolean) }
        : { ...(identifier.includes('@') ? { email: identifier } : { username: identifier }), password };
      const result = await api<{ user: User; token: string }>(`/auth/${mode}`, { method: 'POST', body });
      onAuthenticated(result.user, result.token);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card auth-card">
      <div className="section-head"><h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2></div>
      <form onSubmit={submit}>
        {mode === 'register' && <>
          <p className="muted">Your username is assigned automatically, starting at 110001.</p>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} /></label>
          <label>Interests, comma separated<input value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="chess, reading" /></label>
        </>}
        <label>{mode === 'login' ? 'Email or username' : 'Email'}<input type={mode === 'register' || identifier.includes('@') ? 'email' : 'text'} value={identifier} onChange={(event) => setIdentifier(event.target.value)} required maxLength={254} autoComplete={mode === 'register' ? 'email' : 'username'} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
        {mode === 'register' && <label>Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={6} maxLength={128} autoComplete="new-password" /></label>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy || backendPending}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
      </form>
      <button className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setConfirmPassword(''); setError(''); }}>
        {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
      </button>
    </section>
  );
}
