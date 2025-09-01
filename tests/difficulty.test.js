const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const content = fs.readFileSync('main.js', 'utf8');
const match = content.match(/const DIFFICULTY_SETTINGS = (\{[\s\S]*?\n\});/);
if (!match) throw new Error('DIFFICULTY_SETTINGS not found');
const DIFFICULTY_SETTINGS = vm.runInNewContext('(' + match[1] + ')');

assert.strictEqual(DIFFICULTY_SETTINGS.free.startingCash, 99999);
assert.strictEqual(
  DIFFICULTY_SETTINGS.free.healthMultiplier,
  DIFFICULTY_SETTINGS.medium.healthMultiplier
);
console.log('difficulty tests passed');
