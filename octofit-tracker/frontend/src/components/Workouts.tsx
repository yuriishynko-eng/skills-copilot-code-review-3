import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { LoadState } from './LoadState.js';

type Suggestion = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason: string };

// Demo user from the seed data; a real app would use the signed-in user.
const DEFAULT_USER_EMAIL = 'mona@example.com';

export default function Workouts({ userEmail = DEFAULT_USER_EMAIL }: { userEmail?: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then((data) => active && setSuggestions(data.suggestions))
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userEmail]);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <LoadState label="workout suggestions" loading={loading} error={error} empty={suggestions.length === 0} emptyText="No workout suggestions yet." />
        {!loading && !error && suggestions.length > 0 && (
          <ul className="list-group">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion._id ?? index} className="list-group-item">
                <h3 className="h6 mb-1">{suggestion.title}</h3>
                <p className="mb-0 small text-muted">{suggestion.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
