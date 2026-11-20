import { useEffect, useState, type FormEvent } from 'react';
import { api, messageOf, type Page, type PermissionDefinition, type Role } from '../api';
import Pagination from './Pagination';

interface Props { token: string }

/** Lets built-in administrators define named permission sets for regular users. */
export default function RolesPage({ token }: Props) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<Role> | null>(null);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void api<{ items: PermissionDefinition[] }>('/admin/permissions', { token })
      .then((value) => { if (active) setCatalog(value.items); })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    let active = true;
    void api<Page<Role>>(`/admin/roles?page=${page}&per_page=10`, { token })
      .then((value) => { if (active) setResult(value); })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [token, page, revision]);

  function reset() { setEditingId(null); setName(''); setPermissions([]); }

  function edit(role: Role) {
    setEditingId(role.id);
    setName(role.name);
    setPermissions(role.permissions);
  }

  function toggle(key: string) {
    setPermissions((current) => current.includes(key)
      ? current.filter((value) => value !== key) : [...current, key]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api<Role>(editingId ? `/admin/roles/${editingId}` : '/admin/roles', {
        method: editingId ? 'PATCH' : 'POST', token, body: { name, permissions },
      });
      reset();
      setPage(1);
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }

  async function remove(role: Role) {
    if (!window.confirm(`Delete role “${role.name}”?`)) return;
    setError('');
    try {
      await api<void>(`/admin/roles/${role.id}`, { method: 'DELETE', token });
      if (editingId === role.id) reset();
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
  }

  return <section className="card">
    <div className="section-head"><h2>Roles &amp; permissions</h2></div>
    <p className="muted">Create a role, choose its permissions, then assign it to a user from the Users page. Built-in admin and user roles stay available.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="editor" onSubmit={save}>
      <h3>{editingId ? 'Edit role' : 'New role'}</h3>
      <label>Role name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9 -]*" placeholder="support agent" /></label>
      <fieldset className="permission-list"><legend>Permissions</legend>
        {catalog.map((permission) => <label className="check-row" key={permission.key}>
          <input type="checkbox" checked={permissions.includes(permission.key)} onChange={() => toggle(permission.key)} />
          <span>{permission.label}<small>{permission.key}</small></span>
        </label>)}
      </fieldset>
      <div className="actions"><button className="primary" disabled={busy || catalog.length === 0}>{editingId ? 'Save role' : 'Create role'}</button>
        {editingId && <button type="button" onClick={reset}>Cancel</button>}</div>
    </form>
    <div className="list">
      {result?.items.length === 0 && <p className="muted">No custom roles yet.</p>}
      {result?.items.map((role) => <article className="list-item" key={role.id}>
        <div><h3>{role.name}</h3><p className="muted">{role.permissions.length ? role.permissions.join(', ') : 'No permissions'}</p></div>
        <div className="actions"><button onClick={() => edit(role)}>Edit</button><button className="danger" onClick={() => void remove(role)}>Delete</button></div>
      </article>)}
    </div>
    <Pagination result={result} onPageChange={setPage} />
  </section>;
}
