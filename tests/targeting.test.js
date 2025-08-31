const assert = require('assert');

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function acquire(targets, origin, mode, onlyAir = false) {
  const candidates = targets.filter(t => !(onlyAir && !t.flying));
  if (candidates.length === 0) return null;
  let best = candidates[0];
  switch (mode) {
    case 'FIRST':
      best = candidates.reduce((a, b) => b.path_progress > a.path_progress ? b : a);
      break;
    case 'LAST':
      best = candidates.reduce((a, b) => b.path_progress < a.path_progress ? b : a);
      break;
    case 'STRONGEST':
      best = candidates.reduce((a, b) => b.hp > a.hp ? b : a);
      break;
    case 'WEAKEST':
      best = candidates.reduce((a, b) => b.hp < a.hp ? b : a);
      break;
    case 'FASTEST':
      best = candidates.reduce((a, b) => b.speed > a.speed ? b : a);
      break;
    case 'ARMORED':
      best = candidates.reduce((a, b) => (b.armor_flat + b.armor_pct) > (a.armor_flat + a.armor_pct) ? b : a);
      break;
    case 'AIR':
      best = candidates.find(t => t.flying) || null;
      break;
    case 'CLOSEST_TO_GOAL':
      best = candidates.reduce((a, b) => b.dist_to_goal < a.dist_to_goal ? b : a);
      break;
    default:
      best = candidates.reduce((a, b) => distance(b, origin) < distance(a, origin) ? b : a);
  }
  return best;
}

const targets = [
  { id: 'a', path_progress: 0.2, hp: 50, speed: 20, armor_flat: 1, armor_pct: 0.1, flying: false, dist_to_goal: 80, x: 0, y: 0 },
  { id: 'b', path_progress: 0.8, hp: 100, speed: 10, armor_flat: 5, armor_pct: 0.2, flying: true, dist_to_goal: 20, x: 5, y: 0 },
  { id: 'c', path_progress: 0.5, hp: 40, speed: 30, armor_flat: 0, armor_pct: 0.0, flying: false, dist_to_goal: 40, x: 2, y: 0 }
];

assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'FIRST').id, 'b');
assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'LAST').id, 'a');
assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'STRONGEST').id, 'b');
assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'WEAKEST').id, 'c');
assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'FASTEST').id, 'c');
assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'ARMORED').id, 'b');
assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'AIR').id, 'b');
assert.strictEqual(acquire(targets, { x: 0, y: 0 }, 'CLOSEST_TO_GOAL').id, 'b');
assert.strictEqual(acquire(targets.filter(t => !t.flying), { x: 0, y: 0 }, 'AIR', true), null);
console.log('targeting tests passed');
