import { useState } from 'react';
import CreateCareer from './components/CreateCareer';
import Game from './components/Game';
import Home from './components/Home';
import { saveCareer } from './game/storage';
import type { Career } from './game/types';

type Screen = { name: 'home' } | { name: 'create' } | { name: 'game'; career: Career };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [saveFailed, setSaveFailed] = useState(false);

  const update = (career: Career) => {
    setSaveFailed(!saveCareer(career));
    setScreen({ name: 'game', career });
  };

  return (
    <div className="app">
      {saveFailed && (
        <div className="banner warn">Speichern im Browser nicht möglich (z. B. privater Modus) – der Fortschritt geht beim Schließen verloren.</div>
      )}
      {screen.name === 'home' && (
        <Home onNew={() => setScreen({ name: 'create' })} onLoad={(career) => setScreen({ name: 'game', career })} />
      )}
      {screen.name === 'create' && <CreateCareer onCancel={() => setScreen({ name: 'home' })} onCreate={update} />}
      {screen.name === 'game' && (
        <Game career={screen.career} onChange={update} onExit={() => setScreen({ name: 'home' })} />
      )}
    </div>
  );
}
