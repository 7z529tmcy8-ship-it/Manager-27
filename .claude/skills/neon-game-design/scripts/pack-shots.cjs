// Fotografiert die Pack-Öffnung in allen Phasen (Handy 390 px).
// Aufruf: node .claude/skills/neon-game-design/scripts/pack-shots.cjs <ausgabe-ordner> <präfix> [pack-index]
// pack-index: Nummer des „Öffnen“-Buttons im Store (0 = erstes Pack, -1 = letztes/teuerstes, oft mit Walkout).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [, , OUT = 'shots', TAG = 'pack', IDX = '0'] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.SHOTS_URL || 'http://localhost:4174/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('fc-manager-unlocked', '1');
    localStorage.setItem('fc-seen-update', 'x');
    if (!localStorage.getItem('fc-club')) localStorage.setItem('fc-club', JSON.stringify({ coins: 5000000, cards: {}, welcomeClaimed: true, megaXxlClaimed: true, megaSuperClaimed: true }));
  });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL); await p.waitForTimeout(500);
  await p.locator('.upd-actions button').last().click({ timeout: 1500 }).catch(() => {});
  await p.click('.hub-tile:has(strong:text-is("Store"))');
  await p.waitForTimeout(400);
  const btns = p.locator('.pack-card button.btn.primary:not([disabled])');
  const n = await btns.count();
  const i = Number(IDX) < 0 ? n + Number(IDX) : Number(IDX);
  await btns.nth(i).click();
  const t0 = Date.now();
  const at = async (ms, name) => { const w = ms - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}/${TAG}-${name}.png` }); };
  await at(700, '1-pack');
  await at(1650, '2-burst');
  await at(3200, '3-walkout-or-reveal');
  // bis zur Einzelkarte warten (Walkout dauert ~3,5 s)
  await p.locator('.reveal').waitFor({ timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${OUT}/${TAG}-4-reveal.png` });
  await p.click('.reveal .btn').catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${TAG}-5-flip.png` });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${OUT}/${TAG}-6-all.png`, fullPage: true });
  console.log(errors.length ? errors : 'ok', `${OUT}/${TAG}-*.png`);
  await b.close();
})();
