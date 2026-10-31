import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { LoadState } from './LoadState.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then((data) => active && setEntries(data.leaderboard))
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Leaderboard</h2>
        <LoadState label="leaderboard" loading={loading} error={error} empty={entries.length === 0} emptyText="No leaderboard scores yet." />
        {!loading && !error && entries.length > 0 && (
          <table className="table">
            <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.teamName}><td>#{entry.rank}</td><td>{entry.teamName}</td><td>{entry.totalPoints}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
