// ============================================================
// engine.js - コアエンジン (入力、カメラ、レンダリング、マップ)
// ============================================================

// --- 入力マネージャ ---
const Input = {
  keys: {},
  justPressed: {},
  _prev: {},
  // Touch state
  touchDir: { x: 0, y: 0 },
  touchActions: {},
  _prevTouchActions: {},
  isMobile: false,

  init() {
    // Detect mobile
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      e.preventDefault();
    });
    window.addEventListener('blur', () => {
      this.keys = {};
      this.touchDir = { x: 0, y: 0 };
    });

    // Show touch controls on mobile
    if (this.isMobile) {
      this.initTouchControls();
    }
  },

  initTouchControls() {
    const touchUI = document.getElementById('touch-controls');
    if (touchUI) touchUI.classList.remove('hidden');

    // Hide PC controls hint, show mobile hint
    document.querySelectorAll('.controls-hint-pc').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.controls-hint-mobile').forEach(el => el.style.display = 'block');

    // Virtual joystick
    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');
    const joyThumb = document.getElementById('joystick-thumb');
    let joyActive = false;
    let joyCenterX = 0, joyCenterY = 0;
    const joyRadius = 50; // max thumb displacement
    const deadZone = 10;

    const updateJoy = (tx, ty) => {
      const dx = tx - joyCenterX;
      const dy = ty - joyCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Clamp to radius
      const clampDist = Math.min(dist, joyRadius);
      const angle = Math.atan2(dy, dx);
      const cx = clampDist * Math.cos(angle);
      const cy = clampDist * Math.sin(angle);
      // Move thumb visually
      joyThumb.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
      // Set direction with dead zone
      if (dist < deadZone) {
        this.touchDir.x = 0;
        this.touchDir.y = 0;
      } else {
        this.touchDir.x = cx / joyRadius;
        this.touchDir.y = cy / joyRadius;
      }
    };

    const resetJoy = () => {
      joyActive = false;
      this.touchDir.x = 0;
      this.touchDir.y = 0;
      joyThumb.style.transform = 'translate(-50%, -50%)';
    };

    joyZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      joyActive = true;
      const rect = joyBase.getBoundingClientRect();
      joyCenterX = rect.left + rect.width / 2;
      joyCenterY = rect.top + rect.height / 2;
      const t = e.touches[0];
      updateJoy(t.clientX, t.clientY);
    });

    joyZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!joyActive) return;
      const t = e.touches[0];
      updateJoy(t.clientX, t.clientY);
    });

    joyZone.addEventListener('touchend', (e) => { e.preventDefault(); resetJoy(); });
    joyZone.addEventListener('touchcancel', (e) => { e.preventDefault(); resetJoy(); });

    // Action buttons
    const bindAction = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touchActions[action] = true;
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.touchActions[action] = false;
      });
      btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        this.touchActions[action] = false;
      });
    };
    bindAction('btn-touch-attack', 'attack');
    bindAction('btn-touch-interact', 'interact');
    bindAction('btn-touch-item', 'useItem');
    bindAction('btn-touch-inv', 'inventory');
    bindAction('btn-touch-save', 'save');

    // Prevent zoom/scroll on the game area
    document.getElementById('game-container').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.getElementById('touch-controls').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Allow overlay panels to scroll (stop propagation before game-container's preventDefault)
    document.querySelectorAll('.overlay-panel').forEach(panel => {
      panel.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
    });

    // Prevent double-tap zoom
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    }, { passive: false });
  },

  update() {
    for (const code in this.keys) {
      this.justPressed[code] = this.keys[code] && !this._prev[code];
    }
    this._prev = { ...this.keys };

    // Touch direction "just pressed" tracking (threshold for joystick)
    const dirThreshold = 0.3;
    this._touchDirJust = {
      up: this.touchDir.y < -dirThreshold && !(this._prevTouchDir?.y < -dirThreshold),
      down: this.touchDir.y > dirThreshold && !(this._prevTouchDir?.y > dirThreshold),
    };
    this._prevTouchDir = { x: this.touchDir.x, y: this.touchDir.y };

    // Touch action "just pressed" tracking
    this._touchJust = {};
    for (const action in this.touchActions) {
      this._touchJust[action] = this.touchActions[action] && !this._prevTouchActions[action];
    }
    this._prevTouchActions = { ...this.touchActions };
  },

  isDown(code) { return !!this.keys[code]; },
  isJustPressed(code) { return !!this.justPressed[code]; },

  get moveX() {
    let x = this.touchDir.x;
    if (this.isDown('ArrowLeft') || this.isDown('KeyA')) x -= 1;
    if (this.isDown('ArrowRight') || this.isDown('KeyD')) x += 1;
    return Math.max(-1, Math.min(1, x));
  },
  get moveY() {
    let y = this.touchDir.y;
    if (this.isDown('ArrowUp') || this.isDown('KeyW')) y -= 1;
    if (this.isDown('ArrowDown') || this.isDown('KeyS')) y += 1;
    return Math.max(-1, Math.min(1, y));
  },
  get attack() { return this.isJustPressed('Space') || !!this._touchJust?.attack; },
  get interact() { return this.isJustPressed('Enter') || !!this._touchJust?.interact; },
  get useItem() { return this.isJustPressed('KeyX') || !!this._touchJust?.useItem; },
  get inventory() { return this.isJustPressed('KeyI') || !!this._touchJust?.inventory; },
  get escape() { return this.isJustPressed('Escape'); },
  get save() { return this.isJustPressed('KeyQ') || !!this._touchJust?.save; },
};

