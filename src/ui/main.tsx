// Browser entry: sets zod up first, then loads the styles and mounts the app into the root element.
import './zod-setup.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles/app.css';

/** Mounts the app into the element with the given id. It throws if the element is missing. */
export function mount(rootId: string): void {
  const root = document.getElementById(rootId);
  if (!root) {
    throw new Error(`No element with id ${rootId}`);
  }
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

mount('root');
