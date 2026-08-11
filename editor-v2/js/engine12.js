/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 12 · GRAPHICS + ANIMATED STICKERS
   owner: Fable.  Verbatim v1 libraries:
   · STICKER_LIB — flat multi-colour sticker art incl. ANIMATED ones whose
     motion plays live on the canvas (spin / pulse / bounce / float); the
     resting transform is stashed so saves and exports never record a
     half-way animation frame.
   · ILLO_LIB — illustrations painted by PALETTE ROLE, recolourable in 8
     colour schemes without losing depth.
   ═══════════════════════════════════════════════════════════════════════ */

var STICKER_LIB = [
  /* ── Emoji ─────────────────────────────────────────────── */
  { n:'Grin', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M32 38 A6 8 0 1 1 31.9 38 Z','#3E2723'],
    ['M68 38 A6 8 0 1 1 67.9 38 Z','#3E2723'],
    ['M26 58 A24 24 0 0 0 74 58 Z','#3E2723'],
    ['M34 66 A16 16 0 0 0 66 66 Z','#FF5252'],
  ]},
  { n:'Heart eyes', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M32 48 C24 42 20 38 20 33 A6 6 0 0 1 32 30 A6 6 0 0 1 44 33 C44 38 40 42 32 48 Z','#F4436C'],
    ['M68 48 C60 42 56 38 56 33 A6 6 0 0 1 68 30 A6 6 0 0 1 80 33 C80 38 76 42 68 48 Z','#F4436C'],
    ['M30 62 A22 22 0 0 0 70 62 Z','#3E2723'],
  ]},
  { n:'Cool', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M14 34 H86 V40 H14 Z','#263238'],
    ['M18 38 H44 V52 A13 13 0 0 1 18 52 Z','#263238'],
    ['M56 38 H82 V52 A13 13 0 0 1 56 52 Z','#263238'],
    ['M32 68 A20 20 0 0 0 68 68','#3E2723','st'],
  ]},
  { n:'Wink', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M26 38 A6 8 0 1 1 25.9 38 Z','#3E2723'],
    ['M60 40 A10 6 0 0 1 78 40','#3E2723','st'],
    ['M30 62 A22 20 0 0 0 70 62 Z','#3E2723'],
  ]},
  { n:'Party', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M30 40 A5 7 0 1 1 29.9 40 Z','#3E2723'],
    ['M62 40 A5 7 0 1 1 61.9 40 Z','#3E2723'],
    ['M30 60 A22 22 0 0 0 74 60 Z','#3E2723'],
    ['M74 4 L96 26 L70 30 Z','#42A5F5'],
    ['M12 16 A4 4 0 1 1 11.9 16 Z','#EC407A'],
    ['M88 56 A4 4 0 1 1 87.9 56 Z','#66BB6A'],
  ]},
  { n:'Thinking', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M30 38 A5 7 0 1 1 29.9 38 Z','#3E2723'],
    ['M66 38 A5 7 0 1 1 65.9 38 Z','#3E2723'],
    ['M36 68 H64','#3E2723','st'],
    ['M62 74 A9 9 0 1 1 61.9 74 Z','#FFB74D'],
  ]},

  /* ── Social ────────────────────────────────────────────── */
  { n:'Heart', c:'Social', p:[
    ['M50 90 C22 66 6 52 6 34 A20 20 0 0 1 50 22 A20 20 0 0 1 94 34 C94 52 78 66 50 90 Z','#F4436C'],
    ['M30 34 A8 8 0 0 1 42 28','#FFFFFF','st'],
  ]},
  { n:'Thumbs up', c:'Social', p:[
    ['M28 44 H44 L52 16 A9 9 0 0 1 64 24 L60 42 H84 A8 8 0 0 1 92 52 L84 82 A10 10 0 0 1 74 90 H28 Z','#42A5F5'],
    ['M8 44 H28 V90 H8 Z','#1E88E5'],
  ]},
  { n:'Star', c:'Social', p:[
    ['M50 4 L62 36 L96 38 L70 60 L78 94 L50 76 L22 94 L30 60 L4 38 L38 36 Z','#FFC107'],
  ]},
  { n:'Comment', c:'Social', p:[
    ['M10 12 H90 V68 H44 L24 88 V68 H10 Z','#7C3AED'],
    ['M28 34 A5 5 0 1 1 27.9 34 Z','#FFFFFF'],
    ['M50 34 A5 5 0 1 1 49.9 34 Z','#FFFFFF'],
    ['M72 34 A5 5 0 1 1 71.9 34 Z','#FFFFFF'],
  ]},
  { n:'Fire', c:'Social', p:[
    ['M52 4 C58 26 82 34 82 58 A32 32 0 0 1 18 58 C18 44 28 38 32 26 C40 38 44 40 48 34 C52 28 50 16 52 4 Z','#FF7043'],
    ['M52 44 C56 56 66 58 66 68 A16 16 0 0 1 34 68 C34 60 42 56 44 48 C48 54 50 52 52 44 Z','#FFCA28'],
  ]},
  { n:'Bell', c:'Social', p:[
    ['M50 8 A8 8 0 0 1 58 16 A26 26 0 0 1 76 40 V64 L86 76 H14 L24 64 V40 A26 26 0 0 1 42 16 A8 8 0 0 1 50 8 Z','#FFB300'],
    ['M38 80 A12 12 0 0 0 62 80 Z','#F57C00'],
  ]},
  { n:'Check badge', c:'Social', p:[
    ['M50 4 L62 14 L78 12 L82 28 L96 36 L88 50 L96 64 L82 72 L78 88 L62 86 L50 96 L38 86 L22 88 L18 72 L4 64 L12 50 L4 36 L18 28 L22 12 L38 14 Z','#22C55E'],
    ['M32 50 L44 62 L70 36','#FFFFFF','st'],
  ]},
  { n:'New', c:'Social', p:[
    ['M10 26 H90 A8 8 0 0 1 98 34 V66 A8 8 0 0 1 90 74 H10 A8 8 0 0 1 2 66 V34 A8 8 0 0 1 10 26 Z','#EF4444'],
    ['M18 62 V38 L34 62 V38 M44 38 H60 M44 50 H56 M44 62 H60 M68 38 L72 62 L78 46 L84 62 L88 38','#FFFFFF','st'],
  ]},

  /* ── Decorative ────────────────────────────────────────── */
  { n:'Sparkle', c:'Decorative', p:[
    ['M50 4 C54 30 64 40 90 44 C64 48 54 58 50 84 C46 58 36 48 10 44 C36 40 46 30 50 4 Z','#A78BFA'],
    ['M82 68 C84 78 88 82 96 84 C88 86 84 90 82 98 C80 90 76 86 68 84 C76 82 80 78 82 68 Z','#DDD6FE'],
  ]},
  { n:'Confetti', c:'Decorative', p:[
    ['M12 10 H26 V24 H12 Z','#F4436C'],
    ['M74 6 L88 14 L80 28 Z','#42A5F5'],
    ['M20 60 A7 7 0 1 1 19.9 60 Z','#FFC107'],
    ['M64 48 H80 V56 H64 Z','#22C55E'],
    ['M44 76 L56 84 L44 92 L32 84 Z','#A78BFA'],
    ['M86 66 A6 6 0 1 1 85.9 66 Z','#FF7043'],
  ]},
  { n:'Tape', c:'Decorative', p:[
    ['M6 38 L94 24 L98 52 L10 66 Z','#FDE68A'],
    ['M6 38 L18 42 L6 46 Z','#FCD34D'],
    ['M98 52 L86 48 L98 44 Z','#FCD34D'],
  ]},
  { n:'Ribbon banner', c:'Decorative', p:[
    ['M14 22 H86 V62 H72 L50 78 L28 62 H14 Z','#7C3AED'],
    ['M14 22 L2 34 L14 40 Z','#5B21B6'],
    ['M86 22 L98 34 L86 40 Z','#5B21B6'],
  ]},
  { n:'Quote', c:'Decorative', p:[
    ['M12 20 H42 V50 A28 28 0 0 1 14 78 V64 A14 14 0 0 0 28 50 H12 Z','#334155'],
    ['M56 20 H86 V50 A28 28 0 0 1 58 78 V64 A14 14 0 0 0 72 50 H56 Z','#334155'],
  ]},
  { n:'Arrow doodle', c:'Decorative', p:[
    ['M8 76 C28 76 30 26 52 26 C70 26 68 60 86 56','#0F172A','st'],
    ['M76 46 L90 54 L76 64','#0F172A','st'],
  ]},
  { n:'Burst', c:'Decorative', p:[
    ['M50 2 L58 26 L80 12 L74 38 L98 40 L78 54 L94 74 L68 70 L66 96 L50 78 L34 96 L32 70 L6 74 L22 54 L2 40 L26 38 L20 12 L42 26 Z','#FF7043'],
    ['M50 30 A18 18 0 1 1 49.9 30 Z','#FFCA28'],
  ]},
  { n:'Pin', c:'Decorative', p:[
    ['M50 6 A30 30 0 0 1 80 36 C80 58 50 94 50 94 C50 94 20 58 20 36 A30 30 0 0 1 50 6 Z','#EF4444'],
    ['M50 22 A13 13 0 1 1 49.9 22 Z','#FFFFFF'],
  ]},

  /* ── Animated ──────────────────────────────────────────── */
  { n:'Spin star', c:'Animated', anim:'spin', p:[
    ['M50 4 L62 36 L96 38 L70 60 L78 94 L50 76 L22 94 L30 60 L4 38 L38 36 Z','#FFC107'],
    ['M50 30 L56 44 L70 45 L59 54 L62 68 L50 60 L38 68 L41 54 L30 45 L44 44 Z','#FFE082'],
  ]},
  { n:'Pulse heart', c:'Animated', anim:'pulse', p:[
    ['M50 90 C22 66 6 52 6 34 A20 20 0 0 1 50 22 A20 20 0 0 1 94 34 C94 52 78 66 50 90 Z','#F4436C'],
  ]},
  { n:'Bounce arrow', c:'Animated', anim:'bounce', p:[
    ['M36 6 H64 V54 H84 L50 94 L16 54 H36 Z','#42A5F5'],
  ]},
  { n:'Float sparkle', c:'Animated', anim:'float', p:[
    ['M50 6 C54 32 64 42 90 46 C64 50 54 60 50 86 C46 60 36 50 10 46 C36 42 46 32 50 6 Z','#A78BFA'],
  ]},
  { n:'Spin sun', c:'Animated', anim:'spin', p:[
    ['M50 26 A24 24 0 1 1 49.9 26 Z','#FFC107'],
    ['M50 2 L56 16 H44 Z M50 98 L44 84 H56 Z M2 50 L16 44 V56 Z M98 50 L84 56 V44 Z','#FFB300'],
    ['M16 16 L30 22 L22 30 Z M84 84 L70 78 L78 70 Z M84 16 L78 30 L70 22 Z M16 84 L22 70 L30 78 Z','#FFB300'],
  ]},
  { n:'Pulse dot', c:'Animated', anim:'pulse', p:[
    ['M50 10 A40 40 0 1 1 49.9 10 Z','#DDD6FE'],
    ['M50 28 A22 22 0 1 1 49.9 28 Z','#7C3AED'],
  ]},
];

