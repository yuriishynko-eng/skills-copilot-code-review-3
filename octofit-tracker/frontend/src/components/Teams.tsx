import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { LoadState } from './LoadState.js';

type Team = { _id?: string; name: string; mascot?: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => active && setTeams(data.teams))
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <LoadState label="teams" loading={loading} error={error} empty={teams.length === 0} emptyText="No teams created yet." />
        {!loading && !error && teams.length > 0 && (
          <ul className="list-group">
            {teams.map((team, index) => (
              <li key={team._id ?? index} className="list-group-item d-flex justify-content-between">
                <span className="fw-semibold">{team.name}</span>
                <span className="badge text-bg-secondary" aria-label={`${team.members.length} members`}>{team.members.length} members</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
