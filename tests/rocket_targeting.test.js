const assert = require('assert');

function findFastestEnemy(list) {
  return list.reduce((best, e) => (!best || e.speed > best.speed ? e : best), null);
}

function retarget(bullet, enemies) {
  if (!bullet.target || !enemies.includes(bullet.target)) {
    bullet.target = findFastestEnemy(enemies);
  }
}

function rocketCap(type) {
  return type === 'hellfire' ? 5 : (type === 'rocket' ? 3 : 0);
}

const enemies = [
  { id: 'slow', speed: 1 },
  { id: 'fast', speed: 3 },
  { id: 'faster', speed: 3 }
];

assert.strictEqual(findFastestEnemy(enemies).id, 'fast');
assert.strictEqual(findFastestEnemy([]), null);

let bullet = { target: null };
retarget(bullet, enemies);
assert.strictEqual(bullet.target.id, 'fast');

enemies.splice(1,1); // remove 'fast'
retarget(bullet, enemies);
assert.strictEqual(bullet.target.id, 'faster');

enemies.length = 0;
retarget(bullet, enemies);
assert.strictEqual(bullet.target, null);

assert.strictEqual(rocketCap('rocket'), 3);
assert.strictEqual(rocketCap('hellfire'), 5);

console.log('rocket targeting tests passed');
