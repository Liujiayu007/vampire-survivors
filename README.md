# Dark Survivors（黑夜幸存者）

浏览器端的吸血鬼幸存者类 Roguelike 小游戏，使用原生 JavaScript + Canvas 实现。

## 运行方式

```bash
node server.js
```

浏览器打开 [http://127.0.0.1:8765](http://127.0.0.1:8765)

也可直接打开 `index.html`（模块化版本）或 `index-standalone-final.html`（单文件完整版）。

## 操作

- **WASD / 方向键**：移动
- 武器自动攻击，拾取经验宝石升级并选择强化

## 项目结构

- `js/` — 游戏模块（玩家、敌人、武器、地图边界等）
- `index.html` — ES Module 入口
- `index-standalone-final.html` — 单文件整合版（含波次与 BOSS）
- `server.js` — 本地静态文件服务器

## 特性

- 固定竞技场地图（参考土豆兄弟式边界）
- 多种武器与升级选项
- 敌人波次与 BOSS
