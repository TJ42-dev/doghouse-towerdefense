const assert = require('assert');

function railgunHits(tower, enemies, grid) {
  const angle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  const minX = grid.originX;
  const maxX = grid.originX + grid.cols * grid.cellPx;
  const minY = grid.originY;
  const maxY = grid.originY + grid.rows * grid.cellPx;
  let edgeT = Infinity;
  if (dx > 0) edgeT = Math.min(edgeT, (maxX - tower.x) / dx);
  else if (dx < 0) edgeT = Math.min(edgeT, (minX - tower.x) / dx);
  if (dy > 0) edgeT = Math.min(edgeT, (maxY - tower.y) / dy);
  else if (dy < 0) edgeT = Math.min(edgeT, (minY - tower.y) / dy);

  const hits = [];
  for (const e of enemies) {
    const ex = e.x - tower.x;
    const ey = e.y - tower.y;
    const along = ex * dx + ey * dy;
    const perp = Math.abs(ex * dy - ey * dx);
    if (along > 0 && along <= edgeT && perp <= e.r) hits.push(e.id);
  }
  return hits;
}

const tower = { x: 0, y: 0, target: { x: 10, y: 0 } };
const grid = { originX: 0, originY: 0, cols: 20, rows: 20, cellPx: 10 };
const enemies = [
  { id: 'a', x: 50, y: 0, r: 1 },
  { id: 'b', x: 150, y: 0, r: 1 },
  { id: 'c', x: 250, y: 10, r: 1 }
];

assert.deepStrictEqual(railgunHits(tower, enemies, grid), ['a', 'b']);

console.log('railgun tests passed');
