// ============================================================
// data.js - ゲームデータ定義 (サイバーネットワーク世界)
// ============================================================

const GameData = {};

// --- タイル定義 ---
GameData.TILE_SIZE = 32;
GameData.TILES = {
  EMPTY:    0, // void
  WALL:     1, // ファイアウォール
  WATER:    2, // データストリーム
  GRASS:    3, // 回路基板
  PATH:     4, // データパス
  STONE:    5, // サーバーブロック
  DARK:     6, // 破損セクター
  LAVA:     7, // ウイルスコア
};

GameData.TILE_COLORS = {
  0: '#0a0a14',  // void
  1: '#1a2a3a',  // firewall
  2: '#003366',  // data stream
  3: '#0a1a0a',  // circuit board
  4: '#1a1a2a',  // data path
  5: '#12121e',  // server block
  6: '#0d0014',  // corrupted
  7: '#330011',  // virus core
};

GameData.TILE_WALKABLE = {
  0: true, 1: false, 2: false, 3: true, 4: true, 5: true, 6: true, 7: false,
};

// --- マップ定義 ---
GameData.MAPS = {
  town: {
    name: 'ホームサーバー',
    width: 25,
    height: 20,
    tileData: [
      1,1,1,1,1,1,1,1,1,1,1,4,4,4,1,1,1,1,1,1,1,1,1,1,1,
      1,3,3,3,3,3,3,3,1,1,1,4,4,4,1,1,1,3,3,3,3,3,3,3,1,
      1,3,3,3,3,3,3,3,1,1,1,4,4,4,1,1,1,3,3,3,3,3,3,3,1,
      1,3,3,1,1,1,3,3,1,1,1,4,4,4,1,1,1,3,3,1,1,1,3,3,1,
      1,3,3,1,5,1,3,3,3,4,4,4,4,4,4,4,3,3,3,1,5,1,3,3,1,
      1,3,3,1,4,1,3,3,3,4,4,4,4,4,4,4,3,3,3,1,1,1,3,3,1,
      1,3,3,3,3,3,3,3,3,4,4,3,3,3,4,4,3,3,3,3,3,3,3,3,1,
      1,3,3,3,3,3,3,3,4,4,4,3,3,3,4,4,4,3,3,3,3,3,3,3,1,
      1,1,1,3,3,3,4,4,4,4,3,3,3,3,3,4,4,4,4,3,3,3,1,1,1,
      1,1,1,3,3,4,4,4,4,3,3,3,3,3,3,3,4,4,4,4,3,3,1,1,1,
      1,3,3,3,4,4,4,3,3,3,3,2,2,2,3,3,3,3,4,4,4,3,3,3,1,
      1,3,3,3,4,4,3,3,3,3,2,2,2,2,2,3,3,3,3,4,4,3,3,3,1,
      1,3,3,3,4,4,3,3,3,3,2,2,2,2,2,3,3,3,3,4,4,3,3,3,1,
      1,3,3,3,4,4,3,3,3,3,3,2,2,2,3,3,3,3,3,4,4,3,3,3,1,
      1,3,3,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4,3,3,1,
      1,3,3,4,4,3,3,1,1,1,1,3,3,3,1,1,1,1,3,3,4,4,3,3,1,
      1,3,3,4,4,3,3,1,5,5,1,3,3,3,1,5,5,1,3,3,4,4,3,3,1,
      1,3,3,4,4,3,3,1,1,4,1,3,3,3,1,1,4,1,3,3,4,4,3,3,1,
      1,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,1,
      1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,
    ],
    playerStart: { x: 12, y: 9 },
    portals: [
      { x: 12, y: 19, target: 'field', spawnX: 12, spawnY: 1 },
      { x: 12, y: 0, target: 'random_dungeon', spawnX: 0, spawnY: 0 },
    ],
    npcs: [
      { id: 'elder', x: 4, y: 4, sprite: 'AI', name: 'マスターAI', dialogue: 'elder_intro' },
      { id: 'healer', x: 9, y: 16, sprite: 'Re', name: 'リペアプログラム', dialogue: 'healer' },
      { id: 'shopkeeper', x: 16, y: 16, sprite: 'Sh', name: 'データショップ', dialogue: 'shop' },
      { id: 'villager1', x: 6, y: 9, sprite: 'Mo', name: 'モニター', dialogue: 'villager1' },
      { id: 'villager2', x: 18, y: 7, sprite: 'Bt', name: 'メッセンジャーBot', dialogue: 'villager2' },
    ],
    enemies: [],
    chests: [],
    bgColor: '#050a10',
  },

  field: {
    name: 'ネットワーク回線',
    width: 40,
    height: 30,
    tileData: null,
    playerStart: { x: 12, y: 1 },
    portals: [
      { x: 12, y: 0, target: 'town', spawnX: 12, spawnY: 18 },
      { x: 38, y: 15, target: 'dungeon1', spawnX: 1, spawnY: 8 },
    ],
    npcs: [
      { id: 'traveler', x: 20, y: 12, sprite: 'Sc', name: 'スカウト', dialogue: 'traveler' },
    ],
    enemies: [
      { type: 'bug', x: 8, y: 10 },
      { type: 'bug', x: 15, y: 8 },
      { type: 'bug', x: 25, y: 5 },
      { type: 'bug', x: 30, y: 10 },
      { type: 'trojan', x: 20, y: 18 },
      { type: 'trojan', x: 28, y: 22 },
      { type: 'trojan', x: 35, y: 12 },
      { type: 'bug', x: 10, y: 20 },
      { type: 'trojan', x: 15, y: 25 },
    ],
    chests: [
      { x: 32, y: 5, item: 'patch', opened: false },
      { x: 5, y: 22, item: 'patch', opened: false },
    ],
    bgColor: '#040a04',
  },

  dungeon1: {
    name: '感染セクター A',
    width: 25,
    height: 20,
    tileData: null,
    playerStart: { x: 1, y: 8 },
    portals: [
      { x: 0, y: 8, target: 'field', spawnX: 37, spawnY: 15 },
      { x: 23, y: 10, target: 'dungeon2', spawnX: 1, spawnY: 10 },
    ],
    npcs: [],
    enemies: [
      { type: 'worm', x: 8, y: 5 },
      { type: 'worm', x: 15, y: 8 },
      { type: 'spyware', x: 10, y: 12 },
      { type: 'spyware', x: 18, y: 4 },
      { type: 'worm', x: 20, y: 14 },
      { type: 'spyware', x: 6, y: 16 },
    ],
    chests: [
      { x: 20, y: 3, item: 'hotfix', opened: false },
      { x: 12, y: 16, item: 'antivirus_v2', opened: false },
    ],
    bgColor: '#0a050a',
  },

  dungeon2: {
    name: '感染セクター B',
    width: 25,
    height: 20,
    tileData: null,
    playerStart: { x: 1, y: 10 },
    portals: [
      { x: 0, y: 10, target: 'dungeon1', spawnX: 22, spawnY: 10 },
      { x: 23, y: 10, target: 'boss_room', spawnX: 2, spawnY: 7 },
    ],
    npcs: [],
    enemies: [
      { type: 'ransomware', x: 8, y: 6 },
      { type: 'ransomware', x: 16, y: 14 },
      { type: 'rootkit', x: 12, y: 10 },
      { type: 'rootkit', x: 20, y: 6 },
      { type: 'ransomware', x: 5, y: 14 },
      { type: 'rootkit', x: 18, y: 16 },
    ],
    chests: [
      { x: 6, y: 3, item: 'hotfix', opened: false },
      { x: 20, y: 17, item: 'encryption_v3', opened: false },
    ],
    bgColor: '#05000a',
  },

  boss_room: {
    name: 'ウイルスコア',
    width: 15,
    height: 15,
    tileData: null,
    playerStart: { x: 2, y: 7 },
    portals: [
      { x: 0, y: 7, target: 'dungeon2', spawnX: 22, spawnY: 10 },
    ],
    npcs: [],
    enemies: [
      { type: 'zeroday', x: 10, y: 7 },
    ],
    chests: [],
    bgColor: '#100005',
  },
};

