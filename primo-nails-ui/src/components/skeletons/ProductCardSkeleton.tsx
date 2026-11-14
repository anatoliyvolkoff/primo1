import React from 'react';

export const ProductCardSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="bg-black/[0.05] rounded-[16px] sm:rounded-[24px] overflow-hidden flex flex-col w-full min-h-[280px] sm:min-h-[400px] lg:min-h-[500px]"
  >
    <div className="relative h-[150px] sm:h-[220px] lg:h-[280px] px-2 sm:px-4 pt-4 sm:pt-8">
      <div className="w-full h-full bg-muted/50 rounded-[16px] animate-pulse" />
    </div>
    <div className="px-3 sm:px-5 lg:px-6 pb-4 sm:pb-6 lg:pb-8 pt-2 flex-grow flex flex-col items-center gap-3 sm:gap-4">
      <div className="w-3/4 h-6 bg-muted/50 rounded-full animate-pulse" />
      <div className="w-1/2 h-3 bg-muted/30 rounded-full animate-pulse" />
      <div className="flex gap-2 mt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-7 h-7 rounded-full bg-muted/50 animate-pulse" />
        ))}
      </div>
      <div className="w-full h-12 bg-muted/50 rounded-full animate-pulse mt-auto" />
    </div>
  </div>
);
