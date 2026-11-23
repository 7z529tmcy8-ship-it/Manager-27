import { useState } from 'react';
import { SCRATCH_TABLE, scratchRtp, scratchTicket, type Sym } from '../../game/casino';
import { SlotSym } from './symbols';
import { BetPicker, GameFrame, bet, buzz, fmt, settle, sfx, useBet } from './shared';


/** Rubbellos: Los kaufen, 9 Felder freirubbeln (antippen), 3 gleiche Symbole gewinnen. */
export default function Scratch({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('scratch', 50);
  const [ticket, setTicket] = useState<{ cells: Sym[]; mult: number; sym: Sym | null; stake: number } | null>(null);
  const [open, setOpen] = useState<boolean[]>(Array(9).fill(false));
  const [done, setDone] = useState(false);

  const buy = () => {
    if (!bet(stake)) return;
    const t = scratchTicket();
    setTicket({ ...t, stake });
    setOpen(Array(9).fill(false));
    setDone(false);
    sfx('packRip');
  };
  const finish = (cells: boolean[]) => {
    if (!ticket || done || !cells.every(Boolean)) return;
    setDone(true);
    settle({ game: 'scratch', bet: ticket.stake, win: ticket.stake * ticket.mult });
    if (ticket.mult) { buzz([30, 40, 30]); } else sfx('tap');
  };
  const reveal = (i: number) => {
    if (!ticket || open[i]) return;
    const next = open.map((x, k) => (k === i ? true : x));
    setOpen(next);
    const s = ticket.cells[i];
    const same = ticket.cells.filter((c, k) => c === s && next[k]).length;
    sfx(same >= 2 && s === ticket.sym ? 'revealRare' : 'tick');
    finish(next);
  };
  const revealAll = () => { if (!ticket) return; const all = Array(9).fill(true); setOpen(all); finish(all); };

  return (
    <GameFrame title="Rubbellos" onClose={onClose} className="cz-scratch"
      odds={`9 Felder, 3 gleiche Symbole gewinnen das Vielfache des Lospreises: ${SCRATCH_TABLE.map((t) => `${t.mult}× (${(t.p * 100).toLocaleString('de-DE', { maximumFractionDigits: 3 })} %)`).join(' · ')}. Auszahlungsquote ca. ${Math.round(scratchRtp() * 100)} %.`}>
      <div className={`cz-sc-card ${done ? (ticket?.mult ? 'win' : 'lose') : ''}`}>
        <div className="cz-sc-head"><b>Glückslos</b><small>3 gleiche gewinnen</small></div>
        <div className="cz-sc-grid">
          {Array.from({ length: 9 }, (_, i) => {
            const s = ticket?.cells[i];
            const hit = done && ticket?.mult && s === ticket.sym;
            return (
              <button key={i} className={`cz-sc-cell ${open[i] ? 'open' : ''} ${hit ? 'hit' : ''}`} disabled={!ticket || open[i]} onClick={() => reveal(i)} aria-label={open[i] && s ? s : 'Feld freirubbeln'}>
                {open[i] && s ? <SlotSym s={s} size={44} /> : <span className="cz-sc-foil" />}
              </button>
            );
          })}
        </div>
        <div className="cz-sc-pay">{SCRATCH_TABLE.slice().reverse().map((t) => <span key={t.sym}><SlotSym s={t.sym} size={18} />{t.mult}×</span>)}</div>
      </div>
      <div className={`cz-result ${done && ticket?.mult ? 'on' : ''}`}>
        {done && ticket ? (ticket.mult ? <><b>+{fmt(ticket.stake * ticket.mult)}</b><small>{ticket.mult}× Lospreis</small></> : <small>Diesmal nichts – nächstes Los?</small>) : <small>{ticket ? 'Tippe die Felder an zum Freirubbeln' : 'Kauf ein Los'}</small>}
      </div>
      <BetPicker value={stake} onChange={setStake} disabled={!!ticket && !done} label="Lospreis" />
      <div className="cz-actions">
        {ticket && !done ? (
          <button className="cz-cta" onClick={revealAll}>Alle aufdecken</button>
        ) : <button className="cz-cta" onClick={buy}>Los kaufen · {fmt(stake)}</button>}
      </div>
    </GameFrame>
  );
}
