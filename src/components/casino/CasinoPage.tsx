import { Suspense, lazy, useEffect, useState } from 'react';
import { getClubState, setClubState, useClub } from '../../clubStore';
import { SHOP, VIP, buy, casinoOf, claimDaily, claimQuest, dailyBonus, ownsExtra, questList, vipLevel } from '../../game/casino';
import { betsOf, resolveCareerBets } from '../../game/bets';
import { listCareers } from '../../game/storage';
import Icon from '../Icon';
import UtCard from '../UtCard';
import { buzz, fmt, giveXp, onWinShow, sfx, useCountUp, type WinShow } from './shared';

const Games = {
  slots: lazy(() => import('./games1').then((m) => ({ default: m.Slots }))),
  crash: lazy(() => import('./games1').then((m) => ({ default: m.Crash }))),
  plinko: lazy(() => import('./games1').then((m) => ({ default: m.Plinko }))),
  mines: lazy(() => import('./games1').then((m) => ({ default: m.Mines }))),
  roulette: lazy(() => import('./games2').then((m) => ({ default: m.Roulette }))),
  blackjack: lazy(() => import('./games2').then((m) => ({ default: m.Blackjack }))),
  wheel: lazy(() => import('./games2').then((m) => ({ default: m.Wheel }))),
  bets: lazy(() => import('./Sportsbook')),
};
type Playable = keyof typeof Games;
const GAME_NAME: Record<string, string> = { slots: 'Slots', crash: 'Crash', plinko: 'Plinko', mines: 'Minen', roulette: 'Roulette', blackjack: 'Blackjack', wheel: 'Glücksrad', bets: 'Sportwetten' };
const TILES: { id: Playable; name: string; sub: string; icon: string; hue: string; hot?: boolean }[] = [
  { id: 'slots', name: 'Stadion-Slots', sub: '10 Linien · Freispiele', icon: 'star', hue: 'gold', hot: true },
  { id: 'crash', name: 'Elfmeter-Crash', sub: 'Kassier, bevor er hält', icon: 'rocket', hue: 'pink', hot: true },
  { id: 'plinko', name: 'Torwand-Plinko', sub: 'Bis 165×', icon: 'ball', hue: 'cyan' },
  { id: 'mines', name: 'Elfmeter-Minen', sub: 'Tor oder Parade', icon: 'target', hue: 'green' },
  { id: 'roulette', name: 'Roulette', sub: 'Rückennummern 0–36', icon: 'dice', hue: 'red' },
  { id: 'blackjack', name: 'Blackjack', sub: 'Blackjack zahlt 3:2', icon: 'cards', hue: 'violet' },
  { id: 'wheel', name: 'Glücksrad', sub: 'Täglich gratis', icon: 'spark', hue: 'gold' },
];

