// Josi Estética — prévia conceitual (Bruno Luque). Ideia central: "Fio a fio, cor a cor."
// Camadas de motion:
//  - Assinatura: folha de estudo do hero (fios desenhados um a um + "pentear" com o ponteiro)
//    e a cena presa "Três técnicas" (fios → contorno/preenchimento labial → delineado).
//  - Narrativa: títulos por máscara (line-mask), recorte das fotos da galeria (ed-image-crop),
//    linha de pigmento que conecta as etapas de "Como funciona".
//  - Interface: pressão de botões, copiar com confirmação (ix-copy-confirm), chips, lupa e
//    lightbox com trilho (ed-loupe-detail, ix-lightbox-filmstrip), barra fixa no celular.
// O conteúdo funciona sem este arquivo; estados escondidos só existem depois de `motion-ready`.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const deskMQ = matchMedia('(min-width: 961px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

/* ---------------- tokens de motion (espelham o :root do CSS) ---------------- */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const DUR = { press: 0.14, control: 0.2, panel: 0.32, scene: 0.6 };
const SPRING_SOFT = { type: 'spring', bounce: 0.15, duration: 0.5 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ */
/* Sobrancelha procedural: fios curtos com ângulo e espessura variáveis */
/* ------------------------------------------------------------------ */
function rng(seed) { // mulberry32 — determinístico: a mesma folha sempre gera o mesmo desenho
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Forma da sobrancelha no viewBox 0 0 400 170: início (esq.), arco (~66%) e final afinando.
function browAt(t) {
  const x = 40 + 332 * t;
  const yc = t < 0.64 ? 118 - 56 * (1 - (1 - t / 0.64) ** 2.2) : 62 + 40 * ((t - 0.64) / 0.36) ** 1.5;
  const w = t < 0.18 ? 30 + 6 * (t / 0.18) : t < 0.64 ? 36 - 10 * ((t - 0.18) / 0.46) : 2.5 + 23.5 * (1 - ss((t - 0.64) / 0.36));
  return { x, yc, w };
}
const PIGMENTS = ['#33221D', '#3E2A23', '#4A3229', '#5B3D31'];
function buildBrow(svg, seed, count) {
  const g = $('.hairs', svg);
  const r = rng(seed);
  const hairs = [];
  let guard = 0;
  while (hairs.length < count && guard++ < count * 20) {
    const t = r();
    const { x, yc, w } = browAt(t);
    if (r() > w / 34 + 0.12) continue; // densidade acompanha a largura
    const u = (r() * 2 - 1) * 0.92;      // -1 topo, +1 base
    const e = 0.004;
    const a1 = browAt(Math.max(0, t - e)), a2 = browAt(Math.min(1, t + e));
    const spine = Math.atan2(a2.yc - a1.yc, a2.x - a1.x);
    const deg = Math.PI / 180;
    const head = -82 * deg + u * 10 * deg + (r() - 0.5) * 14 * deg;            // início: fios quase verticais
    const spread = 0.35 + 0.65 * (w / 36); // no final, os fios deitam junto à linha
    const body = spine + lerp(6 * deg, -34 * deg, (u + 1) / 2) * spread + (r() - 0.5) * 10 * deg * spread; // corpo: fileiras que convergem
    const k = ss((t - 0.04) / 0.22);
    const ang = lerp(head, body, k);
    const len = (8 + w * 0.5 + r() * 6) * (t > 0.8 ? 0.62 : 1);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const mx = x, my = yc + (u * w) / 2;
    const bx = mx - dx * len * 0.45, by = my - dy * len * 0.45;
    const ex = mx + dx * len * 0.55, ey = my + dy * len * 0.55;
    const bend = (r() < 0.72 ? 1 : -1) * len * (0.08 + r() * 0.12);
    const cx = mx - dy * bend, cy = my + dx * bend;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${bx.toFixed(1)} ${by.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
    p.setAttribute('pathLength', '1');
    const op = (0.68 + r() * 0.32) * (0.45 + 0.55 * ss(t / 0.24)); // início mais suave (degradê)
    p.setAttribute('stroke', PIGMENTS[Math.floor(r() * PIGMENTS.length)]);
    p.setAttribute('stroke-width', (0.7 + r() * 0.8 * (1 - t * 0.45)).toFixed(2));
    p.setAttribute('opacity', op.toFixed(2));
    hairs.push({ el: p, t, mx, my, ang, op, key: 0, cur: 0, tgt: 0 });
  }
  // ordem de desenho: estrutura (30%) do início ao final, depois o preenchimento — densidade crescente
  hairs.forEach((h, i) => { h.key = (i % 10 < 3 ? 0 : 1) + h.t + r() * 0.12; });
  hairs.sort((a, b) => a.key - b.key);
  hairs.forEach((h) => g.appendChild(h.el));
  return hairs;
}

const heroSheet = $('[data-hero-sheet]');
const heroSvg = $('[data-brow="hero"]');
const techBrowSvg = $('[data-brow="tech"]');
const heroHairs = heroSvg ? buildBrow(heroSvg, +heroSvg.dataset.seed, 300) : [];
const techHairs = techBrowSvg ? buildBrow(techBrowSvg, +techBrowSvg.dataset.seed, 320) : [];

/* ---------------- renderizadores por progresso (0–1), usados na cena e no celular ---------------- */
const hidden = (p) => { p.style.strokeDasharray = '1 2'; p.style.strokeDashoffset = '1.1'; };
function drawTo(path, k) {
  const v = (1.1 - 1.1 * clamp(k)).toFixed(3);
  if (path._v !== v) { path._v = v; path.style.strokeDashoffset = v; }
}
function makeBrowRender(svg, hairs) {
  const guides = $$('.guide, .guide-t', svg);
  let shown = -1;
  return (s) => {
    const go = (0.75 * clamp(s / 0.12)).toFixed(2);
    guides.forEach((gd) => { if (gd._o !== go) { gd._o = go; gd.style.opacity = go; } });
    const n = Math.round(clamp((s - 0.06) / 0.78) * hairs.length);
    if (n === shown) return;
    const [a, b, on] = n > shown ? [Math.max(0, shown), n, true] : [n, shown, false];
    for (let i = a; i < b; i++) hairs[i].el.style.strokeDashoffset = on ? '0' : '1.1';
    shown = n;
  };
}
function makeLipsRender(svg) {
  const line = $('.lip-line', svg), mid = $('.lip-mid', svg), sweep = $('.lip-sweep', svg), guides = $$('.guide', svg);
  return (s) => {
    guides.forEach((gd) => (gd.style.opacity = (0.75 * clamp(s / 0.1)).toFixed(2)));
    drawTo(line, s / 0.42);
    line.style.opacity = s > 0.005 ? 1 : 0;
    drawTo(mid, (s - 0.22) / 0.26);
    mid.style.opacity = s > 0.22 ? 1 : 0;
    sweep.setAttribute('x', (-520 + 520 * ss((s - 0.4) / 0.5)).toFixed(1));
  };
}
function makeEyeRender(svg) {
  const lids = $$('.eye-lid', svg), iris = $('.eye-iris', svg), clip = $('.liner-clip', svg), lashes = $$('.lashes path', svg), guides = $$('.guide', svg);
  return (s) => {
    guides.forEach((gd) => (gd.style.opacity = (0.75 * clamp(s / 0.1)).toFixed(2)));
    lids.forEach((l, i) => { drawTo(l, (s - i * 0.06) / 0.28); l.style.opacity = s > 0.005 ? 1 : 0; });
    iris.style.opacity = clamp((s - 0.12) / 0.15).toFixed(2);
    clip.setAttribute('width', (290 * ss((s - 0.22) / 0.56)).toFixed(1));
    lashes.forEach((l, i) => { drawTo(l, (s - 0.72 - i * 0.02) / 0.14); l.style.opacity = s > 0.72 ? 1 : 0; });
  };
}

/* ---------------- topo, barra fixa do celular ---------------- */
const top = $('[data-top]');
const onScrollTop = () => top.classList.toggle('is-solid', scrollY > 24);
addEventListener('scroll', onScrollTop, { passive: true }); onScrollTop();

const dock = $('[data-dock]');
if (dock && 'IntersectionObserver' in window) {
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting));
    const heroCta = seen.get($('.hero__actions')), contact = seen.get($('#contato')), foot = seen.get($('.foot'));
    dock.classList.toggle('is-on', heroCta === false && !contact && !foot);
  });
  [$('.hero__actions'), $('#contato'), $('.foot')].forEach((n) => n && io.observe(n));
}