var ILLO_PALETTES = [
  { n:'Violet',  c:['#3C1E7A','#7C3AED','#A78BFA','#DDD6FE','#F5F3FF'] },
  { n:'Teal',    c:['#04342C','#0F6E56','#1D9E75','#9FE1CB','#E1F5EE'] },
  { n:'Coral',   c:['#4A1B0C','#993C1D','#D85A30','#F5C4B3','#FAECE7'] },
  { n:'Blue',    c:['#042C53','#185FA5','#378ADD','#B5D4F4','#E6F1FB'] },
  { n:'Amber',   c:['#412402','#854F0B','#BA7517','#FAC775','#FAEEDA'] },
  { n:'Pink',    c:['#4B1528','#993556','#D4537E','#F4C0D1','#FBEAF0'] },
  { n:'Slate',   c:['#0F172A','#334155','#64748B','#CBD5E1','#F1F5F9'] },
  { n:'Green',   c:['#173404','#3B6D11','#639922','#C0DD97','#EAF3DE'] },
];

var ILLO_LIB = [
  /* ── Flat ─────────────────────────────────────────────── */
  { n:'Growth', s:'Flat', p:[
    ['M10 88 H90', 1, 'st'],
    ['M18 88 V62 H32 V88 Z', 3],
    ['M38 88 V46 H52 V88 Z', 2],
    ['M58 88 V30 H72 V88 Z', 1],
    ['M20 40 L44 24 L60 34 L86 12', 0, 'st'],
    ['M74 10 H88 V24 Z', 0],
  ]},
  { n:'Idea', s:'Flat', p:[
    ['M50 8 C66 8 78 20 78 36 C78 48 70 54 66 62 H34 C30 54 22 48 22 36 C22 20 34 8 50 8 Z', 3],
    ['M50 20 C60 20 66 27 66 36 C66 43 61 47 58 53 H42 C39 47 34 43 34 36 C34 27 40 20 50 20 Z', 4],
    ['M36 66 H64 V74 H36 Z', 1],
    ['M39 78 H61 V86 H39 Z', 0],
    ['M50 2 V10 M18 18 L24 24 M82 18 L76 24 M8 42 H16 M84 42 H92', 2, 'st'],
  ]},
  { n:'Target', s:'Flat', p:[
    ['M50 12 A38 38 0 1 1 49.9 12 Z', 3],
    ['M50 26 A24 24 0 1 1 49.9 26 Z', 4],
    ['M50 38 A12 12 0 1 1 49.9 38 Z', 1],
    ['M84 16 L54 46', 0, 'st'],
    ['M78 8 L92 12 L88 26 Z', 0],
  ]},
  { n:'Data board', s:'Flat', p:[
    ['M8 14 H92 V74 H8 Z', 3],
    ['M8 14 H92 V26 H8 Z', 1],
    ['M18 66 V44 H28 V66 Z', 2],
    ['M34 66 V34 H44 V66 Z', 1],
    ['M50 66 V50 H60 V66 Z', 2],
    ['M66 66 V38 H76 V66 Z', 0],
    ['M42 74 H58 V88 H42 Z', 1],
    ['M28 88 H72 V94 H28 Z', 0],
  ]},

  /* ── 3D (depth by tonal layering) ─────────────────────── */
  { n:'Coin stack', s:'3D', p:[
    ['M50 66 C70 66 86 72 86 80 C86 88 70 94 50 94 C30 94 14 88 14 80 C14 72 30 66 50 66 Z', 1],
    ['M50 48 C70 48 86 54 86 62 C86 70 70 76 50 76 C30 76 14 70 14 62 C14 54 30 48 50 48 Z', 2],
    ['M50 30 C70 30 86 36 86 44 C86 52 70 58 50 58 C30 58 14 52 14 44 C14 36 30 30 50 30 Z', 3],
    ['M50 34 C64 34 74 38 74 44 C74 50 64 54 50 54 C36 54 26 50 26 44 C26 38 36 34 50 34 Z', 4],
  ]},
  { n:'Cube', s:'3D', p:[
    ['M50 10 L88 32 L50 54 L12 32 Z', 3],
    ['M12 32 L50 54 V94 L12 72 Z', 1],
    ['M88 32 L50 54 V94 L88 72 Z', 2],
  ]},
  { n:'Sphere', s:'3D', p:[
    ['M50 8 A42 42 0 1 1 49.9 8 Z', 1],
    ['M50 8 A42 42 0 0 1 88 34 A46 46 0 0 0 22 76 A42 42 0 0 1 50 8 Z', 2],
    ['M36 26 A11 8 0 1 1 35.9 26 Z', 4],
  ]},
  { n:'Layers', s:'3D', p:[
    ['M50 62 L92 78 L50 94 L8 78 Z', 1],
    ['M50 42 L92 58 L50 74 L8 58 Z', 2],
    ['M50 22 L92 38 L50 54 L8 38 Z', 3],
    ['M50 30 L74 38 L50 46 L26 38 Z', 4],
  ]},

  /* ── Hand drawn (stroke art) ──────────────────────────── */
  { n:'Sketch arrow', s:'Hand drawn', p:[
    ['M8 74 C26 74 30 30 48 30 C64 30 62 62 78 60 C86 59 88 48 88 40', 1, 'st'],
    ['M80 32 L89 38 L80 46', 1, 'st'],
  ]},
  { n:'Sketch star', s:'Hand drawn', p:[
    ['M50 10 L61 38 L91 40 L68 58 L76 88 L50 71 L24 88 L32 58 L9 40 L39 38 Z', 1, 'st'],
    ['M50 26 L56 42 L72 43 L60 53 L64 69 L50 60 L36 69 L40 53 L28 43 L44 42 Z', 3, 'st'],
  ]},
  { n:'Doodle cloud', s:'Hand drawn', p:[
    ['M28 72 A16 16 0 0 1 28 40 A20 20 0 0 1 64 33 A16 16 0 0 1 70 72 Z', 1, 'st'],
    ['M22 82 A5 5 0 1 1 21.9 82 Z', 2, 'st'],
    ['M40 88 A4 4 0 1 1 39.9 88 Z', 2, 'st'],
  ]},
  { n:'Flourish', s:'Hand drawn', p:[
    ['M6 56 q12 -18 24 0 t24 0 t24 0 t16 -6', 1, 'st'],
    ['M14 70 q14 -10 28 -2 t30 -4', 3, 'st'],
  ]},

  /* ── Corporate ────────────────────────────────────────── */
  { n:'Office', s:'Corporate', p:[
    ['M10 90 V26 H46 V90 Z', 2],
    ['M46 90 V44 H90 V90 Z', 1],
    ['M18 34 H26 V42 H18 Z M32 34 H40 V42 H32 Z M18 50 H26 V58 H18 Z M32 50 H40 V58 H32 Z M18 66 H26 V74 H18 Z M32 66 H40 V74 H32 Z', 4],
    ['M54 52 H62 V60 H54 Z M70 52 H78 V60 H70 Z M54 68 H62 V76 H54 Z M70 68 H78 V76 H70 Z', 4],
    ['M6 90 H94', 0, 'st'],
  ]},
  { n:'Briefcase', s:'Corporate', p:[
    ['M8 32 H92 V86 H8 Z', 2],
    ['M36 20 H64 V32 H56 V28 H44 V32 H36 Z', 1],
    ['M8 48 H92 V58 H8 Z', 1],
    ['M42 46 H58 V60 H42 Z', 4],
  ]},
  { n:'Agreement', s:'Corporate', p:[
    ['M14 10 H70 L86 26 V90 H14 Z', 3],
    ['M70 10 L86 26 H70 Z', 2],
    ['M26 38 H74 M26 50 H74 M26 62 H58', 1, 'st'],
    ['M56 74 L64 82 L80 64', 0, 'st'],
  ]},
  { n:'Strategy', s:'Corporate', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z', 4],
    ['M50 18 A32 32 0 1 1 49.9 18 Z', 3],
    ['M50 50 L50 18 A32 32 0 0 1 78 34 Z', 1],
    ['M50 50 L78 34 A32 32 0 0 1 66 78 Z', 2],
    ['M50 44 A6 6 0 1 1 49.9 44 Z', 0],
  ]},

  /* ── Character packs ──────────────────────────────────── */
  { n:'Standing', s:'Character', p:[
    ['M50 12 A13 13 0 1 1 49.9 12 Z', 2],
    ['M30 46 C30 38 38 34 50 34 C62 34 70 38 70 46 V70 H30 Z', 1],
    ['M36 70 H46 V94 H36 Z M54 70 H64 V94 H54 Z', 0],
    ['M30 46 L20 66 M70 46 L80 66', 2, 'st'],
  ]},
  { n:'Waving', s:'Character', p:[
    ['M50 14 A12 12 0 1 1 49.9 14 Z', 2],
    ['M32 48 C32 40 40 36 50 36 C60 36 68 40 68 48 V72 H32 Z', 1],
    ['M38 72 H47 V94 H38 Z M53 72 H62 V94 H53 Z', 0],
    ['M68 48 L84 26', 2, 'st'],
    ['M84 20 A6 6 0 1 1 83.9 20 Z', 3],
  ]},
  { n:'Duo', s:'Character', p:[
    ['M32 20 A11 11 0 1 1 31.9 20 Z', 2],
    ['M14 50 C14 43 22 39 32 39 C42 39 50 43 50 50 V88 H14 Z', 1],
    ['M68 24 A10 10 0 1 1 67.9 24 Z', 3],
    ['M52 52 C52 46 59 42 68 42 C77 42 84 46 84 52 V88 H52 Z', 2],
  ]},
  { n:'Avatar', s:'Character', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z', 4],
    ['M50 26 A15 15 0 1 1 49.9 26 Z', 2],
    ['M20 82 C20 66 33 58 50 58 C67 58 80 66 80 82 A44 44 0 0 1 20 82 Z', 1],
  ]},

  /* ── Isometric ────────────────────────────────────────── */
  { n:'Iso tile', s:'Isometric', p:[
    ['M50 30 L92 54 L50 78 L8 54 Z', 2],
    ['M8 54 L50 78 V88 L8 64 Z', 1],
    ['M92 54 L50 78 V88 L92 64 Z', 0],
  ]},
  { n:'Iso boxes', s:'Isometric', p:[
    ['M28 46 L52 60 L28 74 L4 60 Z', 3],
    ['M4 60 L28 74 V88 L4 74 Z', 1],
    ['M52 60 L28 74 V88 L52 74 Z', 2],
    ['M72 30 L96 44 L72 58 L48 44 Z', 3],
    ['M48 44 L72 58 V72 L48 58 Z', 1],
    ['M96 44 L72 58 V72 L96 58 Z', 2],
  ]},
  { n:'Iso stack', s:'Isometric', p:[
    ['M50 8 L86 28 L50 48 L14 28 Z', 3],
    ['M14 28 L50 48 V62 L14 42 Z', 1],
    ['M86 28 L50 48 V62 L86 42 Z', 2],
    ['M14 46 L50 66 V80 L14 60 Z', 1],
    ['M86 46 L50 66 V80 L86 60 Z', 2],
    ['M50 46 L86 46 L50 66 L14 46 Z', 4],
  ]},
  { n:'Iso room', s:'Isometric', p:[
    ['M50 34 L92 58 L50 82 L8 58 Z', 3],
    ['M8 22 L50 46 V82 L8 58 Z', 1],
    ['M92 22 L50 46 V82 L92 58 Z', 2],
    ['M30 52 L46 61 L30 70 L14 61 Z', 4],
  ]},
];