// --- カメラ ---
const Camera = {
  x: 0, y: 0,
  width: 800,
  height: 600,
  targetX: 0, targetY: 0,
  mapPixelW: 0, mapPixelH: 0,

  follow(entity) {
    this.targetX = entity.x - this.width / 2;
    this.targetY = entity.y - this.height / 2;
  },

  update() {
    // Smooth follow
    this.x += (this.targetX - this.x) * 0.1;
    this.y += (this.targetY - this.y) * 0.1;

    // Clamp to map bounds
    this.x = Math.max(0, Math.min(this.x, this.mapPixelW - this.width));
    this.y = Math.max(0, Math.min(this.y, this.mapPixelH - this.height));

    if (this.mapPixelW <= this.width) this.x = (this.mapPixelW - this.width) / 2;
    if (this.mapPixelH <= this.height) this.y = (this.mapPixelH - this.height) / 2;
  },

  worldToScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y };
  },
};

// --- マップレンダラー ---
const MapRenderer = {
  currentMap: null,

  loadMap(mapId) {
    this.currentMap = mapId;
    const map = GameData.MAPS[mapId];
    Camera.mapPixelW = map.width * GameData.TILE_SIZE;
    Camera.mapPixelH = map.height * GameData.TILE_SIZE;
  },

  render(ctx) {
    const map = GameData.MAPS[this.currentMap];
    if (!map) return;
    const ts = GameData.TILE_SIZE;

    // Only render visible tiles
    const startCol = Math.max(0, Math.floor(Camera.x / ts));
    const endCol = Math.min(map.width, Math.ceil((Camera.x + Camera.width) / ts) + 1);
    const startRow = Math.max(0, Math.floor(Camera.y / ts));
    const endRow = Math.min(map.height, Math.ceil((Camera.y + Camera.height) / ts) + 1);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile = map.tileData[row * map.width + col];
        const color = GameData.TILE_COLORS[tile] || '#000';
        const pos = Camera.worldToScreen(col * ts, row * ts);

        ctx.fillStyle = color;
        ctx.fillRect(pos.x, pos.y, ts, ts);

        // Tile details - cyber theme
        if (tile === 1) {
          // Firewall - circuit border glow
          ctx.strokeStyle = 'rgba(0,180,255,0.15)';
          ctx.strokeRect(pos.x + 1, pos.y + 1, ts - 2, ts - 2);
          ctx.fillStyle = 'rgba(0,100,200,0.08)';
          ctx.fillRect(pos.x + 4, pos.y + 4, ts - 8, ts - 8);
        } else if (tile === 2) {
          // Data stream - flowing data
          ctx.fillStyle = 'rgba(0,150,255,0.2)';
          const flow = Math.sin(Date.now() / 400 + col * 2 + row) * 3;
          ctx.fillRect(pos.x + 4 + flow, pos.y + 6, 8, 1);
          ctx.fillRect(pos.x + 14 + flow, pos.y + 14, 10, 1);
          ctx.fillStyle = 'rgba(0,200,255,0.3)';
          ctx.fillRect(pos.x + 10 - flow, pos.y + 22, 6, 1);
        } else if (tile === 3) {
          // Circuit board - grid lines
          ctx.strokeStyle = 'rgba(0,255,100,0.1)';
          ctx.beginPath();
          ctx.moveTo(pos.x + 8, pos.y); ctx.lineTo(pos.x + 8, pos.y + ts);
          ctx.moveTo(pos.x + 24, pos.y); ctx.lineTo(pos.x + 24, pos.y + ts);
          ctx.moveTo(pos.x, pos.y + 16); ctx.lineTo(pos.x + ts, pos.y + 16);
          ctx.stroke();
          // Circuit nodes
          ctx.fillStyle = 'rgba(0,255,120,0.15)';
          ctx.fillRect(pos.x + 7, pos.y + 15, 3, 3);
          ctx.fillRect(pos.x + 23, pos.y + 15, 3, 3);
        } else if (tile === 4) {
          // Data path - subtle pulse lines
          const pulse = Math.sin(Date.now() / 600 + col + row * 0.5) * 0.1 + 0.1;
          ctx.fillStyle = `rgba(100,100,255,${pulse})`;
          ctx.fillRect(pos.x, pos.y + 15, ts, 2);
          ctx.fillRect(pos.x + 15, pos.y, 2, ts);
        } else if (tile === 5) {
          // Server block - subtle grid
          ctx.strokeStyle = 'rgba(100,100,200,0.08)';
          ctx.strokeRect(pos.x + 2, pos.y + 2, ts - 4, ts - 4);
        } else if (tile === 6) {
          // Corrupted sector - glitch lines
          const glitch = Math.sin(Date.now() / 200 + col * 3) * 0.15 + 0.1;
          ctx.fillStyle = `rgba(150,0,200,${glitch})`;
          ctx.fillRect(pos.x, pos.y + ((col * 7 + row * 3) % 20), ts, 2);
        } else if (tile === 7) {
          // Virus core - pulsing red
          const glow = Math.sin(Date.now() / 300 + col * 2 + row) * 0.2 + 0.3;
          ctx.fillStyle = `rgba(255,0,50,${glow})`;
          ctx.fillRect(pos.x, pos.y, ts, ts);
          ctx.strokeStyle = `rgba(255,50,0,${glow * 0.5})`;
          ctx.strokeRect(pos.x + 4, pos.y + 4, ts - 8, ts - 8);
        }

        // Grid lines (cyber grid)
        ctx.strokeStyle = 'rgba(0,150,255,0.04)';
        ctx.strokeRect(pos.x, pos.y, ts, ts);
      }
    }

    // Render portals (gateway nodes)
    map.portals.forEach(portal => {
      const pos = Camera.worldToScreen(portal.x * ts, portal.y * ts);
      const pulse = Math.sin(Date.now() / 400) * 0.3 + 0.5;

      if (portal.isStairsDown) {
        // Stairs down - red/orange pulsing
        ctx.fillStyle = `rgba(255,100,0,${pulse * 0.3})`;
        ctx.fillRect(pos.x + 2, pos.y + 2, ts - 4, ts - 4);
        ctx.strokeStyle = `rgba(255,150,0,${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x + 4, pos.y + 4, ts - 8, ts - 8);
        // Down arrow
        ctx.beginPath();
        ctx.moveTo(pos.x + ts/2, pos.y + ts - 8);
        ctx.lineTo(pos.x + ts - 8, pos.y + 8);
        ctx.lineTo(pos.x + 8, pos.y + 8);
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,200,0,${pulse * 0.8})`;
        ctx.stroke();
      } else if (portal.isStairsUp) {
        // Stairs up - green pulsing
        ctx.fillStyle = `rgba(0,255,100,${pulse * 0.3})`;
        ctx.fillRect(pos.x + 2, pos.y + 2, ts - 4, ts - 4);
        ctx.strokeStyle = `rgba(0,255,150,${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x + 4, pos.y + 4, ts - 8, ts - 8);
        // Up arrow
        ctx.beginPath();
        ctx.moveTo(pos.x + ts/2, pos.y + 8);
        ctx.lineTo(pos.x + ts - 8, pos.y + ts - 8);
        ctx.lineTo(pos.x + 8, pos.y + ts - 8);
        ctx.closePath();
        ctx.strokeStyle = `rgba(0,255,200,${pulse * 0.8})`;
        ctx.stroke();
      } else {
        // Normal portal
        ctx.fillStyle = `rgba(0,200,255,${pulse * 0.3})`;
        ctx.fillRect(pos.x + 2, pos.y + 2, ts - 4, ts - 4);
        ctx.strokeStyle = `rgba(0,255,255,${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x + 4, pos.y + 4, ts - 8, ts - 8);
        // Inner diamond
        ctx.beginPath();
        ctx.moveTo(pos.x + ts/2, pos.y + 6);
        ctx.lineTo(pos.x + ts - 6, pos.y + ts/2);
        ctx.lineTo(pos.x + ts/2, pos.y + ts - 6);
        ctx.lineTo(pos.x + 6, pos.y + ts/2);
        ctx.closePath();
        ctx.strokeStyle = `rgba(0,255,200,${pulse * 0.7})`;
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    });

    // Render data packages (chests)
    map.chests.forEach(chest => {
      const pos = Camera.worldToScreen(chest.x * ts + ts / 2, chest.y * ts + ts / 2);
      if (chest.opened) {
        ctx.strokeStyle = 'rgba(100,100,100,0.4)';
        ctx.strokeRect(pos.x - 8, pos.y - 8, 16, 16);
      } else {
        const glow = Math.sin(Date.now() / 500) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(0,255,200,${glow * 0.3})`;
        ctx.fillRect(pos.x - 10, pos.y - 10, 20, 20);
        ctx.strokeStyle = `rgba(0,255,200,${glow})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 10, pos.y - 10, 20, 20);
        ctx.fillStyle = `rgba(0,255,200,${glow})`;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PKG', pos.x, pos.y);
        ctx.lineWidth = 1;
      }
    });
  },

  getTile(mapId, worldX, worldY) {
    const map = GameData.MAPS[mapId];
    const col = Math.floor(worldX / GameData.TILE_SIZE);
    const row = Math.floor(worldY / GameData.TILE_SIZE);
    if (col < 0 || col >= map.width || row < 0 || row >= map.height) return 1; // wall outside
    return map.tileData[row * map.width + col];
  },

  isWalkable(mapId, worldX, worldY, size) {
    const half = size / 2;
    const corners = [
      { x: worldX - half + 2, y: worldY - half + 2 },
      { x: worldX + half - 2, y: worldY - half + 2 },
      { x: worldX - half + 2, y: worldY + half - 2 },
      { x: worldX + half - 2, y: worldY + half - 2 },
    ];
    return corners.every(c => {
      const tile = this.getTile(mapId, c.x, c.y);
      return GameData.TILE_WALKABLE[tile] !== false;
    });
  },

  getPortalAt(mapId, worldX, worldY) {
    const map = GameData.MAPS[mapId];
    const ts = GameData.TILE_SIZE;
    return map.portals.find(p => {
      const px = p.x * ts + ts / 2;
      const py = p.y * ts + ts / 2;
      return Math.abs(worldX - px) < ts / 2 && Math.abs(worldY - py) < ts / 2;
    });
  },

  getChestAt(mapId, worldX, worldY) {
    const map = GameData.MAPS[mapId];
    const ts = GameData.TILE_SIZE;
    return map.chests.find(c => {
      if (c.opened) return false;
      const cx = c.x * ts + ts / 2;
      const cy = c.y * ts + ts / 2;
      return Math.abs(worldX - cx) < ts * 1.2 && Math.abs(worldY - cy) < ts * 1.2;
    });
  },
};

// --- パーティクルシステム ---
const Particles = {
  particles: [],

  spawn(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  },

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
  },

  render(ctx) {
    this.particles.forEach(p => {
      const pos = Camera.worldToScreen(p.x, p.y);
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  },
};
