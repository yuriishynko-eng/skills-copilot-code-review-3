type Props = { label: string; loading: boolean; error: string | null; empty: boolean; emptyText: string };

// Shared accessible loading, error and empty state messages.
export function LoadState({ label, loading, error, empty, emptyText }: Props) {
  if (loading) return <p role="status" className="text-muted">Loading {label}…</p>;
  if (error) return <div role="alert" className="alert alert-danger">Unable to load {label}: {error}</div>;
  if (empty) return <p className="text-muted">{emptyText}</p>;
  return null;
}
