import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App.tsx';
import { initI18n } from './i18n/i18n';
import { LocationProvider } from './location/LocationContext';
import { MethodProvider } from './method/MethodContext';
import { ThemeProvider } from './theme/ThemeContext';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icon paths broken by bundlers (Vite/Webpack).
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

initI18n('en');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LocationProvider>
        <MethodProvider>
          <BrowserRouter
            basename={import.meta.env.BASE_URL}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <App />
          </BrowserRouter>
        </MethodProvider>
      </LocationProvider>
    </ThemeProvider>
  </StrictMode>
);
