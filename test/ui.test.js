const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('offers the +1s Slow Burn talent at level 25', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8');

  assert.match(source, /id="linaTalentBurn"/);
  assert.match(source, /burnTalent\.disabled = state\.level < 25/);
});
