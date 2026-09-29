import { useState } from 'react';
import CreateCareer from './components/CreateCareer';
import Game from './components/Game';
import Achievements from './components/Achievements';
import HallOfFame from './components/HallOfFame';
import Home from './components/Home';
import { saveCareer } from './game/storage';
import type { Career } from './game/types';

type Screen = { name: 'home' } | { name: 'create' } | { name: 'fame' } | { name: 'achievements' } | { name: 'game'; career: Career; casino?: boolean };

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
        <Home
          onNew={() => setScreen({ name: 'create' })}
          onFame={() => setScreen({ name: 'fame' })}
          onAchievements={() => setScreen({ name: 'achievements' })}
          onLoad={(career) => setScreen({ name: 'game', career })}
          onCasino={(career) => setScreen({ name: 'game', career, casino: true })}
        />
      )}
      {screen.name === 'achievements' && <Achievements onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'fame' && (
        <HallOfFame onBack={() => setScreen({ name: 'home' })} onOpen={(career) => setScreen({ name: 'game', career })} />
      )}
      {screen.name === 'create' && <CreateCareer onCancel={() => setScreen({ name: 'home' })} onCreate={update} />}
      {screen.name === 'game' && (
        <Game career={screen.career} openCasino={screen.casino} onChange={update} onExit={() => setScreen({ name: 'home' })} />
      )}
    </div>
  );
}
