import { useEffect, useState, type FormEvent } from 'react';
import { api, messageOf, type Page, type Post, type User } from '../api';
import Pagination from './Pagination';

interface Props { token: string | null; user: User | null; backendPending?: boolean }

/** Shows public posts and lets signed-in authors manage their own entries. */
export default function PostsPage({ token, user, backendPending = false }: Props) {
  const [page, setPage] = useState(1);
  const [authorInput, setAuthorInput] = useState('');
  const [authorReference, setAuthorReference] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [result, setResult] = useState<Page<Post> | null>(null);
  const [selected, setSelected] = useState<Post | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (backendPending) return;
    let active = true;
    const path = authorReference ? `/users/${authorReference}/posts` : '/posts';
    api<Page<Post> & { user?: Pick<User, 'name' | 'username'> }>(`${path}?page=${page}&per_page=10`)
      .then((value) => { if (active) { setResult(value); setAuthorName(value.user ? `${value.user.name} (${value.user.username})` : ''); if (value.user) setAuthorInput(value.user.username); setError(''); } })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [authorReference, page, revision, backendPending]);

  function resetForm() { setEditing(null); setTitle(''); setBody(''); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await api<Post>(editing ? `/posts/${editing}` : '/posts', {
        method: editing ? 'PATCH' : 'POST', token, body: { title, body },
      });
      resetForm();
      setAuthorReference('');
      setAuthorInput('');
      setPage(1);
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }

  async function view(post: Post) {
    try { setSelected(await api<Post>(`/posts/${post.id}`)); }
    catch (reason) { setError(messageOf(reason)); }
  }

  async function remove(post: Post) {
    if (!token || !window.confirm(`Delete “${post.title}”?`)) return;
    try {
      await api<void>(`/posts/${post.id}`, { method: 'DELETE', token });
      if (selected?.id === post.id) setSelected(null);
      setRevision((value) => value + 1);
    } catch (reason) { setError(messageOf(reason)); }
  }

  function searchAuthor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthorReference(authorInput.trim());
    setAuthorName('');
    setResult(null);
    setPage(1);
  }

  if (backendPending) return <section className="card"><h2>Public posts</h2><p className="muted">Posts will appear here after the backend is connected.</p></section>;

  return <section className="card">
    <div className="section-head"><h2>{authorReference ? `Posts by ${authorName || authorInput || 'user'}` : 'Public posts'}</h2></div>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="inline-form" onSubmit={searchAuthor}>
      <label>Username<input value={authorInput} onChange={(event) => setAuthorInput(event.target.value)} placeholder="e.g. 110001" required pattern="[0-9]{6,16}" inputMode="numeric" maxLength={16} /></label>
      <button>Find user posts</button>
      {authorReference && <button type="button" onClick={() => { setAuthorReference(''); setAuthorInput(''); setPage(1); }}>All posts</button>}
    </form>
    {token && user?.permissions?.includes('posts.write') && <form className="editor" onSubmit={save}>
      <h3>{editing ? 'Edit post' : 'New public post'}</h3>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} /></label>
      <label>Body<textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={4} maxLength={20000} /></label>
      <div className="actions"><button className="primary" disabled={busy}>{editing ? 'Save changes' : 'Publish post'}</button>
        {editing && <button type="button" onClick={resetForm}>Cancel</button>}</div>
    </form>}
    <div className="list">
      {result?.items.length === 0 && <p className="muted">No posts on this page.</p>}
      {result?.items.map((post) => <article className="list-item" key={post.id}>
        <div><h3>{post.title}</h3><p className="muted">{new Date(post.createdAt).toLocaleString()} · Author {post.authorUsername ?? 'Unknown'}</p></div>
        <div className="actions"><button onClick={() => void view(post)}>View</button>
          <button onClick={() => { setAuthorReference(post.authorUsername ?? post.authorId); setAuthorInput(post.authorUsername ?? ''); setAuthorName(''); setResult(null); setPage(1); }}>Author’s posts</button>
          {user?.id === post.authorId && user.permissions?.includes('posts.write') && <><button onClick={() => { setEditing(post.id); setTitle(post.title); setBody(post.body); }}>Edit</button>
            <button className="danger" onClick={() => void remove(post)}>Delete</button></>}</div>
      </article>)}
    </div>
    <Pagination result={result} onPageChange={setPage} />
    {selected && <div className="detail"><div className="section-head"><h3>{selected.title}</h3><button onClick={() => setSelected(null)}>Close</button></div><p className="prewrap">{selected.body}</p></div>}
  </section>;
}
