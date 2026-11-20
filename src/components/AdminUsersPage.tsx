import { useEffect, useState, type FormEvent } from 'react';
import { api, messageOf, type Page, type Role, type User } from '../api';
import Pagination from './Pagination';

interface Props { token: string; currentUser: User }
type Draft = { name: string; email: string; password: string; confirmPassword: string; roleChoice: string; interests: string };
const emptyDraft: Draft = { name: '', email: '', password: '', confirmPassword: '', roleChoice: 'user', interests: '' };

/** Gives admins paginated user management without exposing password hashes. */
export default function AdminUsersPage({ token, currentUser }: Props) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<User> | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (currentUser.role !== 'admin') return;
    let active = true;
    async function loadRoles() {
      try {
        const all: Role[] = [];
        let next = 1;
        while (true) {
          const batch = await api<Page<Role>>(`/admin/roles?page=${next}&per_page=100`, { token });
          all.push(...batch.items);
          if (next >= batch.pages) break;
          next += 1;
        }
        if (active) setRoles(all);
      } catch (reason) { if (active) setError(messageOf(reason)); }
    }
    void loadRoles();
    return () => { active = false; };
  }, [token, currentUser.role]);

  useEffect(() => {
    let active = true;
    api<Page<User>>(`/admin/users?page=${page}&per_page=10`, { token })
      .then((value) => { if (active) { setResult(value); setError(''); } })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [token, page, revision]);

  function edit(user: User) {
    setEditingId(user.id);
    setDraft({ name: user.name, email: user.email, password: '', confirmPassword: '', roleChoice: user.roleId ?? user.role, interests: user.interests.join(', ') });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const interests = draft.interests.split(',').map((value) => value.trim()).filter(Boolean);
    try {
      if (draft.password !== draft.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const roleFields = currentUser.role === 'admin' ? {
        role: draft.roleChoice === 'admin' ? 'admin' : 'user',
        roleId: draft.roleChoice === 'admin' || draft.roleChoice === 'user' ? null : draft.roleChoice,
      } : {};
      const body = { name: draft.name, email: draft.email, interests, ...roleFields,
        ...(draft.password ? { password: draft.password, confirmPassword: draft.confirmPassword } : {}) };
      await api<User>(editingId ? `/admin/users/${editingId}` : '/admin/users', {
        method: editingId ? 'PATCH' : 'POST', token, body,
      });
      setEditingId(null);
      setDraft(emptyDraft);
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }

  async function view(user: User) {
    try { setSelected(await api<User>(`/admin/users/${user.id}`, { token })); }
    catch (reason) { setError(messageOf(reason)); }
  }

  async function remove(user: User) {
    if (!window.confirm(`Delete ${user.name} and their notes and posts?`)) return;
    try {
      await api<void>(`/admin/users/${user.id}`, { method: 'DELETE', token });
      if (selected?.id === user.id) setSelected(null);
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
  }

  return <section className="card">
    <div className="section-head"><h2>Manage users</h2></div>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="editor" onSubmit={save}>
      <h3>{editingId ? 'Edit user' : 'Add user'}</h3>
      {!editingId && <p className="muted">The next username is assigned automatically.</p>}
      <div className="form-grid">
        <label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required minLength={2} maxLength={100} /></label>
        <label>Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required maxLength={254} /></label>
        <label>Password {editingId && '(leave blank to keep)'}<input type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} required={!editingId} minLength={6} maxLength={128} autoComplete="new-password" /></label>
        <label>Confirm password<input type="password" value={draft.confirmPassword} onChange={(event) => setDraft({ ...draft, confirmPassword: event.target.value })} required={!editingId || Boolean(draft.password)} minLength={6} maxLength={128} autoComplete="new-password" /></label>
        {currentUser.role === 'admin' && <label>Role<select value={draft.roleChoice} onChange={(event) => setDraft({ ...draft, roleChoice: event.target.value })} disabled={editingId === currentUser.id}>
          <option value="user">User</option><option value="admin">Admin</option>
          {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select></label>}
      </div>
      <label>Interests, comma separated<input value={draft.interests} onChange={(event) => setDraft({ ...draft, interests: event.target.value })} placeholder="chess, reading" /></label>
      <div className="actions"><button className="primary" disabled={busy}>{editingId ? 'Save user' : 'Add user'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel</button>}</div>
    </form>
    <div className="list">
      {result?.items.length === 0 && <p className="muted">No users on this page.</p>}
      {result?.items.map((user) => <article className="list-item" key={user.id}>
        <div><h3>{user.name} <span className="badge">{user.username}</span> <span className="badge">{user.roleId ? roles.find((role) => role.id === user.roleId)?.name ?? 'Custom role' : user.role}</span></h3><p className="muted">{user.email} · {user.interests.join(', ') || 'No interests'}</p></div>
        <div className="actions"><button onClick={() => void view(user)}>Profile</button>
          {(currentUser.role === 'admin' || user.role !== 'admin') && <button onClick={() => edit(user)}>Edit</button>}
          {user.id !== currentUser.id && (currentUser.role === 'admin' || user.role !== 'admin') && <button className="danger" onClick={() => void remove(user)}>Delete</button>}</div>
      </article>)}
    </div>
    <Pagination result={result} onPageChange={setPage} />
    {selected && <div className="detail"><div className="section-head"><h3>{selected.name}</h3><button onClick={() => setSelected(null)}>Close</button></div>
      <p>Username: {selected.username} · {selected.email} · {selected.roleId ? roles.find((role) => role.id === selected.roleId)?.name ?? 'Custom role' : selected.role}</p><p>Interests: {selected.interests.join(', ') || 'None'}</p></div>}
  </section>;
}