function stickerSvg(st, size) {
  return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '">'
    + st.p.map(function (part) {
        return part[2] === 'st'
          ? '<path d="' + part[0] + '" fill="none" stroke="' + part[1]
            + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
          : '<path d="' + part[0] + '" fill="' + part[1] + '"/>';
      }).join('') + '</svg>';
}

function illoSvg(il, pal, size) {
  var c = ILLO_PALETTES[pal % ILLO_PALETTES.length].c;
  return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '">'
    + il.p.map(function (part) {
        var col = c[part[1]];
        return part[2] === 'st'
          ? '<path d="' + part[0] + '" fill="none" stroke="' + col
            + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
          : '<path d="' + part[0] + '" fill="' + col + '"/>';
      }).join('')
    + '</svg>';
}

function addStickerV2(idx, atX, atY) {
  var st = STICKER_LIB[idx];
  if (!st || !fc) return;
  var paths = st.p.map(function (part) {
    return new fabric.Path(part[0], part[2] === 'st'
      ? { fill: '', stroke: part[1], strokeWidth: 6,
          strokeLineCap: 'round', strokeLineJoin: 'round', objectCaching: false }
      : { fill: part[1], objectCaching: false });
  });
  var g = new fabric.Group(paths, {
    isSticker: true, stickerName: st.n, stickerAnim: st.anim || null,
    objectCaching: false
  });
  var slideW = fc.getWidth() / fc.getZoom();
  var slideH = fc.getHeight() / fc.getZoom();
  g.scaleToWidth(Math.min(slideW, slideH) * 0.2);
  g.set({
    left: atX != null ? atX - g.getScaledWidth() / 2  : (slideW - g.getScaledWidth()) / 2,
    top:  atY != null ? atY - g.getScaledHeight() / 2 : (slideH - g.getScaledHeight()) / 2
  });
  fc.add(g); fc.setActiveObject(g);
  if (g.stickerAnim) stickerCaptureBase(g);
  fc.renderAll();
  saveState();
  showToast(st.n + ' added');
}

