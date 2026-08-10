/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 3                          owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   AI panel (compose-append: add slides in style, mock-ups, one slide,
   rewrite/summarize/translate), the full 1900-font catalogue with lazy
   Google-Fonts loading, icons library, photos library, CSV → chart data.
   ═══════════════════════════════════════════════════════════════════════ */

window.LD_CHAT_URL = window.LD_CHAT_URL
  || 'https://us-central1-templatehub-16cd7.cloudfunctions.net/chat_http';
window.LD_MAX_SLIDES = window.LD_MAX_SLIDES || 500;
function ldMaxSlides() { return window.LD_MAX_SLIDES || 500; }

/* ── fonts: full catalogue + lazy loader ── */
var SYSTEM_FONTS = [
    "Arial","Arial Black","Helvetica","Times New Roman","Georgia","Verdana","Tahoma",
    "Trebuchet MS","Courier New","Impact","Comic Sans MS","Calibri","Calibri Light",
    "Cambria","Candara","Consolas","Constantia","Corbel","Franklin Gothic Medium",
    "Garamond","Century Gothic","Book Antiqua","Bookman Old Style","Palatino Linotype",
    "Segoe UI","Segoe UI Semibold","Lucida Console","Lucida Sans Unicode","Rockwell",
    "Baskerville","Futura","Optima","Gill Sans","Copperplate","Papyrus",
    "Brush Script MT","Didot","Avenir","Avenir Next","American Typewriter","Big Caslon",
    "Chalkboard SE","Cochin","Herculanum","Marker Felt","Monaco","Party LET","Phosphate",
    "Skia","Snell Roundhand","Zapfino","Bahnschrift","DM Sans"
  ];