/* ---------------- rolagem contínua: só roda do mouse (desktop); toque nativo ---------------- */
let lenis = null;
function startLenis() {
  if (reduce || !fineMQ.matches || !window.Lenis || lenis) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id === '#conteudo') return;
  const target = id === '#inicio' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  const offset = id === '#inicio' ? 0 : -(top.offsetHeight + 8);
  if (lenis) lenis.scrollTo(id === '#inicio' ? 0 : target, { offset, duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: id === '#inicio' ? 0 : target.getBoundingClientRect().top + scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
  if (id !== '#inicio') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
});

/* ---------------- copiar mensagem (o Direct não aceita texto pronto) ---------------- */
const live = document.createElement('p');
live.className = 'sr-only'; live.setAttribute('role', 'status'); document.body.appendChild(live);
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }
}
$$('[data-copy], [data-copy-from]').forEach((btn) => {
  let timer = 0;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy ?? $(btn.dataset.copyFrom)?.textContent.trim() ?? '';
    const ok = await copyText(text);
    live.textContent = ok ? 'Mensagem copiada. Agora é só colar na conversa do Direct.' : 'Não foi possível copiar automaticamente. Selecione e copie o texto da mensagem.';
    if (!ok) return;
    btn.classList.add('is-done');
    clearTimeout(timer); timer = setTimeout(() => btn.classList.remove('is-done'), 2400);
  });
});

