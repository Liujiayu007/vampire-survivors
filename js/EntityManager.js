import { Enemy } from './Enemy.js';
import { Player } from './Player.js';

/**
 * EntityManager — 实体管理器
 * 职责：管理所有实体的生命周期（增删查遍历）
 * 不知道实体是什么，只做容器管理
 */
export class EntityManager {
  constructor() {
    this.entities = new Set();
  }

  add(entity) {
    this.entities.add(entity);
    entity._em = this;
  }

  remove(entity) {
    entity._em = null;
    this.entities.delete(entity);
  }

  clear() {
    this.entities.forEach(e => e._em = null);
    this.entities.clear();
  }

  /** 遍历存活实体 */
  forEach(fn) {
    this.entities.forEach(fn);
  }

  /** 按类型过滤 */
  filter(type) {
    const result = [];
    this.entities.forEach(e => { if (e instanceof type) result.push(e); });
    return result;
  }

  /** 获取所有存活实体的数量 */
  get count() { return this.entities.size; }

  /** 更新投射物、宝石等（玩家/敌人在主循环单独更新） */
  update(dt) {
    const dead = [];
    this.entities.forEach(e => {
      if (e instanceof Player || e instanceof Enemy) {
        if (e instanceof Enemy && e.dead) dead.push(e);
        return;
      }
      e.update(dt);
      if (e.dead) dead.push(e);
    });
    dead.forEach(e => this.remove(e));
  }

  /** 渲染所有实体（通过 camera 裁剪） */
  render(ctx, camera) {
    this.entities.forEach(e => {
      if (e.dead) return;
      if (camera.isVisible(e.x, e.y, 80)) {
        e.render(ctx, camera);
      }
    });
  }
}
