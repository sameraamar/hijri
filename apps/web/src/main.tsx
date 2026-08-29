import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App.tsx';
import GoatCounter from './components/GoatCounter';
import { initI18n, detectInitialLanguage } from './i18n/i18n';
import { LocationProvider } from './location/LocationContext';
import { MethodProvider } from './method/MethodContext';
import { ThemeProvider } from './theme/ThemeContext';

initI18n(detectInitialLanguage());

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Registration failures are non-fatal; the app still works online.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LocationProvider>
        <MethodProvider>
          <BrowserRouter
            basename={import.meta.env.BASE_URL}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <GoatCounter />
            <App />
          </BrowserRouter>
        </MethodProvider>
      </LocationProvider>
    </ThemeProvider>
  </StrictMode>
);
