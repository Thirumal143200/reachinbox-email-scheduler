import React from 'react';

export const LoadingState: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
          <div className="w-24 h-6 bg-gray-200 rounded-full" />
          <div className="w-28 h-4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
};
