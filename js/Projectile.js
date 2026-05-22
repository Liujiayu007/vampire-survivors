import { Entity } from './Entity.js';

/**
 * Projectile — 投射物实体
 * 职责：直线/追踪飞行、命中敌人造成伤害
 * 由 WeaponSystem 创建和管理
 */

export class Projectile extends Entity {
  constructor(x, y, config) {
    super(x, y, config.w || 10, config.h || 10);
    this.speed = config.speed || 300;
    this.damage = config.damage || 10;
    this.dx = config.dx || 0;    // 方向（已归一化）
    this.dy = config.dy || 0;
    this.piercing = config.piercing || 1;   // 穿透次数
    this.lifetime = config.lifetime || 2;
    this.color = config.color || '#ffd60a';
    this.type = config.type || 'bullet';    // bullet / magic
    this.hitEnemies = new Set();            // 已命中的敌人
    this.trail = [];                        // 拖尾轨迹
  }

  update(dt) {
    this.x += this.dx * this.speed * dt;
    this.y += this.dy * this.speed * dt;
    this.lifetime -= dt;

    // 拖尾
    this.trail.push({ x: this.x, y: this.y, age: 0 });
    if (this.trail.length > 8) this.trail.shift();
    this.trail.forEach(t => t.age += dt);

    if (this.lifetime <= 0) this.dead = true;
  }

  /** 命中敌人 */
  hitEnemy(enemy) {
    if (this.hitEnemies.has(enemy)) return false;
    this.hitEnemies.add(enemy);
    this.piercing--;
    if (this.piercing <= 0) this.dead = true;
    return true;
  }

  render(ctx, camera) {
    // 拖尾
    if (this.trail.length > 1) {
      ctx.strokeStyle = this.color + '40';
      ctx.lineWidth = this.w * 0.6;
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x - camera.x, this.trail[0].y - camera.y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x - camera.x, this.trail[i].y - camera.y);
      }
      ctx.stroke();
    }

    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    if (this.type === 'magic') {
      // 魔法弹：发光球
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(sx, sy, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, this.w / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // 子弹：旋转菱形
      ctx.fillStyle = this.color;
      const angle = Math.atan2(this.dy, this.dx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(this.w, 0);
      ctx.lineTo(0, -this.w * 0.4);
      ctx.lineTo(-this.w * 0.5, 0);
      ctx.lineTo(0, this.w * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
