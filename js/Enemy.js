import { Entity } from './Entity.js';
import { clampPosition } from './World.js';

/**
 * Enemy — 敌人实体
 * 职责：追踪玩家、受伤、死亡、掉落经验宝石
 * 不包含生成逻辑（由 Spawner 管理）
 */

// 敌人类型定义
export const ENEMY_TYPES = {
  bat: {
    name: '蝙蝠', hp: 8, speed: 90, damage: 6,
    w: 20, h: 20, xp: 1, color: '#8338ec', bodyType: 'circle'
  },
  zombie: {
    name: '僵尸', hp: 20, speed: 50, damage: 10,
    w: 24, h: 24, xp: 3, color: '#2d6a4f', bodyType: 'circle'
  },
  skeleton: {
    name: '骷髅', hp: 35, speed: 70, damage: 14,
    w: 22, h: 22, xp: 5, color: '#e9ecef', bodyType: 'circle'
  },
  ghost: {
    name: '幽灵', hp: 50, speed: 100, damage: 8,
    w: 26, h: 26, xp: 8, color: '#adb5bd', bodyType: 'circle'
  },
  demon: {
    name: '恶魔', hp: 120, speed: 55, damage: 25,
    w: 32, h: 32, xp: 15, color: '#d00000', bodyType: 'circle'
  },
};

export class Enemy extends Entity {
  constructor(x, y, typeName, difficultyScale = 1) {
    const type = ENEMY_TYPES[typeName];
    super(x, y, type.w, type.h);
    this.typeName = typeName;
    this.color = type.color;
    this.bodyType = type.bodyType;
    this.maxHp = Math.floor(type.hp * difficultyScale);
    this.hp = this.maxHp;
    this.speed = type.speed * (0.9 + Math.random() * 0.2);
    this.damage = Math.floor(type.damage * difficultyScale);
    this.xpValue = type.xp;
    this.hitFlashTimer = 0;
    this.animPhase = Math.random() * Math.PI * 2;
  }

  /** 向目标移动 */
  moveToward(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    const clamped = clampPosition(this.x, this.y, this.w / 2, this.h / 2);
    this.x = clamped.x;
    this.y = clamped.y;
    this.animPhase += dt * 5;
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlashTimer = 0.1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.hitFlashTimer = 0;
    }
    return this.dead;
  }

  update(dt, playerX, playerY) {
    if (this.dead) return;
    this.moveToward(playerX, playerY, dt);
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
  }

  render(ctx, camera) {
    if (this.dead) return;
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    const r = this.w / 2;

    // 受击闪白
    const color = this.hitFlashTimer > 0 ? '#fff' : this.color;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#e63946' : '#ff006e';
    const eyeR = r * 0.2;
    const eyeOff = r * 0.3;
    ctx.beginPath();
    ctx.arc(sx - eyeOff, sy - eyeOff * 0.5, eyeR, 0, Math.PI * 2);
    ctx.arc(sx + eyeOff, sy - eyeOff * 0.5, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // 血条（受伤且存活时显示）
    if (this.hp > 0 && this.hp < this.maxHp) {
      const barW = this.w + 4;
      const barH = 3;
      const barX = sx - barW / 2;
      const barY = sy - r - 8;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }
  }
}