// --- フィールドマップ生成 ---
(function generateFieldMap() {
  const w = 40, h = 30;
  const data = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        if ((x === 12 && y === 0) || (x === 38 && y === 15)) {
          data.push(4);
        } else {
          data.push(1);
        }
      } else if (Math.random() < 0.05) {
        data.push(2);
      } else if (Math.random() < 0.06) {
        data.push(1);
      } else {
        data.push(3);
      }
    }
  }
  for (let i = 1; i < 4; i++) {
    data[i * w + 12] = 4;
    data[15 * w + (w - 1 - i)] = 4;
  }
  GameData.MAPS.field.tileData = data;
})();

// --- ダンジョン1マップ生成 ---
(function generateDungeon1() {
  const w = 25, h = 20;
  const data = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        if ((x === 0 && y === 8) || (x === w - 1 && y === 10)) {
          data.push(5);
        } else {
          data.push(1);
        }
      } else if (
        (x > 4 && x < 7 && y === 3) || (x === 6 && y > 3 && y < 7) ||
        (x > 10 && x < 14 && y === 10) ||
        (x === 16 && y > 6 && y < 12) ||
        (x > 2 && x < 5 && y === 14) ||
        (x > 18 && x < 22 && y === 16)
      ) {
        data.push(1);
      } else {
        data.push(5);
      }
    }
  }
  GameData.MAPS.dungeon1.tileData = data;
})();

