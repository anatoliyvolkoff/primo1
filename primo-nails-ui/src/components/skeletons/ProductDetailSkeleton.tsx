import React from 'react';

export const ProductDetailSkeleton: React.FC = () => (
  <main className="flex-1 pt-24 sm:pt-32 pb-24">
    <div className="container-premium">
      {/* Breadcrumbs placeholder */}
      <div className="h-4 w-56 bg-muted/50 rounded-full animate-pulse mb-8" />
      {/* Back button placeholder */}
      <div className="h-9 w-36 bg-muted/40 rounded-full animate-pulse mb-12" />

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
        {/* Image panel */}
        <div className="bg-muted/30 rounded-[30px] sm:rounded-[40px] min-h-[400px] sm:min-h-[500px] lg:min-h-[700px] animate-pulse" />

        {/* Info panel */}
        <div className="flex flex-col gap-6">
          <div className="h-4 w-20 bg-muted/50 rounded-full animate-pulse" />
          <div className="h-14 w-4/5 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-4 w-1/2 bg-muted/30 rounded-full animate-pulse" />
          <div className="h-10 w-36 bg-muted/50 rounded-lg animate-pulse mt-2" />

          {/* Swatches */}
          <div className="flex gap-3 mt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-14 h-14 rounded-[14px] bg-muted/50 animate-pulse" />
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="h-16 w-40 bg-muted/40 rounded-full animate-pulse" />
            <div className="h-16 flex-1 bg-muted/50 rounded-full animate-pulse" />
          </div>

          {/* Accordion placeholders */}
          <div className="mt-8 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 w-full bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </main>
);
