// Spielgefühl-Prüfung für Manager Sim: spielt die wichtigsten Abläufe im Browser durch und misst,
// ob sich das Spiel flüssig, schnell und befriedigend anfühlt.
//
// Aufruf:  node .claude/skills/spielgefuehl/scripts/feel-audit.cjs [ausgabe-ordner] [--slow] [--only=store,drop]
//   --slow   simuliert ein schwaches Handy (CPU 4× gedrosselt)
// Voraussetzung: `npx vite build` und `npx vite preview --port 4174` laufen (Adresse per FEEL_URL änderbar).
//
// Selbstprüfung: Vor der eigentlichen Messung testet das Skript seine Messwerkzeuge an einer
// Test-Animation. Liefern sie keine Werte, ist das Ergebnis ungültig (Exit-Code 2) – statt still „alles gut“ zu melden.
// Kalibrierung: Dieselbe Test-Animation zeigt, wie flüssig der Testrechner überhaupt zeichnen kann. Ein Testbrowser
// ohne Grafikkarte schafft oft nur 30 Bilder/s – dann werden Ruckler relativ dazu bewertet, nicht absolut.
// Ruckelt ein Ablauf, wird er ein zweites Mal gemessen; nur wenn er beide Male ruckelt, zählt es als Fehler.
// Exit-Code: 0 = bestanden, 1 = mindestens eine Grenze gerissen, 2 = Messung ungültig.

const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith('--')) || 'feel-report';
const SLOW = args.includes('--slow');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const URL = process.env.FEEL_URL || 'http://localhost:4174/';
fs.mkdirSync(OUT, { recursive: true });

/** Grenzwerte – begründet in references/grenzwerte.md. */
const LIMIT = {
  frameP95: SLOW ? 50 : 34, // ms pro Bild (95 % der Bilder schneller) – ab ~30 fps wirkt es ruckelig
  jankShare: 0.08, // Anteil Bilder > 50 ms
  longTaskMax: SLOW ? 400 : 200, // ms – längster Hänger, in dem nichts reagiert
  tapLatencyP95: SLOW ? 250 : 120, // ms vom Antippen bis zur ersten sichtbaren Änderung
  cls: 0.1, // Layout-Sprünge pro Bildschirm
  tapTarget: 40, // px – kleinste Tipp-Fläche am Handy
};

// Messwerkzeuge, die in jede Seite geladen werden
function probes() {
  const w = window;
  w.__feel = { frames: [], sampling: false, long: [], cls: 0, lat: [] };
  let last = performance.now();
  const loop = (t) => { if (w.__feel.sampling) w.__feel.frames.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__feel.long.push(e.duration))).observe({ type: 'longtask', buffered: true }); } catch { /* nicht unterstützt */ }
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) w.__feel.cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch { /* nicht unterstützt */ }
  // Antippen → erste DOM-Änderung (Rückmeldung nur per :active-CSS zählt hier nicht, siehe Grenzwerte)
  document.addEventListener('pointerdown', () => {
    const t = performance.now();
    let done = false;
    const mo = new MutationObserver(() => { if (done) return; done = true; w.__feel.lat.push(performance.now() - t); mo.disconnect(); });
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    setTimeout(() => { if (!done) mo.disconnect(); }, 1500);
  }, true);
  sessionStorage.setItem('fc-manager-unlocked', '1');
  localStorage.setItem('fc-seen-update', 'feel-audit');
  if (!localStorage.getItem('fc-club')) {
    localStorage.setItem('fc-club', JSON.stringify({ coins: 2_000_000, cards: {}, drops: 3, megaDrops: 1, welcomeClaimed: true, megaXxlClaimed: true, megaSuperClaimed: true, trophies: 400, trophyBest: 400 }));
  }
}

const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const round = (n) => Math.round(n * 10) / 10;