// --- ダンジョン2マップ生成 ---
(function generateDungeon2() {
  const w = 25, h = 20;
  const data = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        if ((x === 0 && y === 10) || (x === w - 1 && y === 10)) {
          data.push(6);
        } else {
          data.push(1);
        }
      } else if (
        (x === 5 && y > 1 && y < 8) || (x === 10 && y > 4 && y < 16) ||
        (x > 13 && x < 16 && y === 5) || (x === 19 && y > 8 && y < 18) ||
        (x > 7 && x < 10 && y === 17)
      ) {
        data.push(1);
      } else {
        data.push(6);
      }
    }
  }
  GameData.MAPS.dungeon2.tileData = data;
})();

// --- ボス部屋マップ生成 ---
(function generateBossRoom() {
  const w = 15, h = 15;
  const data = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        if (x === 0 && y === 7) {
          data.push(5);
        } else {
          data.push(1);
        }
      } else if ((x === 3 || x === 11) && (y === 3 || y === 11)) {
        data.push(7);
      } else {
        data.push(5);
      }
    }
  }
  GameData.MAPS.boss_room.tileData = data;
})();

// --- エネミーデータ ---
GameData.ENEMIES = {
  bug: {
    name: 'バグ', sprite: 'BG', color: '#22cc44',
    hp: 30, atk: 5, def: 2, spd: 0.8, exp: 15, gold: 8,
    size: 20, aggroRange: 120, attackRange: 24, attackCooldown: 1500,
    drops: [{ item: 'patch', chance: 0.3 }],
  },
  trojan: {
    name: 'トロイの木馬', sprite: 'TJ', color: '#aa44cc',
    hp: 50, atk: 10, def: 4, spd: 1.5, exp: 25, gold: 15,
    size: 22, aggroRange: 160, attackRange: 28, attackCooldown: 1200,
    drops: [{ item: 'patch', chance: 0.4 }],
  },
  worm: {
    name: 'ワーム', sprite: 'WM', color: '#ccaa22',
    hp: 60, atk: 14, def: 6, spd: 1.0, exp: 35, gold: 22,
    size: 22, aggroRange: 140, attackRange: 30, attackCooldown: 1400,
    drops: [{ item: 'hotfix', chance: 0.25 }],
  },
  spyware: {
    name: 'スパイウェア', sprite: 'SP', color: '#4466aa',
    hp: 35, atk: 12, def: 3, spd: 2.0, exp: 28, gold: 18,
    size: 18, aggroRange: 180, attackRange: 22, attackCooldown: 1000,
    drops: [{ item: 'patch', chance: 0.35 }],
  },
  ransomware: {
    name: 'ランサムウェア', sprite: 'RW', color: '#aa3355',
    hp: 70, atk: 18, def: 8, spd: 1.2, exp: 50, gold: 35,
    size: 22, aggroRange: 160, attackRange: 28, attackCooldown: 1300,
    drops: [{ item: 'hotfix', chance: 0.35 }, { item: 'memory_cleaner', chance: 0.2 }],
  },
  rootkit: {
    name: 'ルートキット', sprite: 'RK', color: '#3333aa',
    hp: 100, atk: 22, def: 14, spd: 0.9, exp: 70, gold: 50,
    size: 24, aggroRange: 150, attackRange: 32, attackCooldown: 1500,
    drops: [{ item: 'hotfix', chance: 0.4 }, { item: 'antivirus_v3', chance: 0.1 }],
  },
  zeroday: {
    name: 'ゼロデイ', sprite: '0D', color: '#cc1133',
    hp: 500, atk: 35, def: 20, spd: 0.7, exp: 500, gold: 300,
    size: 48, aggroRange: 300, attackRange: 48, attackCooldown: 2000,
    isBoss: true,
    drops: [{ item: 'quantum_blade', chance: 1.0 }],
  },
  // --- ランダムダンジョン用エネミー ---
  botnet_node: {
    name: 'ボットネット', sprite: 'BN', color: '#44aa66',
    hp: 40, atk: 7, def: 3, spd: 1.2, exp: 20, gold: 12,
    size: 20, aggroRange: 130, attackRange: 24, attackCooldown: 1400,
    drops: [{ item: 'patch', chance: 0.3 }],
  },
  cryptojacker: {
    name: 'クリプトジャッカー', sprite: 'CJ', color: '#ccaa00',
    hp: 55, atk: 13, def: 5, spd: 1.6, exp: 35, gold: 25,
    size: 22, aggroRange: 150, attackRange: 26, attackCooldown: 1200,
    drops: [{ item: 'hotfix', chance: 0.25 }, { item: 'memory_cleaner', chance: 0.15 }],
  },
  apt: {
    name: 'APT', sprite: 'AP', color: '#8833cc',
    hp: 90, atk: 20, def: 12, spd: 1.0, exp: 60, gold: 45,
    size: 24, aggroRange: 170, attackRange: 30, attackCooldown: 1300,
    drops: [{ item: 'hotfix', chance: 0.35 }, { item: 'firewall_breaker', chance: 0.08 }],
  },
  polymorphic: {
    name: 'ポリモーフィック', sprite: 'PM', color: '#cc44aa',
    hp: 120, atk: 25, def: 16, spd: 1.4, exp: 85, gold: 60,
    size: 24, aggroRange: 160, attackRange: 32, attackCooldown: 1100,
    drops: [{ item: 'overclock', chance: 0.3 }, { item: 'rootkit_slicer', chance: 0.06 }, { item: 'quantum_shield', chance: 0.06 }],
  },
  dark_ai: {
    name: 'ダークAI', sprite: 'DA', color: '#aa00ff',
    hp: 800, atk: 45, def: 25, spd: 0.8, exp: 800, gold: 500,
    size: 48, aggroRange: 300, attackRange: 48, attackCooldown: 1800,
    isBoss: true, isDungeonBoss: true,
    drops: [{ item: 'neural_lance', chance: 0.5 }, { item: 'neural_barrier', chance: 0.5 }],
  },
};