/** Neon-Casino: Chips, Jackpot, VIP, Tagesbonus, 8 Spiele, Aufgaben und Preis-Shop. */
export default function CasinoPage({ onExit }: { onExit: () => void }) {
  const club = useClub();
  const c = casinoOf(club);
  const chips = useCountUp(c.chips);
  const jackpot = useCountUp(c.jackpot, 1200);
  const lv = vipLevel(c.vipPts);
  const next = VIP[lv + 1];
  const daily = dailyBonus(club);
  const [game, setGame] = useState<Playable | null>(null);
  const [shop, setShop] = useState(false);
  const [win, setWin] = useState<WinShow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => onWinShow(setWin), []);
  // Karriere-Wetten auswerten, deren Saison inzwischen gespielt ist
  useEffect(() => {
    const r = resolveCareerBets(getClubState(), listCareers());
    if (!r.results.length) return;
    setClubState(r.club);
    const won = r.results.filter((x) => x.win > x.bet.stake);
    if (won.length) { sfx('cash'); setToast(`Karriere-Wette gewonnen: +${fmt(won.reduce((a, x) => a + x.win, 0))}`); }
    else setToast(`${r.results.length} Karriere-Wette${r.results.length > 1 ? 'n' : ''} ausgewertet – diesmal nichts`);
  }, []);
  const recent = c.recent ?? [];
  const round = betsOf(club).round;
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);
  const quests = questList(club);
  const Game = game ? Games[game] : null;

  const claim = () => {
    const r = claimDaily(getClubState());
    if (!r.amount) return;
    setClubState(r.club);
    sfx('coin'); buzz([20, 40, 20]);
    setToast(`+${fmt(r.amount)} Chips · Tag ${daily.streak} in Folge`);
  };

  return (
    <div className="cz" role="dialog" aria-label="Neon-Casino">
      <div className="cz-scroll">
        <header className="cz-top">
          <button className="cz-round" onClick={onExit} aria-label="Zurück zum Home-Menü"><Icon name="arrow" size={20} /></button>
          <h1 className="cz-logo">Neon<span>Casino</span></h1>
          <span className="cz-chips big"><Icon name="coin" size={18} />{fmt(chips)}</span>
        </header>

        <section className="cz-jackpot" aria-label="Jackpot">
          <small>Progressiver Jackpot</small>
          <b>{fmt(jackpot)}</b>
          <span>5 Jackpot-Münzen an den Slots oder das Glücksrad – dazu eine Ikonen-Karte</span>
        </section>

        {recent.length > 0 && (
          <div className="cz-ticker" aria-label="Deine letzten Gewinne">
            <div style={{ animationDuration: `${Math.max(12, recent.length * 4)}s` }}>
              {[...recent, ...recent].map((r, i) => <span key={i}><Icon name="spark" size={14} />{GAME_NAME[r.game] ?? r.game} <b>+{fmt(r.win)}</b> <small>{r.mult.toFixed(1).replace('.', ',')}×</small></span>)}
            </div>
          </div>
        )}

        <button className="cz-hero" onClick={() => { sfx('tap'); setGame('bets'); }}>
          <span className="cz-hero-bg" aria-hidden="true" />
          <span className="cz-hero-tag"><span className="cz-live-dot" /> Live · Spieltag {round}</span>
          <b>Sportwetten</b>
          <span>Bundesliga, Premier League, LaLiga & Co. · Kombi-Boost bis +50 % · Cash-out · Wetten auf deine Karriere</span>
          <em>Jetzt tippen <Icon name="arrow" size={18} /></em>
        </button>

        <div className="cz-row2">
          <section className="cz-vip" style={{ '--vc': VIP[lv].color } as React.CSSProperties}>
            <small>VIP</small>
            <b>{VIP[lv].name}</b>
            <span className="cz-bar"><i style={{ width: `${next ? Math.min(100, ((c.vipPts - VIP[lv].min) / (next.min - VIP[lv].min)) * 100) : 100}%` }} /></span>
            <small>{next ? `${fmt(next.min - c.vipPts)} Einsatz bis ${next.name}` : 'Höchste Stufe'} · max. {fmt(VIP[lv].maxBet)}</small>
          </section>
          <button className={`cz-daily ${daily.ready ? 'ready' : ''}`} onClick={claim} disabled={!daily.ready}>
            <Icon name="gift" size={22} />
            <b>{daily.ready ? `+${fmt(daily.amount)}` : 'Morgen wieder'}</b>
            <small>Tagesbonus · Serie {daily.ready ? daily.streak : Math.max(1, c.daily?.streak ?? 1)}</small>
          </button>
        </div>

        <div className="cz-grid">
          {TILES.map((t) => (
            <button key={t.id} className={`cz-tile h-${t.hue}`} onClick={() => { sfx('tap'); setGame(t.id); }}>
              {t.hot && <em className="cz-hot">Heiß</em>}
              <span className="cz-tile-ic"><Icon name={t.icon} size={30} /></span>
              <b>{t.name}</b>
              <small>{t.sub}</small>
            </button>
          ))}
        </div>

        <h2 className="cz-h">Tagesaufgaben</h2>
        <ul className="cz-quests">
          {quests.map(({ quest, have, claimed }) => (
            <li key={quest.id} className={claimed ? 'done' : have >= quest.goal ? 'ready' : ''}>
              <span className="cz-q-text"><b>{quest.text}</b><span className="cz-bar"><i style={{ width: `${(have / quest.goal) * 100}%` }} /></span></span>
              {claimed ? <Icon name="check" size={20} /> : (
                <button disabled={have < quest.goal} onClick={() => { setClubState(claimQuest(getClubState(), quest.id)); sfx('coin'); }}>
                  +{fmt(quest.reward)}
                </button>
              )}
            </li>
          ))}
        </ul>

        <button className="cz-shop-btn" onClick={() => setShop(true)}>
          <Icon name="bag" size={22} /><span><b>Preis-Shop</b><small>Karten fürs Team, XP für deine Karriere, exklusive Wappen</small></span><Icon name="arrow" size={20} />
        </button>
        <p className="cz-foot">Nur Spielgeld – Chips lassen sich nicht kaufen und nicht auszahlen. Die Gewinnchancen stehen in jedem Spiel unter <Icon name="info" size={14} />.</p>
      </div>

      {toast && <div className="cz-toast" role="status">{toast}</div>}
      {shop && <Shop onClose={() => setShop(false)} onDone={setToast} />}
      {Game && <Suspense fallback={<div className="cz-game cz-loading" />}><Game onClose={() => setGame(null)} /></Suspense>}
      {win && <BigWinShow w={win} onClose={() => setWin(null)} />}
    </div>
  );
}

const WIN_TITLE: Record<NonNullable<WinShow['kind']>, string> = { big: 'Big Win', mega: 'Mega Win', epic: 'Epic Win', jackpot: 'Jackpot' };

