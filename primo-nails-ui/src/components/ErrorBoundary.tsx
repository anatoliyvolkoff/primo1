import React, { useContext } from 'react';
import * as Sentry from '@sentry/react';
import { LanguageContext } from '../context/LanguageContext';

// English fallback copy for the case where the boundary catches an error from
// OUTSIDE the LanguageProvider — mirrors i18n/en.ts `errorBoundary.*`. The
// fallback must never itself depend on a context that may be absent, or it
// would throw during render and blank the whole page.
const EN_FALLBACK: Record<string, string> = {
  'errorBoundary.eyebrow': 'Error',
  'errorBoundary.title': 'Something went wrong.',
  'errorBoundary.body':
    'An unexpected error occurred. Please try reloading the page or returning home.',
  'errorBoundary.reload': 'Reload',
  'errorBoundary.retry': 'Try again',
};

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  // Read the context directly (no throw) so this works even when rendered
  // above the LanguageProvider; fall back to English when it's absent.
  const ctx = useContext(LanguageContext);
  const t = (key: string): string =>
    ctx ? ctx.t(key as never) : EN_FALLBACK[key] ?? key;
  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center bg-background px-6"
    >
      <div className="max-w-md text-center space-y-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
          {t('errorBoundary.eyebrow')}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t('errorBoundary.title')}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('errorBoundary.body')}
        </p>
        {error?.message && (
          <pre className="text-[11px] text-left bg-muted/50 rounded-xl p-4 overflow-x-auto text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-12 px-6 bg-foreground text-background rounded-full text-xs font-bold uppercase tracking-widest hover:bg-foreground/90 transition-colors"
          >
            {t('errorBoundary.reload')}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="h-12 px-6 border border-border rounded-full text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors"
          >
            {t('errorBoundary.retry')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Forward to Sentry with the React component-stack attached as a
    // context so the UI on Sentry's issue page shows where in the
    // tree the error bubbled up from. No-op if Sentry isn't initialised.
    Sentry.withScope((scope) => {
      scope.setExtras({ componentStack: errorInfo.componentStack });
      Sentry.captureException(error);
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return <ErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}
