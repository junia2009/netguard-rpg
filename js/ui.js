// ============================================================
// ui.js - UI システム (HUD, ダイアログ, インベントリ, ショップ)
// ============================================================

const UI = {
  game: null,
  dialogueActive: false,
  dialogueQueue: [],
  dialogueIndex: 0,
  currentChoices: null,
  selectedChoice: 0,
  inventoryOpen: false,
  shopOpen: false,
  currentTab: 'items',

  init(game) {
    this.game = game;
    this.setupEventListeners();
  },

  setupEventListeners() {
    document.getElementById('close-inventory').addEventListener('click', () => this.closeInventory());
    document.getElementById('close-shop').addEventListener('click', () => this.closeShop());

    // Dialogue touch to advance
    document.getElementById('dialogue-box').addEventListener('click', () => {
      if (this.dialogueActive) {
        this.advanceDialogue();
      }
    });

    // インベントリタブ
    document.querySelectorAll('#inventory-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#inventory-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.renderInventoryContent();
      });
    });
  },

  // --- HUD 更新 ---
  updateHUD(player) {
    const hpPct = (player.hp / player.maxHp * 100).toFixed(0);
    const mpPct = (player.mp / player.maxMp * 100).toFixed(0);
    const expPct = (player.exp / player.nextExp * 100).toFixed(0);

    document.getElementById('hp-fill').style.width = hpPct + '%';
    document.getElementById('mp-fill').style.width = mpPct + '%';
    document.getElementById('exp-fill').style.width = expPct + '%';
    document.getElementById('hp-text').textContent = `${player.hp}/${player.maxHp}`;
    document.getElementById('mp-text').textContent = `${player.mp}/${player.maxMp}`;
    document.getElementById('exp-text').textContent = `${player.exp}/${player.nextExp}`;
    document.getElementById('hud-level').textContent = `Lv.${player.level}`;
    document.getElementById('hud-gold').textContent = `◆ ${player.gold}G`;

    const mapName = GameData.MAPS[this.game.currentMap]?.name || '';
    document.getElementById('hud-map').textContent = `⬡ ${mapName}`;

    // Skill HUD
    const skillEl = document.getElementById('hud-skill');
    const skill = player.currentSkill;
    if (skill) {
      const cdLeft = Math.max(0, player.skillCooldown);
      const ready = cdLeft <= 0 && player.mp >= skill.mp;
      skillEl.innerHTML = `<span class="skill-name${ready ? ' skill-ready' : ''}">[Z] ${skill.name}</span> <span class="skill-mp">MP${skill.mp}</span>` +
        (cdLeft > 0 ? ` <span class="skill-cd">${cdLeft.toFixed(1)}s</span>` : '');
      skillEl.classList.remove('hidden');
    } else {
      skillEl.classList.add('hidden');
    }

    // Buff indicators
    const buffEl = document.getElementById('hud-buffs');
    const buffs = [];
    if (player.buffDefTimer > 0) buffs.push(`🛡Firewall ${player.buffDefTimer.toFixed(1)}s`);
    if (player.buffAtkTimer > 0) buffs.push(`⚔ATK↑ ${player.buffAtkTimer.toFixed(1)}s`);
    buffEl.textContent = buffs.join('  ');
    buffEl.classList.toggle('hidden', buffs.length === 0);
  },

  // --- ボスHPバー ---
  updateBossHP(enemy) {
    const bar = document.getElementById('boss-hp-bar');
    if (!enemy || !enemy.alive) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    document.getElementById('boss-name').textContent = enemy.name;
    document.getElementById('boss-hp-fill').style.width =
      (enemy.hp / enemy.maxHp * 100) + '%';
  },

  // --- ダイアログ ---
  startDialogue(dialogueId, callback) {
    const dialogue = GameData.DIALOGUES[dialogueId];
    if (!dialogue) return;

    this.dialogueActive = true;
    this.dialogueQueue = dialogue;
    this.dialogueIndex = 0;
    this.dialogueCallback = callback;
    this.currentChoices = null;
    this.showCurrentDialogue();
    document.getElementById('dialogue-box').classList.remove('hidden');
  },

  showCurrentDialogue() {
    const entry = this.dialogueQueue[this.dialogueIndex];
    if (!entry) {
      this.closeDialogue();
      return;
    }

    document.getElementById('dialogue-name').textContent = entry.name || '';
    document.getElementById('dialogue-text').textContent = entry.text;

    const choicesEl = document.getElementById('dialogue-choices');
    const nextEl = document.getElementById('dialogue-next');
    choicesEl.innerHTML = '';

    if (entry.choices) {
      this.currentChoices = entry.choices;
      this.selectedChoice = 0;
      nextEl.classList.add('hidden');
      entry.choices.forEach((choice, i) => {
        const btn = document.createElement('div');
        btn.className = 'dialogue-choice' + (i === 0 ? ' selected' : '');
        btn.textContent = choice.text;
        btn.addEventListener('click', () => this.selectChoice(i));
        choicesEl.appendChild(btn);
      });
    } else {
      this.currentChoices = null;
      nextEl.classList.remove('hidden');
    }
  },

  selectChoice(index) {
    if (!this.currentChoices) return;
    const choice = this.currentChoices[index];
    this.closeDialogue();

    if (choice.action === 'heal') {
      this.game.healPlayer();
    } else if (choice.action === 'open_shop') {
      this.openShop();
    }
    // 'close' does nothing extra
  },

  advanceDialogue() {
    if (!this.dialogueActive) return;

    if (this.currentChoices) {
      // Navigate choices with Enter
      this.selectChoice(this.selectedChoice);
      return;
    }

    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueQueue.length) {
      this.closeDialogue();
    } else {
      this.showCurrentDialogue();
    }
  },

  handleDialogueInput() {
    if (!this.dialogueActive || !this.currentChoices) return;

    if (Input.isJustPressed('ArrowUp') || Input.isJustPressed('KeyW') || Input._touchDirJust?.up) {
      this.selectedChoice = Math.max(0, this.selectedChoice - 1);
      this.updateChoiceHighlight();
    }
    if (Input.isJustPressed('ArrowDown') || Input.isJustPressed('KeyS') || Input._touchDirJust?.down) {
      this.selectedChoice = Math.min(this.currentChoices.length - 1, this.selectedChoice + 1);
      this.updateChoiceHighlight();
    }
  },

  updateChoiceHighlight() {
    const choices = document.querySelectorAll('.dialogue-choice');
    choices.forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedChoice);
    });
  },

  closeDialogue() {
    this.dialogueActive = false;
    this.currentChoices = null;
    document.getElementById('dialogue-box').classList.add('hidden');
    if (this.dialogueCallback) {
      this.dialogueCallback();
      this.dialogueCallback = null;
    }
  },

  showDialogueText(name, text, callback) {
    this.dialogueActive = true;
    this.dialogueQueue = [{ name, text }];
    this.dialogueIndex = 0;
    this.dialogueCallback = callback;
    this.currentChoices = null;
    this.showCurrentDialogue();
    document.getElementById('dialogue-box').classList.remove('hidden');
  },

  // --- インベントリ ---
  toggleInventory() {
    if (this.shopOpen) return;
    if (this.inventoryOpen) {
      this.closeInventory();
    } else {
      this.openInventory();
    }
  },

  openInventory() {
    this.inventoryOpen = true;
    this.renderInventoryContent();
    document.getElementById('inventory-screen').classList.remove('hidden');
  },

  closeInventory() {
    this.inventoryOpen = false;
    document.getElementById('inventory-screen').classList.add('hidden');
  },

  renderInventoryContent() {
    const content = document.getElementById('inventory-content');
    const player = this.game.player;

    switch (this.currentTab) {
      case 'items':
        this.renderItemsList(content, player);
        break;
      case 'equip':
        this.renderEquipment(content, player);
        break;
      case 'status':
        this.renderStatus(content, player);
        break;
    }
  },

  renderItemsList(content, player) {
    let html = '';
    const items = Object.entries(player.inventory);
    if (items.length === 0) {
      html = '<p style="color:#888;text-align:center;padding:20px;">アイテムがありません</p>';
    } else {
      // Sort: weapon > armor > consumable, then by power descending
      const typeOrder = { weapon: 0, armor: 1, consumable: 2 };
      const getSortValue = (itemId) => {
        const item = GameData.ITEMS[itemId];
        if (!item) return 99;
        if (item.stats && item.stats.atk) return -item.stats.atk;
        if (item.stats && item.stats.def) return -item.stats.def;
        if (item.effect && item.effect.hp) return -item.effect.hp;
        return 0;
      };
      items.sort((a, b) => {
        const itemA = GameData.ITEMS[a[0]], itemB = GameData.ITEMS[b[0]];
        const tA = (itemA ? typeOrder[itemA.type] : 3) || 3;
        const tB = (itemB ? typeOrder[itemB.type] : 3) || 3;
        if (tA !== tB) return tA - tB;
        return getSortValue(a[0]) - getSortValue(b[0]);
      });

      let lastType = '';
      items.forEach(([itemId, count]) => {
        const item = GameData.ITEMS[itemId];
        if (!item) return;
        // Category header
        const typeLabel = item.type === 'weapon' ? '⚔ 武器' : item.type === 'armor' ? '🛡 防具' : '💊 回復';
        if (item.type !== lastType) {
          html += `<div class="item-category">${typeLabel}</div>`;
          lastType = item.type;
        }
        const canUse = item.type === 'consumable';
        const canEquip = item.type === 'weapon' || item.type === 'armor';
        const isEquipped = (item.type === 'weapon' && player.weapon === itemId) || (item.type === 'armor' && player.armor === itemId);
        html += `<div class="item-row${isEquipped ? ' equipped' : ''}">
          <span class="item-name">${item.icon} ${item.name} <span class="item-count">x${count}</span>${isEquipped ? ' <span class="equip-badge">E</span>' : ''}</span>
          <span style="color:#888;font-size:11px;">${item.desc}</span>
          ${canUse ? `<button class="item-btn" onclick="UI.useItemFromInventory('${itemId}')">使う</button>` : ''}
          ${canEquip && !isEquipped ? `<button class="item-btn" onclick="UI.equipItem('${itemId}')">装備</button>` : ''}
        </div>`;
      });
    }
    content.innerHTML = html;
  },

  renderEquipment(content, player) {
    const weapon = player.weapon ? GameData.ITEMS[player.weapon] : null;
    const armor = player.armor ? GameData.ITEMS[player.armor] : null;
    const skill = weapon?.skill;

    content.innerHTML = `
      <div class="equip-slot">
        <span class="equip-slot-name">武器</span>
        <span class="equip-item-name">${weapon ? weapon.icon + ' ' + weapon.name : '--- なし ---'}</span>
        ${weapon ? `<span style="color:#aaa;font-size:12px;">${weapon.desc}</span>` : ''}
      </div>
      ${skill ? `<div class="equip-slot skill-info">
        <span class="equip-slot-name">スキル [Z]</span>
        <span class="equip-item-name" style="color:#44ffff;">${skill.name}</span>
        <span style="color:#aaa;font-size:12px;">${skill.desc} (MP${skill.mp})</span>
      </div>` : ''}
      <div class="equip-slot">
        <span class="equip-slot-name">防具</span>
        <span class="equip-item-name">${armor ? armor.icon + ' ' + armor.name : '--- なし ---'}</span>
        ${armor ? `<span style="color:#aaa;font-size:12px;">${armor.desc}</span>` : ''}
      </div>
    `;
  },

  renderStatus(content, player) {
    content.innerHTML = `
      <div class="stat-row"><span class="stat-label">レベル</span><span class="stat-value">${player.level}</span></div>
      <div class="stat-row"><span class="stat-label">HP</span><span class="stat-value">${player.hp} / ${player.maxHp}</span></div>
      <div class="stat-row"><span class="stat-label">MP</span><span class="stat-value">${player.mp} / ${player.maxMp}</span></div>
      <div class="stat-row"><span class="stat-label">攻撃力</span><span class="stat-value">${player.atk}</span></div>
      <div class="stat-row"><span class="stat-label">防御力</span><span class="stat-value">${player.def}</span></div>
      <div class="stat-row"><span class="stat-label">素早さ</span><span class="stat-value">${player.spd}</span></div>
      <div class="stat-row"><span class="stat-label">経験値</span><span class="stat-value">${player.exp} / ${player.nextExp}</span></div>
      <div class="stat-row"><span class="stat-label">所持金</span><span class="stat-value">${player.gold}G</span></div>
      <div class="stat-row"><span class="stat-label">武器</span><span class="stat-value">${player.weapon ? GameData.ITEMS[player.weapon].name : 'なし'}</span></div>
      <div class="stat-row"><span class="stat-label">防具</span><span class="stat-value">${player.armor ? GameData.ITEMS[player.armor].name : 'なし'}</span></div>
    `;
  },

  useItemFromInventory(itemId) {
    const player = this.game.player;
    if (player.useConsumable(itemId)) {
      const item = GameData.ITEMS[itemId];
      this.showFloatingText(player.x, player.y - 30, `${item.name}を使った！`, '#44ff44');
      if (item.effect.hp) {
        Combat.showDamage(player.x, player.y, item.effect.hp, 'heal');
      }
      this.renderInventoryContent();
      this.updateHUD(player);
    }
  },

  equipItem(itemId) {
    const player = this.game.player;
    const item = GameData.ITEMS[itemId];
    if (!item) return;

    if (item.type === 'weapon') {
      // Put old weapon back in inventory
      if (player.weapon && player.weapon !== itemId) {
        player.addItem(player.weapon);
      }
      player.removeItem(itemId);
      player.weapon = itemId;
    } else if (item.type === 'armor') {
      if (player.armor && player.armor !== itemId) {
        player.addItem(player.armor);
      }
      player.removeItem(itemId);
      player.armor = itemId;
    }

    this.renderInventoryContent();
    this.updateHUD(player);
  },

  // --- ショップ ---
  openShop() {
    this.shopOpen = true;
    const player = this.game.player;
    document.getElementById('shop-gold').textContent = `所持金: ${player.gold}G`;

    let html = '';
    GameData.SHOP_ITEMS.forEach(itemId => {
      const item = GameData.ITEMS[itemId];
      const canBuy = player.gold >= item.buyPrice;
      html += `<div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">${item.icon} ${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
        </div>
        <span class="shop-item-price">${item.buyPrice}G</span>
        <button class="shop-buy-btn" ${canBuy ? '' : 'disabled'}
                onclick="UI.buyItem('${itemId}')">買う</button>
      </div>`;
    });

    document.getElementById('shop-content').innerHTML = html;
    document.getElementById('shop-screen').classList.remove('hidden');
  },

  closeShop() {
    this.shopOpen = false;
    document.getElementById('shop-screen').classList.add('hidden');
  },

  buyItem(itemId) {
    const player = this.game.player;
    const item = GameData.ITEMS[itemId];
    if (player.gold < item.buyPrice) return;

    player.gold -= item.buyPrice;
    player.addItem(itemId);
    this.showFloatingText(400, 300, `${item.name}を購入！`, '#44ff44');

    // Refresh shop
    this.openShop();
  },

  // --- レベルアップ表示 ---
  showLevelUp() {
    const el = document.getElementById('levelup-notification');
    el.classList.remove('hidden');
    // Reset animation
    const span = el.querySelector('span');
    span.style.animation = 'none';
    void span.offsetWidth;
    span.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 2000);
  },

  // --- フローティングテキスト ---
  showFloatingText(worldX, worldY, text, color) {
    const pos = Camera.worldToScreen(worldX, worldY);
    const el = document.createElement('div');
    el.className = 'damage-num';
    el.style.color = color;
    el.style.fontSize = '13px';
    el.textContent = text;
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    document.getElementById('damage-numbers').appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },

  // --- ゲームオーバー ---
  showGameOver() {
    document.getElementById('gameover-screen').classList.remove('hidden');
  },

  hideGameOver() {
    document.getElementById('gameover-screen').classList.add('hidden');
  },

  // --- 全UI非表示チェック ---
  get isOverlayOpen() {
    return this.dialogueActive || this.inventoryOpen || this.shopOpen;
  },
};
