/* ============ icons.js — iconos pixel art (sustituyen a los emojis) ============
 * Todo se dibuja desde mapas de caracteres, igual que los tiles: así la
 * interfaz comparte estilo con los sprites de Mundo Misterioso.
 *
 *   G.Icons.html('coin', 18)     <img> para el DOM
 *   G.Icons.draw(ctx, 'coin', x, y, 18)   en el canvas
 *   G.Icons.url('star')          data URL (para CSS)
 *   'move:<id>'                  emblema del tipo + insignia de la familia
 *   'type:<tipo>'                sólo el emblema
 */
window.G = window.G || {};
G.Icons = (() => {
  const K = '#1b1528';          // contorno

  // ---------------- iconos de interfaz (12×12) ----------------
  const MEDAL = ['.kkk....kkk.', '.krk....kqk.', '..krk..kqk..', '...krkkqk...', '....kkkk....', '...kmmmmk...',
                 '..kmwmmmnk..', '.kmwmsmmmnk.', '.kmmsssmmnk.', '.kmmmsmmmnk.', '..kmmmmmnk..', '...kkkkkk...'];

  const UI = {
    gear: { pal: { g: '#c9d6ff', d: '#7f93c9' }, rows: [
      '....kkkk....', '.kk.kggk.kk.', '.kgkkggkkgk.', '..kggggggk..', 'kkggkkkkggkk', 'kgggk..kgddk',
      'kgggk..kgddk', 'kkggkkkkddkk', '..kggddddk..', '.kgkkddkkdk.', '.kk.kddk.kk.', '....kkkk....'] },
    full: { pal: { w: '#f4f8ff' }, rows: [
      'kkkkk..kkkkk', 'kwwwk..kwwwk', 'kwkk....kkwk', 'kwk......kwk', 'kkk......kkk', '............',
      '............', 'kkk......kkk', 'kwk......kwk', 'kwkk....kkwk', 'kwwwk..kwwwk', 'kkkkk..kkkkk'] },
    phone: { pal: { b: '#2c519f', s: '#9fd8ff', w: '#e6f4ff' }, rows: [
      '...kkkkkk...', '...kbbbbk...', '...kssssk...', '...kswssk...', '...kssssk...', '...kssssk...',
      '...kssssk...', '...kssssk...', '...kssssk...', '...kbbbbk...', '...kbwwbk...', '...kkkkkk...'] },
    // Banderita: reportar una marca del ranking.
    flag: { pal: { r: '#ff5f6d', w: '#c9cfdc' }, rows: [
      '.kk.........', '.kwkkkkkk...', '.kwkrrrrrk..', '.kwkrrrrrrk.', '.kwkrrrrrk..', '.kwkrrrrk...',
      '.kwkkkkk....', '.kwk........', '.kwk........', '.kwk........', 'kkwkk.......', 'kkkkk.......'] },
    // Prohibido (Veto: movimiento bloqueado).
    ban: { pal: { r: '#ff5f6d' }, rows: [
      '...kkkkkk...', '..krrrrrrk..', '.krrkkkkrrk.', 'krrk..krrrrk', 'krk..krrkkrk', 'krk.krrk.krk',
      'krkkrrk..krk', 'krrrrk..krrk', '.krrkkkkrrk.', '..krrrrrrk..', '...kkkkkk...', '............'] },
    heart: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#ffd3d8' }, rows: [
      '............', '.kkk....kkk.', 'kwwrk..krrrk', 'kwrrrkkrrrsk', 'krrrrrrrrrsk', 'krrrrrrrrrsk',
      '.krrrrrrrsk.', '..krrrrrsk..', '...krrrsk...', '....krsk....', '.....kk.....', '............'] },
    fist: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#ffd3d8', c: '#e8e8f0' }, rows: [
      '............', '..kkkkkk....', '.krrrrrrk...', 'krwwrrrrrkk.', 'krwrrrrrrrrk', 'krrrrrrrkrsk',
      'krrrrrrrkrsk', '.krrrrrrskk.', '..kssssssk..', '..kcccccck..', '..kkkkkkkk..', '............'] },
    up: { pal: { g: '#5fe08a', d: '#2f9a52', w: '#c8ffd8' }, rows: [
      '.....kk.....', '....kwgk....', '...kwgggk...', '..kwgggggk..', '.kwgggggggk.', 'kkkkggggkkkk',
      '...kggggk...', '...kggggk...', '...kggddk...', '...kgdddk...', '...kddddk...', '...kkkkkk...'] },
    boot: { pal: { b: '#4fb4ff', d: '#2a6fb0', w: '#e6f4ff', g: '#e8e8f0' }, rows: [
      '............', '....kkkk....', '....kbbk....', '....kbbk....', '....kbbk....', '....kbbbkk..',
      '...kbwbbbbk.', '..kbbbbbbbbk', '..kdddddddbk', '..kgggggggk.', '...kkkkkkk..', '............'] },
    // Vínculo (premio de los legendarios): dos eslabones enlazados.
    bond: { pal: { y: '#ffd23f', w: '#fff3b0', p: '#ff8ad8', q: '#ffd3f1' }, rows: [
      '.kkkkk......', 'kwyyyyk.....', 'kykkkyk.....', 'kyk.kyk.....', 'kykkkyk.....', 'kyyyyykkkkk.',
      '.kkkkkqppppk', '.....kpkkkpk', '.....kpk.kpk', '.....kpkkkpk', '.....kpppppk', '......kkkkk.'] },
    clock: { pal: { w: '#f4f4ff', y: '#ffd23f', o: '#c9c9e0' }, rows: [
      '....kkkk....', '..kkyyyykk..', '.kyywwwwyyk.', '.kywwwkwwyk.', 'kywwwwkwwwyk', 'kywwwwkwwwyk',
      'kywwwwkkkwyk', 'kywwwwwwwwyk', '.kywwwwwwyk.', '.kyyowwwyyk.', '..kkyyyykk..', '....kkkk....'] },
    shield: { pal: { s: '#9fb1c9', d: '#5d6f8c', w: '#e6eef8', r: '#4fb4ff' }, rows: [
      '............', '.kkkkkkkkkk.', '.kwwsssssdk.', '.kwssrrssdk.', '.kwssrrssdk.', '.kssrrrrsdk.',
      '.kssrrrrsdk.', '..kssrrsdk..', '..kssssddk..', '...ksssdk...', '....kddk....', '.....kk.....'] },
    sprout: { pal: { g: '#5fe08a', d: '#2f9a52', b: '#8a5a2b' }, rows: [
      '............', '..kkk..kkk..', '.kgggk.kgggk', '.kggggkgggdk', '..kdggkggdk.', '...kkdgdkk..',
      '.....kgk....', '.....kgk....', '...kkkdkkk..', '..kbbbbbbbk.', '..kbbbbbbbk.', '...kkkkkkk..'] },
    magnet: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#e8e8f0' }, rows: [
      '............', '..kkkkkkkk..', '.krrrrrrrrk.', 'krrsskkssrrk', 'krrk....krrk', 'krrk....krrk',
      'krrk....krrk', 'kwwk....kwwk', 'kwwk....kwwk', 'kkkk....kkkk', '............', '............'] },
    book: { pal: { c: '#4fb4ff', d: '#2a6fb0', p: '#f4f4ff', y: '#ffd23f' }, rows: [
      '............', '.kkkkkkkkkk.', '.kcccccccck.', '.kcyyyyyyck.', '.kcccccccck.', '.kccyyyyyck.',
      '.kcccccccck.', '.kcccccccck.', '.kddddddddk.', '.kppppppppk.', '.kkkkkkkkkk.', '............'] },
    coin: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff4b0' }, rows: [
      '....kkkk....', '..kkyyyykk..', '.kyywwyyyyk.', '.kywyyyyyok.', 'kyyyyooyyyok', 'kywyoyyoyyok',
      'kyyyoyyoyyok', 'kyyyyooyyyok', '.kyyyyyyyok.', '.kooyyyyook.', '..kkooookk..', '....kkkk....'] },
    cards: { pal: { a: '#ffd23f', b: '#4fb4ff', w: '#e6f4ff' }, rows: [
      '............', '.kkkkkk.....', '.kaaaaakkkk.', '.kaaaakbbbbk', '.kaaaakbwwbk', '.kaaaakbwwbk',
      '.kaaaakbbbbk', '.kaaaakbwwbk', '.kkkkkkbwwbk', '......kbbbbk', '......kkkkkk', '............'] },
    berry: { pal: { r: '#ff7a9e', s: '#c23a6b', w: '#ffd3e0', g: '#5fe08a', d: '#2f9a52' }, rows: [
      '............', '.....kkk....', '....kgggk...', '..kkkgdkkk..', '.krrrkkrrrk.', 'krwwrrrrrrsk',
      'krwrrrrrrrsk', 'krrrrrrrrrsk', 'krrrrrrrrssk', '.krrrrrrssk.', '..kkssssskk.', '....kkkkk...'] },
    bomb: { pal: { b: '#3a3a4a', w: '#8a8aa0', f: '#ffd23f', r: '#ff7b3d' }, rows: [
      '........r...', '.......rfr..', '......kfr...', '.....kfk....', '...kkkkkk...', '..kbbbbbbk..',
      '.kbwwbbbbbk.', '.kbwbbbbbbk.', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kbbbbbbk..', '...kkkkkk...'] },
    star: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff4b0' }, rows: [
      '.....kk.....', '.....kk.....', '....kwyk....', '....kyyk....', 'kkkkwyyykkkk', 'kwyyyyyyyyok',
      '.kyyyyyyyok.', '..kyyyyyyk..', '..kyyyoyyk..', '.kyok..koyk.', '.kok....kok.', '.kk......kk.'] },
    // Marca de shiny: la estrella roja de la ficha de los juegos, con un destello.
    shiny: { pal: { y: '#ff4d5e', w: '#ffd0d6', o: '#b8283a', x: '#fff6b0' }, rows: [
      '.....kk...x.', '.....kk..xxx', '....kwyk..x.', '....kyyk....', 'kkkkwyyykkkk', 'kwyyyyyyyyok',
      '.kyyyyyyyok.', '..kyyyyyyk..', '..kyyyoyyk..', '.kyok..koyk.', '.kok....kok.', '.kk......kk.'] },
    crown: { pal: { y: '#ffd23f', o: '#c08a10', r: '#ff5f6d' }, rows: [
      '............', '............', 'k....k....k.', 'kk..kyk..kk.', 'kyk.kyk.kyk.', 'kyykyyykyyk.',
      'kyyyyyyyyyk.', 'kyyryyyryyk.', 'kyyyyyyyyyk.', 'koooooooook.', 'kkkkkkkkkkk.', '............'] },
    user: { pal: { u: '#b9cbf0', d: '#7f93c0' }, rows: [
      '............', '....kkkk....', '...kuuuuk...', '...kuuuuk...', '...kuuuuk...', '....kuuk....',
      '..kkkuukkk..', '.kuuuuuuuuk.', '.kuuuuuuuuk.', '.kdduuuuddk.', '.kkkkkkkkkk.', '............'] },
    cursor: { pal: { y: '#ffd23f' }, rows: [
      'k.......', 'kk......', 'kyk.....', 'kyyk....', 'kyyyk...', 'kyyyyk..',
      'kyyyk...', 'kyyk....', 'kyk.....', 'kk......', 'k.......', '........'] },
    sound: { pal: { w: '#e8eef8' }, rows: [
      '............', '.....kk.....', '....kwk..k..', '...kwwk...k.', 'kkkwwwk.k..k', 'kwwwwwk..k.k',
      'kwwwwwk..k.k', 'kkkwwwk.k..k', '...kwwk...k.', '....kwk..k..', '.....kk.....', '............'] },
    mute: { pal: { w: '#e8eef8', r: '#ff5f6d' }, rows: [
      '............', '.....kk.....', '....kwk.....', '...kwwk.....', 'kkkwwwk.r..r', 'kwwwwwk..rr.',
      'kwwwwwk..rr.', 'kkkwwwk.r..r', '...kwwk.....', '....kwk.....', '.....kk.....', '............'] },
    ticket: { pal: { y: '#ffd23f', d: '#c08a10', w: '#fff3b0', r: '#ff5f6d' }, rows: [
      '............', '............', 'kkkkkkkkkkkk', 'kwyyydyyyyyk', 'kyyyyyyrryyk', '.kyyydyrryk.',
      '.kyyyyyrryk.', 'kyyyydyyyyyk', 'kddddddddddk', 'kkkkkkkkkkkk', '............', '............'] },
    ticket10: { pal: { p: '#c47bff', q: '#8a3fd0', w: '#f0d8ff', y: '#ffd23f' }, rows: [
      '............', '............', 'kkkkkkkkkkkk', 'kwpppqppyypk', 'kppppqpyyypk', '.kpppqpyyyk.',
      '.kpppqppyyk.', 'kppppqpppppk', 'kqqqqqqqqqqk', 'kkkkkkkkkkkk', '............', '............'] },
    wsun: { pal: { y: '#ffd23f', o: '#ff9a3d' }, rows: [
      '.....yy.....', '..y..yy..y..', '...y....y...', '....kkkk....', 'yy.kyyyyk.yy', 'yy.kyyoyk.yy',
      '...kyooyk...', '....kkkk....', '...y....y...', '..y..yy..y..', '.....yy.....', '............'] },
    wrain: { pal: { w: '#e8eef8', g: '#9fb1c9', b: '#4fb4ff' }, rows: [
      '............', '...kkkk.....', '..kwwwwkkk..', '.kwwwwwwwwk.', 'kwwwwwwwwwgk', 'kggggggggggk',
      '.kkkkkkkkkk.', '..b...b...b.', '.b...b...b..', '..b...b...b.', '.b...b...b..', '............'] },
    wsand: { pal: { s: '#e0bf73', d: '#9a7a3a' }, rows: [
      '............', '..ssssss....', '........ss..', 'ssssssss..s.', '.........s..', '..dddddd....',
      '........dd..', 'dddddd....d.', '.........d..', '...sssss....', '............', '............'] },
    wsnow: { pal: { w: '#ffffff', c: '#9fe0ff' }, rows: [
      '.....w......', '...w.w.w....', '....www.....', '.w..cwc..w..', '..w.cwc.w...', 'wwwwwwwwwww.',
      '..w.cwc.w...', '.w..cwc..w..', '....www.....', '...w.w.w....', '.....w......', '............'] },
    wfog: { pal: { g: '#c9cfdc', d: '#8f98ab' }, rows: [
      '............', '............', '..gggggg....', '.g......gg..', '............', '....gggggg..',
      '..dd......d.', '............', '.ggggggg....', 'g.......gg..', '............', '............'] },
    // Bolas del tragaperras del gacha (una por rareza).
    ball2: { pal: { r: '#3d7bff', s: '#2a56b8', w: '#cfe0ff', b: '#f4f4f4' }, rows: [
      '....kkkk....', '..kkrrrrkk..', '.krwrrrrrrk.', '.krwrrrrrsk.', 'krrrrkkrrssk', 'kkkkkbbkkkkk', 'kbbbkbbkbbbk', 'kbbbbkkbbbbk', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kkbbbbkk..', '....kkkk....'] },
    ball3: { pal: { r: '#3a3a46', s: '#1d1d26', w: '#ffd23f', b: '#f4f4f4' }, rows: [
      '....kkkk....', '..kkrrrrkk..', '.krwrrrrrrk.', '.krwrrrrrsk.', 'krrrrkkrrssk', 'kkkkkbbkkkkk', 'kbbbkbbkbbbk', 'kbbbbkkbbbbk', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kkbbbbkk..', '....kkkk....'] },
    ball4: { pal: { r: '#8a3fd0', s: '#5e2a96', w: '#ff8ad8', b: '#f4f4f4' }, rows: [
      '....kkkk....', '..kkrrrrkk..', '.krwrrrrrrk.', '.krwrrrrrsk.', 'krrrrkkrrssk', 'kkkkkbbkkkkk', 'kbbbkbbkbbbk', 'kbbbbkkbbbbk', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kkbbbbkk..', '....kkkk....'] },
    ballLux: { pal: { r: '#30303a', s: '#18181e', w: '#ff5f6d', b: '#ffd23f' }, rows: [
      '....kkkk....', '..kkrrrrkk..', '.krwrrrrrrk.', '.krwrrrrrsk.', 'krrrrkkrrssk', 'kkkkkbbkkkkk', 'kbbbkbbkbbbk', 'kbbbbkkbbbbk', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kkbbbbkk..', '....kkkk....'] },
    // ---------- objetos equipables (data/items.js) ----------
    leftovers: { pal: { r: '#ff5f6d', d: '#b8283a', w: '#ffd8d8', g: '#5fe08a' }, rows: [
      '.....kgk....', '....kggk....', '..kkkkkkkk..', '.krwrrrrrrk.', 'krwrrrrrrrdk', 'krrrrrrrrrdk',
      'krrrrrrrrrdk', 'krrrrrrrrddk', '.krrrrrrrdk.', '..kdrrrrdk..', '...kkkkkk...', '............'] },
    choiceband: { pal: { p: '#ff8ad8', q: '#c04a98', w: '#ffe0f4' }, rows: [
      '............', '............', '...kkkkkk...', '.kkppwwppkk.', 'kpp......ppk', 'kq........qk',
      'kq........qk', 'kpp......ppk', '.kkppppppkk.', '...kkkkkk...', '............', '............'] },
    quickclaw: { pal: { y: '#ffd23f', o: '#c08a10', b: '#8a5a2b' }, rows: [
      '........kk..', '.......kyk..', '......kyok..', '..kk..kyok..', '.kyk.kyok...', '.kyokyok....',
      '.kyyyok..kk.', '.kbbbbk.kyk.', 'kbbbbbbkyok.', 'kbbbbbbyok..', '.kkkkkkkk...', '............'] },
    focussash: { pal: { o: '#ff9a3d', d: '#c0601a', w: '#ffd0a0' }, rows: [
      '.kk.........', 'kook........', 'kwook.......', '.kwook......', '..kwook.....', '...kwook....',
      '....kwook...', '.....kwook..', '......kwook.', '.......koodk', '........kddk', '.........kk.'] },
    shellbell: { pal: { p: '#ff9ec4', q: '#c05a88', w: '#ffe0ee', y: '#ffd23f' }, rows: [
      '.....kk.....', '....kyyk....', '...kkkkkk...', '..kwppppqk..', '.kwppppppqk.', '.kpppppppqk.',
      'kpppppppppqk', 'kppqpqpqppqk', 'kkkkkkkkkkkk', '....kyyk....', '.....kk.....', '............'] },
    amuletcoin: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff3b0', r: '#ff5f6d' }, rows: [
      '..kk....kk..', '..krk..krk..', '...krkkrk...', '....kkkk....', '...kyyyyk...', '..kywyyyok..',
      '..kyyooyok..', '..kyyooyok..', '..kyyyyyok..', '...kooook...', '....kkkk....', '............'] },
    luckyegg: { pal: { w: '#fffaf0', s: '#e0d6c8', r: '#ff5f6d' }, rows: [
      '....kkkk....', '...kwwwwk...', '..kwwrwwwk..', '..kwwwwwwk..', '.kwrwwwwrwk.', '.kwwwwwwwwk.',
      '.kwwwrwwwsk.', '.kwwwwwwwsk.', '.kwrwwwwssk.', '..kwwwwssk..', '...kkkkkk...', '............'] },
    lifeorb: { pal: { p: '#c04a98', d: '#7a1f5a', w: '#ffb0e0', r: '#ff3048' }, rows: [
      '....kkkk....', '..kkpppdkk..', '.kwwpppppdk.', '.kwpprrpppk.', 'kppprrrrppdk', 'kpprrrrrrpdk',
      'kpprrrrrrpdk', 'kppprrrrppdk', '.kpppprppdk.', '.kdpppppddk.', '..kkddddkk..', '....kkkk....'] },
    choicescarf: { pal: { b: '#4fb4ff', d: '#2a6fb0', w: '#cfe8ff' }, rows: [
      '............', '............', 'kkkkkkkkkk..', 'kwbbbbbbbbk.', 'kbbbbbbbbdk.', 'kkkkkkkbbdk.',
      '......kbbdk.', '......kbbdk.', '.....kbbbdk.', '.....kbbddk.', '.....kkkkkk.', '............'] },
    rockyhelmet: { pal: { g: '#9aa6b5', d: '#5d6773', w: '#e0e6ee' }, rows: [
      '............', '.k...k...k..', 'kgk.kgk.kgk.', '.kkkkkkkkk..', 'kwggggggggk.', 'kwgggggggdk.',
      'kggggggggdk.', 'kgggkkkkgdk.', 'kggk....kdk.', 'kkk......kk.', '............', '............'] },
    assaultvest: { pal: { g: '#4f8a3a', d: '#2f5a22', y: '#ffd23f' }, rows: [
      '............', '.kkk....kkk.', 'kggk....kggk', 'kgggkkkkgggk', 'kgggyggygggk', 'kgggggggggdk',
      'kggyggggygdk', 'kgggggggggdk', 'kgggggggggdk', 'kddddddddddk', 'kkkkkkkkkkkk', '............'] },
    // ---------- medallas de logros (bronce, plata, oro) ----------
    medal1: { pal: { r: '#ff5f6d', q: '#b8283a', m: '#d08a4a', n: '#8a5226', w: '#ffd0a0', s: '#ffe8c8' }, rows: MEDAL },
    medal2: { pal: { r: '#4fb4ff', q: '#2a6fb0', m: '#c9d2de', n: '#7d8899', w: '#ffffff', s: '#ffffff' }, rows: MEDAL },
    medal3: { pal: { r: '#c47bff', q: '#7a3fb0', m: '#ffd23f', n: '#c08a10', w: '#fff3b0', s: '#fffbe0' }, rows: MEDAL },
    medalOff: { pal: { r: '#3a4870', q: '#2a3458', m: '#3a4870', n: '#2a3458', w: '#4a5a88', s: '#4a5a88' }, rows: MEDAL },
    trophy: { pal: { y: '#ffd23f', d: '#c08a10', w: '#fff3b0' }, rows: [
      '............', '..kkkkkkkk..', 'kkkwyyyydkkk', 'k.kwyyyydk.k', 'k.kwyyyydk.k', '.kkwyyyydkk.',
      '...kyyyyk...', '....kyyk....', '....kyyk....', '...kddddk...', '..kyyyyyyk..', '..kkkkkkkk..'] },
    friends: { pal: { b: '#4fb4ff', d: '#2a6fb0', g: '#5fe08a', h: '#2f9a52' }, rows: [
      '............', '..kkk..kkk..', '.kbbbkkgggk.', '.kbbbkkgggk.', '..kkk..kkk..', '............',
      '.kkkkkkkkkk.', 'kbbbbkkggggk', 'kbbbbkkggggk', 'kddddkkhhhhk', 'kkkkkkkkkkkk', '............'] },
    save: { pal: { b: '#4f7bd6', d: '#2a4590', w: '#e8eefc', s: '#8a96b8', l: '#f4f4ff', g: '#9fb0d8' }, rows: [
      'kkkkkkkkkkk.', 'kbkwwwwwkbkk', 'kbkwwswwkbbk', 'kbkwwswwkbbk', 'kbbkkkkkbbbk', 'kbbbbbbbbbbk',
      'kbkkkkkkkkbk', 'kbkllllllkbk', 'kbklgggglkbk', 'kbkllllllkbk', 'kdkllllllkdk', 'kkkkkkkkkkkk'] },
    ball: { pal: { r: '#ff4d4d', w: '#f4f4f4', s: '#c23a3a' }, rows: [
      '....kkkk....', '..kkrrrrkk..', '.krwrrrrrrk.', '.krwrrrrrsk.', 'krrrrkkrrssk', 'kkkkkwwkkkkk',
      'kwwwkwwkwwwk', 'kwwwwkkwwwwk', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '..kkwwwwkk..', '....kkkk....'] }
  };
  // Variantes de paleta.
  UI.starDim = { rows: UI.star.rows, pal: { y: '#3a4870', o: '#2a3458', w: '#4a5a88' } };

  // ---------------- glifos de tipo (8×8, blancos sobre el emblema) ----------------
  const TYPE_GLYPH = {
    normal:   ['..####..', '.#....#.', '#......#', '#..##..#', '#..##..#', '#......#', '.#....#.', '..####..'],
    fire:     ['...#....', '...##...', '..###.#.', '.#####..', '.######.', '##.####.', '##..###.', '.######.'],
    water:    ['...##...', '...##...', '..####..', '.######.', '.##.###.', '.#.####.', '.######.', '..####..'],
    grass:    ['.....###', '...#####', '..######', '.####.##', '.###.###', '.##.####', '.#.####.', '#.......'],
    electric: ['....###.', '...###..', '..###...', '.######.', '...###..', '..###...', '.##.....', '#.......'],
    psychic:  ['.######.', '#......#', '#.####.#', '#.#..#.#', '#.#.##.#', '#.#....#', '#.######', '#.......'],
    ice:      ['...#....', '.#.#.#..', '..###...', '#######.', '..###...', '.#.#.#..', '...#....', '........'],
    fighting: ['.######.', '########', '########', '#.#.#.##', '########', '.#######', '..#####.', '..####..'],
    poison:   ['.....##.', '....####', '.....##.', '.###....', '#####...', '#####.##', '.###.###', '.....##.'],
    ground:   ['........', '...##...', '..####..', '.##..##.', '.######.', '##.##.##', '########', '........'],
    flying:   ['#.......', '##......', '###.....', '####....', '######..', '########', '.#######', '...####.'],
    bug:      ['.#....#.', '..#..#..', '..####..', '.##.###.', '########', '###.####', '.######.', '..####..'],
    rock:     ['...###..', '..#####.', '.###.###', '######.#', '##.#####', '#######.', '.#####..', '........'],
    ghost:    ['..####..', '.######.', '##.##.##', '##.##.##', '########', '########', '########', '#.#..#.#'],
    dragon:   ['#.......', '##....#.', '.##..##.', '.######.', '..####..', '.######.', '##.##.##', '#..##..#'],
    dark:     ['..####..', '.###....', '###.....', '###.....', '###.....', '###.....', '.###....', '..####..'],
    steel:    ['..####..', '.######.', '###..###', '##....##', '##....##', '###..###', '.######.', '..####..'],
    fairy:    ['...#....', '...#....', '..###...', '#######.', '..###...', '..#.#...', '.#...#..', '........']
  };

  // Insignia de la familia de movimiento (5×5).
  const KIND_GLYPH = {
    projectile: ['..#..', '...#.', '#####', '...#.', '..#..'],
    melee:      ['....#', '...#.', '..#..', '.#...', '#....'],
    beam:       ['.....', '#####', '.....', '#####', '.....'],
    orbit:      ['.###.', '#...#', '#...#', '#...#', '.###.'],
    nova:       ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
    aura:       ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
    buff:       ['..#..', '.###.', '#####', '..#..', '..#..'],
    boomerang:  ['####.', '#....', '#....', '#....', '#....'],
    chain:      ['##...', '..#..', '...##', '..#..', '##...'],
    mine:       ['..#..', '.###.', '##.##', '.###.', '..#..'],
    meteor:     ['....#', '...#.', '.##..', '####.', '.##..'],
    turret:     ['.###.', '.#.#.', '.###.', '..#..', '#####'],
    dash:       ['#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..'],
    trail:      ['#....', '.....', '..#..', '.....', '....#'],
    cone:       ['....#', '..###', '#####', '..###', '....#'],
    // nuevas (19-10-2026)
    homing:     ['.#...', '..#..', '#..#.', '.#..#', '..###'],
    bounce:     ['#...#', '.#.#.', '..#..', '.....', '#####'],
    charge:     ['.###.', '#####', '##.##', '#####', '.###.'],
    spin:       ['.###.', '#....', '#.#.#', '....#', '.###.'],
    quake:      ['.....', '#...#', '##.##', '#####', '#.#.#'],
    vortex:     ['####.', '#....', '#.##.', '#..#.', '####.'],
    shove:      ['#...#', '.#.#.', '.....', '.#.#.', '#...#'],
    stun:       ['#.#.#', '.....', '..#..', '.....', '#.#.#']
  };

  // ---------------- render ----------------

  const cache = new Map();      // clave -> canvas a 1×
  const urls = new Map();

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
    return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function fromRows(def) {
    const h = def.rows.length, w = Math.max(...def.rows.map(r => r.length));
    const pad = def.outline ? 1 : 0;
    const cv = document.createElement('canvas');
    cv.width = w + pad * 2; cv.height = h + pad * 2;
    const c = cv.getContext('2d', { willReadFrequently: true });   // se lee en svgOf()
    const pal = Object.assign({ k: K }, def.pal);
    if (def.outline) {
      c.fillStyle = K;
      def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.' || ch === ' ') return;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.fillRect(x + pad + dx, y + pad + dy, 1, 1);
      }));
    }
    def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ' || !pal[ch]) return;
      c.fillStyle = pal[ch];
      c.fillRect(x + pad, y + pad, 1, 1);
    }));
    return cv;
  }

  /** Emblema circular de un tipo (16×16), con insignia de familia opcional. */
  function emblem(type, kind) {
    const S = 16;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d', { willReadFrequently: true });   // se lee en svgOf()
    const col = G.U.TYPE_COLOR[type] || '#b0a99f';
    const dark = shade(col, 0.55), lite = shade(col, 1.3);
    // Disco con contorno, sombra abajo-derecha y brillo arriba-izquierda.
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 7.6) continue;
      let f = col;
      if (d > 6.6) f = K;
      else if ((x - 7.5) + (y - 7.5) > 6) f = dark;
      else if ((x - 7.5) + (y - 7.5) < -6.5) f = lite;
      c.fillStyle = f; c.fillRect(x, y, 1, 1);
    }
    const g = TYPE_GLYPH[type] || TYPE_GLYPH.normal;
    // Sombra del glifo y glifo.
    c.fillStyle = dark;
    g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.fillRect(x + 5, y + 5, 1, 1); }));
    c.fillStyle = '#ffffff';
    g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.fillRect(x + 4, y + 4, 1, 1); }));

    if (kind && KIND_GLYPH[kind]) {
      c.fillStyle = K; c.fillRect(9, 9, 7, 7);
      c.fillStyle = '#2b3454'; c.fillRect(10, 10, 5, 5);
      c.fillStyle = '#ffd23f';
      KIND_GLYPH[kind].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.fillRect(x + 10, y + 10, 1, 1); }));
    }
    return cv;
  }

  function canvas(name) {
    let cv = cache.get(name);
    if (cv) return cv;
    if (name.startsWith('move:')) {
      const m = G.Moves.BY_ID[name.slice(5)];
      cv = emblem(m ? m.type : 'normal', m ? m.kind : null);
    } else if (name.startsWith('type:')) {
      cv = emblem(name.slice(5));
    } else {
      cv = fromRows(UI[name] || UI.star);
    }
    cache.set(name, cv);
    return cv;
  }

  function url(name) {
    let u = urls.get(name);
    if (!u) {
      // Los de interfaz, directamente de su dibujo; los emblemas (tipos, movimientos), del canvas.
      const plain = !name.startsWith('move:') && !name.startsWith('type:');
      u = plain ? svgOfRows(UI[name] || UI.star) : svgOf(canvas(name));
      urls.set(name, u);
    }
    return u;
  }

  /**
   * El icono como SVG de texto (un rectángulo por tramo de píxeles iguales).
   * toDataURL() hacía lo mismo en PNG, pero la primera vez el navegador tarda
   * ~175 ms en prepararlo y eso bloqueaba la carga de la página (Lighthouse).
   */
  function svgDoc(W, H, rects) {
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${rects}</svg>`);
  }

  /** Igual que fromRows() pero sin canvas (ni lectura de píxeles). */
  function svgOfRows(def) {
    const h = def.rows.length, w = Math.max(...def.rows.map(r => r.length));
    const pad = def.outline ? 1 : 0;
    const pal = Object.assign({ k: K }, def.pal);
    const px = new Map();
    if (def.outline) def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px.set((x + pad + dx) + ',' + (y + pad + dy), K);
    }));
    def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ' || !pal[ch]) return;
      px.set((x + pad) + ',' + (y + pad), pal[ch]);
    }));
    let out = '';
    for (const [k, c] of px) { const [x, y] = k.split(','); out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }
    return svgDoc(w + pad * 2, h + pad * 2, out);
  }

  function svgOf(cv) {
    const W = cv.width, H = cv.height;
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    let out = '';
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W;) {
        const i = (y * W + x) * 4, a = d[i + 3];
        if (!a) { x++; continue; }
        let n = 1;
        while (x + n < W && d[i + n * 4] === d[i] && d[i + n * 4 + 1] === d[i + 1] && d[i + n * 4 + 2] === d[i + 2] && d[i + n * 4 + 3] === a) n++;
        const hex = '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1);
        out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${hex}"${a < 255 ? ` fill-opacity="${(a / 255).toFixed(3)}"` : ''}/>`;
        x += n;
      }
    }
    return svgDoc(W, H, out);
  }

  /**
   * Ajusta el tamaño a un múltiplo entero de la resolución del icono: un
   * icono de 16 px pintado a 24 duplicaría unos píxeles sí y otros no.
   */
  function snap(name, size) {
    const w = canvas(name).width;
    return w * Math.max(1, Math.round(size / w));
  }

  /** <img> pixelado para el DOM. */
  function html(name, size = 20, cls = '') {
    const cv = canvas(name), w = snap(name, size), h = w * cv.height / cv.width;
    return `<img class="pix ${cls}" src="${url(name)}" width="${w}" height="${h}" alt="" draggable="false">`;
  }

  function draw(ctx, name, x, y, size) {
    const cv = canvas(name);
    const s2 = snap(name, size);
    x += (size - s2) / 2; y += (size - s2) / 2; size = s2;
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, Math.round(x), Math.round(y), size, size * cv.height / cv.width);
    ctx.imageSmoothingEnabled = prev;
  }

  /**
   * Centelleo de shiny, dibujado píxel a píxel (no es un icono): una cruz que
   * nace, crece, echa puntas en diagonal y se apaga, como en los juegos.
   * phase 0..1 · px = tamaño de píxel en pantalla.
   */
  function twinkle(ctx, x, y, phase, px = 2) {
    const st = phase < 0.15 ? 0 : phase < 0.32 ? 1 : phase < 0.62 ? 2 : phase < 0.82 ? 1 : 0;
    const X = Math.round(x / px) * px, Y = Math.round(y / px) * px;
    const dot = (dx, dy, c) => { ctx.fillStyle = c; ctx.fillRect(X + dx * px, Y + dy * px, px, px); };
    const ARM = '#fff3a8', TIP = '#9ae6ff';
    dot(0, 0, '#ffffff');
    if (st >= 1) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(dx, dy, ARM);
    if (st >= 2) {
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) dot(dx, dy, ARM);
      for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) dot(dx, dy, TIP);
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) dot(dx, dy, TIP);
    }
  }

  /**
   * Rareza como Poké Ball: Poké (Común), Super (Poco común), Ultra (Rara),
   * Lujo (Épica) y Master (Legendaria).
   */
  const RARITY_BALL = { 1: 'ball', 2: 'ball2', 3: 'ball3', 4: 'ballLux', 5: 'ball4' };
  function rarity(n, size = 12) {
    return `<span class="rarity-ball" title="${(G.Gacha && G.Gacha.RARITY_NAME[n]) || ''}">${html(RARITY_BALL[n] || 'ball', size)}</span>`;
  }

  /** Publica en CSS los iconos que usan las hojas de estilo. */
  function installCss() {
    const r = document.documentElement.style;
    r.setProperty('--ico-coin', `url("${url('coin')}")`);
    r.setProperty('--ico-cursor', `url("${url('cursor')}")`);
  }

  return { canvas, url, html, draw, twinkle, rarity, RARITY_BALL, installCss, UI, TYPE_GLYPH };
})();