var GOOGLE_FONTS = [
    "Roboto", "Roboto Slab", "Roboto Condensed", "Roboto Mono", "Open Sans", "Lato",
    "Montserrat", "Oswald", "Raleway", "PT Sans", "PT Serif", "PT Mono",
    "Merriweather", "Playfair Display", "Nunito", "Nunito Sans", "Poppins", "Source Sans Pro",
    "Source Serif Pro", "Source Code Pro", "Ubuntu", "Work Sans", "Rubik", "Inter",
    "Karla", "Quicksand", "Josefin Sans", "Josefin Slab", "Dosis", "Fjalla One",
    "Bitter", "Crimson Text", "Libre Baskerville", "Libre Franklin", "Cabin", "Mulish",
    "Titillium Web", "Barlow", "Barlow Condensed", "Barlow Semi Condensed", "Archivo", "Archivo Black",
    "Archivo Narrow", "Manrope", "DM Serif Display", "DM Serif Text", "DM Mono", "Space Grotesk",
    "Space Mono", "IBM Plex Sans", "IBM Plex Serif", "IBM Plex Mono", "Noto Sans", "Noto Serif",
    "Fira Sans", "Fira Code", "Fira Mono", "Hind", "Heebo", "Assistant",
    "Varela Round", "Comfortaa", "Pacifico", "Lobster", "Lobster Two", "Great Vibes",
    "Dancing Script", "Sacramento", "Satisfy", "Caveat", "Shadows Into Light", "Indie Flower",
    "Permanent Marker", "Amatic SC", "Alfa Slab One", "Anton", "Bebas Neue", "Passion One",
    "Righteous", "Bangers", "Fredoka", "Baloo 2", "Cinzel", "Cinzel Decorative",
    "Cormorant", "Cormorant Garamond", "EB Garamond", "Spectral", "Domine", "Vollkorn",
    "Zilla Slab", "Arvo", "Inconsolata", "Courier Prime", "JetBrains Mono", "Overpass",
    "Overpass Mono", "Signika", "Signika Negative", "Exo", "Exo 2", "Orbitron",
    "Play", "Michroma", "Audiowide", "Russo One", "Teko", "Yanone Kaffeesatz",
    "Krona One", "Staatliches", "Prompt", "Kanit", "Chakra Petch", "Sarabun",
    "Mitr", "Maven Pro", "Questrial", "Catamaran", "Rajdhani", "Saira",
    "Saira Condensed", "Jost", "Outfit", "Sora", "Plus Jakarta Sans", "Lexend",
    "Lexend Deca", "Epilogue", "Red Hat Display", "Red Hat Text", "Public Sans", "Figtree",
    "Onest", "Urbanist", "Albert Sans", "Schibsted Grotesk", "Instrument Sans", "Bricolage Grotesque",
    "Familjen Grotesk", "Unbounded", "Syne", "Abril Fatface", "Alegreya", "Alegreya Sans",
    "Alegreya SC", "Yeseva One", "Prata", "Marcellus", "Cardo", "Neuton",
    "Old Standard TT", "Vidaloka", "Trirong", "Bevan", "Sanchez", "Rufina",
    "Bree Serif", "Kreon", "Alice", "Gelasio", "Lora", "PT Serif Caption",
    "Frank Ruhl Libre", "Noticia Text", "Faustina", "Crete Round", "Coustard", "Suez One",
    "Amiri", "Aref Ruqaa", "Almarai", "Cairo", "Tajawal", "El Messiri",
    "Changa", "Markazi Text", "Reem Kufi", "Lalezar", "Harmattan", "Vazirmatn",
    "Mada", "Rakkas", "Quattrocento", "Quattrocento Sans", "Antic", "Antic Slab",
    "Judson", "Coming Soon", "Kalam", "Patrick Hand", "Gochi Hand", "Architects Daughter",
    "Homemade Apple", "Nanum Pen Script", "Gloria Hallelujah", "Handlee", "Cabin Sketch", "Special Elite",
    "Rock Salt", "Walter Turncoat", "Covered By Your Grace", "Reenie Beanie", "Delius", "Schoolbell",
    "Crafty Girls", "Just Another Hand", "Neucha", "Sriracha", "Yellowtail", "Alex Brush",
    "Allura", "Tangerine", "Mrs Saint Delafield", "Parisienne", "Cookie", "Kaushan Script",
    "Courgette", "Pinyon Script", "Playball", "Rochester", "Marck Script", "Italianno",
    "Petit Formal Script", "Mr Dafoe", "Norican", "Meddon", "WindSong", "Herr Von Muellerhoff",
    "Berkshire Swash", "League Script", "Give You Glory", "Grand Hotel", "Lovers Quarrel", "Nothing You Could Do",
    "Yesteryear", "Bad Script", "Bahiana", "Bungee", "Bungee Inline", "Bungee Shade",
    "Monoton", "Faster One", "Rammetto One", "Sigmar One", "Luckiest Guy", "Chewy",
    "Titan One", "ABeeZee", "ADLaM Display", "AR One Sans", "Abel", "Abhaya Libre",
    "Aboreto", "Abyssinica SIL", "Aclonica", "Acme", "Actor", "Adamina",
    "Advent Pro", "Agdasima", "Aguafina Script", "Akatab", "Akaya Kanadaka", "Akaya Telivigala",
    "Akronim", "Akshar", "Aladin", "Alata", "Alatsi", "Aldrich",
    "Alef", "Alegreya Sans SC", "Aleo", "Alexandria", "Alike", "Alike Angular",
    "Alkalami", "Alkatra", "Allan", "Allerta", "Allerta Stencil", "Allison",
    "Almendra", "Almendra Display", "Almendra SC", "Alumni Sans", "Alumni Sans Collegiate One", "Alumni Sans Inline One",
    "Alumni Sans Pinstripe", "Amarante", "Amaranth", "Amethysta", "Amiko", "Amiri Quran",
    "Amita", "Anaheim", "Andada Pro", "Andika", "Anek Bangla", "Anek Devanagari",
    "Anek Gujarati", "Anek Gurmukhi", "Anek Kannada", "Anek Latin", "Anek Malayalam", "Anek Odia",
    "Anek Tamil", "Anek Telugu", "Angkor", "Annie Use Your Telescope", "Anonymous Pro", "Antic Didone",
    "Antonio", "Anuphan", "Anybody", "Aoboshi One", "Arapey", "Arbutus",
    "Arbutus Slab", "Are You Serious", "Aref Ruqaa Ink", "Arima", "Arima Madurai", "Arimo",
    "Arizonia", "Armata", "Arsenal", "Artifika", "Arya", "Asap",
    "Asap Condensed", "Asar", "Asset", "Astloch", "Asul", "Athiti",
    "Atkinson Hyperlegible", "Atma", "Atomic Age", "Aubrey", "Autour One", "Average",
    "Average Sans", "Averia Gruesa Libre", "Averia Libre", "Averia Sans Libre", "Averia Serif Libre", "Azeret Mono",
    "B612", "B612 Mono", "BIZ UDGothic", "BIZ UDMincho", "BIZ UDPGothic", "BIZ UDPMincho",
    "Babylonica", "Bacasime Antique", "Bagel Fat One", "Bahianita", "Bai Jamjuree", "Bakbak One",
    "Ballet", "Baloo Bhai 2", "Baloo Bhaijaan 2", "Baloo Bhaina 2", "Baloo Chettan 2", "Baloo Da 2",
    "Baloo Paaji 2", "Baloo Tamma 2", "Baloo Tammudu 2", "Baloo Thambi 2", "Balsamiq Sans", "Balthazar",
    "Barriecito", "Barrio", "Basic", "Baskervville", "Battambang", "Baumans",
    "Bayon", "Be Vietnam Pro", "Beau Rivage", "Belanosima", "Belgrano", "Bellefair",
    "Belleza", "Bellota", "Bellota Text", "BenchNine", "Benne", "Bentham",
    "Besley", "Beth Ellen", "BhuTuka Expanded One", "Big Shoulders Display", "Big Shoulders Inline Display", "Big Shoulders Inline Text",
    "Big Shoulders Stencil Display", "Big Shoulders Stencil Text", "Big Shoulders Text", "Bigelow Rules", "Bigshot One", "Bilbo",
    "Bilbo Swash Caps", "BioRhyme", "BioRhyme Expanded", "Birthstone", "Birthstone Bounce", "Biryani",
    "Black And White Picture", "Black Han Sans", "Black Ops One", "Blaka", "Blaka Hollow", "Blaka Ink",
    "Blinker", "Bodoni Moda", "Bokor", "Bona Nova", "Bonbon", "Bonheur Royale",
    "Boogaloo", "Borel", "Bowlby One", "Bowlby One SC", "Braah One", "Brawler",
    "Bruno Ace", "Bruno Ace SC", "Brygada 1918", "Bubblegum Sans", "Bubbler One", "Buda",
    "Buenard", "Bungee Hairline", "Bungee Outline", "Bungee Spice", "Butcherman", "Butterfly Kids",
    "Cabin Condensed", "Caesar Dressing", "Cagliostro", "Cairo Play", "Caladea", "Calistoga",
    "Calligraffitti", "Cambay", "Cambo", "Candal", "Cantarell", "Cantata One",
    "Cantora One", "Caprasimo", "Capriola", "Caramel", "Carattere", "Carlito",
    "Carme", "Carrois Gothic", "Carrois Gothic SC", "Carter One", "Castoro", "Castoro Titling",
    "Caudex", "Caveat Brush", "Cedarville Cursive", "Ceviche One", "Changa One", "Chango",
    "Charis SIL", "Charm", "Charmonman", "Chathura", "Chau Philomene One", "Chela One",
    "Chelsea Market", "Chenla", "Cherish", "Cherry Bomb One", "Cherry Cream Soda", "Cherry Swash",
    "Chicle", "Chilanka", "Chivo", "Chivo Mono", "Chokokutai", "Chonburi",
    "Clicker Script", "Climate Crisis", "Coda", "Coda Caption", "Codystar", "Coiny",
    "Combo", "Comforter", "Comforter Brush", "Comic Neue", "Comme", "Commissioner",
    "Concert One", "Condiment", "Content", "Contrail One", "Convergence", "Copse",
    "Corben", "Corinthia", "Cormorant Infant", "Cormorant SC", "Cormorant Unicase", "Cormorant Upright",
    "Cousine", "Creepster", "Crimson Pro", "Croissant One", "Crushed", "Cuprum",
    "Cute Font", "Cutive", "Cutive Mono", "Dai Banna SIL", "Damion", "Dangrek",
    "Darker Grotesque", "Darumadrop One", "David Libre", "Dawning of a New Day", "Days One", "Dekko",
    "Dela Gothic One", "Delicious Handrawn", "Delius Swash Caps", "Delius Unicase", "Della Respira", "Denk One",
    "Devonshire", "Dhurjati", "Didact Gothic", "Diphylleia", "Diplomata", "Diplomata SC",
    "Do Hyeon", "Dokdo", "Donegal One", "Dongle", "Doppio One", "Dorsa",
    "DotGothic16", "Dr Sugiyama", "Duru Sans", "DynaPuff", "Dynalight", "Eagle Lake",
    "East Sea Dokdo", "Eater", "Economica", "Eczar", "Edu NSW ACT Foundation", "Edu QLD Beginner",
    "Edu SA Beginner", "Edu TAS Beginner", "Edu VIC WA NT Beginner", "Electrolize", "Elsie", "Elsie Swash Caps",
    "Emblema One", "Emilys Candy", "Encode Sans", "Encode Sans Condensed", "Encode Sans Expanded", "Encode Sans SC",
    "Encode Sans Semi Condensed", "Encode Sans Semi Expanded", "Engagement", "Englebert", "Enriqueta", "Ephesis",
    "Erica One", "Esteban", "Estonia", "Euphoria Script", "Ewert", "Expletus Sans",
    "Explora", "Fahkwang", "Fanwood Text", "Farro", "Farsan", "Fascinate",
    "Fascinate Inline", "Fasthand", "Fauna One", "Federant", "Federo", "Felipa",
    "Fenix", "Festive", "Finger Paint", "Finlandica", "Fira Sans Condensed", "Fira Sans Extra Condensed",
    "Fjord One", "Flamenco", "Flavors", "Fleur De Leah", "Flow Block", "Flow Circular",
    "Flow Rounded", "Foldit", "Fondamento", "Fontdiner Swanky", "Forum", "Fragment Mono",
    "Francois One", "Fraunces", "Freckle Face", "Fredericka the Great", "Freehand", "Fresca",
    "Frijole", "Fruktur", "Fugaz One", "Fuggles", "Fuzzy Bubbles", "GFS Didot",
    "GFS Neohellenic", "Gabarito", "Gabriela", "Gaegu", "Gafata", "Gajraj One",
    "Galada", "Galdeano", "Galindo", "Gamja Flower", "Gantari", "Gasoek One",
    "Gayathri", "Gemunu Libre", "Genos", "Gentium Book Plus", "Gentium Plus", "Geo",
    "Geologica", "Georama", "Geostar", "Geostar Fill", "Germania One", "Gideon Roman",
    "Gidugu", "Gilda Display", "Girassol", "Glass Antiqua", "Glegoo", "Gloock",
    "Glory", "Gluten", "Goblin One", "Goldman", "Golos Text", "Gorditas",
    "Gothic A1", "Gotu", "Goudy Bookletter 1911", "Gowun Batang", "Gowun Dodum", "Graduate",
    "Grandiflora One", "Grandstander", "Grape Nuts", "Gravitas One", "Grechen Fuemen", "Grenze",
    "Grenze Gotisch", "Grey Qo", "Griffy", "Gruppo", "Gudea", "Gugi",
    "Gulzar", "Gupter", "Gurajada", "Gwendolyn", "Habibi", "Hachi Maru Pop",
    "Hahmlet", "Halant", "Hammersmith One", "Hanalei", "Hanalei Fill", "Handjet",
    "Hanken Grotesk", "Hanuman", "Happy Monkey", "Headland One", "Henny Penny", "Hepta Slab",
    "Hi Melody", "Hina Mincho", "Hind Guntur", "Hind Madurai", "Hind Siliguri", "Hind Vadodara",
    "Holtwood One SC", "Homenaje", "Hubballi", "Hurricane", "IBM Plex Sans Arabic", "IBM Plex Sans Condensed",
    "IBM Plex Sans Devanagari", "IBM Plex Sans Hebrew", "IBM Plex Sans JP", "IBM Plex Sans KR", "IBM Plex Sans Thai", "IBM Plex Sans Thai Looped",
    "IM Fell DW Pica", "IM Fell DW Pica SC", "IM Fell Double Pica", "IM Fell Double Pica SC", "IM Fell English", "IM Fell English SC",
    "IM Fell French Canon", "IM Fell French Canon SC", "IM Fell Great Primer", "IM Fell Great Primer SC", "Ibarra Real Nova", "Iceberg",
    "Iceland", "Imbue", "Imperial Script", "Imprima", "Inclusive Sans", "Inder",
    "Ingrid Darling", "Inika", "Inknut Antiqua", "Inria Sans", "Inria Serif", "Inspiration",
    "Instrument Serif", "Inter Tight", "Irish Grover", "Island Moments", "Istok Web", "Italiana",
    "Itim", "Jacques Francois", "Jacques Francois Shadow", "Jaldi", "Jim Nightshade", "Joan",
    "Jockey One", "Jolly Lodger", "Jomhuria", "Jomolhari", "Joti One", "Jua",
    "Julee", "Julius Sans One", "Junge", "Jura", "Just Me Again Down Here", "K2D",
    "Kablammo", "Kadwa", "Kaisei Decol", "Kaisei HarunoUmi", "Kaisei Opti", "Kaisei Tokumin",
    "Kameron", "Kantumruy Pro", "Karantina", "Karma", "Katibeh", "Kavivanar",
    "Kavoon", "Kdam Thmor Pro", "Keania One", "Kelly Slab", "Kenia", "Khand",
    "Khmer", "Khula", "Kings", "Kirang Haerang", "Kite One", "Kiwi Maru",
    "Klee One", "Knewave", "KoHo", "Kodchasan", "Koh Santepheap", "Kolker Brush",
    "Konkhmer Sleokchher", "Kosugi", "Kosugi Maru", "Kotta One", "Koulen", "Kranky",
    "Kristi", "Krub", "Kufam", "Kulim Park", "Kumar One", "Kumar One Outline",
    "Kumbh Sans", "Kurale", "La Belle Aurore", "Labrada", "Lacquer", "Laila",
    "Lakki Reddy", "Lancelot", "Langar", "Lateef", "Lavishly Yours", "League Gothic",
    "League Spartan", "Leckerli One", "Ledger", "Lekton", "Lemon", "Lemonada",
    "Lexend Exa", "Lexend Giga", "Lexend Mega", "Lexend Peta", "Lexend Tera", "Lexend Zetta",
    "Libre Barcode 128", "Libre Barcode 128 Text", "Libre Barcode 39", "Libre Barcode 39 Extended", "Libre Barcode 39 Extended Text", "Libre Barcode 39 Text",
    "Libre Barcode EAN13 Text", "Libre Bodoni", "Libre Caslon Display", "Libre Caslon Text", "Licorice", "Life Savers",
    "Lilita One", "Lily Script One", "Limelight", "Linden Hill", "Lisu Bosa", "Literata",
    "Liu Jian Mao Cao", "Livvic", "Londrina Outline", "Londrina Shadow", "Londrina Sketch", "Londrina Solid",
    "Long Cang", "Love Light", "Love Ya Like A Sister", "Loved by the King", "Lugrasimo", "Lumanosimo",
    "Lunasima", "Lusitana", "Lustria", "Luxurious Roman", "Luxurious Script", "M PLUS 1",
    "M PLUS 1 Code", "M PLUS 1p", "M PLUS 2", "M PLUS Code Latin", "M PLUS Rounded 1c", "Ma Shan Zheng",
    "Macondo", "Macondo Swash Caps", "Magra", "Maiden Orange", "Maitree", "Major Mono Display",
    "Mako", "Mali", "Mallanna", "Mandali", "Manjari", "Mansalva",
    "Manuale", "Marcellus SC", "Margarine", "Marhey", "Marko One", "Marmelad",
    "Martel", "Martel Sans", "Martian Mono", "Marvel", "Mate", "Mate SC",
    "Material Icons", "Material Icons Outlined", "Material Icons Round", "Material Icons Sharp", "Material Icons Two Tone", "Material Symbols Outlined",
    "Material Symbols Rounded", "Material Symbols Sharp", "McLaren", "Mea Culpa", "MedievalSharp", "Medula One",
    "Meera Inimai", "Megrim", "Meie Script", "Meow Script", "Merienda", "Merriweather Sans",
    "Metal", "Metal Mania", "Metamorphous", "Metrophobic", "Milonga", "Miltonian",
    "Miltonian Tattoo", "Mina", "Mingzat", "Miniver", "Miriam Libre", "Mirza",
    "Miss Fajardose", "Mochiy Pop One", "Mochiy Pop P One", "Modak", "Modern Antiqua", "Mogra",
    "Mohave", "Moirai One", "Molengo", "Molle", "Monda", "Monofett",
    "Monomaniac One", "Monsieur La Doulaise", "Montaga", "Montagu Slab", "MonteCarlo", "Montez",
    "Montserrat Alternates", "Montserrat Subrayada", "Moo Lah Lah", "Mooli", "Moon Dance", "Afacad",
    "Afacad Flux", "Agbalumo", "Agu Display", "Alan Sans", "Alumni Sans SC", "Amarna",
    "Ancizar Sans", "Ancizar Serif", "Annapurna SIL", "Anta", "Anton SC", "Arsenal SC",
    "Asimovian", "Asta Sans", "Atkinson Hyperlegible Mono", "Atkinson Hyperlegible Next", "BBH Bartle", "BBH Bogle",
    "BBH Hegarty", "Badeen Display", "Baskervville SC", "Beiruti", "Big Shoulders", "Big Shoulders Inline",
    "Big Shoulders Stencil", "Bitcount", "Bitcount Grid Double", "Bitcount Grid Double Ink", "Bitcount Grid Single", "Bitcount Grid Single Ink",
    "Bitcount Ink", "Bitcount Prop Double", "Bitcount Prop Double Ink", "Bitcount Prop Single", "Bitcount Prop Single Ink", "Bitcount Single",
    "Bitcount Single Ink", "Bodoni Moda SC", "Boldonse", "Bona Nova SC", "Bungee Tint", "Bytesized",
    "Cactus Classical Serif", "Cal Sans", "Cascadia Code", "Cascadia Mono", "Cause", "Chiron GoRound TC",
    "Chiron Hei HK", "Chiron Sung HK", "Chocolate Classical Sans", "Comic Relief", "Coral Pixels", "Cossette Texte",
    "Cossette Titre", "Danfo", "Doto", "Edu AU VIC WA NT Arrows", "Edu AU VIC WA NT Dots", "Edu AU VIC WA NT Guides",
    "Edu AU VIC WA NT Hand", "Edu AU VIC WA NT Pre", "Edu NSW ACT Cursive", "Edu NSW ACT Hand Pre", "Edu QLD Hand", "Edu SA Hand",
    "Edu VIC WA NT Hand", "Edu VIC WA NT Hand Pre", "Elms Sans", "Epunda Sans", "Epunda Slab", "Exile",
    "Faculty Glyphic", "Freeman", "Funnel Display", "Funnel Sans", "Fustat", "Ga Maamli",
    "Geist", "Geist Mono", "Geom", "Gidole", "Google Sans", "Google Sans Code",
    "Google Sans Flex", "Hedvig Letters Sans", "Hedvig Letters Serif", "Hind Mysuru", "Honk", "Host Grotesk",
    "Hubot Sans", "Huninn", "Iansui", "Intel One Mono", "Jacquard 12", "Jacquard 12 Charted",
    "Jacquard 24", "Jacquard 24 Charted", "Jacquarda Bastarda 9", "Jacquarda Bastarda 9 Charted", "Jaini", "Jaini Purva",
    "Jaro", "Jersey 10", "Jersey 10 Charted", "Jersey 15", "Jersey 15 Charted", "Jersey 20",
    "Jersey 20 Charted", "Jersey 25", "Jersey 25 Charted", "Kalnia", "Kalnia Glaze", "Kanchenjunga",
    "Kapakana", "Karla Tamil Inclined", "Karla Tamil Upright", "Kay Pho Du", "Kedebideri", "Kode Mono",
    "LXGW Marker Gothic", "LXGW WenKai Mono TC", "LXGW WenKai TC", "Libertinus Keyboard", "Libertinus Math", "Libertinus Mono",
    "Libertinus Sans", "Libertinus Serif", "Libertinus Serif Display", "Lilex", "Linefont", "Liter",
    "Madimi One", "Maname", "Manufacturing Consent", "Matangi", "Matemasie", "Material Symbols",
    "Menbere", "Micro 5", "Micro 5 Charted", "Moderustic", "Momo Signature", "Momo Trust Display",
    "Momo Trust Sans", "Mona Sans", "Monomakh", "Montserrat Underline", "Moul", "Moulpali",
    "Mountains of Christmas", "Mouse Memoirs", "Mozilla Headline", "Mozilla Text", "Mr Bedfort", "Mr De Haviland",
    "Mrs Sheppards", "Ms Madi", "Mukta", "Mukta Mahee", "Mukta Malar", "Mukta Vaani",
    "Murecho", "MuseoModerno", "My Soul", "Mynerve", "Mystery Quest", "NTR",
    "Nabla", "Namdhinggo", "Nanum Brush Script", "Nanum Gothic", "Nanum Gothic Coding", "Nanum Myeongjo",
    "Narnoor", "Nata Sans", "National Park", "Neonderthaw", "Nerko One", "New Amsterdam",
    "New Rocker", "New Tegomin", "News Cycle", "Newsreader", "Niconne", "Niramit",
    "Nixie One", "Nobile", "Nokora", "Nosifer", "Notable", "Noto Color Emoji",
    "Noto Emoji", "Noto Kufi Arabic", "Noto Music", "Noto Naskh Arabic", "Noto Nastaliq Urdu", "Noto Rashi Hebrew",
    "Noto Sans Adlam", "Noto Sans Adlam Unjoined", "Noto Sans Anatolian Hieroglyphs", "Noto Sans Arabic", "Noto Sans Armenian", "Noto Sans Avestan",
    "Noto Sans Balinese", "Noto Sans Bamum", "Noto Sans Bassa Vah", "Noto Sans Batak", "Noto Sans Bengali", "Noto Sans Bhaiksuki",
    "Noto Sans Brahmi", "Noto Sans Buginese", "Noto Sans Buhid", "Noto Sans Canadian Aboriginal", "Noto Sans Carian", "Noto Sans Caucasian Albanian",
    "Noto Sans Chakma", "Noto Sans Cham", "Noto Sans Cherokee", "Noto Sans Chorasmian", "Noto Sans Coptic", "Noto Sans Cuneiform",
    "Noto Sans Cypriot", "Noto Sans Cypro Minoan", "Noto Sans Deseret", "Noto Sans Devanagari", "Noto Sans Display", "Noto Sans Duployan",
    "Noto Sans Egyptian Hieroglyphs", "Noto Sans Elbasan", "Noto Sans Elymaic", "Noto Sans Ethiopic", "Noto Sans Georgian", "Noto Sans Glagolitic",
    "Noto Sans Gothic", "Noto Sans Grantha", "Noto Sans Gujarati", "Noto Sans Gunjala Gondi", "Noto Sans Gurmukhi", "Noto Sans HK",
    "Noto Sans Hanifi Rohingya", "Noto Sans Hanunoo", "Noto Sans Hatran", "Noto Sans Hebrew", "Noto Sans Imperial Aramaic", "Noto Sans Indic Siyaq Numbers",
    "Noto Sans Inscriptional Pahlavi", "Noto Sans Inscriptional Parthian", "Noto Sans JP", "Noto Sans Javanese", "Noto Sans KR", "Noto Sans Kaithi",
    "Noto Sans Kannada", "Noto Sans Kawi", "Noto Sans Kayah Li", "Noto Sans Kharoshthi", "Noto Sans Khmer", "Noto Sans Khojki",
    "Noto Sans Khudawadi", "Noto Sans Lao", "Noto Sans Lao Looped", "Noto Sans Lepcha", "Noto Sans Limbu", "Noto Sans Linear A",
    "Noto Sans Linear B", "Noto Sans Lisu", "Noto Sans Lycian", "Noto Sans Lydian", "Noto Sans Mahajani", "Noto Sans Malayalam",
    "Noto Sans Mandaic", "Noto Sans Manichaean", "Noto Sans Marchen", "Noto Sans Masaram Gondi", "Noto Sans Math", "Noto Sans Mayan Numerals",
    "Noto Sans Medefaidrin", "Noto Sans Meetei Mayek", "Noto Sans Mende Kikakui", "Noto Sans Meroitic", "Noto Sans Miao", "Noto Sans Modi",
    "Noto Sans Mongolian", "Noto Sans Mono", "Noto Sans Mro", "Noto Sans Multani", "Noto Sans Myanmar", "Noto Sans NKo",
    "Noto Sans NKo Unjoined", "Noto Sans Nabataean", "Noto Sans Nag Mundari", "Noto Sans Nandinagari", "Noto Sans New Tai Lue", "Noto Sans Newa",
    "Noto Sans Nushu", "Noto Sans Ogham", "Noto Sans Ol Chiki", "Noto Sans Old Hungarian", "Noto Sans Old Italic", "Noto Sans Old North Arabian",
    "Noto Sans Old Permic", "Noto Sans Old Persian", "Noto Sans Old Sogdian", "Noto Sans Old South Arabian", "Noto Sans Old Turkic", "Noto Sans Oriya",
    "Noto Sans Osage", "Noto Sans Osmanya", "Noto Sans Pahawh Hmong", "Noto Sans Palmyrene", "Noto Sans Pau Cin Hau", "Noto Sans PhagsPa",
    "Noto Sans Phoenician", "Noto Sans Psalter Pahlavi", "Noto Sans Rejang", "Noto Sans Runic", "Noto Sans SC", "Noto Sans Samaritan",
    "Noto Sans Saurashtra", "Noto Sans Sharada", "Noto Sans Shavian", "Noto Sans Siddham", "Noto Sans SignWriting", "Noto Sans Sinhala",
    "Noto Sans Sogdian", "Noto Sans Sora Sompeng", "Noto Sans Soyombo", "Noto Sans Sundanese", "Noto Sans Sunuwar", "Noto Sans Syloti Nagri",
    "Noto Sans Symbols", "Noto Sans Symbols 2", "Noto Sans Syriac", "Noto Sans Syriac Eastern", "Noto Sans Syriac Western", "Noto Sans TC",
    "Noto Sans Tagalog", "Noto Sans Tagbanwa", "Noto Sans Tai Le", "Noto Sans Tai Tham", "Noto Sans Tai Viet", "Noto Sans Takri",
    "Noto Sans Tamil", "Noto Sans Tamil Supplement", "Noto Sans Tangsa", "Noto Sans Telugu", "Noto Sans Thaana", "Noto Sans Thai",
    "Noto Sans Thai Looped", "Noto Sans Tifinagh", "Noto Sans Tirhuta", "Noto Sans Ugaritic", "Noto Sans Vai", "Noto Sans Vithkuqi",
    "Noto Sans Wancho", "Noto Sans Warang Citi", "Noto Sans Yi", "Noto Sans Zanabazar Square", "Noto Serif Ahom", "Noto Serif Armenian",
    "Noto Serif Balinese", "Noto Serif Bengali", "Noto Serif Devanagari", "Noto Serif Display", "Noto Serif Dives Akuru", "Noto Serif Dogra",
    "Noto Serif Ethiopic", "Noto Serif Georgian", "Noto Serif Grantha", "Noto Serif Gujarati", "Noto Serif Gurmukhi", "Noto Serif HK",
    "Noto Serif Hebrew", "Noto Serif Hentaigana", "Noto Serif JP", "Noto Serif KR", "Noto Serif Kannada", "Noto Serif Khitan Small Script",
    "Noto Serif Khmer", "Noto Serif Khojki", "Noto Serif Lao", "Noto Serif Makasar", "Noto Serif Malayalam", "Noto Serif Myanmar",
    "Noto Serif NP Hmong", "Noto Serif Old Uyghur", "Noto Serif Oriya", "Noto Serif Ottoman Siyaq", "Noto Serif SC", "Noto Serif Sinhala",
    "Noto Serif TC", "Noto Serif Tamil", "Noto Serif Tangut", "Noto Serif Telugu", "Noto Serif Thai", "Noto Serif Tibetan",
    "Noto Serif Todhri", "Noto Serif Toto", "Noto Serif Vithkuqi", "Noto Serif Yezidi", "Noto Traditional Nushu", "Noto Znamenny Musical Notation",
    "Nova Cut", "Nova Flat", "Nova Mono", "Nova Oval", "Nova Round", "Nova Script",
    "Nova Slim", "Nova Square", "Numans", "Nuosu SIL", "Odibee Sans", "Odor Mean Chey",
    "Offside", "Oi", "Ojuju", "Oldenburg", "Ole", "Oleo Script",
    "Oleo Script Swash Caps", "Oooh Baby", "Oranienbaum", "Orbit", "Oregano", "Orelega One",
    "Orienta", "Original Surfer", "Over the Rainbow", "Overlock", "Overlock SC", "Ovo",
    "Oxanium", "Oxygen", "Oxygen Mono", "PT Sans Caption", "PT Sans Narrow", "Padauk",
    "Padyakke Expanded One", "Palanquin", "Palanquin Dark", "Palette Mosaic", "Pangolin", "Paprika",
    "Parastoo", "Parkinsans", "Passero One", "Passions Conflict", "Pathway Extreme", "Pathway Gothic One",
    "Patrick Hand SC", "Pattaya", "Patua One", "Pavanam", "Paytone One", "Peddana",
    "Peralta", "Petemoss", "Petrona", "Phetsarath", "Philosopher", "Phudu",
    "Piazzolla", "Piedra", "Pirata One", "Pixelify Sans", "Plaster", "Platypi",
    "Playfair", "Playfair Display SC", "Playpen Sans", "Playpen Sans Arabic", "Playpen Sans Deva", "Playpen Sans Hebrew",
    "Playpen Sans Thai", "Playwrite AR", "Playwrite AR Guides", "Playwrite AT", "Playwrite AT Guides", "Playwrite AU NSW",
    "Playwrite AU NSW Guides", "Playwrite AU QLD", "Playwrite AU QLD Guides", "Playwrite AU SA", "Playwrite AU SA Guides", "Playwrite AU TAS",
    "Playwrite AU TAS Guides", "Playwrite AU VIC", "Playwrite AU VIC Guides", "Playwrite BE VLG", "Playwrite BE VLG Guides", "Playwrite BE WAL",
    "Playwrite BE WAL Guides", "Playwrite BR", "Playwrite BR Guides", "Playwrite CA", "Playwrite CA Guides", "Playwrite CL",
    "Playwrite CL Guides", "Playwrite CO", "Playwrite CO Guides", "Playwrite CU", "Playwrite CU Guides", "Playwrite CZ",
    "Playwrite CZ Guides", "Playwrite DE Grund", "Playwrite DE Grund Guides", "Playwrite DE LA", "Playwrite DE LA Guides", "Playwrite DE SAS",
    "Playwrite DE SAS Guides", "Playwrite DE VA", "Playwrite DE VA Guides", "Playwrite DK Loopet", "Playwrite DK Loopet Guides", "Playwrite DK Uloopet",
    "Playwrite DK Uloopet Guides", "Playwrite ES", "Playwrite ES Deco", "Playwrite ES Deco Guides", "Playwrite ES Guides", "Playwrite FR Moderne",
    "Playwrite FR Moderne Guides", "Playwrite FR Trad", "Playwrite FR Trad Guides", "Playwrite GB J", "Playwrite GB J Guides", "Playwrite GB S",
    "Playwrite GB S Guides", "Playwrite HR", "Playwrite HR Guides", "Playwrite HR Lijeva", "Playwrite HR Lijeva Guides", "Playwrite HU",
    "Playwrite HU Guides", "Playwrite ID", "Playwrite ID Guides", "Playwrite IE", "Playwrite IE Guides", "Playwrite IN",
    "Playwrite IN Guides", "Playwrite IS", "Playwrite IS Guides", "Playwrite IT Moderna", "Playwrite IT Moderna Guides", "Playwrite IT Trad",
    "Playwrite IT Trad Guides", "Playwrite MX", "Playwrite MX Guides", "Playwrite NG Modern", "Playwrite NG Modern Guides", "Playwrite NL",
    "Playwrite NL Guides", "Playwrite NO", "Playwrite NO Guides", "Playwrite NZ", "Playwrite NZ Guides", "Playwrite PE",
    "Playwrite PE Guides", "Playwrite PL", "Playwrite PL Guides", "Playwrite PT", "Playwrite PT Guides", "Playwrite RO",
    "Playwrite RO Guides", "Playwrite SK", "Playwrite SK Guides", "Playwrite TZ", "Playwrite TZ Guides", "Playwrite US Modern",
    "Playwrite US Modern Guides", "Playwrite US Trad", "Playwrite US Trad Guides", "Playwrite VN", "Playwrite VN Guides", "Playwrite ZA",
    "Playwrite ZA Guides", "Pochaevsk", "Podkova", "Poetsen One", "Poiret One", "Poller One",
    "Poltawski Nowy", "Poly", "Pompiere", "Ponnala", "Ponomar", "Pontano Sans",
    "Poor Story", "Port Lligat Sans", "Port Lligat Slab", "Potta One", "Pragati Narrow", "Praise",
    "Preahvihear", "Press Start 2P", "Pridi", "Princess Sofia", "Prociono", "Prosto One",
    "Protest Guerrilla", "Protest Revolution", "Protest Riot", "Protest Strike", "Proza Libre", "Puppies Play",
    "Puritan", "Purple Purse", "Qahiri", "Quando", "Quantico", "Quintessential",
    "Qwigley", "Qwitcher Grypen", "REM", "Racing Sans One", "Radio Canada", "Radio Canada Big",
    "Radley", "Raleway Dots", "Ramabhadra", "Ramaraja", "Rambla", "Rampart One",
    "Ranchers", "Rancho", "Ranga", "Rasa", "Rationale", "Ravi Prakash",
    "Readex Pro", "Recursive", "Red Hat Mono", "Red Rose", "Redacted", "Redacted Script",
    "Reddit Mono", "Reddit Sans", "Reddit Sans Condensed", "Redressed", "Reem Kufi Fun", "Reem Kufi Ink",
    "Reggae One", "Rethink Sans", "Revalia", "Rhodium Libre", "Ribeye", "Ribeye Marrow",
    "Risque", "Road Rage", "Roboto Flex", "Roboto Serif", "Rock 3D", "RocknRoll One",
    "Rokkitt", "Romanesco", "Ropa Sans", "Rosario", "Rosarivo", "Rouge Script",
    "Rowdies", "Rozha One", "Rubik 80s Fade", "Rubik Beastly", "Rubik Broken Fax", "Rubik Bubbles",
    "Rubik Burned", "Rubik Dirt", "Rubik Distressed", "Rubik Doodle Shadow", "Rubik Doodle Triangles", "Rubik Gemstones",
    "Rubik Glitch", "Rubik Glitch Pop", "Rubik Iso", "Rubik Lines", "Rubik Maps", "Rubik Marker Hatch",
    "Rubik Maze", "Rubik Microbe", "Rubik Mono One", "Rubik Moonrocks", "Rubik Pixels", "Rubik Puddles",
    "Rubik Scribble", "Rubik Spray Paint", "Rubik Storm", "Rubik Vinyl", "Rubik Wet Paint", "Ruda",
    "Ruge Boogie", "Ruluko", "Rum Raisin", "Ruslan Display", "Ruthie", "Ruwudu",
    "Rye", "STIX Two Text", "SUSE", "SUSE Mono", "Sahitya", "Sail",
    "Saira Extra Condensed", "Saira Semi Condensed", "Saira Stencil One", "Salsa", "Sancreek", "Sankofa Display",
    "Sansation", "Sansita", "Sansita Swashed", "Sarala", "Sarina", "Sarpanch",
    "Sassy Frass", "Savate", "Sawarabi Gothic", "Sawarabi Mincho", "Scada", "Scheherazade New",
    "Science Gothic", "Scope One", "Seaweed Script", "Secular One", "Sedan", "Sedan SC",
    "Sedgwick Ave", "Sedgwick Ave Display", "Sekuya", "Sen", "Send Flowers", "Sevillana",
    "Seymour One", "Shadows Into Light Two", "Shafarik", "Shalimar", "Shantell Sans", "Shanti",
    "Share", "Share Tech", "Share Tech Mono", "Shippori Antique", "Shippori Antique B1", "Shippori Mincho",
    "Shippori Mincho B1", "Shizuru", "Shojumaru", "Short Stack", "Shrikhand", "Siemreap",
    "Sigmar", "Silkscreen", "Simonetta", "Single Day", "Sintony", "Sirin Stencil",
    "Sirivennela", "Six Caps", "Sixtyfour", "Sixtyfour Convergence", "Skranji", "Slabo 13px",
    "Slabo 27px", "Slackey", "Slackside One", "Smokum", "Smooch", "Smooch Sans",
    "Smythe", "Sniglet", "Snippet", "Snowburst One", "Sofadi One", "Sofia",
    "Sofia Sans", "Sofia Sans Condensed", "Sofia Sans Extra Condensed", "Sofia Sans Semi Condensed", "Solitreo", "Solway",
    "Sometype Mono", "Song Myung", "Sono", "Sonsie One", "Sorts Mill Goudy", "Sour Gummy",
    "Source Sans 3", "Source Serif 4", "Special Gothic", "Special Gothic Condensed One", "Special Gothic Expanded One", "Spectral SC",
    "Spicy Rice", "Spinnaker", "Spirax", "Splash", "Spline Sans", "Spline Sans Mono",
    "Squada One", "Square Peg", "Sree Krushnadevaraya", "Srisakdi", "Stack Sans Headline", "Stack Sans Notch",
    "Stack Sans Text", "Stalemate", "Stalinist One", "Stardos Stencil", "Stick", "Stick No Bills",
    "Stint Ultra Condensed", "Stint Ultra Expanded", "Stoke", "Story Script", "Strait", "Style Script",
    "Stylish", "Sue Ellen Francisco", "Sulphur Point", "Sumana", "Sunflower", "Sunshiney",
    "Supermercado One", "Sura", "Suranna", "Suravaram", "Suwannaphum", "Swanky and Moo Moo",
    "Syncopate", "Syne Mono", "Syne Tactile", "TASA Explorer", "TASA Orbiter", "Tac One",
    "Tagesschrift", "Tai Heritage Pro", "Tapestry", "Taprom", "Tauri", "Taviraj",
    "Teachers", "Tektur", "Telex", "Tenali Ramakrishna", "Tenor Sans", "Text Me One",
    "Texturina", "Thasadith", "The Girl Next Door", "The Nautigal", "Tienne", "TikTok Sans",
    "Tillana", "Tilt Neon", "Tilt Prism", "Tilt Warp", "Timmana", "Tinos",
    "Tiny5", "Tiro Bangla", "Tiro Devanagari Hindi", "Tiro Devanagari Marathi", "Tiro Devanagari Sanskrit", "Tiro Gurmukhi",
    "Tiro Kannada", "Tiro Tamil", "Tiro Telugu", "Tirra", "Tomorrow", "Tourney",
    "Trade Winds", "Train One", "Triodion", "Trispace", "Trocchi", "Trochut",
    "Truculenta", "Trykker", "Tsukimi Rounded", "Tuffy", "Tulpen One", "Turret Road",
    "Twinkle Star", "Ubuntu Condensed", "Ubuntu Mono", "Ubuntu Sans", "Ubuntu Sans Mono", "Uchen",
    "Ultra", "Uncial Antiqua", "Underdog", "Unica One", "UnifrakturCook", "UnifrakturMaguntia",
    "Unkempt", "Unlock", "Unna", "UoqMunThenKhung", "Updock", "VT323",
    "Vampiro One", "Varela", "Varta", "Vast Shadow", "Vend Sans", "Vesper Libre",
    "Viaoda Libre", "Vibes", "Vibur", "Victor Mono", "Viga", "Vina Sans",
    "Voces", "Volkhov", "Vollkorn SC", "Voltaire", "Vujahday Script", "WDXL Lubrifont JP N",
    "WDXL Lubrifont SC", "WDXL Lubrifont TC", "Waiting for the Sunrise", "Wallpoet", "Warnes", "Water Brush",
    "Waterfall", "Wavefont", "Wellfleet", "Wendy One", "Whisper", "Winky Rough",
    "Winky Sans", "Wire One", "Wittgenstein", "Wix Madefor Display", "Wix Madefor Text", "Workbench",
    "Xanh Mono", "Yaldevi", "Yantramanav", "Yarndings 12", "Yarndings 12 Charted", "Yarndings 20",
    "Yarndings 20 Charted", "Yatra One", "Yeon Sung", "Yomogi", "Young Serif", "Yrsa",
    "Ysabeau", "Ysabeau Infant", "Ysabeau Office", "Ysabeau SC", "Yuji Boku", "Yuji Hentaigana Akari",
    "Yuji Hentaigana Akebono", "Yuji Mai", "Yuji Syuku", "Yusei Magic", "ZCOOL KuaiLe", "ZCOOL QingKe HuangYou",
    "ZCOOL XiaoWei", "Zain", "Zalando Sans", "Zalando Sans Expanded", "Zalando Sans SemiExpanded", "Zen Antique",
    "Zen Antique Soft", "Zen Dots", "Zen Kaku Gothic Antique", "Zen Kaku Gothic New", "Zen Kurenaido", "Zen Loop",
    "Zen Maru Gothic", "Zen Old Mincho", "Zen Tokyo Zoo", "Zeyada", "Zhi Mang Xing", "Zilla Slab Highlight"
  ];

