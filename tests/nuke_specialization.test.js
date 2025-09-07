const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const content = fs.readFileSync('main.js', 'utf8');

// Extract needed definitions from main.js
const balanceMatch = content.match(/const BALANCE = (\{[\s\S]*?\n\});/);
if (!balanceMatch) throw new Error('BALANCE not found');
const BALANCE = vm.runInNewContext('(' + balanceMatch[1] + ')');

const maxMatch = content.match(/const MAX_UPGRADES = (\d+);/);
const MAX_UPGRADES = maxMatch ? parseInt(maxMatch[1], 10) : 7;

const context = {
  money: 999999,
  removeTowerProjectiles: () => {},
  BALANCE,
  DEFAULT_DOG_STATS: { ...BALANCE.defaultDogStats },
  waveIndex: 25,
  MAX_UPGRADES,
  SPECIALIZE_BY_BASE: { rocket: ['nuke'] },
  TOWER_TYPES: [JSON.parse(fs.readFileSync('assets/towers/tower configurations/nuke.json', 'utf8'))]
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
  upgrades: { damage: MAX_UPGRADES, fireRate: MAX_UPGRADES, range: MAX_UPGRADES },
  damage: 200,
  fireRate: 0.4,
  range: 5.5
};
context.specializeTower(tower, 'nuke');
assert.strictEqual(tower.type, 'nuke');
assert.strictEqual(tower.damage, context.TOWER_TYPES[0].damage);
console.log('nuke specialization tests passed');
