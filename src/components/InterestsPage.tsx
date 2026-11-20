import { useEffect, useState } from 'react';
import { api, messageOf, type InterestGroup, type Page, type User } from '../api';
import Pagination from './Pagination';

interface Props { token: string }

/** Displays the single-aggregation group view and indexed member detail pages. */
export default function InterestsPage({ token }: Props) {
  const [page, setPage] = useState(1);
  const [groups, setGroups] = useState<Page<InterestGroup> | null>(null);
  const [interest, setInterest] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [members, setMembers] = useState<Page<User> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api<Page<InterestGroup>>(`/admin/interests?page=${page}&per_page=10`, { token })
      .then((value) => { if (active) { setGroups(value); setError(''); } })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [token, page]);

  useEffect(() => {
    if (!interest) { setMembers(null); return; }
    let active = true;
    api<Page<User>>(`/admin/interests/${encodeURIComponent(interest)}/users?page=${memberPage}&per_page=10`, { token })
      .then((value) => { if (active) { setMembers(value); setError(''); } })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [token, interest, memberPage]);

  return <section className="card">
    <div className="section-head"><h2>Interest groups</h2></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="list">
      {groups?.items.length === 0 && <p className="muted">No interests found.</p>}
      {groups?.items.map((group) => <article className="list-item" key={group.interest}>
        <div><h3>{group.interest} <span className="badge">{group.memberCount}</span></h3>
          <p className="muted">Recent members: {group.members.map((member) => `${member.name} (${member.username})`).join(', ') || 'None'}</p></div>
        <button onClick={() => { setInterest(group.interest); setMemberPage(1); }}>View members</button>
      </article>)}
    </div>
    <Pagination result={groups} onPageChange={setPage} />
    {interest && <div className="detail">
      <div className="section-head"><h3>Members interested in {interest}</h3><button onClick={() => setInterest('')}>Close</button></div>
      {members?.items.length === 0 && <p className="muted">No members on this page.</p>}
      {members?.items.map((member) => <p key={member.id}>{member.username} · {member.name} · {member.email}</p>)}
      <Pagination result={members} onPageChange={setMemberPage} />
    </div>}
  </section>;
}
