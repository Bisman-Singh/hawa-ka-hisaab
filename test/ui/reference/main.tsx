// Mounts the component reference on the dev server. ?theme=dark or ?theme=light fixes the scheme for review.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../../src/ui/App.js';
import '../../../src/ui/styles/app.css';
import { REFERENCE_VIEW } from './ReferencePage.js';

const theme = new URLSearchParams(window.location.search).get('theme');
if (theme === 'dark' || theme === 'light') {
  document.documentElement.dataset['theme'] = theme;
}
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App views={[REFERENCE_VIEW]} />
    </StrictMode>,
  );
}
