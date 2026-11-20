import { useCallback, useEffect, useState } from 'react';
import { api, type User } from './api';
import AuthScreen from './components/AuthScreen';
import NotesPage from './components/NotesPage';
import PostsPage from './components/PostsPage';
import AdminUsersPage from './components/AdminUsersPage';
import InterestsPage from './components/InterestsPage';
import RolesPage from './components/RolesPage';

type Tab = 'notes' | 'posts' | 'users' | 'interests' | 'roles' | 'auth';
const tokenKey = 'secure-notes-token';
const backendPending = import.meta.env.VITE_BACKEND_PENDING === 'true';

/** Keeps navigation and session state in one place across the feature screens. */
export default function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(tokenKey));
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>(() => sessionStorage.getItem(tokenKey) ? 'notes' : 'posts');
  const [loading, setLoading] = useState(Boolean(token));

  const signOut = useCallback(() => {
    sessionStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    setTab('posts');
    setLoading(false);
  }, []);

  useEffect(() => {
    window.addEventListener('secure-notes:session-expired', signOut);
    return () => window.removeEventListener('secure-notes:session-expired', signOut);
  }, [signOut]);

  useEffect(() => {
    if (!token || backendPending) return;
    let active = true;
    void api<User>('/auth/me', { token })
      .then((result) => {
        if (active) {
          setUser(result);
          if (!result.permissions?.includes('notes.read')) setTab((current) => current === 'notes' ? 'posts' : current);
        }
      })
      .catch(() => { if (active) signOut(); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, signOut]);

  function authenticated(nextUser: User, nextToken: string) {
    sessionStorage.setItem(tokenKey, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setTab(nextUser.permissions?.includes('notes.read') ? 'notes' : 'posts');
  }

  const authVisible = !user && tab === 'auth';
  const can = (permission: string) => Boolean(user?.permissions?.includes(permission));

  return <div className={`app-shell${authVisible ? ' auth-view' : ''}`}>
    <header className="site-header">
      <div className="header-inner">
        <div className="brand"><div><strong>Secure Notes</strong><small>Private notes and public posts</small></div></div>
        <div className="account">
          {user ? <><span>{user.name} <span className="badge">{user.username}</span> <span className="badge">{user.roleName ?? user.role}</span></span><button onClick={signOut}>Sign out</button></>
            : <button onClick={() => setTab('auth')}>Sign in</button>}
        </div>
      </div>
    </header>
    <div className="content-shell">
      {backendPending && <p className="deployment-notice" role="status">Frontend preview is live. Sign in, registration, notes, and posts will be available when the backend is connected.</p>}
      <nav className="tabs" aria-label="Main navigation">
        {can('notes.read') && <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>Notes</button>}
        <button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>Public posts</button>
        {can('users.manage') && <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>}
        {can('interests.read') && <button className={tab === 'interests' ? 'active' : ''} onClick={() => setTab('interests')}>Interest groups</button>}
        {user?.role === 'admin' && <button className={tab === 'roles' ? 'active' : ''} onClick={() => setTab('roles')}>Roles & permissions</button>}
        {!user && <button className={tab === 'auth' ? 'active' : ''} onClick={() => setTab('auth')}>Sign in</button>}
      </nav>
      <main>
        {loading ? <section className="card"><p className="muted">Loading your account…</p></section>
          : tab === 'notes' && can('notes.read') && user && token ? <NotesPage token={token} user={user} />
          : tab === 'users' && can('users.manage') && user && token ? <AdminUsersPage token={token} currentUser={user} />
          : tab === 'interests' && can('interests.read') && token ? <InterestsPage token={token} />
          : tab === 'roles' && user?.role === 'admin' && token ? <RolesPage token={token} />
          : tab === 'auth' && !user ? <AuthScreen onAuthenticated={authenticated} backendPending={backendPending} />
          : <PostsPage token={token} user={user} backendPending={backendPending} />}
      </main>
    </div>
  </div>;
}