var ALL_FONT_NAMES = SYSTEM_FONTS.concat(GOOGLE_FONTS);
var _ldLoadedFonts = {};
function ensureFontLoadedV2(name, cb) {
  if (!name || SYSTEM_FONTS.indexOf(name) > -1 || _ldLoadedFonts[name]) { cb && cb(); return; }
  _ldLoadedFonts[name] = 1;
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + ':wght@400;600;700&display=swap';
  l.onload = function () { setTimeout(function () { cb && cb(); }, 60); };
  l.onerror = function () { cb && cb(); };
  document.head.appendChild(l);
  setTimeout(function () { cb && cb(); }, 2500);
}
window.loadDeckFonts = function (names, done) {
  var todo = (names || []).filter(function (n) { return n && SYSTEM_FONTS.indexOf(n) === -1 && !_ldLoadedFonts[n]; });
  if (!todo.length) { done && done(); return; }
  var left = todo.length, fired = false;
  function one() { left--; if (left <= 0 && !fired) { fired = true; done && done(); } }
  todo.forEach(function (n) { ensureFontLoadedV2(n, one); });
  setTimeout(function () { if (!fired) { fired = true; done && done(); } }, 4000);
};
Editor._register({
  __qFonts: function () { return ALL_FONT_NAMES; },
  fontFamily: function (name) {
    var o = fc.getActiveObject();
    if (!o || !/text/.test(o.type || '')) { showToast('Select a text box first'); return; }
    ensureFontLoadedV2(name, function () { fc.renderAll(); });
    o.set('fontFamily', name);
    if (o.styles) {
      Object.keys(o.styles).forEach(function (li) {
        Object.keys(o.styles[li]).forEach(function (ci) { o.styles[li][ci].fontFamily = name; });
      });
      if (o.initDimensions) o.initDimensions();
    }
    o.dirty = true; fc.renderAll(); saveState();
    Editor._emit('selection', Editor.query('selection'));
  }
});