/* ── live motion runtime (verbatim v1) ── */
function stickerCaptureBase(o) {
  o._animBase = { top: o.top, left: o.left, angle: o.angle || 0,
                  scaleX: o.scaleX || 1, scaleY: o.scaleY || 1 };
}
window.stickerFreeze = function () {
  if (!fc || !fc.getObjects) return;
  (fc.getObjects() || []).forEach(function (o) {
    if (o.stickerAnim && o._animBase) {
      o.set({ top: o._animBase.top, left: o._animBase.left, angle: o._animBase.angle,
              scaleX: o._animBase.scaleX, scaleY: o._animBase.scaleY });
      o.setCoords();
    }
  });
};
(function stickerTicker() {
  var t0 = Date.now();
  function tick() {
    requestAnimationFrame(tick);
    if (typeof fc === 'undefined' || !fc || !fc.getObjects) return;
    var all = fc.getObjects();
    if (!all || !all.length) return;
    var objs = all.filter(function (o) { return o && o.stickerAnim; });
    if (!objs.length) return;
    var t = (Date.now() - t0) / 1000;
    var moved = false;
    objs.forEach(function (o) {
      if (!o._animBase) stickerCaptureBase(o);
      if (fc.getActiveObject() === o && o.__corner) { stickerCaptureBase(o); return; }
      var b = o._animBase;
      if (o.stickerAnim === 'spin')  o.set({ angle: b.angle + (t * 60) % 360 });
      else if (o.stickerAnim === 'pulse') {
        var k = 1 + Math.sin(t * 3) * 0.07;
        o.set({ scaleX: b.scaleX * k, scaleY: b.scaleY * k });
      } else if (o.stickerAnim === 'bounce') {
        o.set({ top: b.top + Math.abs(Math.sin(t * 3)) * -10 });
      } else if (o.stickerAnim === 'float') {
        o.set({ top: b.top + Math.sin(t * 1.6) * 6 });
      }
      moved = true;
    });
    if (moved) fc.requestRenderAll();
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
})();
/* saves/thumbnails must never record a mid-animation frame */
(function () {
  function wrapCapture() {
    if (!window.captureCurrentPage) { setTimeout(wrapCapture, 500); return; }
    if (window.captureCurrentPage.__ldFreezeWrapped) return;
    var orig = window.captureCurrentPage;
    var w = function () { try { window.stickerFreeze(); } catch (e) {} return orig.apply(this, arguments); };
    w.__ldFreezeWrapped = true;
    window.captureCurrentPage = w;
  }
  wrapCapture();
})();

var _illoPaletteV2 = 0;

function makeIllustrationV2(idx, pal) {
  var il = ILLO_LIB[idx];
  if (!il || !fc) return null;
  var cols = ILLO_PALETTES[pal % ILLO_PALETTES.length].c;
  var paths = il.p.map(function (part) {
    return new fabric.Path(part[0], part[2] === 'st'
      ? { fill: '', stroke: cols[part[1]], strokeWidth: 4,
          strokeLineCap: 'round', strokeLineJoin: 'round',
          illoRole: part[1], illoStroke: true, objectCaching: false }
      : { fill: cols[part[1]], illoRole: part[1], objectCaching: false });
  });
  return new fabric.Group(paths, {
    isIllo: true, illoIndex: idx, illoPalette: pal, illoName: il.n,
    objectCaching: false
  });
}

Editor._register({
  insertSticker: function (idx) { addStickerV2(idx | 0); },
  insertIllo: function (arg) {
    var idx = (arg && arg.i != null) ? arg.i : (arg | 0);
    if (arg && arg.pal != null) _illoPaletteV2 = arg.pal;
    var g = makeIllustrationV2(idx, _illoPaletteV2);
    if (!g) return;
    var slideW = fc.getWidth() / fc.getZoom();
    var slideH = fc.getHeight() / fc.getZoom();
    g.scaleToWidth(Math.min(slideW, slideH) * 0.42);
    g.set({
      left: (slideW - g.getScaledWidth()) / 2,
      top: (slideH - g.getScaledHeight()) / 2
    });
    fc.add(g); fc.setActiveObject(g);
    fc.renderAll(); saveState();
    showToast(ILLO_LIB[idx].n + ' added');
  },
  __qStickers: function () {
    var cats = {};
    STICKER_LIB.forEach(function (st, i) {
      var c = st.c || 'Other';
      (cats[c] = cats[c] || []).push({ i: i, name: st.n, svg: stickerSvg(st, 62), anim: st.anim || null });
    });
    return Object.keys(cats).map(function (k) { return { name: k, items: cats[k] }; });
  },
  __qIllos: function (pal) {
    var p = pal == null ? _illoPaletteV2 : pal;
    return {
      palettes: ILLO_PALETTES.map(function (x, i) { return { i: i, name: x.n, a: x.c[1], b: x.c[3] }; }),
      current: _illoPaletteV2,
      styles: (function () {
        var groups = {};
        ILLO_LIB.forEach(function (il, i) {
          (groups[il.s] = groups[il.s] || []).push({ i: i, name: il.n, svg: illoSvg(il, p, 78) });
        });
        return Object.keys(groups).map(function (k) { return { name: k, items: groups[k] }; });
      })()
    };
  },
  illoPalette: function (i) { _illoPaletteV2 = i | 0; if (window.Editor && Editor._emit) Editor._emit('illos', { pal: _illoPaletteV2 }); }
});
