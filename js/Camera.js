import { clampCamera } from './World.js';

/**
 * Camera — 2D 摄像机
 * 职责：视口偏移计算，坐标转换（世界↔屏幕）
 * 只处理坐标变换，不依赖任何实体
 */
export class Camera {
  constructor(viewW, viewH) {
    this.x = 0;          // 世界坐标 — 摄像机左上角
    this.y = 0;
    this.viewW = viewW;
    this.viewH = viewH;
  }

  /** 让摄像机平滑跟随目标 */
  follow(target, lerp = 0.1) {
    let tx = target.x - this.viewW / 2;
    let ty = target.y - this.viewH / 2;
    const clamped = clampCamera(tx, ty, this.viewW, this.viewH);
    tx = clamped.x;
    ty = clamped.y;
    this.x += (tx - this.x) * lerp;
    this.y += (ty - this.y) * lerp;
  }

  /** 世界坐标 → 屏幕坐标 */
  worldToScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y };
  }

  /** 屏幕坐标 → 世界坐标 */
  screenToWorld(sx, sy) {
    return { x: sx + this.x, y: sy + this.y };
  }

  /** 矩形是否在视口内（用于裁剪优化） */
  isVisible(wx, wy, margin = 64) {
    return wx > this.x - margin && wx < this.x + this.viewW + margin &&
           wy > this.y - margin && wy < this.y + this.viewH + margin;
  }

  resize(w, h) {
    this.viewW = w;
    this.viewH = h;
  }
}