/* ── AI: compose-append engine (v1 verbatim) ── */
window.ldComposeAppend = async function (sentence, opts) {
    opts = opts || {};
    if (!window.LD_BACKEND) { say('Designer backend not reachable from here'); return 0; }
    for (var w = 0; w < 10 && !window.LD_AUTH_TOKEN; w++) await new Promise(function (r) { setTimeout(r, 500); });

    var r;
    try {
      r = await fetch(window.LD_BACKEND + '/compose_ir', {
        method: 'POST',
        headers: window.ldHeaders ? window.ldHeaders('application/json') : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: sentence })
      });
    } catch (e) { say('Could not reach the design service — nothing was changed'); return 0; }

    if (r.status === 401 || r.status === 403) { say('Please sign in on the main site first 🔐'); return 0; }
    if (!r.ok) { say('The design service returned an error (' + r.status + ') — nothing was changed'); return 0; }

    var d; try { d = await r.json(); } catch (e) { say('The reply could not be read — nothing was changed'); return 0; }
    var deck = (d && d.deck) ? d.deck : null;
    var slides = (deck && deck.slides) || [];
    var plan = (d && d.plan) || (deck && deck._plan) || [];
    if (!slides.length) { say('The design service sent no slides back — nothing was changed'); return 0; }
    if (d && d.designNo != null) window.LD_DESIGN_NO = d.designNo;

    function kindAt(i) {
      var p = String(plan[i] || '');
      var c = p.lastIndexOf(':');
      return c > -1 ? p.slice(c + 1) : '';
    }

    /* choose which of the returned slides are actually wanted */
    var picked = [];
    if (opts.onlyMockups) {
      slides.forEach(function (s, i) { if (kindAt(i) === 'mockup') picked.push(s); });
      if (!picked.length) { say('No mock-up slides came back — nothing was changed'); return 0; }
    } else if (opts.prefer) {
      var exact = [], rest = [];
      slides.forEach(function (s, i) {
        var k = kindAt(i);
        if (k === 'mockup') return;
        (k === opts.prefer ? exact : rest).push(s);
      });
      picked = exact.concat(rest);
    } else {
      slides.forEach(function (s, i) { if (kindAt(i) !== 'mockup') picked.push(s); });
    }
    if (opts.keep) picked = picked.slice(0, opts.keep);
    if (!picked.length) { say('Nothing matched — nothing was changed'); return 0; }

    /* the same slide ceiling the rest of the editor keeps */
    var _max = (typeof ldMaxSlides === 'function') ? ldMaxSlides() : 500;
    var room = _max - state.pages.length;
    if (room <= 0) { say('Maximum ' + _max + ' slides — remove one first'); return 0; }
    if (picked.length > room) { picked = picked.slice(0, room); say('Only ' + room + ' more slides fit (' + _max + ' max)'); }

    /* fonts first, exactly as loadDeckIRIntoEditor does, or the new slides
       paint in a fallback face for a second and reflow */
    try {
      var fs = {};
      picked.forEach(function (s) {
        (s.elements || []).forEach(function (e) {
          if (e.type === 'text' && e.paragraphs) e.paragraphs.forEach(function (p) {
            (p.runs || []).forEach(function (rn) { if (rn.font) fs[rn.font] = 1; });
          });
        });
      });
      var names = Object.keys(fs);
      if (window.loadDeckFonts && names.length) await new Promise(function (res) { window.loadDeckFonts(names, res); });
    } catch (e) {}

    /* SPLICE, never assign — the deck that is open is untouched */
    try { captureCurrentPage(); } catch (e) {}
    var at = (state.currentPage == null ? state.pages.length - 1 : state.currentPage) + 1;
    picked.forEach(function (slideIR, i) {
      var page = makeBlankPage(Date.now() + i);
      page.ir = slideIR;
      state.pages.splice(at + i, 0, page);
      state.notes.splice(at + i, 0, '');
    });
    /* keep the deck IR in step so saving and exporting see the new slides */
    try {
      if (window._deckIR && window._deckIR.slides) {
        Array.prototype.splice.apply(window._deckIR.slides, [at, 0].concat(picked));
      }
    } catch (e) {}

    state.currentPage = at;
    /* the slides are ALREADY spliced into the deck — a hiccup while drawing
       the first one must not bubble up as "Could not add the slides" when
       they were in fact added (audit 53) */
    try { await loadPageIntoCanvas(state.currentPage); }
    catch (e) { try { console.warn('[ai] drew with a minor issue after insert', e); } catch (e2) {} }
    try { renderPageThumbs && renderPageThumbs(); } catch (e) {}
    try { pageRefresh && pageRefresh(); } catch (e) {}
    try { saveState && saveState(); } catch (e) {}
    return picked.length;
  };

