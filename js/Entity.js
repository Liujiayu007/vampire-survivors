/**
 * Entity — 实体基类
 * 所有游戏对象的基类，只提供最基本的位置、大小、生命管理
 */
export class Entity {
  constructor(x, y, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.dead = false;
    this._em = null;  // EntityManager reference
  }

  update(dt) { /* override */ }

  render(ctx, camera) { /* override */ }

  destroy() {
    this.dead = true;
  }

  /** 简单矩形碰撞 */
  overlaps(other) {
    return this.x - this.w/2 < other.x + other.w/2 &&
           this.x + this.w/2 > other.x - other.w/2 &&
           this.y - this.h/2 < other.y + other.h/2 &&
           this.y + this.h/2 > other.y - other.h/2;
  }

  /** 与点碰撞（用于拾取） */
  containsPoint(px, py) {
    return px > this.x - this.w/2 && px < this.x + this.w/2 &&
           py > this.y - this.h/2 && py < this.y + this.h/2;
  }
}
