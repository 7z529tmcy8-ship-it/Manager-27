import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import PasswordGate from './components/PasswordGate';
import CrashGuard from './components/CrashGuard';
import { applySettings, probePerformance } from './settings';
import { dropRemovedData } from './game/storage';
import './styles.css';

applySettings();
probePerformance();
dropRemovedData();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <CrashGuard>
        <App />
      </CrashGuard>
    </PasswordGate>
  </StrictMode>,
);
