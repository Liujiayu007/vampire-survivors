/**
 * World — 竞技场边界（参考土豆兄弟：固定矩形地图 + 摄像机/玩家限制在场内）
 */
export const WORLD = {
  halfW: 520,
  halfH: 380,
};

export function clampPosition(x, y, halfW = 0, halfH = 0) {
  return {
    x: Math.max(-WORLD.halfW + halfW, Math.min(WORLD.halfW - halfW, x)),
    y: Math.max(-WORLD.halfH + halfH, Math.min(WORLD.halfH - halfH, y)),
  };
}

export function clampCamera(x, y, viewW, viewH) {
  const worldW = WORLD.halfW * 2;
  const worldH = WORLD.halfH * 2;
  let cx = x;
  let cy = y;
  if (viewW >= worldW) {
    cx = -WORLD.halfW;
  } else {
    cx = Math.max(-WORLD.halfW, Math.min(WORLD.halfW - viewW, cx));
  }
  if (viewH >= worldH) {
    cy = -WORLD.halfH;
  } else {
    cy = Math.max(-WORLD.halfH, Math.min(WORLD.halfH - viewH, cy));
  }
  return { x: cx, y: cy };
}

/** 在地图内随机取一点（用于刷怪） */
export function randomPointInWorld(margin = 40) {
  const m = margin;
  return {
    x: -WORLD.halfW + m + Math.random() * (WORLD.halfW * 2 - m * 2),
    y: -WORLD.halfH + m + Math.random() * (WORLD.halfH * 2 - m * 2),
  };
}

/** 在玩家视野外、地图内的位置刷怪 */
export function spawnPointAroundPlayer(px, py, minDist, maxDist) {
  const angle = Math.random() * Math.PI * 2;
  const dist = minDist + Math.random() * (maxDist - minDist);
  const halfW = 16;
  const halfH = 16;
  const raw = {
    x: px + Math.cos(angle) * dist,
    y: py + Math.sin(angle) * dist,
  };
  return clampPosition(raw.x, raw.y, halfW, halfH);
}
