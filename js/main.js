/**
 * main.js — 游戏主入口
 * 职责：初始化、主循环、武器系统、升级系统、UI 控制
 * 各系统通过 EntityManager 解耦通信
 */

import { Player } from './Player.js';
import { Enemy, ENEMY_TYPES } from './Enemy.js';
import { Projectile } from './Projectile.js';
import { DamageZone } from './DamageZone.js';
import { XpGem } from './XpGem.js';
import { Camera } from './Camera.js';
import { InputManager, input } from './InputManager.js';
import { EntityManager } from './EntityManager.js';
import { Spawner } from './Spawner.js';
import { WORLD } from './World.js';

// ============ 全局状态 ============
const canvas = document.getElementById('game-canvas');
const gameStage = document.getElementById('game-stage');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  const worldW = WORLD.halfW * 2;
  const worldH = WORLD.halfH * 2;
  const pad = 32;
  const scale = Math.min(
    (window.innerWidth - pad) / worldW,
    (window.innerHeight - pad) / worldH
  );
  const w = Math.max(320, Math.floor(worldW * scale));
  const h = Math.max(240, Math.floor(worldH * scale));
  if (gameStage) {
    gameStage.style.width = w + 'px';
    gameStage.style.height = h + 'px';
  }
  W = canvas.width = w;
  H = canvas.height = h;
  if (camera) camera.resize(W, H);
}
window.addEventListener('resize', resize);
resize();

// ============ 武器定义 ============
const WEAPONS = [
  {
    id: 'wand', name: '魔法杖', icon: '🪄',
    desc: '发射追踪魔法弹', maxLv: 5,
    getCooldown(lv) { return [1.2, 1.0, 0.8, 0.6, 0.5][lv - 1]; },
    getDamage(lv) { return [8, 10, 14, 18, 24][lv - 1]; },
    getCount(lv) { return [1, 1, 1, 2, 2][lv - 1]; },
    fire(player, enemies, entityManager, level) {
      let closest = null, minDist = Infinity;
      enemies.forEach(e => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist) { minDist = d; closest = e; }
      });
      if (!closest) return;
      const angle = Math.atan2(closest.y - player.y, closest.x - player.x);
      const count = this.getCount(level);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 0.3;
        entityManager.add(new Projectile(player.x, player.y, {
          dx: Math.cos(angle + offset), dy: Math.sin(angle + offset),
          damage: Math.floor(this.getDamage(level) * (player.damageMultiplier || 1)),
          speed: 260, lifetime: 2, color: '#b388ff', type: 'magic', w: 12, h: 12,
          piercing: 1,
        }));
      }
    }
  },
  {
    id: 'axe', name: '飞斧', icon: '🪓',
    desc: '向四周投掷回旋斧', maxLv: 5,
    getCooldown(lv) { return [1.5, 1.3, 1.1, 0.9, 0.7][lv - 1]; },
    getDamage(lv) { return [12, 16, 20, 28, 36][lv - 1]; },
    getCount(lv) { return [1, 2, 3, 4, 6][lv - 1]; },
    _phase: 0,
    fire(player, enemies, entityManager, level) {
      const count = this.getCount(level);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + this._phase;
        entityManager.add(new Projectile(player.x, player.y, {
          dx: Math.cos(angle), dy: Math.sin(angle),
          damage: Math.floor(this.getDamage(level) * (player.damageMultiplier || 1)),
          speed: 200, lifetime: 1.5, color: '#ff6d00', type: 'bullet', w: 10, h: 10,
          piercing: 2,
        }));
      }
    },
    update(dt) { this._phase += dt * 2; }
  },
  {
    id: 'shield', name: '圣盾', icon: '🛡️',
    desc: '围绕自身旋转护盾', maxLv: 5,
    getDamage(lv) { return [3, 5, 8, 12, 18][lv - 1]; },
    getRadius(lv) { return [60, 75, 90, 110, 130][lv - 1]; },
    isContinuous: true,
  },
  {
    id: 'whip', name: '闪电鞭', icon: '⚡',
    desc: '向最近敌人释放闪电链', maxLv: 5,
    getCooldown(lv) { return [2.0, 1.7, 1.4, 1.1, 0.8][lv - 1]; },
    getDamage(lv) { return [15, 20, 28, 38, 50][lv - 1]; },
    getRange(lv) { return [150, 180, 220, 260, 300][lv - 1]; },
    getChainCount(lv) { return [1, 2, 2, 3, 4][lv - 1]; },
    fire(player, enemies, entityManager, level) {
      let closest = null, minDist = Infinity;
      const range = this.getRange(level);
      enemies.forEach(e => {
        if (e.dead) return;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist && d < range) { minDist = d; closest = e; }
      });
      if (!closest) return;
      this._lightningChain(player, closest, enemies, entityManager, level, this.getChainCount(level), new Set());
    },
    _lightningChain(player, target, enemies, entityManager, level, remain, hitSet) {
      if (remain <= 0 || hitSet.has(target)) return;
      hitSet.add(target);
      const dmg = Math.floor(this.getDamage(level) * (player.damageMultiplier || 1));
      target.takeDamage(dmg);
      if (target.dead) {
        Spawner.onEnemyDeath(target, entityManager);
        player.kills++;
      }
      // 视觉效果：在目标和玩家之间画闪电
      this._spawnLightningEffect(player, target, entityManager);
      // 连锁到附近敌人
      if (remain > 1) {
        let nextClosest = null, nextDist = 150;
        enemies.forEach(e => {
          if (hitSet.has(e) || e.dead) return;
          const d = Math.hypot(e.x - target.x, e.y - target.y);
          if (d < nextDist) { nextDist = d; nextClosest = e; }
        });
        if (nextClosest) {
          setTimeout(() => {
            this._lightningChain(player, nextClosest, enemies, entityManager, level, remain - 1, hitSet);
          }, 120);
        }
      }
    },
    _spawnLightningEffect(player, target, entityManager) {
      spawnDamageNumber(target.x, target.y - 20, Math.floor(15 * (player.damageMultiplier || 1)));
    }
  },
  {
    id: 'fire', name: '烈焰之环', icon: '🔥',
    desc: '环绕火焰持续灼烧附近敌人', maxLv: 5,
    getDamage(lv) { return [2, 3, 5, 7, 10][lv - 1]; },
    getRadius(lv) { return [50, 60, 75, 90, 110][lv - 1]; },
    isContinuous: true,
  }
];

