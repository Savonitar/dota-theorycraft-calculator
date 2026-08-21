const assert = require('node:assert/strict');
const test = require('node:test');

const { DEFAULT_WINDOW_OPTIONS, getWindowOptions } = require('../src/window-options');

test('uses a centered resizable desktop window by default', () => {
  assert.deepEqual(getWindowOptions(), {
    width: 420,
    height: 560,
    minWidth: 420,
    minHeight: 440,
    center: true,
    resizable: true
  });
});

test('returns a copy of the default window options', () => {
  const options = getWindowOptions();
  options.width = 999;

  assert.equal(DEFAULT_WINDOW_OPTIONS.width, 420);
  assert.equal(getWindowOptions().width, 420);
});