// --- アイテムデータ ---
GameData.ITEMS = {
  patch: {
    name: 'パッチ', desc: 'HPを50回復', type: 'consumable',
    icon: '[+]', effect: { hp: 50 }, buyPrice: 30, sellPrice: 15,
  },
  hotfix: {
    name: 'ホットフィックス', desc: 'HPを150回復', type: 'consumable',
    icon: '[++]', effect: { hp: 150 }, buyPrice: 80, sellPrice: 40,
  },
  memory_cleaner: {
    name: 'メモリクリーナー', desc: 'MPを30回復', type: 'consumable',
    icon: '[M]', effect: { mp: 30 }, buyPrice: 50, sellPrice: 25,
  },
  antivirus_v1: {
    name: 'アンチウイルス v1', desc: 'ATK+5', type: 'weapon',
    icon: '{v1}', stats: { atk: 5 }, buyPrice: 50, sellPrice: 25,
    skill: { name: 'PortScan', desc: '脅威をスキャンして攻撃', mp: 5, cooldown: 1.5, type: 'attack', power: 1.5 },
  },
  antivirus_v2: {
    name: 'アンチウイルス v2', desc: 'ATK+12', type: 'weapon',
    icon: '{v2}', stats: { atk: 12 }, buyPrice: 200, sellPrice: 100,
    skill: { name: 'Quarantine', desc: 'DEF無視で隔離除去', mp: 8, cooldown: 2.0, type: 'pierce', power: 1.2 },
  },
  antivirus_v3: {
    name: 'アンチウイルス v3', desc: 'ATK+20', type: 'weapon',
    icon: '{v3}', stats: { atk: 20 }, buyPrice: 500, sellPrice: 250,
    skill: { name: 'FullScan', desc: '周囲を一斉スキャン駆除', mp: 15, cooldown: 3.0, type: 'aoe', power: 0.8 },
  },
  quantum_blade: {
    name: '量子ブレード', desc: 'ATK+40', type: 'weapon',
    icon: '{Q}', stats: { atk: 40 }, buyPrice: 0, sellPrice: 999,
    skill: { name: 'Defrag', desc: '自己修復でHP回復', mp: 15, cooldown: 4.0, type: 'heal', power: 0.3 },
  },
  // --- ダンジョン武器 ---
  firewall_breaker: {
    name: 'FWブレイカー', desc: 'ATK+28', type: 'weapon',
    icon: '{FB}', stats: { atk: 28 }, buyPrice: 800, sellPrice: 400,
    skill: { name: 'Firewall', desc: '防壁展開で被ダメ半減', mp: 10, cooldown: 8.0, type: 'buff_def', duration: 5.0 },
  },
  rootkit_slicer: {
    name: 'ルートキットスライサー', desc: 'ATK+35', type: 'weapon',
    icon: '{RS}', stats: { atk: 35 }, buyPrice: 1200, sellPrice: 600,
    skill: { name: 'Sandbox', desc: '敵を隔離して行動不能に', mp: 12, cooldown: 6.0, type: 'stun', duration: 3.0 },
  },
  zero_day_edge: {
    name: 'ゼロデイエッジ', desc: 'ATK+50', type: 'weapon',
    icon: '{ZD}', stats: { atk: 50 }, buyPrice: 2000, sellPrice: 1000,
    skill: { name: 'ForceTerminate', desc: '悪性プロセスを強制終了', mp: 20, cooldown: 3.0, type: 'attack', power: 2.5 },
  },
  neural_lance: {
    name: 'ニューラルランス', desc: 'ATK+65', type: 'weapon',
    icon: '{NL}', stats: { atk: 65 }, buyPrice: 0, sellPrice: 2000,
    skill: { name: 'Rollback', desc: 'HP大回復+ATK強化', mp: 25, cooldown: 10.0, type: 'heal_buff', power: 0.5, duration: 5.0 },
  },
  encryption_v1: {
    name: '暗号シールド v1', desc: 'DEF+4', type: 'armor',
    icon: '<v1>', stats: { def: 4 }, buyPrice: 60, sellPrice: 30,
  },
  encryption_v2: {
    name: '暗号シールド v2', desc: 'DEF+10', type: 'armor',
    icon: '<v2>', stats: { def: 10 }, buyPrice: 250, sellPrice: 125,
  },
  encryption_v3: {
    name: '暗号シールド v3', desc: 'DEF+18', type: 'armor',
    icon: '<v3>', stats: { def: 18 }, buyPrice: 600, sellPrice: 300,
  },
  // --- ダンジョン防具 ---
  quantum_shield: {
    name: '量子シールド', desc: 'DEF+26', type: 'armor',
    icon: '<QS>', stats: { def: 26 }, buyPrice: 1000, sellPrice: 500,
  },
  darknet_armor: {
    name: 'ダークネットアーマー', desc: 'DEF+35', type: 'armor',
    icon: '<DN>', stats: { def: 35 }, buyPrice: 1800, sellPrice: 900,
  },
  neural_barrier: {
    name: 'ニューラルバリア', desc: 'DEF+45', type: 'armor',
    icon: '<NB>', stats: { def: 45 }, buyPrice: 0, sellPrice: 2500,
  },
  // --- 上位回復アイテム ---
  full_restore: {
    name: 'フルリストア', desc: 'HP全回復', type: 'consumable',
    icon: '[MAX]', effect: { hp: 9999 }, buyPrice: 300, sellPrice: 150,
  },
  overclock: {
    name: 'オーバークロック', desc: 'HP200+MP50回復', type: 'consumable',
    icon: '[OC]', effect: { hp: 200, mp: 50 }, buyPrice: 200, sellPrice: 100,
  },
};

