// ============================================================
// combat.js - 戦闘システム
// ============================================================

const Combat = {
  game: null,

  init(game) {
    this.game = game;
  },

  // プレイヤーの攻撃処理
  playerAttack(player, enemies) {
    if (!player.startAttack()) return;

    const hitbox = player.getAttackHitbox();
    Particles.spawn(
      hitbox.x + hitbox.w / 2,
      hitbox.y + hitbox.h / 2,
      '#ffffaa', 5, 80, 0.3
    );

    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      if (this.hitboxOverlap(hitbox, enemy)) {
        const damage = enemy.takeDamage(player.atk);
        this.showDamage(enemy.x, enemy.y, damage, 'enemy-damage');
        Particles.spawn(enemy.x, enemy.y, '#ff8844', 8, 100, 0.4);

        // Knockback
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const kb = 12;
        const newX = enemy.x + (dx / dist) * kb;
        const newY = enemy.y + (dy / dist) * kb;
        if (MapRenderer.isWalkable(this.game.currentMap, newX, enemy.y, enemy.size)) {
          enemy.x = newX;
        }
        if (MapRenderer.isWalkable(this.game.currentMap, enemy.x, newY, enemy.size)) {
          enemy.y = newY;
        }

        // Check death
        if (!enemy.alive) {
          this.onEnemyDeath(player, enemy);
        }
      }
    });
  },

  // 敵の攻撃処理
  enemyAttack(enemy, player) {
    const atk = enemy.tryAttack();
    const damage = player.takeDamage(atk);
    if (damage > 0) {
      this.showDamage(player.x, player.y, damage, 'player-damage');
      Particles.spawn(player.x, player.y, '#ff4444', 6, 80, 0.3);

      // Player knockback
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const kb = 16;
      const newX = player.x + (dx / dist) * kb;
      const newY = player.y + (dy / dist) * kb;
      if (MapRenderer.isWalkable(this.game.currentMap, newX, player.y, player.size)) {
        player.x = newX;
      }
      if (MapRenderer.isWalkable(this.game.currentMap, player.x, newY, player.size)) {
        player.y = newY;
      }
    }
  },

  // 敵撃破処理
  onEnemyDeath(player, enemy) {
    // EXP
    const leveled = player.gainExp(enemy.exp);
    if (leveled) {
      UI.showLevelUp();
    }

    // Gold
    player.gold += enemy.gold;

    // Drops
    enemy.drops.forEach(drop => {
      if (Math.random() < drop.chance) {
        player.addItem(drop.item);
        const itemName = GameData.ITEMS[drop.item].name;
        UI.showFloatingText(enemy.x, enemy.y - 20, `${itemName}を手に入れた！`, '#44ff44');
      }
    });

    // Death particles
    Particles.spawn(enemy.x, enemy.y, enemy.color, 20, 120, 0.6);
    Particles.spawn(enemy.x, enemy.y, '#ffff44', 10, 80, 0.4);

    // Boss defeated
    if (enemy.isBoss) {
      if (enemy.isDungeonBoss) {
        this.game.onDungeonBossDefeated();
      } else {
        player.bossDefeated = true;
        this.game.onBossDefeated();
      }
    }
  },

  // 当たり判定
  hitboxOverlap(hitbox, entity) {
    const half = entity.size / 2;
    return !(
      hitbox.x + hitbox.w < entity.x - half ||
      hitbox.x > entity.x + half ||
      hitbox.y + hitbox.h < entity.y - half ||
      hitbox.y > entity.y + half
    );
  },

  // ダメージ数字表示
  showDamage(worldX, worldY, amount, className) {
    const pos = Camera.worldToScreen(worldX, worldY - 20);
    const el = document.createElement('div');
    el.className = `damage-num ${className}`;
    el.textContent = amount;
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    document.getElementById('damage-numbers').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  },

  // スキル発動処理
  playerSkill(player, enemies) {
    if (!player.startSkill()) return false;
    const skill = player.currentSkill;

    switch (skill.type) {
      case 'attack':   // PortScan, ForceTerminate — 前方単体
        this.skillAttackSingle(player, enemies, skill);
        break;
      case 'pierce':   // Quarantine — DEF無視単体
        this.skillPierceSingle(player, enemies, skill);
        break;
      case 'aoe':      // FullScan — 周囲全体
        this.skillAoe(player, enemies, skill);
        break;
      case 'stun':     // Sandbox — 前方単体スタン
        this.skillStun(player, enemies, skill);
        break;
      case 'buff_def': // Firewall — 被ダメ半減
        player.buffDefTimer = skill.duration;
        Particles.spawn(player.x, player.y, '#4488ff', 15, 100, 0.5);
        UI.showFloatingText(player.x, player.y - 20, `${skill.name}!`, '#4488ff');
        break;
      case 'heal':     // Defrag — HP回復
        const healAmt = Math.floor(player.maxHp * skill.power);
        player.heal(healAmt, 0);
        Particles.spawn(player.x, player.y, '#44ff88', 15, 100, 0.5);
        UI.showFloatingText(player.x, player.y - 20, `HP+${healAmt}`, '#44ff88');
        break;
      case 'heal_buff': // Rollback — HP回復+ATKバフ
        const hbAmt = Math.floor(player.maxHp * skill.power);
        player.heal(hbAmt, 0);
        player.buffAtkTimer = skill.duration;
        Particles.spawn(player.x, player.y, '#ff88ff', 15, 120, 0.6);
        UI.showFloatingText(player.x, player.y - 20, `HP+${hbAmt} ATK↑`, '#ff88ff');
        break;
    }
    return true;
  },

  // 前方単体スキル攻撃
  skillAttackSingle(player, enemies, skill) {
    const hitbox = this.getSkillHitbox(player);
    Particles.spawn(hitbox.x + hitbox.w/2, hitbox.y + hitbox.h/2, '#44ffff', 10, 100, 0.4);
    let hit = false;
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      if (this.hitboxOverlap(hitbox, enemy)) {
        const dmg = Math.floor(player.atk * skill.power);
        const damage = enemy.takeDamage(dmg);
        this.showDamage(enemy.x, enemy.y, damage, 'skill-damage');
        Particles.spawn(enemy.x, enemy.y, '#44ffff', 12, 120, 0.5);
        this.knockbackEnemy(player, enemy);
        if (!enemy.alive) this.onEnemyDeath(player, enemy);
        hit = true;
      }
    });
    if (!hit) UI.showFloatingText(player.x, player.y - 20, `${skill.name}!`, '#44ffff');
  },

  // DEF無視単体
  skillPierceSingle(player, enemies, skill) {
    const hitbox = this.getSkillHitbox(player);
    Particles.spawn(hitbox.x + hitbox.w/2, hitbox.y + hitbox.h/2, '#ff44ff', 10, 100, 0.4);
    let hit = false;
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      if (this.hitboxOverlap(hitbox, enemy)) {
        const dmg = Math.floor(player.atk * skill.power);
        const damage = Math.max(1, dmg); // DEF無視
        enemy.hp = Math.max(0, enemy.hp - damage);
        if (enemy.hp <= 0) enemy.alive = false;
        this.showDamage(enemy.x, enemy.y, damage, 'skill-damage');
        Particles.spawn(enemy.x, enemy.y, '#ff44ff', 12, 120, 0.5);
        this.knockbackEnemy(player, enemy);
        if (!enemy.alive) this.onEnemyDeath(player, enemy);
        hit = true;
      }
    });
    if (!hit) UI.showFloatingText(player.x, player.y - 20, `${skill.name}!`, '#ff44ff');
  },

  // 周囲全体攻撃
  skillAoe(player, enemies, skill) {
    const range = 80;
    Particles.spawn(player.x, player.y, '#ffff44', 20, 140, 0.6);
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      if (Math.sqrt(dx*dx + dy*dy) <= range) {
        const dmg = Math.floor(player.atk * skill.power);
        const damage = enemy.takeDamage(dmg);
        this.showDamage(enemy.x, enemy.y, damage, 'skill-damage');
        Particles.spawn(enemy.x, enemy.y, '#ffff44', 8, 100, 0.4);
        this.knockbackEnemy(player, enemy);
        if (!enemy.alive) this.onEnemyDeath(player, enemy);
      }
    });
    UI.showFloatingText(player.x, player.y - 20, `${skill.name}!`, '#ffff44');
  },

  // 前方単体スタン
  skillStun(player, enemies, skill) {
    const hitbox = this.getSkillHitbox(player);
    Particles.spawn(hitbox.x + hitbox.w/2, hitbox.y + hitbox.h/2, '#ff8844', 10, 100, 0.4);
    let hit = false;
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      if (this.hitboxOverlap(hitbox, enemy)) {
        enemy.stunTimer = skill.duration;
        this.showDamage(enemy.x, enemy.y, 'STUN', 'skill-damage');
        Particles.spawn(enemy.x, enemy.y, '#ff8844', 12, 120, 0.5);
        hit = true;
      }
    });
    if (!hit) UI.showFloatingText(player.x, player.y - 20, `${skill.name}!`, '#ff8844');
  },

  // スキル用当たり判定（通常攻撃より広い）
  getSkillHitbox(player) {
    const range = 40;
    const w = 36, h = 36;
    switch (player.facing) {
      case 'up':    return { x: player.x - w/2, y: player.y - range - h/2, w, h };
      case 'down':  return { x: player.x - w/2, y: player.y + range - h/2, w, h };
      case 'left':  return { x: player.x - range - w/2, y: player.y - h/2, w, h };
      case 'right': return { x: player.x + range - w/2, y: player.y - h/2, w, h };
    }
  },

  // 共通ノックバック処理
  knockbackEnemy(player, enemy) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const kb = 16;
    const newX = enemy.x + (dx / dist) * kb;
    const newY = enemy.y + (dy / dist) * kb;
    if (MapRenderer.isWalkable(this.game.currentMap, newX, enemy.y, enemy.size)) {
      enemy.x = newX;
    }
    if (MapRenderer.isWalkable(this.game.currentMap, enemy.x, newY, enemy.size)) {
      enemy.y = newY;
    }
  },
};
