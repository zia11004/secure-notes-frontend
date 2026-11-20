import { useEffect, useState, type FormEvent } from 'react';
import { api, messageOf, type Note, type Page, type User } from '../api';
import Pagination from './Pagination';

interface Props { token: string; user: User }

/** Shows private notes according to the signed-in user's permissions. */
export default function NotesPage({ token, user }: Props) {
  const [scope, setScope] = useState<'own' | 'all'>('own');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<Note> | null>(null);
  const [selected, setSelected] = useState<Note | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api<Page<Note>>(`/notes?page=${page}&per_page=10&scope=${scope}`, { token })
      .then((value) => { if (active) { setResult(value); setError(''); } })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [token, page, scope, revision]);

  function resetForm() { setEditing(null); setTitle(''); setBody(''); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api<Note>(editing ? `/notes/${editing}` : '/notes', {
        method: editing ? 'PATCH' : 'POST', token, body: { title, body },
      });
      resetForm();
      setScope('own');
      setPage(1);
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }

  async function view(note: Note) {
    try { setSelected(await api<Note>(`/notes/${note.id}`, { token })); }
    catch (reason) { setError(messageOf(reason)); }
  }

  async function remove(note: Note) {
    if (!window.confirm(`Delete “${note.title}”?`)) return;
    try {
      await api<void>(`/notes/${note.id}`, { method: 'DELETE', token });
      if (selected?.id === note.id) setSelected(null);
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
  }

  return <section className="card">
    <div className="section-head"><h2>Notes</h2>
      {user.permissions?.includes('notes.read_all') && <select aria-label="Note scope" value={scope} onChange={(event) => { setScope(event.target.value as 'own' | 'all'); setPage(1); }}>
        <option value="own">My notes</option><option value="all">Everyone’s notes</option>
      </select>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {scope === 'own' && user.permissions?.includes('notes.write') && <form className="editor" onSubmit={save}>
      <h3>{editing ? 'Edit note' : 'New note'}</h3>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} /></label>
      <label>Body<textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={4} maxLength={20000} /></label>
      <div className="actions"><button className="primary" disabled={busy}>{editing ? 'Save changes' : 'Create note'}</button>
        {editing && <button type="button" onClick={resetForm}>Cancel</button>}</div>
    </form>}
    <div className="list">
      {result?.items.length === 0 && <p className="muted">No notes on this page.</p>}
      {result?.items.map((note) => <article className="list-item" key={note.id}>
        <div><h3>{note.title}</h3><p className="muted">{new Date(note.createdAt).toLocaleString()}{scope === 'all' && ` · Owner ${note.ownerUsername ?? 'Unknown'}`}</p></div>
        <div className="actions"><button onClick={() => void view(note)}>View</button>
          {note.ownerId === user.id && user.permissions?.includes('notes.write') && <><button onClick={() => { setEditing(note.id); setTitle(note.title); setBody(note.body); }}>Edit</button>
            <button className="danger" onClick={() => void remove(note)}>Delete</button></>}</div>
      </article>)}
    </div>
    <Pagination result={result} onPageChange={setPage} />
    {selected && <div className="detail"><div className="section-head"><h3>{selected.title}</h3><button onClick={() => setSelected(null)}>Close</button></div><p className="prewrap">{selected.body}</p></div>}
  </section>;
}