/* ---------------- compositor de mensagem ---------------- */
const composer = $('[data-composer]');
const msg = $('[data-msg]');
const messageFor = (v) => v ? `Oi, Josi! Vim pelo site e gostaria de agendar uma avaliação de ${v}.` : 'Oi, Josi! Vim pelo site e gostaria de entender qual atendimento é indicado para mim.';
composer?.addEventListener('change', () => {
  msg.textContent = messageFor($('input:checked', composer)?.value ?? '');
  $('[data-copy-from]', composer)?.classList.remove('is-done');
});

/* ---------------- lightbox com trilho ---------------- */
const lb = $('[data-lb]');
const tiles = $$('.tile__btn');
let lbIndex = 0, opener = null, animateFn = null;
if (lb && tiles.length) {
  const img = $('[data-lb-img]', lb), count = $('[data-lb-count]', lb), alt = $('[data-lb-alt]', lb), strip = $('[data-lb-strip]', lb);
  tiles.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', `Imagem ${i + 1} de ${tiles.length}`);
    const th = document.createElement('img'); th.src = $('img', t).getAttribute('src'); th.alt = ''; th.width = 54; th.height = 54;
    b.appendChild(th); b.addEventListener('click', () => show(i, true)); strip.appendChild(b);
  });
  const show = (i, anim) => {
    lbIndex = (i + tiles.length) % tiles.length;
    const t = tiles[lbIndex], ti = $('img', t);
    img.src = t.dataset.full; img.width = +t.dataset.w; img.height = +t.dataset.h; img.alt = ti.alt;
    count.textContent = `${lbIndex + 1} / ${tiles.length}`; alt.textContent = ti.alt;
    $$('button', strip).forEach((b, k) => b.setAttribute('aria-current', String(k === lbIndex)));
    if (anim && animateFn && !reduce) animateFn(img, { opacity: [0.4, 1], transform: ['scale(.97)', 'scale(1)'] }, { duration: DUR.panel, ease: EASE_OUT });
  };
  tiles.forEach((t, i) => t.addEventListener('click', () => {
    opener = t; show(i, false); lb.showModal();
    if (animateFn && !reduce) {
      animateFn($('.lb__frame', lb), { clipPath: ['inset(18% 22% round 4px)', 'inset(0% 0% round 0px)'], opacity: [0, 1] }, { duration: 0.42, ease: EASE_OUT });
      animateFn($$('button', strip), { transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.4, delay: (k) => 0.12 + k * 0.04, ease: EASE_OUT });
    }
  }));
  $('[data-lb-prev]', lb).addEventListener('click', () => show(lbIndex - 1, true));
  $('[data-lb-next]', lb).addEventListener('click', () => show(lbIndex + 1, true));
  $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(lbIndex + 1, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(lbIndex - 1, true); }
  });
  lb.addEventListener('close', () => { $$('button', strip).forEach((b) => (b.style.cssText = '')); opener?.focus(); });
}