/* ============ Analyzer.Icons — Iconos Vectoriales SVG Profesionales (Cero Emojis) ============
 * Proporciona iconos vectoriales limpios, escalables y adaptables al tema (currentColor)
 * para toda la interfaz del analizador, sustituyendo cualquier emoji del sistema operativo.
 */
window.Analyzer = window.Analyzer || {};
window.Analyzer.Icons = (() => {
  const SVGS = {
    home: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    catalog: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    swords: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polygon><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><polygon points="9.5 17.5 21 6 21 3 18 3 6.5 14.5"></polygon><line x1="11" y1="19" x2="5" y2="13"></line><line x1="8" y1="16" x2="4" y2="20"></line></svg>',
    guide: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>',
    compass: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>',
    gamepad: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"></rect><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line></svg>',
    search: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    heart: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>',
    sword: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg>',
    atk: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg>',
    zap: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    spd: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    star: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    bst: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    hash: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
    dex: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
    alpha: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19l4-14 4 14"></path><line x1="5.5" y1="14" x2="10.5" y2="14"></line><path d="M15 9h5l-5 10h5"></path></svg>',
    az: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19l4-14 4 14"></path><line x1="5.5" y1="14" x2="10.5" y2="14"></line><path d="M15 9h5l-5 10h5"></path></svg>',
    shield: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    defense: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    target: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>',
    control: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>',
    sync: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
    flexibility: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
    crown: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><path d="M2 19h20v3H2v-3zm0-13l5 5 5-8 5 8 5-5v11H2V6z"></path></svg>',
    boss: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><path d="M2 19h20v3H2v-3zm0-13l5 5 5-8 5 8 5-5v11H2V6z"></path></svg>',
    sparkles: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3m-9-9h3m12 0h3m-2.6-6.4l-2.1 2.1m-8.6 8.6l-2.1 2.1m0-12.8l2.1 2.1m8.6 8.6l2.1 2.1"></path></svg>',
    shiny: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3m-9-9h3m12 0h3m-2.6-6.4l-2.1 2.1m-8.6 8.6l-2.1 2.1m0-12.8l2.1 2.1m8.6 8.6l2.1 2.1"></path></svg>',
    portal: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2a10 10 0 0 1 8.66 5"></path><path d="M21.66 15A10 10 0 0 1 12 22"></path><path d="M2.34 9A10 10 0 0 1 12 2"></path></svg>',
    galaxy: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2a10 10 0 0 1 8.66 5"></path><path d="M21.66 15A10 10 0 0 1 12 22"></path><path d="M2.34 9A10 10 0 0 1 12 2"></path></svg>',
    lateGame: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2a10 10 0 0 1 8.66 5"></path><path d="M21.66 15A10 10 0 0 1 12 22"></path><path d="M2.34 9A10 10 0 0 1 12 2"></path></svg>',
    info: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    bulb: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18z"></path></svg>',
    leaf: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>',
    flame: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>',
    water: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
    dice: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8" cy="8" r="1.5" fill="currentColor"></circle><circle cx="16" cy="8" r="1.5" fill="currentColor"></circle><circle cx="12" cy="12" r="1.5" fill="currentColor"></circle><circle cx="8" cy="16" r="1.5" fill="currentColor"></circle><circle cx="16" cy="16" r="1.5" fill="currentColor"></circle></svg>',
    cards: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="14" height="14" rx="2"></rect><path d="M3 7v12a2 2 0 0 0 2 2h12"></path></svg>',
    list: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
    table: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="12" y1="3" x2="12" y2="21"></line></svg>',
    trophy: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"></path><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"></path><path d="M4 3h16v6a8 8 0 0 1-16 0V3z"></path><path d="M12 17v4"></path><path d="M8 21h8"></path></svg>',
    chart: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    backpack: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>',
    item: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>',
    fist: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4h3a2 2 0 0 1 2 2v2a2 2 0 0 1 2 2v2a2 2 0 0 1 2 2v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-6a4 4 0 0 1 4-4h3V4z"></path></svg>',
    physical: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4h3a2 2 0 0 1 2 2v2a2 2 0 0 1 2 2v2a2 2 0 0 1 2 2v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-6a4 4 0 0 1 4-4h3V4z"></path></svg>',
    special: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 9 9"></path><circle cx="12" cy="12" r="4" fill="currentColor"></circle></svg>',
    buff: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline><polyline points="18 9 12 3 6 9"></polyline></svg>',
    alert: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    warning: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    check: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    close: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    tornado: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16"></path><path d="M6 9h12"></path><path d="M8 14h8"></path><path d="M10 19h4"></path></svg>',
    paw: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><circle cx="12" cy="6" r="2"></circle><circle cx="6" cy="9" r="2"></circle><circle cx="18" cy="9" r="2"></circle><circle cx="7" cy="15" r="1.5"></circle><circle cx="17" cy="15" r="1.5"></circle><path d="M12 11c-2.5 0-4.5 1.8-4.5 4 0 2 2 4 4.5 4s4.5-2 4.5-4c0-2.2-2-4-4.5-4z"></path></svg>',
    coin: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10"></path><path d="M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0"></path></svg>',
    clock: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    door: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="10" y1="12" x2="10.01" y2="12"></line></svg>',
    trendUp: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    scaling: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    stop: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>',
    user: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    users: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    share: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
    globe: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    tree: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 12h5l-3 6h12l-3-6h5L12 2z"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>',
    temple: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l10-4 10 4v2H2z"></path><line x1="5" y1="9" x2="5" y2="20"></line><line x1="9" y1="9" x2="9" y2="20"></line><line x1="15" y1="9" x2="15" y2="20"></line><line x1="19" y1="9" x2="19" y2="20"></line><path d="M2 20h20"></path></svg>',
    mountain: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 8 5-5 5 15H2L8 3z"></path></svg>',
    city: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="9" y1="13" x2="9.01" y2="13"></line><line x1="9" y1="17" x2="9.01" y2="17"></line></svg>',
    castle: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M4 21V10l3-3v14"></path><path d="M20 21V10l-3-3v14"></path><path d="M7 11h10v10H7z"></path></svg>',
    flower: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5z"></path></svg>',
    dunes: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="7" r="3"></circle><path d="M2 20c4-6 9-2 13-6 3-3 5-1 7 2"></path><path d="M2 20h20"></path></svg>',
    burst: '<svg class="ui-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"></polygon></svg>'
  };

  function get(name, options = {}) {
    const size = options.size || 16;
    const cls = options.className || '';
    const style = options.style ? ` style="${options.style}"` : '';
    const raw = SVGS[name] || SVGS.info;
    let s = raw.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`);
    if (cls || style) {
      s = s.replace('class="ui-icon-svg"', `class="ui-icon-svg ${cls}"${style}`);
    }
    return s;
  }

  return { get, svg: SVGS };
})();