// ============ 武器系统 ============
class WeaponSystem {
  constructor(player) {
    this.player = player;
    this.slots = [];   // [{weapon, level, cooldownTimer}]
    this._shieldZone = null;
    this._fireZone = null;
  }

  addWeapon(weaponId) {
    const w = WEAPONS.find(w => w.id === weaponId);
    if (!w) return;
    const existing = this.slots.find(s => s.weapon.id === weaponId);
    if (existing) {
      if (existing.level < w.maxLv) {
        existing.level++;
        return { upgraded: true, name: w.name, lv: existing.level };
      }
      return { maxed: true, name: w.name };
    }
    this.slots.push({ weapon: w, level: 1, cooldownTimer: 0 });
    return { new: true, name: w.name, lv: 1 };
  }

  update(dt, entityManager) {
    const enemies = entityManager.filter(Enemy);
    const player = this.player;

    this.slots.forEach(slot => {
      const w = slot.weapon;
      if (w.isContinuous) {
        this._updateContinuous(w, slot.level, enemies, entityManager);
        return;
      }
      // 更新武器相位（如飞斧旋转）
      if (w.update) w.update(dt);
      // 冷却
      slot.cooldownTimer -= dt;
      if (slot.cooldownTimer <= 0) {
        slot.cooldownTimer = w.getCooldown(slot.level);
        w.fire(player, enemies, entityManager, slot.level);
      }
    });
  }

  _updateContinuous(weapon, level, enemies, entityManager) {
    if (weapon.id === 'shield') {
      if (!this._shieldZone || this._shieldZone.dead) {
        this._shieldZone = new DamageZone(this.player, {
          radius: weapon.getRadius(level),
          damage: 0,
          damageInterval: 0.3,
          lifetime: 0, // 0 = 永久
          color: '#4895ef',
        });
        entityManager.add(this._shieldZone);
      }
      this._shieldZone.radius = weapon.getRadius(level);
      enemies.forEach(e => {
        if (!e.dead && this._shieldZone && this._shieldZone.tryDamageEnemy(e)) {
          e.takeDamage(Math.floor(weapon.getDamage(level) * (this.player.damageMultiplier || 1)));
          if (e.dead) {
            Spawner.onEnemyDeath(e, entityManager);
            this.player.kills++;
          }
        }
      });
    }
    if (weapon.id === 'fire') {
      if (!this._fireZone || this._fireZone.dead) {
        this._fireZone = new DamageZone(this.player, {
          radius: weapon.getRadius(level),
          damage: 0,
          damageInterval: 0.5,
          lifetime: 0,
          color: '#ff6d00',
        });
        entityManager.add(this._fireZone);
      }
      this._fireZone.radius = weapon.getRadius(level);
      enemies.forEach(e => {
        if (!e.dead && this._fireZone && this._fireZone.tryDamageEnemy(e)) {
          e.takeDamage(Math.floor(weapon.getDamage(level) * (this.player.damageMultiplier || 1)));
          if (e.dead) {
            Spawner.onEnemyDeath(e, entityManager);
            this.player.kills++;
          }
        }
      });
    }
  }

