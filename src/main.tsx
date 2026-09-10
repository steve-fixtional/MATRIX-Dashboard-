import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getAppSettings, applyTheme } from './services/settingsService';

// Apply initial theme
getAppSettings().then(settings => {
  applyTheme(settings.theme);
}).catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
