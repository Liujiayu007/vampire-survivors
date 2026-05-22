import { Entity } from './Entity.js';

/**
 * XpGem — 经验宝石（可拾取实体）
 * 职责：被拾取后给予经验值
 * 独立于玩家和敌人，由敌人死亡时生成
 */

const GEM_TIERS = [
  { minVal: 1,  maxVal: 2,  size: 8,  color: '#4895ef' },
  { minVal: 3,  maxVal: 6,  size: 12, color: '#4cc9f0' },
  { minVal: 7,  maxVal: 15, size: 16, color: '#7209b7' },
  { minVal: 16, maxVal: 99, size: 20, color: '#f72585' },
];

export class XpGem extends Entity {
  constructor(x, y, value) {
    const tier = GEM_TIERS.find(t => value >= t.minVal && value <= t.maxVal) || GEM_TIERS[0];
    const size = tier.size;
    super(x, y, size, size);
    this.value = value;
    this.size = size;
    this.color = tier.color;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.magnetized = false;   // 是否被拾取磁场吸引
  }

  /** 磁吸效果：被拾取范围吸引后加速飞向玩家 */
  update(dt, playerX, playerY, pickupRange) {
    this.bobPhase += dt * 3;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < pickupRange) {
      this.magnetized = true;
    }

    if (this.magnetized) {
      // 磁吸速度：距离越近越快
      const speed = 400;
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;

      // 拾取判定
      if (dist < 16) {
        this.dead = true;
        return this.value;
      }
    }
    return 0;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y + Math.sin(this.bobPhase) * 2;
    const r = this.size / 2;

    // 菱形宝石
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r);
    ctx.lineTo(sx + r * 0.7, sy);
    ctx.lineTo(sx, sy + r);
    ctx.lineTo(sx - r * 0.7, sy);
    ctx.closePath();
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(sx, sy - r);
    ctx.lineTo(sx + r * 0.3, sy - r * 0.2);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx - r * 0.3, sy - r * 0.2);
    ctx.closePath();
    ctx.fill();
  }
}
