import { Enemy, ENEMY_TYPES } from './Enemy.js';
import { XpGem } from './XpGem.js';
import { spawnPointAroundPlayer } from './World.js';

/**
 * Spawner — 敌人生成器
 * 职责：按时间曲线控制敌人生成频率和类型
 * 只负责创建实体并加入管理器，不处理战斗逻辑
 */
export class Spawner {
  constructor() {
    this.timer = 0;
    this.spawnInterval = 1.5;    // 初始生成间隔（秒）
    this.minInterval = 0.15;     // 最小间隔
    this.spawnRadius = 220;      // 在玩家视野外、地图内生成
    this.spawnRadiusMax = 320;
    this.waveTimer = 0;          // 波次计时器
    this.difficultyScale = 1;    // 难度倍率
  }

  update(dt, player, entityManager) {
    this.timer += dt;
    this.waveTimer += dt;

    // 每30秒提升一次难度
    this.difficultyScale = 1 + this.waveTimer / 60;

    // 动态调整生成间隔
    this.spawnInterval = Math.max(
      this.minInterval,
      1.5 - this.waveTimer * 0.02
    );

    if (this.timer >= this.spawnInterval) {
      this.timer = 0;
      this._spawnEnemies(player, entityManager);
    }
  }

  _spawnEnemies(player, entityManager) {
    // 根据时间选择敌人类型池
    const pool = this._getEnemyPool();
    const count = Math.min(8, 1 + Math.floor(this.waveTimer / 30));

    for (let i = 0; i < count; i++) {
      const typeName = pool[Math.floor(Math.random() * pool.length)];
      const pos = spawnPointAroundPlayer(
        player.x, player.y, this.spawnRadius, this.spawnRadiusMax
      );
      entityManager.add(new Enemy(pos.x, pos.y, typeName, this.difficultyScale));
    }
  }

  _getEnemyPool() {
    const t = this.waveTimer;
    const pool = ['bat'];
    if (t > 15)  pool.push('zombie');
    if (t > 45)  pool.push('skeleton');
    if (t > 90)  pool.push('ghost');
    if (t > 150) pool.push('demon');
    return pool;
  }

  /** 处理敌人死亡：掉落经验宝石 */
  static onEnemyDeath(enemy, entityManager) {
    if (enemy.dead) entityManager.remove(enemy);
    const type = ENEMY_TYPES[enemy.typeName];
    // 掉落 1-3 个宝石
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const value = type.xp; // 每个宝石给基础经验
      entityManager.add(new XpGem(enemy.x + offsetX, enemy.y + offsetY, value));
    }
  }
}
