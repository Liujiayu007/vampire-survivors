/**
 * InputManager — 键盘输入管理（单例）
 * 职责：监听键盘事件，暴露当前按键状态
 * 不依赖任何游戏逻辑，可独立使用
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this._init();
  }

  _init() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // 防止方向键滚动页面
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    // 失焦时清空，防止按键粘滞
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  isDown(code) { return !!this.keys[code]; }

  /** 返回标准化方向向量（WASD/方向键） */
  getMoveDir() {
    let dx = 0, dy = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  dx -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) dx += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    dy -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  dy += 1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
    return { dx, dy };
  }
}

export const input = new InputManager();
