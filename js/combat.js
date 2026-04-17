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
};
