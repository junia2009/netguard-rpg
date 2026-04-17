// ============================================================
// dungeon.js - ランダムダンジョン生成システム
// ============================================================

const DungeonGenerator = (() => {
  const TOTAL_FLOORS = 5;
  const MIN_ROOM_SIZE = 4;
  const MAX_SPLIT_DEPTH = 4;

  // BSP Node
  class BSPNode {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.left = null;
      this.right = null;
      this.room = null;
    }

    split(depth) {
      if (depth <= 0) return;
      if (this.w < MIN_ROOM_SIZE * 2 + 3 && this.h < MIN_ROOM_SIZE * 2 + 3) return;

      let horizontal;
      if (this.w > this.h * 1.4) horizontal = false;
      else if (this.h > this.w * 1.4) horizontal = true;
      else horizontal = Math.random() < 0.5;

      const min = MIN_ROOM_SIZE + 1;
      if (horizontal) {
        if (this.h < min * 2) return;
        const split = min + Math.floor(Math.random() * (this.h - min * 2));
        this.left = new BSPNode(this.x, this.y, this.w, split);
        this.right = new BSPNode(this.x, this.y + split, this.w, this.h - split);
      } else {
        if (this.w < min * 2) return;
        const split = min + Math.floor(Math.random() * (this.w - min * 2));
        this.left = new BSPNode(this.x, this.y, split, this.h);
        this.right = new BSPNode(this.x + split, this.y, this.w - split, this.h);
      }

      this.left.split(depth - 1);
      this.right.split(depth - 1);
    }

    createRooms() {
      if (this.left && this.right) {
        this.left.createRooms();
        this.right.createRooms();
        return;
      }
      // Leaf node - create room with margin
      const margin = 1;
      const maxW = Math.max(MIN_ROOM_SIZE, this.w - margin * 2);
      const maxH = Math.max(MIN_ROOM_SIZE, this.h - margin * 2);
      const rw = MIN_ROOM_SIZE + Math.floor(Math.random() * Math.max(1, maxW - MIN_ROOM_SIZE + 1));
      const rh = MIN_ROOM_SIZE + Math.floor(Math.random() * Math.max(1, maxH - MIN_ROOM_SIZE + 1));
      const rx = this.x + margin + Math.floor(Math.random() * Math.max(1, this.w - rw - margin * 2 + 1));
      const ry = this.y + margin + Math.floor(Math.random() * Math.max(1, this.h - rh - margin * 2 + 1));
      this.room = {
        x: rx, y: ry,
        w: Math.min(rw, this.w - margin * 2),
        h: Math.min(rh, this.h - margin * 2),
      };
    }

    getRooms() {
      if (this.room) return [this.room];
      const rooms = [];
      if (this.left) rooms.push(...this.left.getRooms());
      if (this.right) rooms.push(...this.right.getRooms());
      return rooms;
    }

    getRoom() {
      if (this.room) return this.room;
      if (this.left) return this.left.getRoom();
      if (this.right) return this.right.getRoom();
      return null;
    }
  }

  function carveRoom(data, w, room, tile) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && x >= 0) data[y * w + x] = tile;
      }
    }
  }

  function carveCorridor(data, w, h, x1, y1, x2, y2, tile) {
    let cx = x1, cy = y1;
    // L-shaped corridor (random turn point)
    const turnAtX = Math.random() < 0.5;
    if (turnAtX) {
      while (cx !== x2) {
        if (cy >= 0 && cy < h && cx >= 0 && cx < w) data[cy * w + cx] = tile;
        cx += cx < x2 ? 1 : -1;
      }
      while (cy !== y2) {
        if (cy >= 0 && cy < h && cx >= 0 && cx < w) data[cy * w + cx] = tile;
        cy += cy < y2 ? 1 : -1;
      }
    } else {
      while (cy !== y2) {
        if (cy >= 0 && cy < h && cx >= 0 && cx < w) data[cy * w + cx] = tile;
        cy += cy < y2 ? 1 : -1;
      }
      while (cx !== x2) {
        if (cy >= 0 && cy < h && cx >= 0 && cx < w) data[cy * w + cx] = tile;
        cx += cx < x2 ? 1 : -1;
      }
    }
    if (cy >= 0 && cy < h && cx >= 0 && cx < w) data[cy * w + cx] = tile;
  }

  function connectNodes(data, w, h, node, tile) {
    if (!node.left || !node.right) return;
    connectNodes(data, w, h, node.left, tile);
    connectNodes(data, w, h, node.right, tile);

    const roomL = node.left.getRoom();
    const roomR = node.right.getRoom();
    if (roomL && roomR) {
      const x1 = Math.floor(roomL.x + roomL.w / 2);
      const y1 = Math.floor(roomL.y + roomL.h / 2);
      const x2 = Math.floor(roomR.x + roomR.w / 2);
      const y2 = Math.floor(roomR.y + roomR.h / 2);
      carveCorridor(data, w, h, x1, y1, x2, y2, tile);
    }
  }

  // Floor-based enemy types
  function getEnemyTypes(floor) {
    const types = [
      ['botnet_node', 'bug', 'trojan'],
      ['botnet_node', 'cryptojacker', 'trojan'],
      ['cryptojacker', 'worm', 'apt'],
      ['apt', 'ransomware', 'polymorphic'],
      ['polymorphic', 'rootkit', 'apt'],
    ];
    return types[Math.min(floor - 1, types.length - 1)];
  }

  // Floor-based chest items
  function getChestItems(floor) {
    if (floor <= 1) return ['hotfix', 'patch', 'memory_cleaner'];
    if (floor <= 2) return ['hotfix', 'overclock', 'firewall_breaker'];
    if (floor <= 3) return ['full_restore', 'overclock', 'quantum_shield'];
    return ['full_restore', 'overclock', 'rootkit_slicer', 'darknet_armor'];
  }

  function generate(floor, totalFloors) {
    totalFloors = totalFloors || TOTAL_FLOORS;
    const isBossFloor = floor >= totalFloors;

    // Boss floor: special single-room arena
    if (isBossFloor) {
      return generateBossFloor(floor);
    }

    const w = 30;
    const h = 25;

    // Use DARK(6) as dungeon floor tile
    const floorTile = 6;

    // Initialize all as WALL(1)
    const data = new Array(w * h).fill(1);

    // BSP generation
    const root = new BSPNode(1, 1, w - 2, h - 2);
    root.split(MAX_SPLIT_DEPTH);
    root.createRooms();

    const rooms = root.getRooms();

    // Ensure at least 3 rooms
    if (rooms.length < 2) {
      // Fallback: create two basic rooms
      rooms.length = 0;
      rooms.push({ x: 2, y: 2, w: 8, h: 6 });
      rooms.push({ x: 18, y: 16, w: 8, h: 6 });
    }

    // Carve rooms
    rooms.forEach(room => carveRoom(data, w, room, floorTile));

    // Connect rooms via BSP tree
    connectNodes(data, w, h, root, floorTile);

    // Extra: ensure all rooms are connected by chaining them
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      const ax = Math.floor(a.x + a.w / 2);
      const ay = Math.floor(a.y + a.h / 2);
      const bx = Math.floor(b.x + b.w / 2);
      const by = Math.floor(b.y + b.h / 2);
      carveCorridor(data, w, h, ax, ay, bx, by, floorTile);
    }

    // Pick entrance room (first room) and exit room (farthest room from entrance)
    const entranceRoom = rooms[0];
    const entranceCX = Math.floor(entranceRoom.x + entranceRoom.w / 2);
    const entranceCY = Math.floor(entranceRoom.y + entranceRoom.h / 2);

    // Find farthest room from entrance for exit
    let maxDist = 0;
    let exitRoomIdx = rooms.length - 1;
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i];
      const cx = Math.floor(r.x + r.w / 2);
      const cy = Math.floor(r.y + r.h / 2);
      const dist = Math.abs(cx - entranceCX) + Math.abs(cy - entranceCY);
      if (dist > maxDist) {
        maxDist = dist;
        exitRoomIdx = i;
      }
    }
    const exitRoom = rooms[exitRoomIdx];
    const exitCX = Math.floor(exitRoom.x + exitRoom.w / 2);
    const exitCY = Math.floor(exitRoom.y + exitRoom.h / 2);

    // Portals
    const portals = [];

    // Floor 1: entrance portal returns to town (offset from spawn so player doesn't land on it)
    if (floor === 1) {
      // Place stairs at corner of entrance room, away from center spawn
      const stairsX = entranceRoom.x;
      const stairsY = entranceRoom.y;
      portals.push({
        x: stairsX, y: stairsY,
        target: 'town', spawnX: 12, spawnY: 1,
        isStairsUp: true,
      });
    }

    // Non-boss floors: stairs down to next floor
    portals.push({
      x: exitCX, y: exitCY,
      target: `rdungeon_f${floor + 1}`,
      spawnX: 0, spawnY: 0, // overridden by game.js
      isStairsDown: true,
    });

    // Enemies
    const enemies = [];
    const enemyTypes = getEnemyTypes(floor);
    const enemyCount = 4 + floor * 2;

    // Place enemies in rooms (skip entrance room)
    const enemyRooms = rooms.filter((r, i) => i !== 0);
    for (let i = 0; i < enemyCount; i++) {
      if (enemyRooms.length === 0) break;
      const room = enemyRooms[i % enemyRooms.length];
      const ex = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
      const ey = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push({ type, x: ex, y: ey });
    }

    // Chests
    const chests = [];
    const chestRooms = rooms.filter((r, i) => i !== 0 && i !== exitRoomIdx);
    const chestCount = 1 + Math.floor(Math.random() * 2);
    const chestItems = getChestItems(floor);
    for (let i = 0; i < chestCount && chestRooms.length > 0; i++) {
      const room = chestRooms[Math.floor(Math.random() * chestRooms.length)];
      chests.push({
        x: room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2)),
        y: room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2)),
        item: chestItems[Math.floor(Math.random() * chestItems.length)],
        opened: false,
      });
    }

    const mapId = `rdungeon_f${floor}`;

    return {
      id: mapId,
      map: {
        name: `異常セクター B${floor}F`,
        width: w,
        height: h,
        tileData: data,
        playerStart: { x: entranceCX, y: entranceCY },
        portals,
        npcs: [],
        enemies,
        chests,
        bgColor: '#0d0014',
      },
      entranceX: entranceCX,
      entranceY: entranceCY,
      exitX: exitCX,
      exitY: exitCY,
      isBossFloor: false,
    };
  }

  // --- Boss floor: single arena room ---
  function generateBossFloor(floor) {
    const w = 15;
    const h = 15;
    const floorTile = 5; // STONE for boss arena

    const data = new Array(w * h).fill(1);

    // Carve arena (leave 1-tile wall border)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        data[y * w + x] = floorTile;
      }
    }

    // Corner lava pillars for atmosphere
    const lavaPositions = [
      { x: 3, y: 3 }, { x: w - 4, y: 3 },
      { x: 3, y: h - 4 }, { x: w - 4, y: h - 4 },
    ];
    lavaPositions.forEach(p => { data[p.y * w + p.x] = 7; }); // LAVA

    // Player spawns at bottom center
    const spawnX = Math.floor(w / 2);
    const spawnY = h - 3;

    // Boss at top center
    const bossX = Math.floor(w / 2);
    const bossY = 3;

    const mapId = `rdungeon_f${floor}`;

    return {
      id: mapId,
      map: {
        name: `異常セクター B${floor}F - コア`,
        width: w,
        height: h,
        tileData: data,
        playerStart: { x: spawnX, y: spawnY },
        portals: [],
        npcs: [],
        enemies: [
          { type: 'dark_ai', x: bossX, y: bossY },
        ],
        chests: [],
        bgColor: '#100005',
      },
      entranceX: spawnX,
      entranceY: spawnY,
      exitX: bossX,
      exitY: bossY,
      isBossFloor: true,
    };
  }

  // Clean up generated dungeon maps from GameData.MAPS
  function cleanup() {
    for (const key of Object.keys(GameData.MAPS)) {
      if (key.startsWith('rdungeon_')) {
        delete GameData.MAPS[key];
      }
    }
  }

  return {
    TOTAL_FLOORS,
    generate,
    cleanup,
  };
})();
