const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const content = fs.readFileSync('main.js', 'utf8');
const match = content.match(/const BALANCE = (\{[\s\S]*?\n\});/);
if (!match) throw new Error('BALANCE not found');
const BALANCE = vm.runInNewContext('(' + match[1] + ')');

assert.strictEqual(BALANCE.difficulties.free.startingCash, 99999);
assert.strictEqual(
  BALANCE.difficulties.free.healthMultiplier,
  BALANCE.difficulties.medium.healthMultiplier
);
console.log('difficulty tests passed');
