import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// A child that throws during render, to trip the boundary.
const Boom = () => {
  throw new Error('kaboom');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; silence the expected noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its fallback (no white-screen) when a child throws OUTSIDE a LanguageProvider', () => {
    // The app's catch-all ErrorBoundary sits OUTSIDE LanguageProvider, so the
    // fallback must not depend on the language context (which throws when absent).
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // English fallback copy is shown when no provider is present.
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
