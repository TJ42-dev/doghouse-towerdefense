const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const content = fs.readFileSync('main.js', 'utf8');

// Extract needed definitions from main.js
const specCostsMatch = content.match(/const SPECIALIZATION_COSTS = (\{[^}]*\});/);
const dogStatsMatch = content.match(/let DEFAULT_DOG_STATS = (\{[^}]*\});/);
const healthScaleMatch = content.match(/const HEALTH_SCALE_PER_WAVE = ([^;]+);/);

if (!specCostsMatch || !dogStatsMatch || !healthScaleMatch) {
  throw new Error('Required game constants not found');
}

const context = { money: 999999, removeTowerProjectiles: () => {} };
vm.runInNewContext(
  `const SPECIALIZATION_COSTS = ${specCostsMatch[1]}
   let DEFAULT_DOG_STATS = ${dogStatsMatch[1]}
   const HEALTH_SCALE_PER_WAVE = ${healthScaleMatch[1]}`,
  context
);

// Extract specializeTower function
const start = content.indexOf('function specializeTower');
const braceStart = content.indexOf('{', start);
let i = braceStart + 1, depth = 1;
while (i < content.length && depth > 0) {
  const ch = content[i++];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
}
const specializeSrc = content.slice(start, i);
vm.runInNewContext(specializeSrc, context);

const tower = {
  type: 'rocket',
  upgrades: { damage: 10, fireRate: 10, range: 10 },
  damage: 200,
  fireRate: 0.4,
  range: 5.5
};
context.specializeTower(tower, 'nuke');
assert.strictEqual(tower.type, 'nuke');
assert.strictEqual(tower.damage, 1000);
console.log('nuke specialization tests passed');