/* ---------------- lupa de detalhe (só ponteiro fino) ---------------- */
if (fineMQ.matches) {
  const Z = 2.4;
  tiles.forEach((btn) => {
    const im = $('img', btn);
    const lens = document.createElement('span'); lens.className = 'loupe'; lens.setAttribute('aria-hidden', 'true');
    btn.appendChild(lens); btn.classList.add('has-loupe');
    let geo = null;
    const measure = () => {
      const bw = btn.clientWidth, bh = btn.clientHeight, nw = +btn.dataset.w, nh = +btn.dataset.h;
      const s = Math.max(bw / nw, bh / nh), dw = nw * s, dh = nh * s;
      const [px, py] = getComputedStyle(im).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      geo = { dw, dh, ox: (bw - dw) * (isNaN(px) ? 0.5 : px), oy: (bh - dh) * (isNaN(py) ? 0.5 : py) };
      lens.style.backgroundImage = `url("${btn.dataset.full}")`;
      lens.style.backgroundSize = `${dw * Z}px ${dh * Z}px`;
    };
    btn.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; measure(); lens.classList.add('is-on'); lens.style.transform = 'scale(1)'; });
    btn.addEventListener('pointerleave', () => { lens.classList.remove('is-on'); lens.style.transform = 'scale(.6)'; });
    btn.addEventListener('pointermove', (e) => {
      if (!geo || e.pointerType !== 'mouse') return;
      const r = btn.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, R = 85;
      lens.style.left = `${x - R}px`; lens.style.top = `${y - R}px`;
      lens.style.backgroundPosition = `${-((x - geo.ox) * Z - R)}px ${-((y - geo.oy) * Z - R)}px`;
    });
  });
}

/* ------------------------------------------------------------------ */
/* Motion: coreografia                                                 */
/* ------------------------------------------------------------------ */
// Motion 11.11.17 (UMD local em vendor/, global `Motion`); módulos rodam depois dos scripts defer.
const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');

const browHero = heroSvg && makeBrowRender(heroSvg, heroHairs);
const cards = $$('[data-tcard]');
const renderers = cards.map((c, i) => {
  const svg = $('.sheet__svg', c);
  return i === 0 ? makeBrowRender(svg, techHairs) : i === 1 ? makeLipsRender(svg) : makeEyeRender(svg);
});