// --- ショップデータ ---
GameData.SHOP_ITEMS = [
  'patch', 'hotfix', 'memory_cleaner', 'full_restore', 'overclock',
  'antivirus_v1', 'antivirus_v2', 'antivirus_v3',
  'firewall_breaker', 'rootkit_slicer',
  'encryption_v1', 'encryption_v2', 'encryption_v3',
  'quantum_shield', 'darknet_armor',
];

// --- ダイアログデータ ---
GameData.DIALOGUES = {
  elder_intro: [
    { name: 'マスターAI', text: 'アクティベーション完了。ようこそ、セキュリティプログラム。' },
    { name: 'マスターAI', text: 'ネットワークが"ゼロデイ"と呼ばれる未知のウイルスに侵されている。' },
    { name: 'マスターAI', text: '南ゲートからネットワーク回線に出て、東の感染セクターを目指せ。ウイルスコアを破壊するのだ。' },
    { name: 'マスターAI', text: 'リペアプログラムとデータショップが支援してくれる。アップデートを済ませて出発せよ。' },
  ],
  elder_after: [
    { name: 'マスターAI', text: 'ゼロデイを無力化したか…！ネットワーク全体の脅威レベルが正常値に戻った。' },
    { name: 'マスターAI', text: 'お前の活躍はログに永久保存される。ありがとう、プログラム。' },
  ],
  healer_revive: [
    { name: 'リペアプログラム', text: '…再起動シーケンス完了。危なかったですね。' },
    { name: 'リペアプログラム', text: 'バックアップデータからプロセスを復元しました。ただし、所持データの一部が破損していたようです…' },
  ],
  healer: [
    { name: 'リペアプログラム', text: 'ダメージを検出しました。修復を実行しますか？',
      choices: [
        { text: '修復を実行する', action: 'heal' },
        { text: 'キャンセル', action: 'close' },
      ]
    },
  ],
  shop: [
    { name: 'データショップ', text: 'データベースにアクセス中…アップグレードが利用可能です。',
      choices: [
        { text: 'ショップを開く', action: 'open_shop' },
        { text: '閉じる', action: 'close' },
      ]
    },
  ],
  villager1: [
    { name: 'モニター', text: '異常トラフィックを検出中…。感染セクターからの不正パケットが止まらない。' },
    { name: 'モニター', text: '誰かがウイルスコアを止めないと、システム全体がクラッシュする。' },
  ],
  villager2: [
    { name: 'メッセンジャーBot', text: 'こんにちは！あなたがセキュリティプログラムですね！' },
    { name: 'メッセンジャーBot', text: 'パッチはXキーで使えます。回線に出たら気をつけて！' },
  ],
  traveler: [
    { name: 'スカウト', text: 'この先の東に感染セクターへのゲートウェイがある。中はウイルスだらけだ。' },
    { name: 'スカウト', text: '処理能力は十分か？レベルを上げてからアクセスすることを推奨する。' },
  ],
  chest: [
    { name: '', text: 'データパッケージを開いた！' },
  ],
  boss_defeated: [
    { name: '', text: 'ゼロデイを無力化した！ネットワークが浄化されていく…' },
    { name: '', text: 'マスターAIに報告しよう。' },
  ],
  dungeon_boss_defeated: [
    { name: '', text: 'ダークAIを撃破した！異常セクターが崩壊していく…' },
    { name: '', text: 'ホームサーバーに転送される——' },
  ],
  dungeon_gate_locked: [
    { name: 'マスターAI', text: '北ゲートは異常セクターへのアクセスポイントだ。' },
    { name: 'マスターAI', text: 'まずはゼロデイを無力化してからだ。今は南へ向かえ。' },
  ],
};

// --- プレイヤー初期データ ---
GameData.PLAYER_INITIAL = {
  hp: 100, maxHp: 100,
  mp: 50, maxMp: 50,
  atk: 8, def: 4, spd: 2.5,
  level: 1, exp: 0, nextExp: 100,
  gold: 50,
  weapon: 'antivirus_v1',
  armor: 'encryption_v1',
  inventory: { patch: 3 },
  size: 24,
};

// --- レベルアップ成長テーブル ---
GameData.LEVEL_UP = {
  hpGain: 15,
  mpGain: 5,
  atkGain: 2,
  defGain: 1,
  expMultiplier: 1.5,
};