async function measure(page, name, run, jankAt = 50) {
  await page.evaluate(() => { const f = window.__feel; f.frames = []; f.long = []; f.cls = 0; f.lat = []; f.sampling = true; });
  const errors = [];
  const onErr = (e) => errors.push(e.message);
  page.on('pageerror', onErr);
  let failed = null;
  try { await run(); } catch (e) { failed = e.message.split('\n')[0]; }
  await page.waitForTimeout(300);
  const f = await page.evaluate(() => { window.__feel.sampling = false; return window.__feel; });
  page.off('pageerror', onErr);
  const frames = f.frames.filter((d) => d < 1000); // Tab im Hintergrund o. Ä. nicht mitzählen
  return {
    name, failed, errors,
    frames: frames.length,
    frameP95: round(pct(frames, 0.95)),
    jankShare: frames.length ? Math.round((frames.filter((d) => d > jankAt).length / frames.length) * 100) / 100 : 0,
    longTaskMax: round(Math.max(0, ...f.long)),
    longTasks: f.long.length,
    tapLatencyP95: round(pct(f.lat, 0.95)),
    taps: f.lat.length,
    cls: Math.round(f.cls * 1000) / 1000,
  };
}

/** Selbsttest: Liefern die Messwerkzeuge an einer bekannten Animation sinnvolle Werte? */
async function selfTest(page) {
  const r = await measure(page, 'selbsttest', async () => {
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = 'feel-probe';
      d.style.cssText = 'position:fixed;left:0;top:0;width:40px;height:40px;background:red;transition:transform .6s linear';
      document.body.appendChild(d);
      requestAnimationFrame(() => { d.style.transform = 'translateX(200px)'; });
      d.addEventListener('pointerdown', () => { d.style.background = 'blue'; });
    });
    await page.click('#feel-probe', { force: true });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('feel-probe')?.remove());
  });
  const problems = [];
  if (r.frames < 20) problems.push(`Bild-Messung liefert nur ${r.frames} Bilder in 0,8 s`);
  if (!r.taps) problems.push('Tipp-Messung hat das Antippen nicht erkannt');
  return { ...r, problems };
}

