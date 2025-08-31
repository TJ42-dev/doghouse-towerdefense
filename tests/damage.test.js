const assert = require('assert');

function apply(base, mult, add, armor_pct, armor_flat) {
  const raw = (base * (1 + mult)) + add;
  return Math.max(0, raw * (1 - armor_pct) - armor_flat);
}

assert.strictEqual(apply(10, 0, 0, 0, 0), 10);
assert.strictEqual(apply(10, 0.5, 0, 0, 0), 15);
assert.strictEqual(apply(10, 0, 0, 0.1, 2), 7);
assert.strictEqual(apply(5, 0, 0, 0, 10), 0);

console.log('damage tests passed');
