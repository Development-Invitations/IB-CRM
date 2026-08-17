import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LocaleProvider } from './lib/i18n';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { installWebviewHardening } from './lib/hardenWebview';
import { initZoom } from './lib/zoom';
import './styles/theme.css';

installWebviewHardening();
initZoom();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <ToastProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  </React.StrictMode>
);
