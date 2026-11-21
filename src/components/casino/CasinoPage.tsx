import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../../clubStore';
import { CASHOUT_MIN, CASHOUT_RATE, CHIP_PACKS, REFILL, SHOP, VIP, buy, buyChips, cashOutChips, casinoOf, claimDaily, claimQuest, claimRefill, dailyBonus, casinoLevel, levelReward, cashback, claimCashback, giftSpins, tourBoard, tourReward, claimTour, weekEnds, TOUR_MIN_BET, TOUR_PRIZES, happyHour, boxesReady, roundsToBox, openBox, BOX_ODDS, BOX_EVERY, DROP_CHANCE, DROP_TABLE, type BoxPrize, ownsExtra, questList, refillState, vipLevel } from '../../game/casino';
import { betsOf, resolveCareerBets } from '../../game/bets';
import { listCareers } from '../../game/storage';
import Icon from '../Icon';
import UtCard from '../UtCard';
import { buzz, celebrate, fmt, giveXp, onCasinoExtra, onOpenBank, onWinShow, openBank, sfx, useCountUp, type CasinoExtra, type WinShow } from './shared';

const Games = {
  slots: lazy(() => import('./games1').then((m) => ({ default: m.Slots }))),
  crash: lazy(() => import('./games1').then((m) => ({ default: m.Crash }))),
  plinko: lazy(() => import('./plinko')),
  mines: lazy(() => import('./games1').then((m) => ({ default: m.Mines }))),
  roulette: lazy(() => import('./games2').then((m) => ({ default: m.Roulette }))),
  blackjack: lazy(() => import('./games2').then((m) => ({ default: m.Blackjack }))),
  wheel: lazy(() => import('./games2').then((m) => ({ default: m.Wheel }))),
  bets: lazy(() => import('./Sportsbook')),
  scratch: lazy(() => import('./scratch')),
};
type Playable = keyof typeof Games;
const GAME_NAME: Record<string, string> = { slots: 'Slots', crash: 'Crash', plinko: 'Plinko', mines: 'Minen', roulette: 'Roulette', blackjack: 'Blackjack', wheel: 'Glücksrad', bets: 'Sportwetten', scratch: 'Rubbellos' };
const TILES: { id: Playable; name: string; sub: string; icon: string; hue: string; hot?: boolean }[] = [
  { id: 'slots', name: 'Stadion-Slots', sub: '10 Linien · Freispiele', icon: 'star', hue: 'gold', hot: true },
  { id: 'crash', name: 'Elfmeter-Crash', sub: 'Kassier, bevor er hält', icon: 'rocket', hue: 'pink', hot: true },
  { id: 'plinko', name: 'Torwand-Plinko', sub: 'Bis 10.000× · Goldbälle', icon: 'ball', hue: 'cyan', hot: true },
  { id: 'mines', name: 'Elfmeter-Minen', sub: 'Tor oder Parade', icon: 'target', hue: 'green' },
  { id: 'roulette', name: 'Roulette', sub: 'Rückennummern 0–36', icon: 'dice', hue: 'red' },
  { id: 'blackjack', name: 'Blackjack', sub: 'Blackjack zahlt 3:2', icon: 'cards', hue: 'violet' },
  { id: 'scratch', name: 'Rubbellos', sub: 'Freirubbeln · bis 500×', icon: 'ticket', hue: 'green', hot: true },
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
  const [bank, setBank] = useState(false);
  useEffect(() => onOpenBank(() => setBank(true)), []);
  // Karriere-Wetten auswerten, deren Saison inzwischen gespielt ist
  useEffect(() => {
    const r = resolveCareerBets(getClubState(), listCareers());
    if (!r.results.length) return;
    setClubState(r.club);
    const won = r.results.filter((x) => x.win > x.bet.stake);
    if (won.length) { sfx('cash'); setToast(`Karriere-Wette gewonnen: +${fmt(won.reduce((a, x) => a + x.win, 0))}`); }
  }, []);
  const recent = c.recent ?? [];
  const round = betsOf(club).round;
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);
  const quests = questList(club);
  const lvl = casinoLevel(c.vipPts);
  const cb = cashback(club);
  const gift = giftSpins(club);
  const board = tourBoard(club);
  const tourWin = tourReward(club);
  // Level-Aufstieg feiern (Belohnung ist beim Einsatz schon gutgeschrieben)
  const lastLvl = useRef(lvl.level);
  const [lvUp, setLvUp] = useState<number | null>(null);
  useEffect(() => {
    if (lvl.level > lastLvl.current) {
      setLvUp(lvl.level); sfx('levelUp'); buzz([30, 40, 30, 40, 80]);
      const t = setTimeout(() => setLvUp(null), 2600);
      lastLvl.current = lvl.level;
      return () => clearTimeout(t);
    }
    lastLvl.current = lvl.level;
  }, [lvl.level]);
  // Im Spiel: Navigationsleiste ausblenden, damit sie keine Knöpfe verdeckt
  useEffect(() => { document.documentElement.classList.toggle('in-casino-game', !!game); return () => document.documentElement.classList.remove('in-casino-game'); }, [game]);
  const happy = happyHour();
  const boxes = boxesReady(club);
  const [box, setBox] = useState<BoxPrize | null>(null);
  const openMystery = () => { const r = openBox(getClubState()); if (!r) return; setClubState(r.club); setBox(r.prize); sfx(r.prize.kind === 'card' && r.prize.tier !== 'gold' ? 'walkout' : 'revealRare'); buzz([40, 30, 80]); };
  const [extra, setExtra] = useState<CasinoExtra | null>(null);
  useEffect(() => onCasinoExtra((e) => { setExtra(e); if (e.kind === 'drop') celebrate(e.mult); }), []);
  useEffect(() => { if (!extra) return; const t = setTimeout(() => setExtra(null), 2600); return () => clearTimeout(t); }, [extra]);
  const hhLeft = Math.max(0, (happy.active ? happy.endsAt : happy.nextAt) - Date.now());
  const hhTxt = hhLeft > 3_600_000 ? `${Math.floor(hhLeft / 3_600_000)} Std ${Math.floor((hhLeft % 3_600_000) / 60_000)} Min` : `${Math.floor(hhLeft / 60_000)} Min`;
  const claimCb = () => { const r = claimCashback(getClubState()); if (!r.amount) return; setClubState(r.club); sfx('cash'); buzz([20, 40, 20]); setToast(`Cashback: +${fmt(r.amount)} Chips`); };
  const claimT = () => { const r = claimTour(getClubState()); if (!r.prize) return; setClubState(r.club); sfx('fanfare'); setToast(`Turnier Platz ${r.rank}: +${fmt(r.prize)} Chips`); };
  const left = Math.max(0, weekEnds() - Date.now());
  const leftTxt = left > 86_400_000 ? `${Math.floor(left / 86_400_000)} T ${Math.floor((left % 86_400_000) / 3_600_000)} Std` : `${Math.floor(left / 3_600_000)} Std ${Math.floor((left % 3_600_000) / 60_000)} Min`;
  const Game = game ? Games[game] : null;
  // Casino scrollt mit der Seite (feste Ebenen mit eigenem Scrollbereich scrollen im iPad-Vollbild nicht).
  const hubY = useRef(0);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('in-casino');
    window.scrollTo(0, 0);
    return () => { root.classList.remove('in-casino'); window.scrollTo(0, 0); };
  }, []);
  const openGame = (g: Playable) => { hubY.current = window.scrollY; setGame(g); window.scrollTo(0, 0); };
  const closeGame = () => { setGame(null); requestAnimationFrame(() => window.scrollTo(0, hubY.current)); };

  const claim = () => {
    const r = claimDaily(getClubState());
    if (!r.amount) return;
    setClubState(r.club);
    sfx('coin'); buzz([20, 40, 20]);
    setToast(`+${fmt(r.amount)} Chips · Tag ${daily.streak} in Folge`);
  };

  return (
    <div className="cz" role="dialog" aria-label="Neon-Casino">
      {!Game && <div className="cz-scroll">
        <header className="cz-top">
          <button className="cz-round" onClick={onExit} aria-label="Zurück zum Home-Menü"><Icon name="arrow" size={20} /></button>
          <h1 className="cz-logo">Neon<span>Casino</span></h1>
          <button className="cz-chips big" onClick={openBank} aria-label="Chip-Kasse öffnen"><Icon name="coin" size={18} />{fmt(chips)}<Icon name="plus" size={16} /></button>
        </header>

        <section className="cz-level" aria-label="Casino-Level">
          <span className="cz-level-badge"><small>Lv</small>{lvl.level}</span>
          <span className="cz-level-main">
            <span className="cz-bar"><i style={{ width: `${lvl.pct}%` }} /></span>
            <small>Noch {fmt(lvl.to - c.vipPts)} Einsatz bis Level {lvl.level + 1} · Belohnung <b>+{fmt(levelReward(lvl.level + 1))}</b></small>
          </span>
        </section>

        <div className={`cz-happy ${happy.active ? 'on' : ''}`} role="status">
          <Icon name="bolt" size={18} />
          {happy.active ? <span><b>Happy Hour!</b> Doppelte Level- und VIP-Punkte · noch {hhTxt}</span> : <span>Nächste Happy Hour (doppelte Punkte) in <b>{hhTxt}</b></span>}
        </div>

        <section className="cz-bonus" aria-label="Bonus-Center">
            <button className={`cz-bonus-card b-box ${boxes ? '' : 'wait'}`} onClick={openMystery} disabled={!boxes}>
              <Icon name="gift" size={24} /><b>{boxes ? `${boxes > 1 ? `${boxes}× ` : ''}Mystery-Box` : 'Mystery-Box'}</b>
              <small>{boxes ? 'Jetzt öffnen!' : `noch ${roundsToBox(club)} Runden`}</small>
              {!boxes && <span className="cz-bar"><i style={{ width: `${((BOX_EVERY - roundsToBox(club)) / BOX_EVERY) * 100}%` }} /></span>}
            </button>
        {(cb.ready || tourWin || gift.left > 0) && (<>
            {cb.ready && <button className="cz-bonus-card b-cb" onClick={claimCb}><Icon name="rewind" size={24} /><b>+{fmt(cb.amount)}</b><small>Cashback {Math.round(cb.pct * 100)} % von gestern</small></button>}
            {tourWin && <button className="cz-bonus-card b-tour" onClick={claimT}><Icon name="trophy" size={24} /><b>+{fmt(tourWin.prize)}</b><small>Turnier · Platz {tourWin.rank}</small></button>}
            {gift.left > 0 && <button className="cz-bonus-card b-gift" onClick={() => { sfx('tap'); openGame('slots'); }}><Icon name="star" size={24} /><b>{gift.left} Gratis-Drehs</b><small>Slots · je {fmt(gift.bet)} Einsatz</small></button>}
        </>)}
        </section>

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

        <button className="cz-hero" onClick={() => { sfx('tap'); openGame('bets'); }}>
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
            <small className="cz-vip-perk">{lv >= 3 ? `Eigene Kartenbilder: ${lv >= 4 ? 10 : 3} Plätze` : 'Ab Platin: eigene Bilder für deine Karten'}</small>
          </section>
          <button className={`cz-daily ${daily.ready ? 'ready' : ''}`} onClick={claim} disabled={!daily.ready}>
            <Icon name="gift" size={22} />
            <b>{daily.ready ? `+${fmt(daily.amount)}` : 'Morgen wieder'}</b>
            <small>Tagesbonus · Serie {daily.ready ? daily.streak : Math.max(1, c.daily?.streak ?? 1)}</small>
          </button>
        </div>

        <div className="cz-grid">
          {TILES.map((t) => (
            <button key={t.id} className={`cz-tile h-${t.hue}`} onClick={() => { sfx('tap'); openGame(t.id); }}>
              {t.hot && <em className="cz-hot">Heiß</em>}
              <span className="cz-tile-ic"><Icon name={t.icon} size={30} /></span>
              <b>{t.name}</b>
              <small>{t.sub}</small>
            </button>
          ))}
        </div>

        <section className="cz-tour" aria-label="Wochen-Turnier">
          <header><b><Icon name="trophy" size={20} /> Wochen-Turnier</b><small>endet in {leftTxt}</small></header>
          <p>Höchster Gewinn-Multiplikator der Woche (ab {TOUR_MIN_BET} Einsatz) – gegen Computer-Gegner. Platz 1: {fmt(TOUR_PRIZES[0])} Chips.</p>
          <ol>
            {board.rows.slice(0, 5).map((r, i) => (
              <li key={r.name} className={r.me ? 'me' : ''}><i>{i + 1}</i><span>{r.name}</span><b>{r.best ? `${r.best.toFixed(1).replace('.', ',')}×` : '–'}</b><em>{fmt(TOUR_PRIZES[i])}</em></li>
            ))}
            {board.rank > 5 && <li className="me"><i>{board.rank}</i><span>Du</span><b>{board.rows[board.rank - 1].best ? `${board.rows[board.rank - 1].best.toFixed(1).replace('.', ',')}×` : '–'}</b><em>{board.prize ? fmt(board.prize) : '–'}</em></li>}
          </ol>
        </section>

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
        <p className="cz-foot">Drops & Wins: in jeder Runde mit Einsatz 1 zu {Math.round(1 / DROP_CHANCE)} Chance auf einen Bonus von {DROP_TABLE.map(([m]) => `${m}×`).join(' / ')} Einsatz. Glücks-Serie: 3, 5, 7 und 10 Gewinne in Folge bringen Extra-Chips. Mystery-Box alle {BOX_EVERY} Runden: {BOX_ODDS.map((o) => `${o.label} ${o.w} %`).join(' · ')}.</p>
        <p className="cz-foot">Nur Spielgeld – Chips gibt es gegen Spiel-Coins in der Chip-Kasse, nicht für echtes Geld. Die Gewinnchancen stehen in jedem Spiel unter <Icon name="info" size={14} />.</p>
      </div>}

      {toast && <div className="cz-toast" role="status">{toast}</div>}
      {shop && <Shop onClose={() => setShop(false)} onDone={setToast} />}
      {Game && <Suspense fallback={<div className="cz-game cz-loading" />}><Game onClose={closeGame} /></Suspense>}
      {bank && <Bank onClose={() => setBank(false)} onDone={setToast} />}
      {win && <BigWinShow w={win} onClose={() => setWin(null)} />}
      {extra && (
        <div className={`cz-extra ${extra.kind}`} role="status">
          {extra.kind === 'drop' ? <><small>Drops & Wins</small><b>Drop! {extra.mult}×</b><span>+{fmt(extra.amount)} Chips</span></> : <><small>Glücks-Serie</small><b>{extra.n} in Folge!</b><span>+{fmt(extra.bonus)} Chips</span></>}
        </div>
      )}
      {box && (
        <div className="cz-boxshow" role="dialog" aria-modal="true" aria-label="Mystery-Box" onClick={() => setBox(null)}>
          <div className="cz-boxshow-in" onClick={(e) => e.stopPropagation()}>
            <small>Mystery-Box</small>
            {box.kind === 'card' ? <><div className="cz-boxcard"><UtCard card={box.card} size="md" shine /></div><b>{box.tier === 'icon' ? 'Ikone!' : box.tier === 'top' ? 'Top-Karte!' : 'Neue Karte!'}</b><span>{box.card.name} ist jetzt in deiner Sammlung</span></>
              : box.kind === 'spins' ? <><Icon name="star" size={64} /><b>+10 Gratis-Drehs</b><span>an den Stadion-Slots</span></>
              : <><Icon name="coin" size={64} /><b>+{fmt(box.amount)} Chips</b><span>{box.amount >= 3000 ? 'Großer Fang!' : 'Weiter so!'}</span></>}
            <button className="cz-cta" onClick={() => setBox(null)}>Weiter</button>
          </div>
        </div>
      )}
      {lvUp && <div className="cz-lvup" role="status"><small>Level-Aufstieg</small><b>Level {lvUp}</b><span>+{fmt(levelReward(lvUp))} Chips</span></div>}
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

/** Chip-Kasse: Spiel-Coins in Chips tauschen (mit Bonus) und Gratis-Nachschub, wenn man pleite ist. */
function Bank({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const club = useClub();
  const c = casinoOf(club);
  const refill = refillState(club);
  const coins = useCountUp(club.coins);
  const [out, setOut] = useState(0);
  const maxOut = Math.floor(c.chips / CASHOUT_RATE) * CASHOUT_RATE;
  const cash = (n: number) => {
    const next = cashOutChips(getClubState(), n);
    if (!next) { sfx('error'); return; }
    setClubState(next);
    sfx('cash'); buzz([20, 40, 20]);
    onDone(`+${fmt(n / CASHOUT_RATE)} Coins für den Shop`);
    setOut(0);
  };
  const take = (i: number) => {
    const next = buyChips(getClubState(), i);
    if (!next) { sfx('error'); return; }
    setClubState(next);
    sfx('cash'); buzz([20, 40, 20]);
    onDone(`+${fmt(CHIP_PACKS[i].chips)} Chips`);
  };
  const free = () => {
    const next = claimRefill(getClubState());
    if (!next) return;
    setClubState(next);
    sfx('cash'); buzz(30);
    onDone(`+${fmt(REFILL)} Gratis-Chips`);
  };
  const h = Math.floor(refill.waitMs / 3_600_000);
  const m = Math.ceil((refill.waitMs % 3_600_000) / 60_000);
  return (
    <div className="cz-sheet cz-bank" role="dialog" aria-label="Chip-Kasse">
      <div className="cz-sheet-inner">
        <header><b>Chip-Kasse</b><button className="cz-round" onClick={onClose} aria-label="Schließen"><Icon name="close" size={18} /></button></header>
        <div className="cz-bank-bal">
          <span><small>Deine Coins</small><b><Icon name="coin" size={18} />{fmt(coins)}</b></span>
          <Icon name="arrow" size={22} />
          <span><small>Chips</small><b className="gold"><Icon name="coin" size={18} />{fmt(c.chips)}</b></span>
        </div>
        {refill.broke && (
          <button className={`cz-refill ${refill.ready ? 'ready' : ''}`} disabled={!refill.ready} onClick={free}>
            <Icon name="gift" size={24} />
            <span><b>{refill.ready ? `${fmt(REFILL)} Gratis-Chips` : 'Gratis-Nachschub'}</b><small>{refill.ready ? 'Pleite? Hier gibt’s Nachschub – alle 3 Stunden' : `Wieder verfügbar in ${h ? `${h} Std. ` : ''}${m} Min.`}</small></span>
          </button>
        )}
        <section className="cz-cashout">
          <b><Icon name="pack" size={18} /> Chips → Coins</b>
          <small>Gewinne in Coins tauschen ({CASHOUT_RATE} Chips = 1 Coin) – für Packs im Shop und dein Team.</small>
          <div className="cz-cashout-row">
            {[0.25, 0.5, 1].map((f) => {
              const n = Math.floor((maxOut * f) / CASHOUT_RATE) * CASHOUT_RATE;
              return <button key={f} className={out === n && n ? 'on' : ''} disabled={n < CASHOUT_MIN} onClick={() => setOut(n)}>{f === 1 ? 'Alles' : `${f * 100} %`}</button>;
            })}
          </div>
          <button className="cz-cashout-go" disabled={out < CASHOUT_MIN} onClick={() => cash(out)}>{out >= CASHOUT_MIN ? `${fmt(out)} Chips → ${fmt(out / CASHOUT_RATE)} Coins` : `Ab ${fmt(CASHOUT_MIN)} Chips`}</button>
        </section>
        <ul className="cz-packs">
          {CHIP_PACKS.map((p, i) => (
            <li key={i} className={'best' in p && p.best ? 'best' : ''}>
              {'tag' in p && <em>{p.tag}</em>}
              <span className="cz-pack-ic"><Icon name="coin" size={22 + i * 3} /></span>
              <b>{fmt(p.chips)} Chips</b>
              <button disabled={club.coins < p.coins} onClick={() => take(i)}><Icon name="coin" size={14} />{fmt(p.coins)} Coins</button>
            </li>
          ))}
        </ul>
        <p className="cz-foot">Coins verdienst du mit Karriere-Saisons, Duell-Siegen und deinem Vermögen. Echtes Geld gibt es hier nicht.</p>
      </div>
    </div>
  );
}
