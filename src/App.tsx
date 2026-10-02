import { useEffect, useState } from 'react';
import CreateCareer from './components/CreateCareer';
import CareerScreen from './components/CareerScreen';
import Achievements from './components/Achievements';
import Collection from './components/Collection';
import HallOfFame from './components/HallOfFame';
import Hub from './components/Hub';
import Store from './components/Store';
import { creditCareer } from './game/club';
import { saveCareer } from './game/storage';
import type { Career } from './game/types';
import { getClubState, setClubState } from './clubStore';

type Screen =
  | { name: 'home' }
  | { name: 'store' }
  | { name: 'collection' }
  | { name: 'create' }
  | { name: 'fame' }
  | { name: 'achievements' }
  | { name: 'game'; career: Career };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [saveFailed, setSaveFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (career: Career) => {
    setSaveFailed(!saveCareer(career));
    // Neue Saisons bringen Coins für den Club.
    const res = creditCareer(getClubState(), career);
    if (res.gained > 0) {
      setClubState(res.club);
      setToast(`+${res.gained.toLocaleString('de-DE')} Coins für ${res.seasons === 1 ? 'die Saison' : `${res.seasons} Saisons`}`);
    }
    setScreen({ name: 'game', career });
  };
  const home = () => setScreen({ name: 'home' });
  const load = (career: Career) => setScreen({ name: 'game', career });

  return (
    <div className="app">
      {saveFailed && (
        <div className="banner warn">Speichern im Browser nicht möglich (z. B. privater Modus) – der Fortschritt geht beim Schließen verloren.</div>
      )}
      {toast && <div className="coin-toast" role="status">🪙 {toast}</div>}
      {screen.name === 'home' && (
        <Hub
          onNew={() => setScreen({ name: 'create' })}
          onLoad={load}
          onStore={() => setScreen({ name: 'store' })}
          onCollection={() => setScreen({ name: 'collection' })}
          onFame={() => setScreen({ name: 'fame' })}
          onAchievements={() => setScreen({ name: 'achievements' })}
        />
      )}
      {screen.name === 'store' && <Store onBack={home} onCollection={() => setScreen({ name: 'collection' })} />}
      {screen.name === 'collection' && <Collection onBack={home} onStore={() => setScreen({ name: 'store' })} />}
      {screen.name === 'achievements' && <Achievements onBack={home} />}
      {screen.name === 'fame' && <HallOfFame onBack={home} onOpen={load} />}
      {screen.name === 'create' && <CreateCareer onCancel={home} onCreate={update} />}
      {screen.name === 'game' && (
        <CareerScreen career={screen.career} onChange={update} onExit={home} />
      )}
    </div>
  );
}