/* pageRefresh shim — ldComposeAppend calls it after splicing slides */
function pageRefresh() { renderPageThumbs(); }

/* ── AI panel commands ── */
(function () {
  function busy(on, msg) { showToast(msg || (on ? 'Working…' : 'Done'), on ? 60000 : 1200); }
  function say(m) { showToast(m, 4000); }
  function styleClause() {
    return window.LD_DESIGN_NO != null ? ('use design ' + window.LD_DESIGN_NO + ' style, ') : '';
  }
  async function aiText(kind) {
    var o = fc.getActiveObject();
    if (!o || !/text/.test(o.type || '')) { say('Select a text box first'); return; }
    var src = (o.text || '').trim();
    if (!src) { say('That text box is empty'); return; }
    var prompt;
    if (kind === 'rewrite') prompt = 'Rewrite this presentation text so it is clearer and punchier. Keep the same meaning and roughly the same length. Reply with the rewritten text only, no preamble:\n\n' + src;
    else if (kind === 'summarize') prompt = 'Summarise this into one short slide-friendly line. Reply with the line only:\n\n' + src;
    else {
      var lang = window.prompt('Translate into which language?', 'Urdu');
      if (!lang) return;
      prompt = 'Translate this into ' + lang + '. Keep it natural and slide-friendly. Reply with the translation only:\n\n' + src;
    }
    say(kind === 'translate' ? 'Translating…' : kind === 'rewrite' ? 'Rewriting…' : 'Summarising…');
    try {
      var r = await fetch(window.LD_CHAT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      var t = d && (d.reply || d.text || d.message || d.answer);
      if (!t) throw new Error('empty reply');
      t = String(t).replace(/^ACTION:.*$/gm, '').trim();
      o._aiBefore = o.text;
      o.set('text', t);
      if (o.initDimensions) o.initDimensions();
      o.dirty = true; fc.renderAll(); saveState();
      say('Done ✓');
    } catch (e) { say('AI text failed: ' + e.message); }
  }
  var _aiRunning = false;
  Editor._register({
    ai: function (a) {
      var kind = a && a.kind;
      if (['rewrite', 'summarize', 'translate'].indexOf(kind) > -1) { aiText(kind); return; }
      if (kind === 'removeBg') { showToast('Remove background arrives with the media stage'); return; }
      if (_aiRunning) { say('Still working on the previous run — one at a time'); return; }
      if (kind === 'deck') {
        if (state.pages.length > 1 && !confirm('This builds a NEW deck and replaces the ' + state.pages.length + ' slides open here.\n\nReplace everything?')) return;
        var q0 = prompt('Describe the deck you want:\n(e.g. "a fintech pitch deck, dark blue, 8 slides")');
        if (!q0 || !q0.trim()) return;
        _aiRunning = true; busy(true, 'Designing in the cloud… up to a minute');
        window.ldCompose(q0.trim()).then(function () { _aiRunning = false; })
          .catch(function (e) { _aiRunning = false; say('Compose failed: ' + e.message); });
        return;
      }
      if (kind === 'slide') {
        var q = prompt('Describe the slide you want:\n(e.g. "a dark title slide with a bold headline")');
        if (!q || !q.trim()) return;
        _aiRunning = true; busy(true, 'Designing one slide…');
        window.ldComposeAppend(styleClause() + q.trim() + ', 5 slides', { keep: 1 })
          .then(function (n) { _aiRunning = false; if (n) say('Slide added ✓'); })
          .catch(function () { _aiRunning = false; say('Could not add the slide'); });
        return;
      }
      if (kind === 'addSlides') {
        var howMany = prompt('How many more slides in this style?', '5');
        if (!howMany) return;
        var n = Math.max(1, Math.min(20, parseInt(String(howMany).replace(/[^0-9]/g, ''), 10) || 0));
        if (!n) { say('Give a number between 1 and 20'); return; }
        var about = prompt('Anything in particular?\n(optional — e.g. "more charts", or leave blank)', '') || '';
        if (window.LD_DESIGN_NO == null && !about.trim()) {
          about = prompt('This deck has no design number, so describe the look:\n(e.g. "dark navy corporate pitch deck")', '') || '';
          if (!about.trim()) { say('Nothing to go on — cancelled'); return; }
        }
        _aiRunning = true; busy(true, 'Adding ' + n + ' slides…');
        window.ldComposeAppend(styleClause() + about.trim() + (about.trim() ? ', ' : '') + (n + 2) + ' slides', { keep: n })
          .then(function (added) { _aiRunning = false; if (added) say(added + ' slide(s) added ✓'); })
          .catch(function () { _aiRunning = false; say('Could not add the slides'); });
        return;
      }
      if (kind === 'mockups') {
        var hm = prompt('How many mock-up slides?', '3');
        if (!hm) return;
        var m = Math.max(1, Math.min(20, parseInt(String(hm).replace(/[^0-9]/g, ''), 10) || 0));
        if (!m) { say('Give a number between 1 and 20'); return; }
        _aiRunning = true; busy(true, 'Adding ' + m + ' mock-up slides…');
        window.ldComposeAppend(styleClause() + (m + 2) + ' slides, ' + m + ' mockup slides', { onlyMockups: true, keep: m })
          .then(function (added) { _aiRunning = false; if (added) say(added + ' mock-up slide(s) added ✓'); })
          .catch(function () { _aiRunning = false; say('Could not add the mock-ups'); });
        return;
      }
    }
  });
})();

/* ── photos library (session) ── */
(function () {
  var photos = [];
  var origInsert = null;
  document.addEventListener('DOMContentLoaded', function () {
    /* wrap insertImage so every upload lands in the library too */
    var prev = Editor.run;
  });
  Editor._register({
    insertImage: function (dataUrl) {
      if (!dataUrl) return;
      if (photos.indexOf(dataUrl) === -1) photos.unshift(dataUrl);
      if (photos.length > 40) photos.pop();
      fabric.Image.fromURL(dataUrl, function (img) {
        var maxW = fc.getWidth() / fc.getZoom() * 0.5;
        if (img.width > maxW) img.scaleToWidth(maxW);
        img.set({ left: 160, top: 120 });
        fc.add(img).setActiveObject(img);
        fc.renderAll(); saveState();
        showToast('Image added — drag it onto a frame to fit it inside');
      });
    },
    __qPhotos: function () { return photos.slice(); }
  });
})();

/* ── CSV → chart data ── */
Editor._register({
  dataUpload: function (dataUrl) {
    try {
      var csv = atob(String(dataUrl).split(',')[1] || '');
      var rows = csv.split(/\r?\n/).filter(function (r) { return r.trim(); })
        .map(function (r) { return r.split(','); });
      if (rows.length < 2) { showToast('Need a header row + data rows'); return; }
      var labels = rows.slice(1).map(function (r) { return r[0]; });
      var vals = rows.slice(1).map(function (r) { return parseFloat(r[1]) || 0; });
      var o = fc.getActiveObject();
      if (!o || !o.chartType) {
        showToast('Select a chart first, then bring in the CSV — using first 2 columns');
        return;
      }
      /* rebuild the chart with real data */
      var type = o.chartType;
      var pos = { left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY };
      fc.remove(o);
      var maxV = Math.max.apply(null, vals) || 1;
      var cols = ['#7C3AED', '#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#0EA5E9', '#DB2777', '#CA8A04'];
      var parts = [], W = Math.max(340, vals.length * 80), H = 240;
      parts.push(new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: '#FFFFFF', stroke: '#E4E7EE', strokeWidth: 1, rx: 8, ry: 8 }));
      if (type === 'bar' || type === 'line') {
        vals.forEach(function (v, i) {
          var h = v / maxV * (H - 70);
          if (type === 'bar') parts.push(new fabric.Rect({ left: 30 + i * 76, top: H - 40 - h, width: 46, height: h, fill: cols[i % cols.length], rx: 4, ry: 4 }));
          parts.push(new fabric.Text(String(labels[i]).slice(0, 8), { left: 30 + i * 76, top: H - 30, fontSize: 13, fontFamily: 'DM Sans', fill: '#5B6472' }));
        });
        if (type === 'line') {
          var pts = vals.map(function (v, i) { return { x: 50 + i * 76, y: H - 45 - v / maxV * (H - 80) }; });
          parts.push(new fabric.Polyline(pts, { stroke: '#7C3AED', strokeWidth: 4, fill: '', strokeLineJoin: 'round' }));
        }
      } else {
        var total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
        var start = -90;
        vals.forEach(function (v, i) {
          var ang = v / total * 360;
          parts.push(new fabric.Path(describeArc(W / 2, H / 2, 84, start, start + ang), { fill: cols[i % cols.length] }));
          start += ang;
        });
        if (type === 'donut') parts.push(new fabric.Circle({ left: W / 2 - 44, top: H / 2 - 44, radius: 44, fill: '#FFFFFF' }));
      }
      var g = new fabric.Group(parts, Object.assign({ chartType: type }, pos));
      fc.add(g).setActiveObject(g);
      fc.renderAll(); saveState();
      showToast('Chart updated with ' + vals.length + ' rows ✓');
    } catch (e) { showToast('Could not read that file: ' + e.message); }
  }
});

/* ── icons library command upgrade (glyph catalogue for the sidebar) ── */
window.LD_ICON_GLYPHS = ['home','favorite','star','check_circle','bolt','rocket_launch','lightbulb','trending_up',
  'bar_chart','pie_chart','payments','account_balance','shopping_cart','storefront','work','business_center',
  'groups','person','handshake','public','language','travel_explore','school','science','psychology','biotech',
  'health_and_safety','medical_services','favorite_border','eco','recycling','solar_power','devices','smartphone',
  'laptop_mac','cloud','wifi','security','lock','key','settings','build','construction','palette','brush',
  'photo_camera','music_note','movie','sports_esports','emoji_events','celebration','local_fire_department',
  'water_drop','air','pets','restaurant','local_cafe','directions_car','flight','location_on','schedule','mail',
  'call','chat','notifications','thumb_up','verified','diamond','crown'];
