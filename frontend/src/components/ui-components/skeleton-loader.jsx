'use client';

/**
 * SkeletonLoader - Reusable skeleton/placeholder component for loading states
 * Use during data fetching to prevent white flashes and improve perceived performance
 */

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-lg bg-neutral-200 animate-pulse ${className}`} />
  );
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={className}>
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-neutral-200 rounded animate-pulse ${i > 0 ? 'mt-2' : ''}`}
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ columns = 3, count = 6, height = '200px' }) {
  return (
    <div className={`grid gap-4 grid-cols-${columns}`}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-neutral-200 rounded-lg animate-pulse"
          style={{ height }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = '40px', className = '' }) {
  return (
    <div
      className={`bg-neutral-200 rounded-full animate-pulse ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-neutral-100">
      <SkeletonAvatar size="40px" />
      <div className="flex-1">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="80px" />
        <div className="flex-1">
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {[...Array(columns)].map((_, colIdx) => (
            <div
              key={colIdx}
              className="flex-1 h-6 bg-neutral-200 rounded animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonTabs() {
  return (
    <div className="flex gap-4 border-b border-neutral-200 mb-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="h-6 w-24 bg-neutral-200 rounded animate-pulse"
        />
      ))}
    </div>
  );
}

export function SlideshowSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard className="h-96 w-full rounded-2xl" />
      <div className="space-y-3">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function ConstellationSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard className="h-[400px] w-full rounded-2xl" />
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="h-10 flex-1 rounded" />
        ))}
      </div>
    </div>
  );
}

export function VoicesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-4">
          <SkeletonCard className="h-48 w-full rounded-xl" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}

export function PhotoArchiveSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} className="h-10 flex-1 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(12)].map((_, i) => (
          <SkeletonCard key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}


