const assert = require('assert');

function findFastestEnemy(list) {
  return list.reduce((best, e) => (!best || e.speed > best.speed ? e : best), null);
}

const enemies = [
  { id: 'slow', speed: 1 },
  { id: 'fast', speed: 3 },
  { id: 'faster', speed: 3 }
];

assert.strictEqual(findFastestEnemy(enemies).id, 'fast');
assert.strictEqual(findFastestEnemy([]), null);
console.log('rocket targeting tests passed');
