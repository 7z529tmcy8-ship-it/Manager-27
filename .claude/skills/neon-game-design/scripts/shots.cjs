// Fotografiert die Hauptbildschirme von Manager Sim (Handy 390 px + Desktop 1280 px).
// Aufruf: node .claude/skills/neon-game-design/scripts/shots.cjs <ausgabe-ordner> <präfix>
// Voraussetzung: `npx vite build` und `npx vite preview --port 4174` laufen.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [, , OUT = 'shots', TAG = 'shot'] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.SHOTS_URL || 'http://localhost:4174/';
const CARDS = ['lamine-yamal', 'harry-kane', 'jamal-musiala', 'florian-wirtz', 'erling-haaland', 'kylian-mbappe', 'pedri', 'bukayo-saka',
  'declan-rice', 'cole-palmer', 'rodri', 'vitinha', 'joshua-kimmich', 'manuel-neuer', 'david-raya', 'william-saliba', 'virgil-van-dijk',
  'achraf-hakimi', 'nuno-mendes', 'federico-dimarco', 'pele', 'ronaldinho', 'juan-roman-riquelme'];

async function screens(ctx, size) {
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const shot = (name, full = false) => p.screenshot({ path: `${OUT}/${TAG}-${size}-${name}.png`, fullPage: full });
  // Update-Banner schließen, falls offen (erscheint nach jedem Neuladen)
  const home = async () => {
    await p.goto(URL); await p.waitForTimeout(500);
    await p.locator('.upd-actions button').last().click({ timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(200);
  };
  await home();
  await shot('hub'); await shot('hub-full', true);
  const open = async (title) => { await home(); await p.click(`.hub-tile:has(strong:text-is("${title}"))`, { timeout: 4000 }); await p.waitForTimeout(400); };
  for (const [title, name] of [['Store', 'store'], ['Sammlung', 'collection'], ['Mein Team', 'team'], ['Duelle', 'duels'], ['SBC', 'sbc'], ['Neue Karriere', 'create']]) {
    try { await open(title); await shot(name); } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); }
  }
  await p.close();
  return errors;
}

(async () => {
  const b = await chromium.launch();
  const init = (cards) => {
    sessionStorage.setItem('fc-manager-unlocked', '1');
    localStorage.setItem('fc-seen-update', 'x');
    const c = {}; cards.forEach((id) => { c[id] = 1; });
    if (!localStorage.getItem('fc-club')) localStorage.setItem('fc-club', JSON.stringify({ coins: 250000, cards: c, welcomeClaimed: true, megaXxlClaimed: true, megaSuperClaimed: true }));
  };
  for (const [size, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport, deviceScaleFactor: size === 'mobile' ? 2 : 1 });
    await ctx.addInitScript(init, CARDS);
    const errors = await screens(ctx, size);
    console.log(size, errors.length ? errors : 'ok');
    await ctx.close();
  }
  await b.close();
  console.log(`Bilder in ${OUT}/ (${TAG}-mobile-*.png, ${TAG}-desktop-*.png)`);
})();
