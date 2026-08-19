interface SkeletonProps { className?: string; }

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-xl bg-dark-700 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <Skeleton className="h-9 w-9 rounded-xl" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {Array(6).fill(0).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return <>{Array(rows).fill(0).map((_, i) => <SkeletonRow key={i} />)}</>;
}
