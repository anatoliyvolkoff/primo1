import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initSentry} from './lib/sentry';

// Init Sentry before React mounts so even render-time crashes get
// captured. No-op when VITE_SENTRY_DSN isn't set.
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
