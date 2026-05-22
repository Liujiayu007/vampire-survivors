import { Entity } from './Entity.js';
import { clampPosition } from './World.js';

/**
 * Player — 玩家实体
 * 职责：移动、受伤/死亡、属性管理
 * 不包含武器逻辑（武器独立模块处理）
 */
export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 28, 28);
    this.speed = 160;           // 像素/秒
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.armor = 0;
    this.pickupRange = 60;
    this.xp = 0;
    this.level = 1;
    this.xpToNext = 10;
    this.kills = 0;
    this.invincibleTimer = 0;   // 无敌帧（受伤后短暂无敌）
    this.flashTimer = 0;        // 受伤闪烁
    this.damageMultiplier = 1;
  }

  takeDamage(amount) {
    if (this.invincibleTimer > 0) return;
    const dmg = Math.max(1, amount - this.armor);
    this.hp -= dmg;
    this.invincibleTimer = 0.5;  // 0.5秒无敌
    this.flashTimer = 0.3;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  addXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(10 + this.level * 8 + this.level * this.level * 0.5);
      return true;  // 升级了
    }
    return false;
  }

  update(dt, moveDir) {
    // 移动
    this.x += moveDir.dx * this.speed * dt;
    this.y += moveDir.dy * this.speed * dt;
    const clamped = clampPosition(this.x, this.y, this.w / 2, this.h / 2);
    this.x = clamped.x;
    this.y = clamped.y;

    // 计时器
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    // 受伤闪烁效果
    if (this.flashTimer > 0 && Math.floor(this.flashTimer * 20) % 2 === 0) return;

    // 身体
    ctx.fillStyle = '#3a86ff';
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛方向（朝最近敌人方向看）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx - 4, sy - 3, 3, 0, Math.PI * 2);
    ctx.arc(sx + 4, sy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx - 4, sy - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(sx + 4, sy - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 拾取范围指示（半透明圆圈）
    ctx.strokeStyle = 'rgba(72,149,239,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, this.pickupRange, 0, Math.PI * 2);
    ctx.stroke();
  }
}
