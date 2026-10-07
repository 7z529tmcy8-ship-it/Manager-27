import { useEffect, useRef, useState } from 'react';
import CreateCareer from './components/CreateCareer';
import CareerScreen from './components/CareerScreen';
import Achievements from './components/Achievements';
import Collection from './components/Collection';
import HallOfFame from './components/HallOfFame';
import Hub from './components/Hub';
import Store from './components/Store';
import Team from './components/Team';
import Trade from './components/Trade';
import UpdateBanner, { unseenUpdates } from './components/UpdateBanner';
import { UPDATES, type UpdateNote } from './data/updates';
import { creditCareer } from './game/club';
import { saveCareer } from './game/storage';
import type { Career } from './game/types';
import { getClubState, setClubState, useClub } from './clubStore';
import { installClickSound, play } from './sound';

type Screen =
  | { name: 'home' }
  | { name: 'store' }
  | { name: 'collection' }
  | { name: 'team' }
  | { name: 'trade' }
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

  // Sounds: Klick bei jedem Knopf, Münzen beim Verdienen, Kasse beim Ausgeben.
  useEffect(() => installClickSound(), []);
  const coins = useClub().coins;
  const lastCoins = useRef(coins);
  useEffect(() => {
    if (coins === lastCoins.current) return;
    play(coins > lastCoins.current ? 'coin' : 'spend');
    lastCoins.current = coins;
  }, [coins]);

  // Update-Banner: erscheint einmal nach jedem neuen Update (und auf Wunsch über „Neuigkeiten“).
  const [news, setNews] = useState<UpdateNote[]>(unseenUpdates);

  const update = (next: Career) => {
    let career = next;
    // Neue Saisons bringen Coins für den Club.
    const res = creditCareer(getClubState(), career);
    if (res.gained > 0 || res.icon) {
      setClubState(res.club);
      const coins = res.gained > 0 ? `+${res.gained.toLocaleString('de-DE')} Coins ${res.seasons === 0 ? 'aus Familie & Vermögen' : res.seasons === 1 ? 'für die Saison' : `für ${res.seasons} Saisons`}` : '';
      setToast(res.icon ? `👑 Deine Ikonen-Karte (${res.icon.ovr}) liegt in der Sammlung!${coins ? ` ${coins}` : ''}` : coins);
    }
    // Verborgene Abhängigkeit: Das ganze Geld ist weg – ohne Erklärung.
    if (career.drainPending) {
      const lost = getClubState().coins;
      if (lost > 0) {
        setClubState({ ...getClubState(), coins: 0 });
        setToast(`💸 Dein Konto ist leer (−${lost.toLocaleString('de-DE')} Coins). Wo ist das ganze Geld nur hin …?`);
      }
      career = { ...career, drainPending: 0, squandered: (career.squandered ?? 0) + lost };
    }
    setSaveFailed(!saveCareer(career));
    setScreen({ name: 'game', career });
  };
  const home = () => setScreen({ name: 'home' });
  const load = (career: Career) => setScreen({ name: 'game', career });

  return (
    <div className="app">
      {news.length > 0 && <UpdateBanner notes={news} onClose={() => setNews([])} />}
      {saveFailed && (
        <div className="banner warn">Speichern im Browser nicht möglich (z. B. privater Modus) – der Fortschritt geht beim Schließen verloren.</div>
      )}
      {toast && <div className="coin-toast" role="status">🪙 {toast}</div>}
      {screen.name === 'home' && (
        <Hub
          onNews={() => setNews(UPDATES)}
          onNew={() => setScreen({ name: 'create' })}
          onLoad={load}
          onStore={() => setScreen({ name: 'store' })}
          onCollection={() => setScreen({ name: 'collection' })}
          onTeam={() => setScreen({ name: 'team' })}
          onTrade={() => setScreen({ name: 'trade' })}
          onFame={() => setScreen({ name: 'fame' })}
          onAchievements={() => setScreen({ name: 'achievements' })}
        />
      )}
      {screen.name === 'store' && <Store onBack={home} onCollection={() => setScreen({ name: 'collection' })} />}
      {screen.name === 'collection' && <Collection onBack={home} onStore={() => setScreen({ name: 'store' })} />}
      {screen.name === 'team' && <Team onBack={home} onStore={() => setScreen({ name: 'store' })} />}
      {screen.name === 'trade' && <Trade onBack={home} onCollection={() => setScreen({ name: 'collection' })} />}
      {screen.name === 'achievements' && <Achievements onBack={home} />}
      {screen.name === 'fame' && <HallOfFame onBack={home} onOpen={load} />}
      {screen.name === 'create' && <CreateCareer onCancel={home} onCreate={update} />}
      {screen.name === 'game' && (
        <CareerScreen career={screen.career} onChange={update} onExit={home} />
      )}
    </div>
  );
}
