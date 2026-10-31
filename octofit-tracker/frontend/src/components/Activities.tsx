import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { LoadState } from './LoadState.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then((data) => active && setActivities(data.activities))
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Activities</h2>
        <LoadState label="activities" loading={loading} error={error} empty={activities.length === 0} emptyText="No activities logged yet." />
        {!loading && !error && activities.length > 0 && (
          <table className="table table-striped">
            <thead><tr><th scope="col">Type</th><th scope="col">Minutes</th><th scope="col">Points</th></tr></thead>
            <tbody>
              {activities.map((activity, index) => (
                <tr key={activity._id ?? index}><td>{activity.type}</td><td>{activity.minutes}</td><td>{activity.points}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
