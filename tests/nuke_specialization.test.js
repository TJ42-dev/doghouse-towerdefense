const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const content = fs.readFileSync('main.js', 'utf8');

// Extract needed definitions from main.js
const balanceMatch = content.match(/const BALANCE = (\{[\s\S]*?\n\});/);
if (!balanceMatch) throw new Error('BALANCE not found');
const BALANCE = vm.runInNewContext('(' + balanceMatch[1] + ')');

const context = {
  money: 999999,
  removeTowerProjectiles: () => {},
  BALANCE,
  DEFAULT_DOG_STATS: { ...BALANCE.defaultDogStats },
  waveIndex: 25
};

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