/** Vollbild-Show für große Gewinne: Titel schaukelt sich hoch (Big → Mega → Epic), Betrag zählt mit Ticken, Münzregen. */
function BigWinShow({ w, onClose }: { w: WinShow; onClose: () => void }) {
  const dur = w.kind === 'jackpot' ? 3200 : w.kind === 'epic' ? 2800 : w.kind === 'mega' ? 2200 : 1500;
  const amount = useCountUp(w.amount, dur);
  const x = w.bet ? amount / w.bet : 0;
  const kind: NonNullable<WinShow['kind']> = w.kind === 'jackpot' ? 'jackpot' : x >= 50 ? 'epic' : x >= 20 ? 'mega' : 'big';
  useEffect(() => {
    sfx('fanfare'); buzz([40, 60, 40, 60, 120]);
    const ticks = setInterval(() => sfx('tick'), 70);
    const stopTicks = setTimeout(() => { clearInterval(ticks); sfx('cash'); }, dur);
    const t = setTimeout(onClose, dur + 2600);
    return () => { clearInterval(ticks); clearTimeout(stopTicks); clearTimeout(t); };
  }, [w, onClose, dur]);
  useEffect(() => { if (kind !== 'big' && kind !== 'jackpot') { sfx('revealRare'); buzz(60); } }, [kind]);
  return (
    <div className={`cz-win k-${kind}`} role="dialog" aria-label={WIN_TITLE[kind]} onClick={onClose}>
      <div className="cz-rays" aria-hidden="true" />
      <div className="cz-rain" aria-hidden="true">
        {Array.from({ length: kind === 'big' ? 24 : 44 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 12) * 0.12}s`, animationDuration: `${1.4 + (i % 5) * 0.3}s` }}><Icon name="coin" size={18 + (i % 3) * 6} /></i>)}
      </div>
      <div className="cz-win-inner">
        <h2 key={kind}>{WIN_TITLE[kind]}</h2>
        <b><Icon name="coin" size={34} />{fmt(amount)}</b>
        {w.bet ? <span className="cz-win-x">{(amount / w.bet).toFixed(1).replace('.', ',')}× Einsatz</span> : null}
        {w.card && <div className="cz-win-card"><UtCard card={w.card} size="md" shine /></div>}
        {w.card && <p>Ikonen-Karte für dein Haupt-Team!</p>}
        <small>Tippen zum Weiterspielen</small>
      </div>
    </div>
  );
}

/** Preis-Shop: Chips gegen Karten, XP und Profil-Extras. */
function Shop({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const club = useClub();
  const c = casinoOf(club);
  const lv = vipLevel(c.vipPts);
  const [got, setGot] = useState<{ card?: import('../../game/club').CollectCard; text: string } | null>(null);
  const take = (id: string) => {
    const r = buy(getClubState(), id);
    if (!r) { sfx('error'); return; }
    setClubState(r.club);
    sfx('revealRare'); buzz(40);
    if (r.card) setGot({ card: r.card, text: `${r.card.name} ist jetzt in deinem Haupt-Team-Bestand` });
    else if (r.xp) { const who = giveXp(r.xp); onDone(who ? `+${r.xp} XP für ${who}` : 'Keine aktive Karriere mit Spielertyp – XP verfallen nicht, starte eine Karriere'); }
    else onDone('Freigeschaltet – im Profil auswählbar');
  };
  return (
    <div className="cz-sheet" role="dialog" aria-label="Preis-Shop">
      <div className="cz-sheet-inner">
        <header><b>Preis-Shop</b><span className="cz-chips"><Icon name="coin" size={16} />{fmt(c.chips)}</span><button className="cz-round" onClick={onClose} aria-label="Schließen"><Icon name="close" size={18} /></button></header>
        <ul className="cz-shop">
          {SHOP.map((s) => {
            const owned = (s.kind === 'emblem' || s.kind === 'color') && ownsExtra(club, s.value);
            const vipLock = (s.kind === 'emblem' || s.kind === 'color') && (s.minVip ?? 0) > lv;
            return (
              <li key={s.id}>
                <span className="cz-shop-ic">{s.kind === 'color' ? <i style={{ background: s.value }} /> : <Icon name={s.kind === 'card' ? 'cards' : s.kind === 'xp' ? 'rise' : s.value} size={22} />}</span>
                <span className="cz-shop-text"><b>{s.name}</b><small>{vipLock ? `Ab VIP ${VIP[s.minVip!].name}` : s.text}</small></span>
                <button disabled={owned || vipLock || c.chips < s.price} onClick={() => take(s.id)}>{owned ? 'Gekauft' : fmt(s.price)}</button>
              </li>
            );
          })}
        </ul>
        {s_note}
      </div>
      {got && (
        <div className="cz-got" onClick={() => setGot(null)}>
          {got.card && <UtCard card={got.card} size="lg" shine />}
          <p>{got.text}</p>
          <small>Tippen zum Schließen</small>
        </div>
      )}
    </div>
  );
}
const s_note = <p className="cz-foot">Karten kommen in deinen Bestand und sind im Haupt-Team spielbar.</p>;
