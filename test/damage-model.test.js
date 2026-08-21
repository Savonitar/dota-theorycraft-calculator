const assert = require('node:assert/strict');
const test = require('node:test');

const DotaTheorycraft = require('../src/damage-model');

function total(rows, key) {
  return rows.reduce((sum, row) => sum + row[key], 0);
}

test('normalizes numeric input and clamps supported ranges', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'unknown',
    level: '99',
    spellAmp: '12,5',
    magicResistance: '-150',
    incomingAmp: '600',
    dagonLevel: '9',
    damageRune: true,
    extraSpellAmp: '35',
    zeusTargetHp: -10
  });

  assert.equal(state.hero, 'lina');
  assert.equal(state.level, 30);
  assert.equal(state.spellAmp, 12.5);
  assert.equal(state.magicResistance, -100);
  assert.equal(state.incomingAmp, 500);
  assert.equal(state.dagonLevel, 5);
  assert.equal(state.damageRune, true);
  assert.equal(state.extraSpellAmp, 35);
  assert.equal(state.zeusTargetHp, 0);
});

test("supports zero incoming magic multiplier", () => {
  const state = DotaTheorycraft.normalizeState({
    hero: "lina",
    level: 1,
    incomingAmp: -100
  });
  const result = DotaTheorycraft.calculateHero(state);

  assert.equal(DotaTheorycraft.activeIncomingMagicMultiplier(state), 0);
  assert.equal(total(result.rows, "defaultInstant"), 0);
  assert.equal(total(result.rows, "instant"), 0);
});

test('calculates Lina instant and full combo damage separately', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 18,
    magicResistance: 40,
    linaTalentLsa: true
  });
  const result = DotaTheorycraft.calculateHero(state);

  assert.deepEqual(
    result.rows.map((row) => `${row.title}:${row.defaultInstant}/${row.defaultFull}`),
    [
      'Q Dragon Slave:184/301',
      'W Light Strike Array:244/400',
      'R Laguna Blade:570/935'
    ]
  );
  assert.equal(total(result.rows, 'defaultInstant'), 998);
  assert.equal(total(result.rows, 'defaultFull'), 1636);
  assert.equal(total(result.rows, 'instant'), 798);
  assert.equal(total(result.rows, 'full'), 1309);
});

test("applies Lina's level 25 +1s Slow Burn talent only when available", () => {
  const beforeLevel25 = DotaTheorycraft.calculateHero(DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 24,
    linaTalentBurn: true
  }));
  const atLevel25 = DotaTheorycraft.calculateHero(DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 25,
    linaTalentBurn: true
  }));

  assert.equal(beforeLevel25.rows[0].defaultFull, 301);
  assert.equal(atLevel25.rows[0].defaultFull, 331);
  assert.match(atLevel25.rows[0].detail, /80% burn \(\+1s talent\)/);
});

test('includes Dagon item damage in Lina totals', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 18,
    magicResistance: 40,
    linaTalentLsa: true,
    dagonLevel: 3
  });
  const result = DotaTheorycraft.calculateHero(state);

  assert.equal(result.rows[0].title, 'Item Dagon');
  assert.equal(result.rows[0].instant, 360);
  assert.equal(total(result.rows, 'instant'), 1158);
  assert.equal(total(result.rows, 'full'), 1669);
});

test('applies damage rune spell amplification to outgoing damage', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 18,
    magicResistance: 40,
    linaTalentLsa: true,
    damageRune: true
  });
  const result = DotaTheorycraft.calculateHero(state);

  assert.equal(DotaTheorycraft.outgoingSpellAmp(state), 15);
  assert.equal(total(result.rows, 'instant'), 917);
  assert.equal(total(result.rows, 'full'), 1505);
});

test('projects Lina Aghanim Flame Cloak as extra spell amplification', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 18,
    magicResistance: 40,
    linaTalentLsa: true
  });
  const aghanimState = DotaTheorycraft.withExtraSpellAmp(state, DotaTheorycraft.AGHANIM_FLAME_CLOAK_SPELL_AMP);
  const result = DotaTheorycraft.calculateHero(aghanimState);

  assert.equal(DotaTheorycraft.outgoingSpellAmp(aghanimState), 35);
  assert.equal(total(result.rows, 'instant'), 1077);
  assert.equal(total(result.rows, 'full'), 1767);
});

test('includes Ethereal Blade damage and magic vulnerability for Lina', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 18,
    magicResistance: 40,
    linaTalentLsa: true,
    linaEtherealBlade: true
  });
  const result = DotaTheorycraft.calculateHero(state);

  assert.equal(result.rows[0].title, 'Item Ethereal Blade');
  assert.equal(result.rows[0].defaultInstant, 336);
  assert.equal(total(result.rows, 'defaultInstant'), 1633);
  assert.equal(total(result.rows, 'defaultFull'), 2463);
  assert.equal(total(result.rows, 'instant'), 1307);
  assert.equal(total(result.rows, 'full'), 1970);
});

test('stacks generic incoming magic amplification with Ethereal Blade', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'lina',
    level: 7,
    incomingAmp: 20,
    linaEtherealBlade: true,
    linaEbladeAttributes: 300
  });

  assert.equal(DotaTheorycraft.activeIncomingMagicMultiplier(state), 1.56);
  assert.equal(DotaTheorycraft.calculateHero(state).rows[0].defaultInstant, 410);
});

test('uses target HP for Zeus Static Field estimate when provided', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'zeus',
    level: 12,
    spellAmp: 10,
    magicResistance: 35,
    zeusTargetHp: 1400
  });
  const result = DotaTheorycraft.calculateHero(state);
  const staticField = result.rows.find((row) => row.title === 'Static Field');

  assert.equal(staticField.defaultInstant, 114);
  assert.equal(total(result.rows, 'defaultInstant'), 969);
});

test('calculates Storm Spirit Ball Lightning from mana and distance', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'storm',
    level: 12,
    magicResistance: 25,
    stormMana: 1200,
    stormDistance: 1500
  });
  const result = DotaTheorycraft.calculateHero(state);
  const ballLightning = result.rows.find((row) => row.title === 'R Ball Lightning');

  assert.equal(ballLightning.rank, 2);
  assert.equal(ballLightning.defaultInstant, 113);
  assert.equal(ballLightning.detail, 'level 2: 15 x 100 units, mana 382');
});

test('formats Zeus combo note with Static Field when target HP is set', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'zeus',
    magicResistance: 35,
    zeusTargetHp: 1400
  });

  assert.equal(
    DotaTheorycraft.comboNote(DotaTheorycraft.HEROES.zeus, state),
    'MR 35%: W + Q + E + R + Static Field'
  );
});

test('formats compact Lina combo note', () => {
  const state = DotaTheorycraft.normalizeState({
    hero: 'lina',
    magicResistance: 40,
    linaEtherealBlade: true
  });

  assert.equal(DotaTheorycraft.comboNote(DotaTheorycraft.HEROES.lina, state), 'MR 40%: E-Blade + W + R + Q; full includes burn');

  const dagonState = DotaTheorycraft.normalizeState({
    hero: 'lina',
    magicResistance: 40,
    linaEtherealBlade: true,
    damageRune: true,
    dagonLevel: 5
  });
  assert.equal(
    DotaTheorycraft.comboNote(DotaTheorycraft.HEROES.lina, dagonState),
    'MR 40%: E-Blade + DD + Dagon 5 + W + R + Q; full includes burn'
  );
});
