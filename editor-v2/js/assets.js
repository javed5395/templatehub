/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — VISUAL ASSETS (harvested from v1)
   Frame silhouettes + landscape preview painter + real theme presets.
   Pure data & pure-SVG builders. No engine access.
   ═══════════════════════════════════════════════════════════════════════ */
window.RBAssets = (function () {
var FRAME_DEFS = {
  square:  { label: 'Square',   w: 1000, h: 1000, d: 'M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z' },
  landscape:{label: 'Wide',     w: 1000, h: 625,  d: 'M 0 0 L 1000 0 L 1000 625 L 0 625 Z' },
  portrait:{ label: 'Tall',     w: 750,  h: 1000, d: 'M 0 0 L 750 0 L 750 1000 L 0 1000 Z' },
  rounded: { label: 'Rounded',  w: 1000, h: 1000,
    d: 'M 120 0 L 880 0 C 946 0 1000 54 1000 120 L 1000 880 C 1000 946 946 1000 880 1000 '
     + 'L 120 1000 C 54 1000 0 946 0 880 L 0 120 C 0 54 54 0 120 0 Z' },
  circle:  { label: 'Circle',   w: 1000, h: 1000,
    d: 'M 500 0 C 776 0 1000 224 1000 500 C 1000 776 776 1000 500 1000 '
     + 'C 224 1000 0 776 0 500 C 0 224 224 0 500 0 Z' },
  diamond: { label: 'Diamond',  w: 1000, h: 1000, d: 'M 500 0 L 1000 500 L 500 1000 L 0 500 Z' },
  triangle:{ label: 'Triangle', w: 1000, h: 1000, d: 'M 500 0 L 1000 1000 L 0 1000 Z' },
  hexagon: { label: 'Hexagon',  w: 1000, h: 1000,
    d: 'M 500 0 L 933 250 L 933 750 L 500 1000 L 67 750 L 67 250 Z' },
  arch:    { label: 'Arch',     w: 1000, h: 1000,
    d: 'M 0 500 C 0 224 224 0 500 0 C 776 0 1000 224 1000 500 L 1000 1000 L 0 1000 Z' },
  heart:   { label: 'Heart',    w: 1000, h: 1000,
    d: 'M 500 1000 C 220 780 0 600 0 360 C 0 180 140 60 300 60 C 400 60 460 110 500 180 '
     + 'C 540 110 600 60 700 60 C 860 60 1000 180 1000 360 C 1000 600 780 780 500 1000 Z' },

  /* ── Device frames ─────────────────────────────────────────
     A device frame is the same picture-filled aperture as any other
     frame, plus decorative bezel paths that are NOT photo targets.
     deco: [pathData, colour, 'back'|'front'] — back paints under the
     photo, front paints over it (browser chrome, notch, and so on). */
  phone: { label: 'Phone', w: 520, h: 1000, device: true,
    d: 'M 40 70 H 480 V 930 H 40 Z',
    deco: [
      ['M 90 0 H 430 A 90 90 0 0 1 520 90 V 910 A 90 90 0 0 1 430 1000 H 90 A 90 90 0 0 1 0 910 V 90 A 90 90 0 0 1 90 0 Z', '#1F2328', 'back'],
      ['M 200 26 H 320 A 16 16 0 0 1 320 58 H 200 A 16 16 0 0 1 200 26 Z', '#3A4048', 'front'],
      ['M 210 952 H 310 A 12 12 0 0 1 310 976 H 210 A 12 12 0 0 1 210 952 Z', '#3A4048', 'front'],
    ]},

  tablet: { label: 'Tablet', w: 720, h: 1000, device: true,
    d: 'M 46 76 H 674 V 924 H 46 Z',
    deco: [
      ['M 60 0 H 660 A 60 60 0 0 1 720 60 V 940 A 60 60 0 0 1 660 1000 H 60 A 60 60 0 0 1 0 940 V 60 A 60 60 0 0 1 60 0 Z', '#23272E', 'back'],
      ['M 360 30 A 14 14 0 1 1 359.9 30 Z', '#4A5058', 'front'],
      ['M 360 950 A 22 22 0 1 1 359.9 950 Z', '#4A5058', 'front'],
    ]},

  laptop: { label: 'Laptop', w: 1000, h: 660, device: true,
    d: 'M 118 34 H 882 V 512 H 118 Z',
    deco: [
      ['M 100 0 H 900 A 18 18 0 0 1 918 18 V 528 A 18 18 0 0 1 900 546 H 100 A 18 18 0 0 1 82 528 V 18 A 18 18 0 0 1 100 0 Z', '#23272E', 'back'],
      ['M 0 546 H 1000 L 962 626 A 26 26 0 0 1 938 642 H 62 A 26 26 0 0 1 38 626 Z', '#33383F', 'front'],
      ['M 430 546 H 570 L 560 574 H 440 Z', '#1F2328', 'front'],
    ]},

  browser: { label: 'Browser', w: 1000, h: 720, device: true,
    d: 'M 12 96 H 988 V 708 H 12 Z',
    deco: [
      ['M 16 0 H 984 A 16 16 0 0 1 1000 16 V 704 A 16 16 0 0 1 984 720 H 16 A 16 16 0 0 1 0 704 V 16 A 16 16 0 0 1 16 0 Z', '#E4E6EB', 'back'],
      ['M 46 34 A 16 16 0 1 1 45.9 34 Z', '#FF5F57', 'front'],
      ['M 96 34 A 16 16 0 1 1 95.9 34 Z', '#FEBC2E', 'front'],
      ['M 146 34 A 16 16 0 1 1 145.9 34 Z', '#28C840', 'front'],
      ['M 210 20 H 900 A 14 14 0 0 1 914 34 V 48 A 14 14 0 0 1 900 62 H 210 A 14 14 0 0 1 196 48 V 34 A 14 14 0 0 1 210 20 Z', '#FFFFFF', 'front'],
    ]},

  polaroid: { label: 'Polaroid', w: 840, h: 1000, device: true,
    d: 'M 60 60 H 780 V 760 H 60 Z',
    deco: [
      ['M 0 0 H 840 V 1000 H 0 Z', '#FFFFFF', 'back'],
      ['M 60 60 H 780 V 760 H 60 Z', '#D9DDE3', 'back'],
    ]},
};
var THEME_PRESETS = [
  { id:'clean',   name:'Clean',    bg:'#FFFFFF', surface:'#F1F5F9', accent:'#7C3AED',
    heading:'#0F172A', body:'#475569', hFont:'DM Sans',    bFont:'DM Sans' },
  { id:'midnight',name:'Midnight', bg:'#0B0C0E', surface:'#1E293B', accent:'#A78BFA',
    heading:'#F8FAFC', body:'#CBD5E1', hFont:'Montserrat', bFont:'Lato' },
  { id:'paper',   name:'Paper',    bg:'#FAF7F2', surface:'#EFE9DF', accent:'#993C1D',
    heading:'#2C2C2A', body:'#5F5E5A', hFont:'PT Serif',   bFont:'PT Sans' },
  { id:'ocean',   name:'Ocean',    bg:'#F0F7FF', surface:'#DBEAFE', accent:'#185FA5',
    heading:'#042C53', body:'#33556F', hFont:'Raleway',    bFont:'Open Sans' },
  { id:'forest',  name:'Forest',   bg:'#F6FAF2', surface:'#E3EFD6', accent:'#3B6D11',
    heading:'#173404', body:'#4A5B3C', hFont:'Roboto Slab',bFont:'Roboto' },
  { id:'mono',    name:'Mono',     bg:'#FFFFFF', surface:'#F1EFE8', accent:'#2C2C2A',
    heading:'#0B0B0B', body:'#5F5E5A', hFont:'Oswald',     bFont:'Roboto Mono' },
  { id:'sunset',  name:'Sunset',   bg:'#FFF8F3', surface:'#FFE9DC', accent:'#D85A30',
    heading:'#4A1B0C', body:'#7A5244', hFont:'Playfair Display', bFont:'Lato' },
  { id:'grape',   name:'Grape',    bg:'#1A0B2E', surface:'#2D1650', accent:'#C4B5FD',
    heading:'#FFFFFF', body:'#C9BEDD', hFont:'Poppins',    bFont:'Poppins' },

  /* ── Designful additions — dark luxe, jewel tones, warm editorial ── */
  { id:'hexa',    name:'Hexa',     bg:'#140A24', surface:'#271640', accent:'#EC6FA9',
    heading:'#FBEFFF', body:'#C9BEDD', hFont:'Playfair Display', bFont:'Poppins' },
  { id:'aurora',  name:'Aurora',   bg:'#0B1026', surface:'#17213F', accent:'#5EE6C6',
    heading:'#EAF2FF', body:'#AEB9D6', hFont:'Sora',        bFont:'Inter' },
  { id:'ember',   name:'Ember',    bg:'#160E0A', surface:'#2A1A10', accent:'#F59E0B',
    heading:'#FFF3E4', body:'#D8C3AC', hFont:'Playfair Display', bFont:'Lato' },
  { id:'luxe',    name:'Luxe',     bg:'#0C0C0E', surface:'#1C1B1F', accent:'#D4AF37',
    heading:'#F5EFE0', body:'#BDB6A6', hFont:'Cormorant Garamond', bFont:'Jost' },
  { id:'plum',    name:'Plum',     bg:'#1A1024', surface:'#2C1B3E', accent:'#C084FC',
    heading:'#F6EEFF', body:'#CDBDE0', hFont:'Marcellus',   bFont:'Poppins' },
  { id:'cobalt',  name:'Cobalt',   bg:'#F2F6FF', surface:'#DCE8FF', accent:'#2F5BEA',
    heading:'#0A1B44', body:'#3C4A72', hFont:'Poppins',     bFont:'Inter' },
  { id:'blush',   name:'Blush',    bg:'#FFF5F8', surface:'#FCE1EC', accent:'#E84D8A',
    heading:'#4B1528', body:'#8A5568', hFont:'Playfair Display', bFont:'Lato' },
  { id:'candy',   name:'Candy',    bg:'#FFF7FB', surface:'#FDE7F4', accent:'#B5179E',
    heading:'#3B0A46', body:'#7A4E86', hFont:'Poppins',     bFont:'Poppins' },
  { id:'coral',   name:'Coral',    bg:'#FFF6F2', surface:'#FFE0D3', accent:'#FF6B4A',
    heading:'#4A1B0C', body:'#8A5A48', hFont:'Fraunces',    bFont:'Nunito Sans' },
  { id:'sand',    name:'Sand',     bg:'#FBF6EC', surface:'#F0E6D2', accent:'#C2884E',
    heading:'#3A2A16', body:'#6B5A44', hFont:'DM Serif Display', bFont:'DM Sans' },
  { id:'nordic',  name:'Nordic',   bg:'#F4F6F8', surface:'#E2E8EF', accent:'#3E6E8E',
    heading:'#14212B', body:'#3E4E5A', hFont:'Raleway',     bFont:'Open Sans' },
  { id:'teal',    name:'Teal',     bg:'#F0FBFA', surface:'#CFF3EC', accent:'#12A5A0',
    heading:'#04342C', body:'#3A5C55', hFont:'Poppins',     bFont:'Inter' },

  /* ── Multi-colour (gradient) backgrounds — bgA → bgB across the slide ── */
  { id:'citrus',  name:'Citrus',   bgA:'#FEF08A', bgB:'#BBF7D0', bgDeg:135, bg:'#FEF3C7',
    surface:'#FFFFFF', accent:'#16A34A', heading:'#1A2E05', body:'#3F5A22',
    hFont:'Poppins', bFont:'Inter' },
  { id:'dawn',    name:'Dawn',     bgA:'#FDE1D3', bgB:'#E9D5FF', bgDeg:135, bg:'#FBE3E8',
    surface:'#FFFFFF', accent:'#DB2777', heading:'#3B0A46', body:'#6B4A72',
    hFont:'Playfair Display', bFont:'Lato' },
  { id:'lagoon',  name:'Lagoon',   bgA:'#A7F3D0', bgB:'#BAE6FD', bgDeg:135, bg:'#CFF3EC',
    surface:'#FFFFFF', accent:'#0EA5E9', heading:'#043145', body:'#2C5468',
    hFont:'Sora', bFont:'Inter' },
  { id:'nebula',  name:'Nebula',   bgA:'#2A1042', bgB:'#0B1B45', bgDeg:135, bg:'#1A103A',
    surface:'#2A1B45', accent:'#E879F9', heading:'#F5EEFF', body:'#C6BBDD',
    hFont:'Marcellus', bFont:'Poppins' },
  { id:'mango',   name:'Mango',    bgA:'#FDBA74', bgB:'#FCA5A5', bgDeg:135, bg:'#FFE4CC',
    surface:'#FFFFFF', accent:'#EA580C', heading:'#4A1B0C', body:'#7A3E24',
    hFont:'Fraunces', bFont:'Nunito Sans' },
];
var FRAME_SCENES = [
  { s0:'#FFB27A', s1:'#FFD9C2', s2:'#FFF1E8', sun:'#FFC24D', far:'#EA6A52', near:'#C13327', cloud:'#FFF6EF' },
  { s0:'#B39DFF', s1:'#DBD2FF', s2:'#F1EEFF', sun:'#FDE68A', far:'#8B5CF6', near:'#5B21B6', cloud:'#FFFFFF' },
  { s0:'#F7B8D2', s1:'#FBD6E5', s2:'#FDEAF2', sun:'#FFD36E', far:'#DB2777', near:'#831843', cloud:'#FFFFFF' },
  { s0:'#FFD98A', s1:'#FFE9B8', s2:'#FFF6E4', sun:'#F59E0B', far:'#E8590C', near:'#9A3412', cloud:'#FFFDF5' },
  { s0:'#7FC5E8', s1:'#BFE3F5', s2:'#EAF6FD', sun:'#FFE08A', far:'#2F8FD6', near:'#12518A', cloud:'#FFFFFF' }
];
var _clipN = 0;
function frameScenePaint(pathD, W, H, pi) {
  var id = ++_clipN, cid = 'v2fc' + id, sky = 'v2fs' + id;
  var P = FRAME_SCENES[(pi || 0) % FRAME_SCENES.length];
  return '<defs><linearGradient id="' + sky + '" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0" stop-color="' + P.s0 + '"/><stop offset="0.55" stop-color="' + P.s1 + '"/>'
    + '<stop offset="1" stop-color="' + P.s2 + '"/></linearGradient>'
    + '<clipPath id="' + cid + '"><path d="' + pathD + '"/></clipPath></defs>'
    + '<g clip-path="url(#' + cid + ')">'
    + '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#' + sky + ')"/>'
    + '<circle cx="' + (W * 0.74) + '" cy="' + (H * 0.24) + '" r="' + (Math.min(W, H) * 0.11) + '" fill="' + P.sun + '"/>'
    + '<path d="M0 ' + (H * 0.66) + ' Q ' + (W * 0.32) + ' ' + (H * 0.5) + ' ' + (W * 0.62) + ' ' + (H * 0.64)
    + ' Q ' + (W * 0.84) + ' ' + (H * 0.72) + ' ' + W + ' ' + (H * 0.6) + ' V ' + H + ' H 0 Z" fill="' + P.far + '"/>'
    + '<path d="M0 ' + (H * 0.8) + ' Q ' + (W * 0.42) + ' ' + (H * 0.66) + ' ' + W + ' ' + (H * 0.82)
    + ' V ' + H + ' H 0 Z" fill="' + P.near + '"/>'
    + '<g fill="' + P.cloud + '" opacity="0.9">'
    + '<ellipse cx="' + (W * 0.26) + '" cy="' + (H * 0.28) + '" rx="' + (W * 0.14) + '" ry="' + (H * 0.07) + '"/>'
    + '<ellipse cx="' + (W * 0.37) + '" cy="' + (H * 0.25) + '" rx="' + (W * 0.10) + '" ry="' + (H * 0.06) + '"/>'
    + '</g></g>'
    + '<path d="' + pathD + '" fill="none" stroke="rgba(15,23,42,0.12)" stroke-width="' + (Math.max(W, H) * 0.012) + '"/>';
}
function framePreviewSvg(kind, size, pi) {
  var def = FRAME_DEFS[kind];
  if (!def) return '';
  var vb = '0 0 ' + def.w + ' ' + def.h;
  var h = Math.round(size * def.h / def.w);
  var parts = '';
  (def.deco || []).filter(function (d) { return d[2] !== 'front'; })
    .forEach(function (d) { parts += '<path d="' + d[0] + '" fill="' + d[1] + '"/>'; });
  parts += frameScenePaint(def.d, def.w, def.h, pi);
  (def.deco || []).filter(function (d) { return d[2] === 'front'; })
    .forEach(function (d) { parts += '<path d="' + d[0] + '" fill="' + d[1] + '"/>'; });
  return '<svg viewBox="' + vb + '" width="' + size + '" height="' + h + '">' + parts + '</svg>';
}
/* colourful shape previews for the Elements panel */
var SHAPE_COLOURS = { rect:'#5B9BD5', rounded:'#70AD47', circle:'#ED7D31', triangle:'#8B5CF6',
  diamond:'#DB2777', hexagon:'#0D9488', star:'#FFC000', arrow:'#E8536F', line:'#64748B' };
function shapePreviewSvg(kind, size) {
  var c = SHAPE_COLOURS[kind] || '#5B9BD5';
  var d = {
    rect: '<rect x="6" y="10" width="38" height="30" rx="2"/>',
    rounded: '<rect x="6" y="10" width="38" height="30" rx="9"/>',
    circle: '<circle cx="25" cy="25" r="17"/>',
    triangle: '<path d="M25 7 45 42 5 42Z"/>',
    diamond: '<path d="M25 5 45 25 25 45 5 25Z"/>',
    hexagon: '<path d="M25 5 42 15 42 35 25 45 8 35 8 15Z"/>',
    star: '<path d="M25 5l5.6 11.9 13 1.7-9.5 9 2.4 12.9L25 34.3l-11.5 6.2 2.4-12.9-9.5-9 13-1.7z"/>',
    arrow: '<path d="M5 20h24v-8l16 13-16 13v-8H5z"/>',
    line: '<rect x="4" y="23" width="42" height="4" rx="2"/>'
  }[kind] || '';
  return '<svg viewBox="0 0 50 50" width="' + size + '" height="' + size + '" fill="' + c + '">' + d + '</svg>';
}
return { FRAME_DEFS: FRAME_DEFS, THEME_PRESETS: THEME_PRESETS,
         framePreviewSvg: framePreviewSvg, shapePreviewSvg: shapePreviewSvg };
})();
