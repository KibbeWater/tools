import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { HotkeysProvider } from '@tanstack/react-hotkeys';
import { router } from './router';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');

// GitHub Pages SPA trick: 404.html redirects any unknown path back to
// /tools/?_rp=<path> — we rewrite the URL here so React Router picks it up.
(function handleSpaRedirect() {
  const url = new URL(window.location.href);
  const redirected = url.searchParams.get('_rp');
  if (redirected) {
    url.searchParams.delete('_rp');
    const base = '/tools';
    const rest = redirected.replace(/^\/+/, '');
    history.replaceState(null, '', `${base}/${rest}${url.hash}`);
  }
})();

createRoot(container).render(
  <StrictMode>
    <HotkeysProvider>
      <RouterProvider router={router} />
    </HotkeysProvider>
  </StrictMode>,
);