  getUpgradeOptions(count = 3) {
    const options = [];
    // 已有武器可升级
    this.slots.forEach(slot => {
      if (slot.level < slot.weapon.maxLv) {
        options.push({
          type: 'upgrade',
          weaponId: slot.weapon.id,
          name: slot.weapon.name,
          icon: slot.weapon.icon,
          desc: `Lv.${slot.level} → Lv.${slot.level + 1}`,
          level: slot.level + 1,
        });
      }
    });
    // 新武器
    const owned = this.slots.map(s => s.weapon.id);
    const available = WEAPONS.filter(w => !owned.includes(w.id));
    available.forEach(w => {
      options.push({
        type: 'new',
        weaponId: w.id,
        name: w.name,
        icon: w.icon,
        desc: w.desc,
        level: 1,
      });
    });
    // 被动升级
    options.push(
      { type: 'passive', stat: 'damage', name: '攻击强化', icon: '⚔️', desc: '伤害倍率 +20%' },
      { type: 'passive', stat: 'speed', name: '移动加速', icon: '👟', desc: '移动速度 +15%' },
      { type: 'passive', stat: 'maxHp', name: '生命上限', icon: '❤️', desc: '最大生命 +30' },
      { type: 'passive', stat: 'pickup', name: '拾取范围', icon: '🧲', desc: '拾取范围 +30%' }
    );

    // 随机选 count 个
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options.slice(0, count);
  }

  applyUpgrade(option) {
    if (option.type === 'upgrade' || option.type === 'new') {
      return this.addWeapon(option.weaponId);
    }
    if (option.type === 'passive') {
      switch (option.stat) {
        case 'damage': this.player.damageMultiplier += 0.2; break;
        case 'speed': this.player.speed *= 1.15; break;
        case 'maxHp':
          this.player.maxHp += 30;
          this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
          break;
        case 'pickup': this.player.pickupRange += 30; break;
      }
      return { passive: true, name: option.name };
    }
  }
}

// ============ 游戏状态 ============
let gameState = 'start'; // start | playing | levelup | gameover
let player, camera, entityManager, spawner, weaponSystem;
let gameStartTime = 0;
let animFrameId = null;

// ============ 初始化 ============
function initGame() {
  entityManager = new EntityManager();
  player = new Player(0, 0);
  camera = new Camera(W, H);
  spawner = new Spawner();
  weaponSystem = new WeaponSystem(player);

  entityManager.add(player);

  // 初始武器
  weaponSystem.addWeapon('wand');

  gameState = 'playing';
  gameStartTime = performance.now();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('level-up-screen').classList.remove('active');

  if (animFrameId) cancelAnimationFrame(animFrameId);
  lastTime = performance.now();
  animFrameId = requestAnimationFrame(gameLoop);
}

// ============ 主循环 ============
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (gameState === 'playing') {
    update(dt);
    render();
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

// ============ 更新逻辑 ============
function update(dt) {
  // 玩家移动
  const moveDir = input.getMoveDir();
  player.update(dt, moveDir);

  // 摄像机跟随
  camera.follow(player);

  // 生成敌人
  spawner.update(dt, player, entityManager);

  // 武器系统
  weaponSystem.update(dt, entityManager);

  const enemies = entityManager.filter(Enemy);

  // 敌人移动
  enemies.forEach(enemy => {
    if (!enemy.dead) enemy.update(dt, player.x, player.y);
  });

  // 投射物 vs 敌人
  const projectiles = entityManager.filter(Projectile);
  projectiles.forEach(proj => {
    enemies.forEach(enemy => {
      if (proj.dead || enemy.dead) return;
      if (proj.overlaps(enemy)) {
        const hit = proj.hitEnemy(enemy);
        if (hit) {
          const died = enemy.takeDamage(
            Math.floor(proj.damage * (player.damageMultiplier || 1))
          );
          if (died) {
            Spawner.onEnemyDeath(enemy, entityManager);
            player.kills++;
          }
        }
      }
    });
  });

  // 敌人 vs 玩家碰撞
  enemies.forEach(enemy => {
    if (enemy.dead) return;
    if (enemy.overlaps(player)) {
      player.takeDamage(enemy.damage);
      spawnDamageNumber(player.x, player.y - 20, enemy.damage);
    }
  });

  // 经验宝石拾取
  const gems = entityManager.filter(XpGem);
  gems.forEach(gem => {
    const val = gem.update(dt, player.x, player.y, player.pickupRange);
    if (val > 0) {
      const leveledUp = player.addXp(val);
      if (leveledUp) {
        showLevelUpScreen();
      }
    }
  });

  // 更新所有实体
  entityManager.update(dt);

  // 玩家死亡
  if (player.dead) {
    gameState = 'gameover';
    showGameOver();
  }

  // 更新 HUD
  updateHUD();
}

// ============ 渲染 ============
function render() {
  // 背景
  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, W, H);

  // 地面网格
  ctx.strokeStyle = '#1b2a4a';
  ctx.lineWidth = 1;
  const gridSize = 64;
  const startX = -(camera.x % gridSize);
  const startY = -(camera.y % gridSize);
  for (let x = startX; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = startY; y < H; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // 竞技场边界（土豆兄弟式固定地图）
  const arenaLeft = -WORLD.halfW - camera.x;
  const arenaTop = -WORLD.halfH - camera.y;
  const arenaW = WORLD.halfW * 2;
  const arenaH = WORLD.halfH * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, W, Math.max(0, arenaTop));
  ctx.fillRect(0, arenaTop + arenaH, W, Math.max(0, H - (arenaTop + arenaH)));
  ctx.fillRect(0, Math.max(0, arenaTop), Math.max(0, arenaLeft), arenaH);
  ctx.fillRect(arenaLeft + arenaW, Math.max(0, arenaTop), Math.max(0, W - (arenaLeft + arenaW)), arenaH);
  ctx.strokeStyle = '#4895ef';
  ctx.lineWidth = 3;
  ctx.strokeRect(arenaLeft, arenaTop, arenaW, arenaH);

  // 实体渲染
  entityManager.render(ctx, camera);

  // 玩家在顶层
  if (player && !player.dead) {
    player.render(ctx, camera);
  }
}

