import type { Page } from '../api';

interface Props {
  result: Page<unknown> | null;
  onPageChange: (page: number) => void;
}

/** Keeps list navigation consistent across all paginated API views. */
export default function Pagination({ result, onPageChange }: Props) {
  if (!result) return null;
  return (
    <div className="pagination">
      <button disabled={result.page <= 1} onClick={() => onPageChange(result.page - 1)}>Previous</button>
      <span>Page {result.page} of {Math.max(result.pages, 1)} · {result.total} total</span>
      <button disabled={result.page >= result.pages} onClick={() => onPageChange(result.page + 1)}>Next</button>
    </div>
  );
}