if (M && reduce) {
  root.classList.add('motion-ready');
} else if (M) {
  const { animate, scroll, inView } = M;
  animateFn = (...a) => animate(...a);
  const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);

  // estados iniciais (só aqui o desenho começa "vazio")
  [...heroHairs, ...techHairs].forEach((h) => hidden(h.el));
  $$('.lip-line, .lip-mid, .eye-lid, .lashes path').forEach(hidden);
  renderers.forEach((r) => r(0));
  $$('.guide, .guide-t', heroSvg).forEach((g) => (g.style.opacity = 0));
  root.classList.add('motion-ready');

  /* ---- HERO: os fios entram um a um (~2 s), depois a folha fica parada ---- */
  const eo = 'cubic-bezier(0.23, 1, 0.32, 1)';
  $$('.guide, .guide-t', heroSvg).forEach((g, i) => g.animate([{ opacity: 0 }, { opacity: 0.75 }], { duration: 500, delay: 120 + i * 60, easing: eo, fill: 'forwards' }));
  const N = heroHairs.length;
  heroHairs.forEach((h, i) => {
    h.el.animate([{ strokeDashoffset: 1.1 }, { strokeDashoffset: 0 }], { duration: 240, delay: 380 + (i / N) * 1650, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
  });
  animate('.hero__photo img', { clipPath: ['inset(6% 8% 6% 8%)', 'inset(0% 0% 0% 0%)'], transform: ['scale(1.06)', 'scale(1)'] }, { duration: 1.3, ease: EASE_IN_OUT });
  animate(heroSheet, { opacity: [0, 1], transform: ['translateY(26px) rotate(-3deg)', 'translateY(0px) rotate(-1.2deg)'] }, { duration: 0.9, delay: 0.1, ease: EASE_OUT });

  /* ---- HERO: pentear os fios com o ponteiro (mola leve, só enquanto há movimento) ---- */
  if (fineMQ.matches && heroSvg) {
    let raf = 0, pt = heroSvg.createSVGPoint();
    const R = 46, MAX = 0.36;
    const tick = () => {
      let busy = false;
      for (const h of heroHairs) {
        if (h.tgt === 0 && h.cur === 0) continue;
        h.cur += (h.tgt - h.cur) * 0.2; h.tgt *= 0.93;
        if (Math.abs(h.cur) < 0.002 && Math.abs(h.tgt) < 0.002) { h.cur = 0; h.tgt = 0; h.el.removeAttribute('transform'); continue; }
        busy = true;
        h.el.setAttribute('transform', `rotate(${(h.cur * 57.2958).toFixed(2)} ${h.mx.toFixed(1)} ${h.my.toFixed(1)})`);
      }
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    heroSvg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const sp = Math.hypot(e.movementX, e.movementY);
      if (sp < 0.6) return;
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(heroSvg.getScreenCTM().inverse());
      const dir = Math.atan2(e.movementY, e.movementX), gain = Math.min(sp / 14, 1) * 0.5;
      for (const h of heroHairs) {
        const d = Math.hypot(h.mx - p.x, h.my - p.y);
        if (d > R) continue;
        let delta = dir - h.ang; delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        const f = (1 - d / R) ** 2;
        h.tgt = clamp(h.tgt + clamp(delta, -0.5, 0.5) * f * gain, -MAX, MAX);
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }

  /* ---- HERO: saída ligada à rolagem (só desktop) ---- */
  const heroImg = $('.hero__photo img');
  scroll((p) => {
    if (!deskMQ.matches) return;
    const t = prog(p);
    heroImg.style.translate = `0 ${(t * 7).toFixed(2)}%`;
    heroSheet.style.translate = `0 ${(t * -60).toFixed(1)}px`;
  }, { target: $('[data-hero]'), offset: ['start start', 'end start'] });

  /* ---- CENA PRESA: três técnicas (desktop) ---- */
  const tech = $('[data-tech]');
  const idx = $$('[data-tech-index] li');
  const rail = $('[data-tech-rail]');
  let current = 0;
  const parts = (c) => ({ sheet: $('.sheet', c), photo: $('.tcard__photo', c), crop: $('.crop', c), text: $('.tcard__text', c), sw: $$('.swatches span', c) });
  const enter = (c, dir) => {
    const p = parts(c);
    animate(p.sheet, { opacity: [0, 1], transform: [`translateY(${24 * dir}px) rotate(${dir * 1.5}deg)`, 'translateY(0px) rotate(0deg)'] }, { duration: DUR.scene, ease: EASE_OUT });
    // ed-image-crop: as guias marcam o enquadramento e a foto se expande a partir dele
    animate(p.photo, { clipPath: ['inset(16% 20% 16% 20%)', 'inset(0% 0% 0% 0%)'] }, { duration: 0.8, ease: EASE_IN_OUT });
    animate($('img', p.photo), { transform: ['scale(1.14)', 'scale(1)'] }, { duration: 1, ease: EASE_OUT });
    animate(p.crop, { opacity: [0, 1, 1, 0], transform: ['scale(.62)', 'scale(1)', 'scale(1)', 'scale(1)'] }, { duration: 1.2, times: [0, 0.4, 0.75, 1], ease: 'easeOut' });
    animate(p.text, { opacity: [0, 1], transform: [`translateY(${20 * dir}px)`, 'translateY(0px)'] }, { duration: 0.5, delay: 0.1, ease: EASE_OUT });
    // ed-swatch-story: as amostras descem como pigmento e assentam na régua
    animate(p.sw, { opacity: [0, 1], transform: ['translateY(-34px) scaleY(.25)', 'translateY(0px) scaleY(1)'] }, { ...SPRING_SOFT, delay: (k) => 0.18 + k * 0.06 });
  };
  const leave = (c, dir) => {
    const p = parts(c);
    c.classList.add('is-leaving');
    animate(p.sw, { opacity: 0, transform: 'translateY(0px) scaleY(.08)' }, { duration: 0.25, ease: EASE_OUT });
    animate([p.sheet, p.text], { opacity: 0, transform: `translateY(${-18 * dir}px)` }, { duration: 0.3, ease: EASE_OUT });
    animate(p.photo, { clipPath: 'inset(10% 14% 10% 14%)', opacity: 0 }, { duration: 0.35, ease: EASE_OUT })
      .then(() => { c.classList.remove('is-leaving'); p.photo.style.opacity = ''; });
  };
  const setCard = (i) => {
    if (i === current) return;
    const dir = i > current ? 1 : -1;
    leave(cards[current], dir);
    cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
    idx.forEach((li, k) => li.classList.toggle('is-on', k === i));
    current = i;
    enter(cards[i], dir);
  };
  let sceneOn = false;
  scroll((p) => {
    if (!deskMQ.matches) return;
    sceneOn = true;
    const t = prog(p);
    renderers.forEach((r, i) => r(clamp((t - i / 3) * 3 * 1.18)));
    rail.style.transform = `scaleX(${t.toFixed(4)})`;
    setCard(Math.min(2, Math.floor(clamp(t, 0, 0.999) * 3)));
  }, { target: tech, offset: ['start start', 'end end'] });

  /* ---- celular/tablet: cada técnica se desenha ao entrar na tela ---- */
  cards.forEach((c, i) => {
    inView(c, () => {
      if (deskMQ.matches) return;
      animate(0, 1, { duration: i === 0 ? 1.8 : 1.6, ease: [0.45, 0, 0.2, 1], onUpdate: (v) => renderers[i](v) });
      const p = parts(c);
      animate(p.photo, { clipPath: ['inset(12% 16% 12% 16%)', 'inset(0% 0% 0% 0%)'] }, { duration: 0.9, ease: EASE_IN_OUT });
      animate(p.sw, { opacity: [0, 1], transform: ['translateY(-24px) scaleY(.3)', 'translateY(0px) scaleY(1)'] }, { ...SPRING_SOFT, delay: (k) => 0.3 + k * 0.06 });
    }, { amount: 0.3 });
  });
  deskMQ.addEventListener('change', () => {
    renderers.forEach((r) => r(1));
    cards.forEach((c) => $$('.sheet, .tcard__text, .tcard__photo, .swatches span', c).forEach((n) => { n.style.opacity = ''; n.style.transform = ''; n.style.clipPath = ''; }));
  });

  /* ---- títulos: revelação por máscara (line-mask) ---- */
  $$('[data-mask]').forEach((h) => {
    if (h.getBoundingClientRect().top < innerHeight) return;
    h.style.clipPath = 'inset(0% 0% 100% 0%)'; h.style.transform = 'translateY(28px)';
    // observa o pai: um alvo recortado por clip-path não conta como visível
    inView(h.parentElement, () => { animate(h, { clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% -14% 0%)'], transform: 'translateY(0px)' }, { duration: 1, ease: EASE_OUT }); }, { amount: 0.2 });
  });

  /* ---- galeria: cada recorte se abre a partir de um enquadramento menor ---- */
  const mosaic = $('[data-mosaic]');
  if (mosaic && mosaic.getBoundingClientRect().top > innerHeight) {
    tiles.forEach((t) => (t.style.clipPath = 'inset(14% 14% 14% 14%)'));
    inView(mosaic, () => {
      animate(tiles, { clipPath: 'inset(0% 0% 0% 0%)' }, { duration: 1.05, delay: (k) => [0, 0.12, 0.06, 0.2][k] ?? k * 0.08, ease: EASE_IN_OUT });
    }, { amount: 0.15 });
  }

  /* ---- como funciona: a linha de pigmento liga as etapas ---- */
  const howLine = $('[data-how-line]');
  const steps = $$('.how__steps li');
  if (howLine) {
    hidden(howLine);
    scroll((p) => {
      const t = prog(p);
      drawTo(howLine, t);
      steps.forEach((s, i) => s.classList.toggle('is-on', deskMQ.matches ? t >= i / 4 + 0.04 : s._seen));
    }, { target: $('.how__track'), offset: ['start 0.85', 'end 0.55'] });
    steps.forEach((s) => inView(s, () => { s._seen = true; if (!deskMQ.matches) s.classList.add('is-on'); }, { amount: 0.6 }));
  }
}
