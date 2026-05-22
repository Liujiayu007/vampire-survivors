import { Entity } from './Entity.js';

/**
 * DamageZone — 伤害区域实体（火焰光环等持续伤害区域）
 * 职责：在固定范围内对敌人造成持续伤害
 * 由 WeaponSystem 管理
 */
export class DamageZone extends Entity {
  constructor(owner, config) {
    super(owner.x, owner.y, config.radius * 2, config.radius * 2);
    this.owner = owner;
    this.radius = config.radius;
    this.damage = config.damage;
    this.damageInterval = config.damageInterval || 0.5;  // 伤害间隔（秒）
    this.lifetime = config.lifetime || 5;
    this.color = config.color || '#ff6b35';
    this.hitEnemies = new Set();
    this.timer = 0;
    this.rotation = 0;
  }

  update(dt) {
    // 跟随所有者
    this.x = this.owner.x;
    this.y = this.owner.y;
    this.rotation += dt * 2;
    this.timer += dt;
    // lifetime > 0 时才倒计时；<= 0 表示永久
    if (this.lifetime > 0) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) this.dead = true;
    }

    // 每隔一段时间清空命中记录（允许再次伤害）
    if (this.timer >= this.damageInterval) {
      this.timer -= this.damageInterval;
      this.hitEnemies.clear();
    }
  }

  /** 检查敌人是否在区域内并造成伤害 */
  tryDamageEnemy(enemy) {
    if (this.hitEnemies.has(enemy)) return false;
    const dx = enemy.x - this.x;
    const dy = enemy.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= this.radius + enemy.w / 2) {
      this.hitEnemies.add(enemy);
      return true;
    }
    return false;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    // 半透明填充区域
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, this.radius);
    grad.addColorStop(0, this.color + '15');
    grad.addColorStop(0.7, this.color + '08');
    grad.addColorStop(1, this.color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // 旋转边框
    ctx.strokeStyle = this.color + '50';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -this.rotation * 30;
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