/** Grundtempo des Testrechners: Bild-p95 einer ganz einfachen Animation (dreimal, der beste Wert). */
async function calibrate(page) {
  const runs = [];
  for (let k = 0; k < 3; k++) {
    const r = await measure(page, 'kalibrierung', async () => {
      await page.evaluate(() => {
        const d = document.createElement('div');
        d.id = 'feel-cal';
        d.style.cssText = 'position:fixed;left:0;top:0;width:60px;height:60px;background:#888;animation:none;will-change:transform';
        document.body.appendChild(d);
        const t0 = performance.now();
        const step = (t) => { d.style.transform = `translateX(${((t - t0) / 4) % 300}px)`; if (document.getElementById('feel-cal')) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
      await page.waitForTimeout(1200);
      await page.evaluate(() => document.getElementById('feel-cal')?.remove());
    });
    runs.push(r.frameP95);
  }
  return Math.min(...runs);
}

async function home(page) {
  await page.goto(URL);
  await page.waitForTimeout(600);
  await page.locator('.upd-actions button').last().click({ timeout: 800 }).catch(() => {});
  await page.waitForTimeout(150);
}
const tile = (page, title) => page.click(`.hub-tile:has(strong:text-is("${title}"))`, { timeout: 4000 });
const nav = (page, label) => page.click(`.navbar-item:has-text("${label}")`, { timeout: 4000 });
const dept = (page, label) => page.click(`.shop-tab:has-text("${label}")`, { timeout: 3000 });

/** Die geprüften Abläufe. Neue Spielteile hier ergänzen (siehe SKILL.md). */
const FLOWS = {
  navigation: async (p) => {
    for (const label of ['Shop', 'Sammlung', 'Team', 'Duelle', 'Pass', 'Start']) { await nav(p, label); await p.waitForTimeout(450); }
  },
  store: async (p) => {
    await nav(p, 'Shop'); await p.waitForTimeout(400);
    for (const d of ['Packs', 'Drops', 'Ablage', 'Extras', 'Angebote', 'Packs']) { await dept(p, d); await p.waitForTimeout(250); }
    await p.mouse.wheel(0, 900); await p.waitForTimeout(300); await p.mouse.wheel(0, -900);
    await p.click('.pack-card.p-gold button', { timeout: 3000 });
    await p.waitForTimeout(1600);
    await p.locator('.pack-skip').click({ timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(800);
  },
  drop: async (p) => {
    // Ablage → einen Drop antippen bis offen → nächster → alle öffnen (Übersicht)
    await nav(p, 'Shop'); await p.waitForTimeout(400);
    await dept(p, 'Ablage'); await p.waitForTimeout(300);
    await p.click('.stored-drop.normal button', { timeout: 3000 });
    await p.waitForTimeout(500);
    for (let i = 0; i < 8; i++) {
      const gem = p.locator('.dx-drop');
      if (!(await gem.count())) break;
      await gem.click(); await p.waitForTimeout(380);
    }
    await p.waitForTimeout(700);
    await p.click('.dx-actions .btn:has-text("Alle öffnen")', { timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(900);
  },
  ruhmesweg: async (p) => {
    await p.click('.hub-glory', { timeout: 3000 }); await p.waitForTimeout(600);
    await p.mouse.wheel(0, 1200); await p.waitForTimeout(400);
  },
  sammlung: async (p) => {
    await tile(p, 'Sammlung'); await p.waitForTimeout(500);
    await p.click('.cc-tile.ct-all', { timeout: 3000 }); await p.waitForTimeout(400);
    await p.mouse.wheel(0, 1500); await p.waitForTimeout(500); await p.mouse.wheel(0, -1500);
    await p.click('.cc-back', { timeout: 3000 }); await p.waitForTimeout(300);
    await p.click('.cc-tile.ct-icon', { timeout: 3000 }); await p.waitForTimeout(400);
  },
  casino: async (p) => {
    // Echter Spieler → Karriere → Vermögen → Casino: einmal Roulette drehen, dann (falls vorhanden) Elfmeter-Serie
    await p.click('.hb-new', { timeout: 4000 }); await p.waitForTimeout(400);
    await p.click('.tabs button:has-text("Echter")', { timeout: 3000 }); await p.waitForTimeout(300);
    await p.click('.real-list button', { timeout: 3000 }); await p.waitForTimeout(800);
    await p.click('.cs-life-btn:has-text("Vermögen")', { timeout: 3000 }); await p.waitForTimeout(400);
    await p.click('.chip:has-text("Casino")', { timeout: 3000 }); await p.waitForTimeout(400);
    await p.click('.casino .btn.primary', { timeout: 3000 }); await p.waitForTimeout(3000);
    const pen = p.locator('.chip:has-text("Elfmeter")');
    if (await pen.count()) {
      await pen.click(); await p.waitForTimeout(300);
      await p.click('.casino .btn.primary', { timeout: 3000 }); await p.waitForTimeout(400);
      await p.click('.pz-corner >> nth=0', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1600);
    }
  },
  shopcasino: async (p) => {
    // Shop → Casino: Sololauf (Abschließen nach 1 s)
    await nav(p, 'Shop'); await p.waitForTimeout(400);
    await dept(p, 'Extras'); await p.waitForTimeout(250);
    await p.click('.casino-call', { timeout: 3000 }); await p.waitForTimeout(400);
    await p.click('.cz-game:has-text("Sololauf")', { timeout: 3000 }); await p.waitForTimeout(300);
    await p.click('.cz-solo .btn.primary', { timeout: 3000 }); await p.waitForTimeout(1000);
    await p.click('.solo-cash', { timeout: 800 }).catch(() => {}); await p.waitForTimeout(800);
  },
  meteor: async (p) => {
    // Shop → Code METEOR: Einschlag-Animation bis zur Belohnung
    await nav(p, 'Shop'); await p.waitForTimeout(400);
    await dept(p, 'Extras'); await p.waitForTimeout(250);
    await p.fill('.code-redeem input', 'meteor', { timeout: 3000 });
    await p.click('.code-redeem button'); await p.waitForTimeout(4200);
    await p.click('.mt-actions .btn.primary', { timeout: 2000 }).catch(() => {});
  },
  hilo: async (p) => {
    // Duelle → Höher oder Tiefer: drei Tipps
    await nav(p, 'Duelle'); await p.waitForTimeout(400);
    await p.click('.hl-call-btn', { timeout: 3000 }); await p.waitForTimeout(400);
    for (let i = 0; i < 3; i++) { await p.click(i % 2 ? '.hilo-btn.lower' : '.hilo-btn.higher', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(1200); }
  },
  draft: async (p) => {
    // Duelle → Draft: Kapitän, 11 Plätze füllen, eine Turnierrunde
    await nav(p, 'Duelle'); await p.waitForTimeout(400);
    await p.click('.draft-call', { timeout: 3000 }); await p.waitForTimeout(300);
    await p.click('.dr-intro .btn.primary', { timeout: 3000 }); await p.waitForTimeout(500);
    await p.click('.dr-picks .ucard >> nth=0', { timeout: 3000 }); await p.waitForTimeout(300);
    for (let i = 0; i < 10; i++) {
      await p.click('.dr-empty >> nth=0', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(350);
      await p.click('.dr-sheet .ucard >> nth=0', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(200);
    }
    await p.click('.dr-dock .btn.primary', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(300);
    await p.click('.dr-cup .btn.primary', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(1500);
  },
  karriere: async (p) => {
    await p.click('.hb-new', { timeout: 4000 }); await p.waitForTimeout(600);
    await p.mouse.wheel(0, 800); await p.waitForTimeout(300);
  },
};

/** Statische Prüfungen auf einem Bildschirm: Tipp-Flächen, Rückmeldung bei Knöpfen. */
async function staticChecks(page) {
  return page.evaluate((minTap) => {
    const small = [];
    const noFeedback = [];
    for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[aria-hidden="true"]')) continue;
      const label = (el.getAttribute('aria-label') || el.textContent || el.className || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      if (Math.min(r.width, r.height) < minTap) small.push(`${label} (${Math.round(r.width)}×${Math.round(r.height)})`);
      const dur = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
      if (!dur && cs.animationName === 'none') noFeedback.push(label);
    }
    return { small: [...new Set(small)].slice(0, 12), noFeedback: [...new Set(noFeedback)].slice(0, 12) };
  }, LIMIT.tapTarget);
}

/** Bei „weniger Bewegung“ dürfen keine Endlos-Animationen laufen. */
async function reducedMotion(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(probes);
  const p = await ctx.newPage();
  const found = new Set();
  const scan = async () => {
    const list = await p.evaluate(() => [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.animationName !== 'none' && cs.animationIterationCount === 'infinite' && el.getBoundingClientRect().width > 0;
    }).map((el) => (typeof el.className === 'string' ? el.className : el.tagName).split(' ')[0]));
    list.forEach((x) => found.add(x));
  };
  await home(p); await scan();
  for (const label of ['Shop', 'Pass']) { await nav(p, label).catch(() => {}); await p.waitForTimeout(400); await scan(); }
  await ctx.close();
  return [...found].slice(0, 15);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
  await ctx.addInitScript(probes);
  const page = await ctx.newPage();
  if (SLOW) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  try { await page.goto(URL, { timeout: 8000 }); } catch {
    console.error(`Spiel nicht erreichbar unter ${URL} – läuft "npx vite preview --port 4174"?`);
    process.exit(2);
  }

  const self = await selfTest(page);
  if (self.problems.length) {
    console.error('SELBSTTEST FEHLGESCHLAGEN – Messung ungültig:\n- ' + self.problems.join('\n- '));
    await browser.close();
    process.exit(2);
  }

  const base = await calibrate(page);
  // Grenzen relativ zum Testrechner: höchstens 50 % schlechter als seine einfachste Animation
  LIMIT.frameP95 = Math.max(LIMIT.frameP95, Math.round(base * 1.5 * 10) / 10);
  const jankAt = Math.max(50, base * 2);

  const results = [];
  const statics = {};
  for (const [name, run] of Object.entries(FLOWS)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    await home(page);
    let r = await measure(page, name, () => run(page), jankAt);
    if (!r.failed && (r.frameP95 > LIMIT.frameP95 || r.jankShare > LIMIT.jankShare)) {
      // Zweiter Versuch: einzelne Ausreißer des Testrechners sollen nicht als Ruckeln zählen
      await home(page);
      const again = await measure(page, name, () => run(page), jankAt);
      if (again.frameP95 <= r.frameP95) r = { ...again, retried: true };
      else r.retried = true;
    }
    statics[name] = await staticChecks(page);
    await page.screenshot({ path: path.join(OUT, `feel-${name}.png`) });
    results.push(r);
  }
  const motion = ONLY.length ? [] : await reducedMotion(browser);
  await browser.close();

  // Bewertung
  const fails = [];
  const warns = [];
  for (const r of results) {
    if (r.failed) fails.push(`${r.name}: Ablauf ließ sich nicht durchspielen (${r.failed})`);
    if (r.errors.length) fails.push(`${r.name}: ${r.errors.length} Fehler im Spiel – ${r.errors[0]}`);
    if (r.frameP95 > LIMIT.frameP95) fails.push(`${r.name}: ruckelt – 95 % der Bilder brauchen bis ${r.frameP95} ms (Grenze ${LIMIT.frameP95})`);
    if (r.jankShare > LIMIT.jankShare) fails.push(`${r.name}: ${Math.round(r.jankShare * 100)} % Ruckler-Bilder über ${Math.round(jankAt)} ms`);
    if (r.longTaskMax > LIMIT.longTaskMax) fails.push(`${r.name}: Hänger von ${r.longTaskMax} ms (Grenze ${LIMIT.longTaskMax})`);
    else if (r.longTaskMax > LIMIT.longTaskMax / 2) warns.push(`${r.name}: kurzer Hänger ${r.longTaskMax} ms`);
    if (r.taps && r.tapLatencyP95 > LIMIT.tapLatencyP95) fails.push(`${r.name}: Antippen fühlt sich träge an – ${r.tapLatencyP95} ms bis zur Reaktion (Grenze ${LIMIT.tapLatencyP95})`);
    if (r.cls > LIMIT.cls) warns.push(`${r.name}: Inhalte springen (Layout-Verschiebung ${r.cls})`);
    const s = statics[r.name];
    if (s?.small.length) warns.push(`${r.name}: kleine Tipp-Flächen < ${LIMIT.tapTarget} px: ${s.small.join(', ')}`);
    if (s?.noFeedback.length) warns.push(`${r.name}: Knöpfe ohne Übergang/Animation (fühlen sich „tot“ an): ${s.noFeedback.join(', ')}`);
  }
  if (motion.length) warns.push(`Weniger Bewegung: Endlos-Animationen laufen weiter: ${motion.join(', ')}`);

  const table = ['| Ablauf | Bilder | Bild p95 | Ruckler | längster Hänger | Tippen p95 | Layout |', '|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.name}${r.retried ? ' (2×)' : ''} | ${r.frames} | ${r.frameP95} ms | ${Math.round(r.jankShare * 100)} % | ${r.longTaskMax} ms | ${r.taps ? `${r.tapLatencyP95} ms` : '–'} | ${r.cls} |`)];
  const md = [
    `# Spielgefühl-Prüfung ${new Date().toLocaleString('de-DE')}${SLOW ? ' (schwaches Handy simuliert)' : ''}`,
    `Selbsttest: ok (${self.frames} Bilder, Tippen erkannt) · Testrechner-Grundtempo: ${base} ms pro Bild${base > 20 ? ' (langsam – Ruckel-Grenze daran angepasst: ' + LIMIT.frameP95 + ' ms)' : ''}`, '', ...table, '',
    `## Ergebnis: ${fails.length ? 'NICHT BESTANDEN' : 'BESTANDEN'}`,
    ...(fails.length ? ['', '### Muss behoben werden', ...fails.map((f) => `- ${f}`)] : []),
    ...(warns.length ? ['', '### Hinweise', ...warns.map((w) => `- ${w}`)] : []),
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'feel-report.md'), md);
  fs.writeFileSync(path.join(OUT, 'feel-report.json'), JSON.stringify({ slow: SLOW, base, limits: LIMIT, self, results, statics, motion, fails, warns }, null, 2));
  console.log(md);
  process.exit(fails.length ? 1 : 0);
})();
