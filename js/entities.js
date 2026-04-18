// ============================================================
// entities.js - プレイヤー、エネミー、NPC
// ============================================================

// --- プレイヤー ---
class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.size = 24;
    this.facing = 'down'; // up, down, left, right
    this.attacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invincible = 0;
    this.animFrame = 0;
    this.animTimer = 0;
    this.moving = false;
    this.bossDefeated = false;

    // Stats
    const init = GameData.PLAYER_INITIAL;
    this.hp = init.hp;
    this.maxHp = init.maxHp;
    this.mp = init.mp;
    this.maxMp = init.maxMp;
    this.baseAtk = init.atk;
    this.baseDef = init.def;
    this.spd = init.spd;
    this.level = init.level;
    this.exp = init.exp;
    this.nextExp = init.nextExp;
    this.gold = init.gold;
    this.weapon = init.weapon;
    this.armor = init.armor;
    this.inventory = { ...init.inventory };

    // Skill system
    this.skillCooldown = 0;
    this.skillAnimTimer = 0;  // visual feedback
    this.buffDefTimer = 0;    // Firewall buff remaining
    this.buffAtkTimer = 0;    // Rollback ATK buff remaining

    // Dodge system
    this.dodging = false;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.dodgeVelX = 0;
    this.dodgeVelY = 0;
  }

  // Dodge system constants
  static DODGE_DURATION     = 0.25; // seconds
  static DODGE_COOLDOWN     = 1.2;  // seconds
  static DODGE_INVINCIBLE   = 0.3;  // invincibility window (seconds)
  static DODGE_SPEED_MULT   = 3.5;  // speed multiplier relative to normal movement

  get atk() {
    let a = this.baseAtk;
    if (this.weapon && GameData.ITEMS[this.weapon]) a += GameData.ITEMS[this.weapon].stats.atk;
    if (this.buffAtkTimer > 0) a = Math.floor(a * 1.5);
    return a;
  }

  get def() {
    let d = this.baseDef;
    if (this.armor && GameData.ITEMS[this.armor]) d += GameData.ITEMS[this.armor].stats.def;
    return d;
  }

  get currentSkill() {
    if (!this.weapon) return null;
    const item = GameData.ITEMS[this.weapon];
    return item ? item.skill : null;
  }

  update(dt, mapId, entities) {
    // Timers
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.skillCooldown > 0) this.skillCooldown -= dt;
    if (this.skillAnimTimer > 0) this.skillAnimTimer -= dt;
    if (this.buffDefTimer > 0) this.buffDefTimer -= dt;
    if (this.buffAtkTimer > 0) this.buffAtkTimer -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    // MP自然回復 (1/秒)
    if (this.mp < this.maxMp) {
      this.mpRegenTimer = (this.mpRegenTimer || 0) + dt;
      if (this.mpRegenTimer >= 1.0) {
        this.mpRegenTimer -= 1.0;
        this.mp = Math.min(this.maxMp, this.mp + 1);
      }
    }
    if (this.attacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    // Dodge movement (overrides normal movement)
    if (this.dodging) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0) {
        this.dodging = false;
      } else {
        const dodgeSpeed = this.spd * 60 * dt * Player.DODGE_SPEED_MULT;
        const newX = this.x + this.dodgeVelX * dodgeSpeed;
        const newY = this.y + this.dodgeVelY * dodgeSpeed;
        if (MapRenderer.isWalkable(mapId, newX, this.y, this.size)) this.x = newX;
        if (MapRenderer.isWalkable(mapId, this.x, newY, this.size)) this.y = newY;
        Particles.spawn(this.x, this.y, 'rgba(0,220,255,0.6)', 2, 30, 0.15);
      }
      return;
    }

    // Movement
    const mx = Input.moveX;
    const my = Input.moveY;
    this.moving = mx !== 0 || my !== 0;

    if (this.moving && !this.attacking) {
      // Normalize diagonal movement
      const len = Math.sqrt(mx * mx + my * my);
      const nx = mx / len;
      const ny = my / len;
      const speed = this.spd * 60 * dt;

      const newX = this.x + nx * speed;
      const newY = this.y + ny * speed;

      // Collision detection - try X and Y separately
      if (MapRenderer.isWalkable(mapId, newX, this.y, this.size) &&
          !this.collidesWithEntities(newX, this.y, entities) &&
          !this.collidesWithChest(newX, this.y, mapId)) {
        this.x = newX;
      }
      if (MapRenderer.isWalkable(mapId, this.x, newY, this.size) &&
          !this.collidesWithEntities(this.x, newY, entities) &&
          !this.collidesWithChest(this.x, newY, mapId)) {
        this.y = newY;
      }

      // Update facing
      if (Math.abs(mx) > Math.abs(my)) {
        this.facing = mx > 0 ? 'right' : 'left';
      } else if (my !== 0) {
        this.facing = my > 0 ? 'down' : 'up';
      }
    }

    // Animation
    if (this.moving) {
      this.animTimer += dt;
      if (this.animTimer > 0.15) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 0;
    }
  }

  collidesWithEntities(x, y, entities) {
    if (!entities) return false;
    const half = this.size / 2;
    for (const e of entities) {
      if (e === this) continue;
      if (e.alive === false) continue;
      const eHalf = e.size / 2;
      if (Math.abs(x - e.x) < half + eHalf - 4 &&
          Math.abs(y - e.y) < half + eHalf - 4) {
        return true;
      }
    }
    return false;
  }

  collidesWithChest(x, y, mapId) {
    const map = GameData.MAPS[mapId];
    if (!map || !map.chests) return false;
    const ts = GameData.TILE_SIZE;
    const half = this.size / 2;
    for (const c of map.chests) {
      if (c.opened) continue;
      const cx = c.x * ts + ts / 2;
      const cy = c.y * ts + ts / 2;
      const cHalf = ts / 2;
      if (Math.abs(x - cx) < half + cHalf - 4 &&
          Math.abs(y - cy) < half + cHalf - 4) {
        return true;
      }
    }
    return false;
  }

  startAttack() {
    if (this.attackCooldown > 0 || this.attacking) return false;
    this.attacking = true;
    this.attackTimer = 0.25;
    this.attackCooldown = 0.4;
    return true;
  }

  canUseSkill() {
    const skill = this.currentSkill;
    if (!skill) return false;
    if (this.skillCooldown > 0) return false;
    if (this.mp < skill.mp) return false;
    return true;
  }

  startSkill() {
    const skill = this.currentSkill;
    if (!this.canUseSkill()) return false;
    this.mp -= skill.mp;
    this.skillCooldown = skill.cooldown;
    this.skillAnimTimer = 0.4;
    return true;
  }

  startDodge() {
    if (this.dodging || this.dodgeCooldown > 0) return false;
    // Use movement direction, or facing direction if standing still
    const mx = Input.moveX;
    const my = Input.moveY;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0.1) {
      this.dodgeVelX = mx / len;
      this.dodgeVelY = my / len;
    } else {
      switch (this.facing) {
        case 'up':    this.dodgeVelX = 0;  this.dodgeVelY = -1; break;
        case 'down':  this.dodgeVelX = 0;  this.dodgeVelY =  1; break;
        case 'left':  this.dodgeVelX = -1; this.dodgeVelY =  0; break;
        case 'right': this.dodgeVelX =  1; this.dodgeVelY =  0; break;
      }
    }
    this.dodging = true;
    this.dodgeTimer = Player.DODGE_DURATION;
    this.dodgeCooldown = Player.DODGE_COOLDOWN;
    this.invincible = Math.max(this.invincible, Player.DODGE_INVINCIBLE);
    this.attacking = false;
    return true;
  }

  getAttackHitbox() {
    const range = 32;
    const w = 28, h = 28;
    switch (this.facing) {
      case 'up':    return { x: this.x - w/2, y: this.y - range - h/2, w, h };
      case 'down':  return { x: this.x - w/2, y: this.y + range - h/2, w, h };
      case 'left':  return { x: this.x - range - w/2, y: this.y - h/2, w, h };
      case 'right': return { x: this.x + range - w/2, y: this.y - h/2, w, h };
    }
  }

  takeDamage(amount) {
    if (this.invincible > 0) return 0;
    let actual = Math.max(1, amount - this.def);
    if (this.buffDefTimer > 0) actual = Math.max(1, Math.floor(actual * 0.5));
    this.hp = Math.max(0, this.hp - actual);
    this.invincible = 0.8;
    return actual;
  }

  heal(hp, mp) {
    if (hp) this.hp = Math.min(this.maxHp, this.hp + hp);
    if (mp) this.mp = Math.min(this.maxMp, this.mp + mp);
  }

  gainExp(amount) {
    this.exp += amount;
    let leveled = false;
    while (this.exp >= this.nextExp) {
      this.exp -= this.nextExp;
      this.level++;
      this.maxHp += GameData.LEVEL_UP.hpGain;
      this.maxMp += GameData.LEVEL_UP.mpGain;
      this.baseAtk += GameData.LEVEL_UP.atkGain;
      this.baseDef += GameData.LEVEL_UP.defGain;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.nextExp = Math.floor(this.nextExp * GameData.LEVEL_UP.expMultiplier);
      leveled = true;
    }
    return leveled;
  }

  addItem(itemId, count) {
    this.inventory[itemId] = (this.inventory[itemId] || 0) + (count || 1);
  }

  removeItem(itemId, count) {
    if (!this.inventory[itemId]) return false;
    this.inventory[itemId] -= (count || 1);
    if (this.inventory[itemId] <= 0) delete this.inventory[itemId];
    return true;
  }

  useConsumable(itemId) {
    const item = GameData.ITEMS[itemId];
    if (!item || item.type !== 'consumable') return false;
    if (!this.inventory[itemId]) return false;
    if (item.effect.hp && this.hp >= this.maxHp) return false;
    if (item.effect.mp && !item.effect.hp && this.mp >= this.maxMp) return false;

    this.removeItem(itemId);
    if (item.effect.hp) this.heal(item.effect.hp, 0);
    if (item.effect.mp) this.heal(0, item.effect.mp);
    return true;
  }

  render(ctx) {
    const pos = Camera.worldToScreen(this.x, this.y);
    const s = this.size;

    // Dodge flash — bright cyan at full opacity during dodge
    if (this.dodging) {
      ctx.globalAlpha = 0.85;
    } else if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) {
      // Invincibility flash
      ctx.globalAlpha = 0.4;
    }

    const bobY = this.moving ? Math.sin(this.animFrame * Math.PI / 2) * 2 : 0;

    // Glow effect
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 14;

    // Body - TRON style hexagonal program
    ctx.fillStyle = '#002840';
    ctx.fillRect(pos.x - s / 2, pos.y - s / 2 - bobY, s, s);

    // Neon border
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - s / 2, pos.y - s / 2 - bobY, s, s);

    // Inner circuit lines
    ctx.strokeStyle = 'rgba(0,200,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x - 4, pos.y - s/2 - bobY);
    ctx.lineTo(pos.x - 4, pos.y + 2 - bobY);
    ctx.lineTo(pos.x + 4, pos.y + 2 - bobY);
    ctx.lineTo(pos.x + 4, pos.y + s/2 - bobY);
    ctx.stroke();

    // Direction indicator (arrow)
    ctx.fillStyle = '#00ffcc';
    switch (this.facing) {
      case 'up':
        ctx.fillRect(pos.x - 3, pos.y - s / 2 - 4 - bobY, 6, 3);
        break;
      case 'down':
        ctx.fillRect(pos.x - 3, pos.y + s / 2 + 1 - bobY, 6, 3);
        break;
      case 'left':
        ctx.fillRect(pos.x - s / 2 - 4, pos.y - 3 - bobY, 3, 6);
        break;
      case 'right':
        ctx.fillRect(pos.x + s / 2 + 1, pos.y - 3 - bobY, 3, 6);
        break;
    }

    // Core light
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(pos.x - 2, pos.y - 2 - bobY, 4, 4);

    ctx.shadowBlur = 0;

    // Attack animation
    if (this.attacking) {
      this.renderAttack(ctx, pos, bobY);
    }

    // Skill activation flash
    if (this.skillAnimTimer > 0) {
      ctx.strokeStyle = `rgba(68, 255, 255, ${this.skillAnimTimer / 0.4})`;
      ctx.lineWidth = 3;
      const r = s + 8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - bobY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Buff aura
    if (this.buffDefTimer > 0) {
      ctx.strokeStyle = `rgba(68, 136, 255, 0.5)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - bobY, s + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.buffAtkTimer > 0) {
      ctx.strokeStyle = `rgba(255, 136, 255, 0.5)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - bobY, s + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dodge aura ring
    if (this.dodging) {
      const progress = this.dodgeTimer / Player.DODGE_DURATION;
      ctx.strokeStyle = `rgba(0, 240, 255, ${progress * 0.9})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - bobY, s + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  }

  renderAttack(ctx, pos, bobY) {
    const progress = 1 - this.attackTimer / 0.25;
    const swingAngle = progress * Math.PI * 0.8 - Math.PI * 0.4;

    ctx.save();
    ctx.translate(pos.x, pos.y - bobY);

    let baseAngle = 0;
    switch (this.facing) {
      case 'up':    baseAngle = -Math.PI / 2; break;
      case 'down':  baseAngle = Math.PI / 2; break;
      case 'left':  baseAngle = Math.PI; break;
      case 'right': baseAngle = 0; break;
    }

    ctx.rotate(baseAngle + swingAngle);

    // Laser blade
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(10, -1, 22, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, -0.5, 22, 1);
    // Handle
    ctx.fillStyle = '#0088aa';
    ctx.fillRect(6, -3, 5, 6);

    // Scan arc
    ctx.strokeStyle = 'rgba(0,255,200,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 30, -0.3, 0.3);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// --- エネミー ---
class Enemy {
  constructor(type, x, y, scaleFactor) {
    const data = GameData.ENEMIES[type];
    const s = scaleFactor || 1;
    this.type = type;
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.name = data.name;
    this.sprite = data.sprite;
    this.color = data.color;
    this.hp = Math.round(data.hp * s);
    this.maxHp = Math.round(data.hp * s);
    this.atk = Math.round(data.atk * s);
    this.def = Math.round(data.def * s);
    this.spd = data.spd;
    this.exp = Math.round(data.exp * s);
    this.gold = Math.round(data.gold * s);
    this.size = data.size;
    this.aggroRange = data.aggroRange;
    this.attackRange = data.attackRange;
    this.attackCooldown = data.attackCooldown;
    this.isBoss = data.isBoss || false;
    this.isDungeonBoss = data.isDungeonBoss || false;
    this.drops = data.drops || [];

    this.alive = true;
    this.cooldownTimer = 0;
    this.hitFlash = 0;
    this.deathTimer = 0;
    this.stunTimer = 0;
    this.state = 'idle'; // idle, chase, attack, returning
    this.facing = 'down';
    this.animTimer = 0;
  }

  update(dt, playerX, playerY, mapId, playerSize) {
    if (!this.alive) {
      this.deathTimer -= dt;
      return;
    }

    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt * 1000;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return false; // stunned — skip all actions
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // State machine
    if (dist < this.attackRange) {
      this.state = 'attack';
    } else if (dist < this.aggroRange) {
      this.state = 'chase';
    } else {
      const spawnDist = Math.sqrt(
        (this.x - this.spawnX) ** 2 + (this.y - this.spawnY) ** 2
      );
      this.state = spawnDist > 16 ? 'returning' : 'idle';
    }

    // Movement
    let moveX = 0, moveY = 0;
    switch (this.state) {
      case 'chase':
        moveX = dx / dist;
        moveY = dy / dist;
        break;
      case 'returning':
        const sdx = this.spawnX - this.x;
        const sdy = this.spawnY - this.y;
        const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sdist > 2) {
          moveX = sdx / sdist;
          moveY = sdy / sdist;
        }
        break;
      case 'idle':
        // Small random movement
        this.animTimer += dt;
        if (this.animTimer > 2) {
          this.animTimer = 0;
          moveX = (Math.random() - 0.5) * 0.5;
          moveY = (Math.random() - 0.5) * 0.5;
        }
        break;
    }

    if (moveX !== 0 || moveY !== 0) {
      const speed = this.spd * 60 * dt;
      const newX = this.x + moveX * speed;
      const newY = this.y + moveY * speed;
      if (MapRenderer.isWalkable(mapId, newX, this.y, this.size) &&
          !this.collidesWithPlayer(newX, this.y, playerX, playerY, playerSize)) this.x = newX;
      if (MapRenderer.isWalkable(mapId, this.x, newY, this.size) &&
          !this.collidesWithPlayer(this.x, newY, playerX, playerY, playerSize)) this.y = newY;

      if (Math.abs(moveX) > Math.abs(moveY)) {
        this.facing = moveX > 0 ? 'right' : 'left';
      } else {
        this.facing = moveY > 0 ? 'down' : 'up';
      }
    }

    return this.state === 'attack' && this.cooldownTimer <= 0;
  }

  collidesWithPlayer(x, y, playerX, playerY, playerSize) {
    const half = this.size / 2;
    const pHalf = (playerSize || 24) / 2;
    return Math.abs(x - playerX) < half + pHalf - 4 &&
           Math.abs(y - playerY) < half + pHalf - 4;
  }

  tryAttack() {
    this.cooldownTimer = this.attackCooldown;
    return this.atk;
  }

  takeDamage(amount) {
    const actual = Math.max(1, amount - this.def);
    this.hp -= actual;
    this.hitFlash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathTimer = 0.5;
    }
    return actual;
  }

  render(ctx) {
    const pos = Camera.worldToScreen(this.x, this.y);
    const s = this.size;

    if (!this.alive) {
      // Death animation
      ctx.globalAlpha = this.deathTimer / 0.5;
      ctx.fillStyle = this.color;
      const scale = 1 + (1 - this.deathTimer / 0.5) * 0.5;
      ctx.fillRect(pos.x - s * scale / 2, pos.y - s * scale / 2, s * scale, s * scale);
      ctx.globalAlpha = 1;
      return this.deathTimer > 0;
    }

    // Glitch shadow
    ctx.fillStyle = `rgba(${this.color.slice(1,3)},0,0,0.15)`;
    ctx.fillRect(pos.x - s/2 + 2, pos.y + s/2, s, 2);

    // Body - virus/malware block
    const bodyColor = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = this.isBoss ? 20 : 10;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(pos.x - s / 2, pos.y - s / 2, s, s);

    // Inner dark
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pos.x - s/2 + 3, pos.y - s/2 + 3, s - 6, s - 6);

    // Sprite text
    ctx.fillStyle = bodyColor;
    ctx.font = `bold ${Math.max(10, s - 10)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.sprite, pos.x, pos.y);

    // Border
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - s/2, pos.y - s/2, s, s);

    ctx.shadowBlur = 0;

    // HP bar (if damaged)
    if (this.hp < this.maxHp) {
      const barW = s + 8;
      const barH = 4;
      const barX = pos.x - barW / 2;
      const barY = pos.y - s / 2 - 8;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = this.isBoss ? '#ff4444' : '#44cc44';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }

    // Stun indicator
    if (this.stunTimer > 0) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★STUN★', pos.x, pos.y - s / 2 - 12);
    }

    return true;
  }
}

// --- NPC ---
class NPC {
  constructor(data) {
    this.id = data.id;
    this.x = data.x * GameData.TILE_SIZE + GameData.TILE_SIZE / 2;
    this.y = data.y * GameData.TILE_SIZE + GameData.TILE_SIZE / 2;
    this.sprite = data.sprite;
    this.name = data.name;
    this.dialogue = data.dialogue;
    this.size = 24;
  }

  isNear(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < 48;
  }

  render(ctx) {
    const pos = Camera.worldToScreen(this.x, this.y);
    const s = this.size;

    // NPC program block
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 12;

    ctx.fillStyle = '#002a1a';
    ctx.fillRect(pos.x - s/2, pos.y - s/2, s, s);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pos.x - s/2, pos.y - s/2, s, s);

    // Sprite text
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.sprite, pos.x, pos.y);

    ctx.shadowBlur = 0;

    // Name
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ffaa';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, pos.x, pos.y - s / 2 - 8);

    // Interaction indicator
    const bob = Math.sin(Date.now() / 500) * 2;
    ctx.fillStyle = 'rgba(0,255,150,0.6)';
    ctx.font = '9px monospace';
    ctx.fillText('[ENTER]', pos.x, pos.y - s / 2 - 19 + bob);
  }
}