// ============ HUD ============
function updateHUD() {
  const hpBar = document.getElementById('hp-bar-inner');
  hpBar.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';

  const xpBar = document.getElementById('xp-bar-inner');
  const xpPct = (player.xp / player.xpToNext) * 100;
  xpBar.style.width = xpPct + '%';

  document.getElementById('level-text').textContent = 'LV ' + player.level;

  const elapsed = (performance.now() - gameStartTime) / 1000;
  const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const sec = Math.floor(elapsed % 60).toString().padStart(2, '0');
  document.getElementById('timer').textContent = min + ':' + sec;

  document.getElementById('kill-count').textContent = 'Kills: ' + player.kills;
}

// ============ 升级界面 ============
function showLevelUpScreen() {
  gameState = 'levelup';
  const screen = document.getElementById('level-up-screen');
  const optionsDiv = document.getElementById('level-up-options');
  optionsDiv.innerHTML = '';

  const options = weaponSystem.getUpgradeOptions(3);
  options.forEach(opt => {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML =
      '<div class="card-icon">' + opt.icon + '</div>' +
      '<div class="card-name">' + opt.name + '</div>' +
      '<div class="card-desc">' + opt.desc + '</div>' +
      '<div class="card-level">' + (opt.level ? 'Lv.' + opt.level : '') + '</div>';
    card.onclick = () => {
      weaponSystem.applyUpgrade(opt);
      gameState = 'playing';
      screen.classList.remove('active');
    };
    optionsDiv.appendChild(card);
  });

  screen.classList.add('active');
}

// ============ 游戏结束 ============
function showGameOver() {
  const screen = document.getElementById('gameover-screen');
  screen.classList.remove('hidden');

  const elapsed = (performance.now() - gameStartTime) / 1000;
  const min = Math.floor(elapsed / 60);
  const sec = Math.floor(elapsed % 60);

  document.getElementById('go-title').textContent = '你倒下了';
  document.getElementById('go-subtitle').textContent = '存活了 ' + min + ' 分 ' + sec + ' 秒';
  document.getElementById('go-stats').innerHTML =
    '等级: <span>' + player.level + '</span><br>' +
    '击杀: <span>' + player.kills + '</span><br>' +
    '经验: <span>' + player.xp + '</span>';
}

// ============ 伤害数字浮动 ============
function spawnDamageNumber(x, y, amount) {
  const el = document.createElement('div');
  el.className = 'dmg-number';
  el.textContent = '-' + amount;
  el.style.left = (x - camera.x + Math.random() * 30 - 15) + 'px';
  el.style.top = (y - camera.y - 20) + 'px';
  const overlay = document.getElementById('ui-overlay');
  if (overlay) {
    overlay.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }
}

// ============ 全局 Game 对象（供 HTML onclick 调用） ============
window.Game = {
  start: initGame,
};

// ============ 启动：显示开始界面 ============
document.getElementById('start-screen').classList.remove('hidden');
document.getElementById('gameover-screen').classList.add('hidden');
