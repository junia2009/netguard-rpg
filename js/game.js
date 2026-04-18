// ============================================================
// game.js - メインゲームクラス
// ============================================================

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.running = false;
    this.lastTime = 0;
    this.currentMap = 'town';

    this.player = null;
    this.enemies = [];
    this.npcs = [];
    this.state = 'title'; // title, playing, gameover, paused

    // Enemy respawn tracking
    this.enemyRespawnTimers = {};

    // Random dungeon state
    this.dungeonState = null; // { active, floor, totalFloors }

    // Portal cooldown to prevent instant re-trigger after teleport
    this.portalCooldown = 0;
  }

  init() {
    Input.init();
    UI.init(this);
    Combat.init(this);

    // Responsive canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.resizeCanvas(), 100);
    });

    // Title screen
    document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());
    document.getElementById('btn-continue').addEventListener('click', () => this.loadGame());
    document.getElementById('btn-retry').addEventListener('click', () => this.retry());

    // BGM mute toggle
    document.getElementById('btn-bgm-toggle').addEventListener('click', () => {
      const muted = Music.toggleMute();
      document.getElementById('btn-bgm-toggle').classList.toggle('muted', muted);
    });

    // Update continue button visibility
    this.updateContinueButton();

    // Load saved GB theme
    this.loadGbTheme();

    // Easter egg: MENU button 7-click color picker
    this.setupEasterEgg();

    // Init BGM on first user interaction
    const initBGM = () => {
      Music.init();
      Music.playTitle();
      document.removeEventListener('click', initBGM);
      document.removeEventListener('touchstart', initBGM);
    };
    document.addEventListener('click', initBGM);
    document.addEventListener('touchstart', initBGM);

    // Start render loop (for title screen animation)
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    const container = document.getElementById('game-container');
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (Input.isMobile) {
      // Mobile: fill screen with bezel margin, GB controls at bottom
      const touchEl = document.getElementById('touch-controls');
      const touchH = touchEl ? touchEl.offsetHeight : 180;
      const bezel = 12; // 6px margin each side
      const gameW = vw - bezel;
      // Let CSS margin-top (with safe-area) take effect, then measure
      container.style.width = gameW + 'px';
      container.style.height = 'auto';
      const topOffset = container.getBoundingClientRect().top;
      const gameH = vh - touchH - topOffset;
      container.style.height = gameH + 'px';
      this.canvas.width = gameW;
      this.canvas.height = gameH;
      Camera.width = gameW;
      Camera.height = gameH;
    } else {
      // Desktop: fit within window, maintain 4:3 ratio
      const scale = Math.min(vw / 800, vh / 600, 1);
      const w = Math.floor(800 * scale);
      const h = Math.floor(600 * scale);
      container.style.width = w + 'px';
      container.style.height = h + 'px';
      this.canvas.width = w;
      this.canvas.height = h;
      Camera.width = w;
      Camera.height = h;
    }
  }

  startNewGame() {
    this.player = new Player();
    this.state = 'playing';

    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    this.loadMap('town');

    // Start BGM for town
    Music.init();
    Music.playForMap('town');

    // Intro dialogue
    setTimeout(() => {
      UI.startDialogue('elder_intro');
    }, 500);
  }

  retry() {
    // Revive at town (in front of healer)
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    this.player.gold = Math.floor(this.player.gold / 2); // Lose half gold
    this.state = 'playing';
    UI.hideGameOver();
    // Leave dungeon if in one
    if (this.dungeonState) {
      this.leaveDungeon();
    }
    this.loadMap('town');
    // Override position to healer NPC front
    const ts = GameData.TILE_SIZE;
    this.player.x = 9 * ts + ts / 2;
    this.player.y = 17 * ts + ts / 2;
    Camera.follow(this.player);
    Camera.x = Camera.targetX;
    Camera.y = Camera.targetY;
    // Revival dialogue
    setTimeout(() => {
      UI.startDialogue('healer_revive');
    }, 300);
  }

  loadMap(mapId) {
    this.currentMap = mapId;
    const map = GameData.MAPS[mapId];
    MapRenderer.loadMap(mapId);

    // Play BGM for this map
    Music.playForMap(mapId);

    // Position player
    const ts = GameData.TILE_SIZE;
    this.player.x = map.playerStart.x * ts + ts / 2;
    this.player.y = map.playerStart.y * ts + ts / 2;

    // Snap camera
    Camera.follow(this.player);
    Camera.x = Camera.targetX;
    Camera.y = Camera.targetY;

    // Load NPCs
    this.npcs = map.npcs.map(data => new NPC(data));

    // Load enemies
    this.enemies = [];
    // Calculate scale factor for random dungeon enemies based on player level
    let scaleFactor = 1;
    if (this.dungeonState && this.dungeonState.active && mapId.startsWith('rdungeon_')) {
      const playerLevel = this.dungeonState.entryLevel || 1;
      // Base scale: each player level above 5 adds 15% enemy strength
      // Floor depth also adds scaling
      const levelScale = 1 + Math.max(0, playerLevel - 5) * 0.15;
      const floorScale = 1 + (this.dungeonState.floor - 1) * 0.1;
      scaleFactor = Math.min(levelScale * floorScale, 1.5);
    }
    map.enemies.forEach(eData => {
      const enemy = new Enemy(
        eData.type,
        eData.x * ts + ts / 2,
        eData.y * ts + ts / 2,
        scaleFactor
      );
      this.enemies.push(enemy);
    });

    // Reset particles
    Particles.particles = [];

    UI.updateHUD(this.player);
  }

  teleportPlayer(portal) {
    this.portalCooldown = 0.5; // 0.5s cooldown after any teleport
    // Gate: north exit requires bossDefeated
    if (portal.target === 'random_dungeon') {
      if (!this.player.bossDefeated) {
        if (!UI.dialogueActive) {
          UI.startDialogue('dungeon_gate_locked');
        }
        // Push player well away from portal to avoid re-trigger
        const ts = GameData.TILE_SIZE;
        this.player.y = portal.y * ts + ts * 2 + ts / 2;
        Camera.follow(this.player);
        return;
      }
      // Enter random dungeon floor 1
      this.enterRandomDungeon();
      return;
    }

    // Stairs down in random dungeon
    if (portal.isStairsDown && this.dungeonState && this.dungeonState.active) {
      this.dungeonNextFloor();
      return;
    }

    // Leaving dungeon (stairs up to town from floor 1)
    if (portal.isStairsUp && this.dungeonState && this.dungeonState.active) {
      this.leaveDungeon();
      this.loadMap(portal.target);
      const ts = GameData.TILE_SIZE;
      this.player.x = portal.spawnX * ts + ts / 2;
      this.player.y = portal.spawnY * ts + ts / 2;
      Camera.follow(this.player);
      Camera.x = Camera.targetX;
      Camera.y = Camera.targetY;
      return;
    }

    this.loadMap(portal.target);
    const ts = GameData.TILE_SIZE;
    this.player.x = portal.spawnX * ts + ts / 2;
    this.player.y = portal.spawnY * ts + ts / 2;
    Camera.follow(this.player);
    Camera.x = Camera.targetX;
    Camera.y = Camera.targetY;
  }

  enterRandomDungeon() {
    DungeonGenerator.cleanup();
    const totalFloors = DungeonGenerator.TOTAL_FLOORS;
    this.dungeonState = {
      active: true,
      floor: 1,
      totalFloors,
      entryLevel: this.player.level,
    };

    const result = DungeonGenerator.generate(1, totalFloors);
    GameData.MAPS[result.id] = result.map;

    this.loadMap(result.id);
    // Player spawns at entrance
    const ts = GameData.TILE_SIZE;
    this.player.x = result.entranceX * ts + ts / 2;
    this.player.y = result.entranceY * ts + ts / 2;
    Camera.follow(this.player);
    Camera.x = Camera.targetX;
    Camera.y = Camera.targetY;
  }

  dungeonNextFloor() {
    const nextFloor = this.dungeonState.floor + 1;
    this.dungeonState.floor = nextFloor;

    const result = DungeonGenerator.generate(nextFloor, this.dungeonState.totalFloors);
    GameData.MAPS[result.id] = result.map;

    this.loadMap(result.id);
    const ts = GameData.TILE_SIZE;
    this.player.x = result.entranceX * ts + ts / 2;
    this.player.y = result.entranceY * ts + ts / 2;
    Camera.follow(this.player);
    Camera.x = Camera.targetX;
    Camera.y = Camera.targetY;
  }

  leaveDungeon() {
    this.dungeonState = null;
    DungeonGenerator.cleanup();
  }

  onDungeonBossDefeated() {
    setTimeout(() => {
      UI.startDialogue('dungeon_boss_defeated', () => {
        // Return to town after dialogue
        this.leaveDungeon();
        this.loadMap('town');
        const ts = GameData.TILE_SIZE;
        this.player.x = 12 * ts + ts / 2;
        this.player.y = 1 * ts + ts / 2;
        Camera.follow(this.player);
        Camera.x = Camera.targetX;
        Camera.y = Camera.targetY;
        // Auto-save after dungeon clear
        this.saveGame();
      });
    }, 1000);
  }

  healPlayer() {
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    Particles.spawn(this.player.x, this.player.y, '#44ff88', 15, 60, 0.8);
    Combat.showDamage(this.player.x, this.player.y, 'HEAL', 'heal');
    UI.showDialogueText('リペアプログラム', '全システム復旧完了。オールグリーンです。');
  }

  onBossDefeated() {
    // ボス撃破ダイアログを少し遅らせて表示
    setTimeout(() => {
      UI.startDialogue('boss_defeated');
    }, 1000);
  }

  startEnding() {
    this.state = 'ending';
    document.getElementById('hud').classList.add('hidden');
    Music.stop();

    // Auto-save before ending so player can continue post-game
    this.player.endingCleared = true;
    this.saveGame();

    const screen = document.getElementById('ending-screen');
    const msg = document.getElementById('ending-message');
    const creditsRoll = document.getElementById('credits-roll');
    const creditsContent = document.getElementById('credits-content');
    const btnTitle = document.getElementById('btn-ending-title');

    screen.classList.remove('hidden');

    // Phase 1: Epilogue text (fade in line by line)
    const lines = [
      'ゼロデイウイルスは',
      '完全に無力化された。',
      '',
      'ネットワークは平穏を取り戻し、',
      'データの流れが正常に戻っていく。',
      '',
      'あなたの活躍は',
      'マスターAIのログに永久保存され、',
      'すべてのプログラムに',
      '語り継がれるだろう。',
      '',
      '電脳世界に、',
      '再び光が満ちた——',
    ];

    msg.innerHTML = '';
    msg.classList.add('visible');

    let lineIdx = 0;
    const typeTimer = setInterval(() => {
      if (lineIdx >= lines.length) {
        clearInterval(typeTimer);
        // Phase 2: Wait for reading, then fade out and start credits
        setTimeout(() => {
          msg.style.transition = 'opacity 2s';
          msg.classList.remove('visible');

          setTimeout(() => {
            msg.style.display = 'none';
            creditsRoll.classList.add('visible');

            // Start scrolling credits
            const screenH = screen.clientHeight;
            const contentH = creditsContent.scrollHeight;
            creditsContent.style.top = screenH + 'px';

            const scrollSpeed = 0.6; // pixels per frame
            let pos = screenH;

            const scrollAnim = () => {
              pos -= scrollSpeed;
              creditsContent.style.transform = `translateY(${pos - screenH}px)`;

              if (pos > -contentH) {
                requestAnimationFrame(scrollAnim);
              } else {
                // Credits finished, show return button
                btnTitle.classList.remove('hidden');
                setTimeout(() => btnTitle.classList.add('visible'), 100);
              }
            };
            requestAnimationFrame(scrollAnim);
          }, 2500);
        }, 5000);
        return;
      }

      if (lines[lineIdx] === '') {
        msg.innerHTML += '<br>';
      } else {
        msg.innerHTML += lines[lineIdx] + '<br>';
      }
      lineIdx++;
    }, 800);

    // Return to title button
    btnTitle.addEventListener('click', () => {
      screen.classList.add('hidden');
      msg.style.display = '';
      msg.innerHTML = '';
      msg.classList.remove('visible');
      msg.style.transition = '';
      creditsRoll.classList.remove('visible');
      creditsContent.style.transform = '';
      btnTitle.classList.add('hidden');
      btnTitle.classList.remove('visible');

      this.state = 'title';
      document.getElementById('title-screen').classList.remove('hidden');
      Music.playTitle();
      this.updateContinueButton();
    }, { once: true });
  }

  // --- メインループ ---
  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // Cap at 50ms
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    Input.update();

    if (this.state !== 'playing') return;

    // UI overlay checks
    if (UI.isOverlayOpen) {
      if (UI.dialogueActive) {
        UI.handleDialogueInput();
        if (Input.interact) {
          UI.advanceDialogue();
          // Consume input so it doesn't trigger close on newly opened overlay
          return;
        }
        if (Input.escape) {
          UI.closeDialogue();
        }
      } else if (UI.inventoryOpen) {
        if (Input.inventory || Input.escape || Input.interact) {
          UI.closeInventory();
        }
      } else if (UI.shopOpen) {
        if (Input.escape || Input.interact || Input.inventory) {
          UI.closeShop();
        }
      }
      return;
    }

    // Open inventory
    if (Input.inventory) {
      UI.toggleInventory();
      return;
    }

    // Quick save
    if (Input.save) {
      this.saveGame();
    }

    // Use item (quick potion)
    if (Input.useItem) {
      this.quickUseItem();
    }

    // Player update - pass all collidable entities
    const collidables = [
      ...this.enemies.filter(e => e.alive),
      ...this.npcs,
    ];
    this.player.update(dt, this.currentMap, collidables);

    // Attack (blocked during dodge)
    if (Input.attack && !this.player.dodging) {
      Combat.playerAttack(this.player, this.enemies);
    }

    // Skill (blocked during dodge)
    if (Input.skill && !this.player.dodging) {
      Combat.playerSkill(this.player, this.enemies);
    }

    // Dodge
    if (Input.dodge) {
      if (this.player.startDodge()) {
        UI.showFloatingText(this.player.x, this.player.y - 30, 'DODGE!', '#00ffff');
      }
    }

    // Interact
    if (Input.interact) {
      this.handleInteraction();
    }

    // Enemies update
    this.enemies.forEach(enemy => {
      if (!enemy.alive && enemy.deathTimer <= 0) return;
      const shouldAttack = enemy.update(dt, this.player.x, this.player.y, this.currentMap, this.player.size);
      if (shouldAttack && enemy.alive) {
        Combat.enemyAttack(enemy, this.player);
      }
    });

    // Remove fully dead enemies
    this.enemies = this.enemies.filter(e => e.alive || e.deathTimer > 0);

    // Check portals (with cooldown to prevent instant re-trigger)
    if (this.portalCooldown > 0) {
      this.portalCooldown -= dt;
    } else {
      const portal = MapRenderer.getPortalAt(this.currentMap, this.player.x, this.player.y);
      if (portal) {
        this.teleportPlayer(portal);
      }
    }

    // Camera
    Camera.follow(this.player);
    Camera.update();

    // Particles
    Particles.update(dt);

    // Boss HP bar
    const boss = this.enemies.find(e => e.isBoss && e.alive);
    UI.updateBossHP(boss);

    // HUD
    UI.updateHUD(this.player);

    // Game over check
    if (this.player.hp <= 0) {
      this.state = 'gameover';
      UI.showGameOver();
    }
  }

  handleInteraction() {
    // Check NPCs
    for (const npc of this.npcs) {
      if (npc.isNear(this.player.x, this.player.y)) {
        let dialogueId = npc.dialogue;
        let callback = null;
        // Special case: elder after boss defeat → trigger ending
        if (npc.id === 'elder' && this.player.bossDefeated) {
          dialogueId = 'elder_after';
          callback = () => this.startEnding();
        }
        UI.startDialogue(dialogueId, callback);
        return;
      }
    }

    // Check chests
    const chest = MapRenderer.getChestAt(this.currentMap, this.player.x, this.player.y);
    if (chest) {
      chest.opened = true;
      const item = GameData.ITEMS[chest.item];
      this.player.addItem(chest.item);
      UI.showDialogueText('', `データパッケージから ${item.name} を取得した！`);
      Particles.spawn(
        chest.x * GameData.TILE_SIZE + GameData.TILE_SIZE / 2,
        chest.y * GameData.TILE_SIZE + GameData.TILE_SIZE / 2,
        '#00ffcc', 15, 80, 0.6
      );
    }
  }

  quickUseItem() {
    // Try to use best available repair item
    const repairItems = ['hotfix', 'patch'];
    for (const itemId of repairItems) {
      if (this.player.useConsumable(itemId)) {
        const item = GameData.ITEMS[itemId];
        UI.showFloatingText(this.player.x, this.player.y - 30, `${item.name}を使った！`, '#44ff44');
        Combat.showDamage(this.player.x, this.player.y, item.effect.hp || item.effect.mp, 'heal');
        Particles.spawn(this.player.x, this.player.y, '#44ff88', 8, 50, 0.5);
        return;
      }
    }
    // Try memory cleaner if has mp issues
    if (this.player.useConsumable('memory_cleaner')) {
      const item = GameData.ITEMS['memory_cleaner'];
      UI.showFloatingText(this.player.x, this.player.y - 30, `${item.name}を使った！`, '#4488ff');
      Combat.showDamage(this.player.x, this.player.y, item.effect.mp, 'heal');
      Particles.spawn(this.player.x, this.player.y, '#4488ff', 8, 50, 0.5);
    }
  }

  // --- 描画 ---
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'title') {
      // Title screen particle effect
      this.renderTitleParticles(ctx);
      return;
    }

    // Background
    const map = GameData.MAPS[this.currentMap];
    ctx.fillStyle = map ? map.bgColor : '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Map
    MapRenderer.render(ctx);

    // Collect all renderable entities and sort by Y for depth
    const renderables = [];

    this.npcs.forEach(npc => renderables.push({ y: npc.y, render: () => npc.render(ctx) }));
    this.enemies.forEach(enemy => {
      if (enemy.alive || enemy.deathTimer > 0) {
        renderables.push({ y: enemy.y, render: () => enemy.render(ctx) });
      }
    });
    renderables.push({ y: this.player.y, render: () => this.player.render(ctx) });

    // Sort by Y position (painter's algorithm)
    renderables.sort((a, b) => a.y - b.y);
    renderables.forEach(r => r.render());

    // Particles on top
    Particles.render(ctx);

    // Attack hitbox debug (uncomment to debug)
    // if (this.player.attacking) {
    //   const hb = this.player.getAttackHitbox();
    //   const pos = Camera.worldToScreen(hb.x, hb.y);
    //   ctx.strokeStyle = 'rgba(255,0,0,0.5)';
    //   ctx.strokeRect(pos.x, pos.y, hb.w, hb.h);
    // }
  }

  renderTitleParticles(ctx) {
    const time = Date.now() / 1000;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.fillStyle = '#0a0a20';
    ctx.fillRect(0, 0, cw, ch);

    // Grid lines (circuit board)
    ctx.strokeStyle = 'rgba(0,100,200,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = 0; y < ch; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // Floating data particles
    for (let i = 0; i < 60; i++) {
      const x = ((Math.sin(i * 1234.5) * 0.5 + 0.5) * cw + time * (10 + i % 20)) % cw;
      const y = (Math.cos(i * 5678.9) * 0.5 + 0.5) * ch;
      const brightness = Math.sin(time * 2 + i) * 0.3 + 0.7;
      const c = i % 3 === 0 ? `rgba(0,255,200,${brightness * 0.7})` :
                i % 3 === 1 ? `rgba(0,180,255,${brightness * 0.55})` :
                              `rgba(0,120,255,${brightness * 0.4})`;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, i % 5 === 0 ? 3 : 1, i % 5 === 0 ? 3 : 1);
    }
  }

  // --- セーブ/ロード ---
  saveGame() {
    if (!this.player) return;
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      // Save as town if in random dungeon (dungeon maps are not persistent)
      currentMap: this.currentMap.startsWith('rdungeon_') ? 'town' : this.currentMap,
      player: {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        mp: this.player.mp,
        maxMp: this.player.maxMp,
        baseAtk: this.player.baseAtk,
        baseDef: this.player.baseDef,
        spd: this.player.spd,
        level: this.player.level,
        exp: this.player.exp,
        nextExp: this.player.nextExp,
        gold: this.player.gold,
        weapon: this.player.weapon,
        armor: this.player.armor,
        inventory: { ...this.player.inventory },
        bossDefeated: this.player.bossDefeated,
        endingCleared: this.player.endingCleared || false,
      },
      chests: {},
    };
    // Save chest opened state for all maps (skip random dungeon maps)
    for (const mapId in GameData.MAPS) {
      if (mapId.startsWith('rdungeon_')) continue;
      saveData.chests[mapId] = GameData.MAPS[mapId].chests.map(c => c.opened);
    }
    try {
      localStorage.setItem('netguard_save', JSON.stringify(saveData));
      UI.showFloatingText(this.player.x, this.player.y - 30, 'SAVED', '#00ffcc');
      Particles.spawn(this.player.x, this.player.y, '#00ffcc', 8, 40, 0.4);
    } catch (e) {
      UI.showFloatingText(this.player.x, this.player.y - 30, 'SAVE FAILED', '#ff4444');
    }
  }

  loadGame() {
    const raw = localStorage.getItem('netguard_save');
    if (!raw) return;
    let saveData;
    try {
      saveData = JSON.parse(raw);
    } catch (e) { return; }

    // Create player and restore stats
    this.player = new Player();
    const p = saveData.player;
    this.player.hp = p.hp;
    this.player.maxHp = p.maxHp;
    this.player.mp = p.mp;
    this.player.maxMp = p.maxMp;
    this.player.baseAtk = p.baseAtk;
    this.player.baseDef = p.baseDef;
    this.player.spd = p.spd;
    this.player.level = p.level;
    this.player.exp = p.exp;
    this.player.nextExp = p.nextExp;
    this.player.gold = p.gold;
    this.player.weapon = p.weapon;
    this.player.armor = p.armor;
    this.player.inventory = { ...p.inventory };
    this.player.bossDefeated = !!p.bossDefeated;
    this.player.endingCleared = !!p.endingCleared;

    // Restore chest states
    if (saveData.chests) {
      for (const mapId in saveData.chests) {
        if (GameData.MAPS[mapId] && GameData.MAPS[mapId].chests) {
          saveData.chests[mapId].forEach((opened, i) => {
            if (GameData.MAPS[mapId].chests[i]) {
              GameData.MAPS[mapId].chests[i].opened = opened;
            }
          });
        }
      }
    }

    // Enter game
    this.state = 'playing';
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    // Fallback to town if saved map doesn't exist (e.g. random dungeon)
    const loadMapId = (saveData.currentMap && GameData.MAPS[saveData.currentMap]) ? saveData.currentMap : 'town';
    this.loadMap(loadMapId);
  }

  hasSaveData() {
    return !!localStorage.getItem('netguard_save');
  }

  updateContinueButton() {
    const btn = document.getElementById('btn-continue');
    if (this.hasSaveData()) {
      btn.classList.remove('hidden');
      const raw = localStorage.getItem('netguard_save');
      try {
        const data = JSON.parse(raw);
        const info = document.getElementById('save-info');
        if (info && data.player) {
          info.textContent = `Lv.${data.player.level} ${GameData.MAPS[data.currentMap]?.name || ''}`;
        }
      } catch(e) {}
    } else {
      btn.classList.add('hidden');
    }
  }

  // --- イースターエッグ: GB カラー変更 ---
  setupEasterEgg() {
    const menuBtn = document.getElementById('btn-touch-inv');
    if (!menuBtn) return;

    let eggCount = 0;
    let eggResetTimer = null;
    let lastTouchTime = 0;

    const handleMenuEgg = (isTouch) => {
      if (isTouch) {
        lastTouchTime = Date.now();
      } else {
        // Skip click event on touch devices to avoid double-counting
        if (Date.now() - lastTouchTime < 500) return;
      }

      if (this.state !== 'title') { eggCount = 0; return; }

      eggCount++;
      clearTimeout(eggResetTimer);
      if (eggCount >= 7) {
        eggCount = 0;
        this.openColorPicker();
      } else {
        eggResetTimer = setTimeout(() => { eggCount = 0; }, 3000);
      }
    };

    menuBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleMenuEgg(true); });
    menuBtn.addEventListener('click', () => handleMenuEgg(false));

    document.getElementById('close-easter-panel').addEventListener('click', () => {
      document.getElementById('easter-color-panel').classList.add('hidden');
    });
  }

  openColorPicker() {
    const colors = [
      { id: 'default',  name: 'デフォルト',    bg: 'linear-gradient(180deg, #b8b8c0 0%, #a0a0a8 50%, #909098 100%)' },
      { id: 'cobalt',   name: 'コバルト',       bg: 'linear-gradient(180deg, #5b8dd9 0%, #4070bb 50%, #305aaa 100%)' },
      { id: 'red',      name: 'フレイムレッド', bg: 'linear-gradient(180deg, #d94040 0%, #bb3030 50%, #9a2020 100%)' },
      { id: 'pearl',    name: 'パールブルー',   bg: 'linear-gradient(180deg, #b8d4e8 0%, #9abcd4 50%, #7aaabf 100%)' },
      { id: 'emerald',  name: 'エメラルド',     bg: 'linear-gradient(180deg, #40b870 0%, #309a58 50%, #208040 100%)' },
      { id: 'rainbow',  name: 'レインボー',     bg: 'linear-gradient(180deg, #ff6b6b 0%, #ffd93d 25%, #6bcb77 50%, #4d96ff 75%, #c77dff 100%)' },
    ];

    const list = document.getElementById('easter-color-list');
    const currentTheme = localStorage.getItem('netguard_gb_theme') || 'default';

    list.innerHTML = '';
    colors.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'easter-color-btn' + (c.id === currentTheme ? ' selected' : '');
      btn.style.background = c.bg;
      btn.dataset.colorId = c.id;
      btn.textContent = c.name;
      btn.addEventListener('click', () => this.applyGbTheme(c.id));
      list.appendChild(btn);
    });

    document.getElementById('easter-color-panel').classList.remove('hidden');
  }

  applyGbTheme(themeId) {
    const gbBody = document.getElementById('gb-body');
    if (!gbBody) return;

    const themes = ['cobalt', 'red', 'pearl', 'emerald', 'rainbow'];
    themes.forEach(t => {
      gbBody.classList.remove(`gb-theme-${t}`);
      document.body.classList.remove(`gb-theme-${t}`);
    });

    if (themeId !== 'default') {
      gbBody.classList.add(`gb-theme-${themeId}`);
      document.body.classList.add(`gb-theme-${themeId}`);
    }

    localStorage.setItem('netguard_gb_theme', themeId);

    // Update selected state in panel
    document.querySelectorAll('.easter-color-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.colorId === themeId);
    });
  }

  loadGbTheme() {
    const saved = localStorage.getItem('netguard_gb_theme');
    if (saved && saved !== 'default') {
      const gbBody = document.getElementById('gb-body');
      if (gbBody) gbBody.classList.add(`gb-theme-${saved}`);
      document.body.classList.add(`gb-theme-${saved}`);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});
