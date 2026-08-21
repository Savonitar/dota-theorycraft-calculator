(function exposeDamageModel(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  root.DotaTheorycraft = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildDamageModel() {
  const DEFAULT_MAGIC_RESISTANCE = 25;
  const LINA_SLOW_BURN_MULTIPLIER = 0.64;
  const LINA_SLOW_BURN_TALENT_MULTIPLIER = 0.80;
  const AGHANIM_FLAME_CLOAK_SPELL_AMP = 35;
  const DAMAGE_RUNE_SPELL_AMP = 15;
  const ETHEREAL_BLADE_MAGIC_AMP = 30;
  const ETHEREAL_BLADE_BASE_DAMAGE = 50;
  const ETHEREAL_BLADE_ATTRIBUTE_BONUS = 72;
  const DAGON_DAMAGE = [400, 500, 600, 700, 800];

  const LINA_ATTRIBUTES = {
    strength: 20,
    agility: 23,
    intelligence: 30,
    strengthGain: 2.4,
    agilityGain: 2.4,
    intelligenceGain: 4
  };

  const HEROES = {
    lina: {
      title: 'Lina',
      subtitle: 'Dragon Slave, Light Strike Array, Laguna Blade',
      build: {
        q: [1, 3, 5, 7],
        w: [2, 4, 8, 9],
        r: [6, 12, 18]
      },
      damage: {
        q: [65, 125, 185, 245],
        w: [80, 125, 170, 215],
        r: [400, 580, 760]
      }
    },
    zeus: {
      title: 'Zeus',
      subtitle: 'Arc Lightning, Lightning Bolt, Heavenly Jump, Thundergod Wrath',
      build: {
        q: [1, 3, 5, 7],
        w: [2, 8, 9, 10],
        e: [4, 11, 13, 14],
        r: [6, 12, 18]
      },
      damage: {
        q: [105, 130, 155, 180],
        w: [140, 220, 300, 380],
        e: [25, 50, 75, 100],
        r: [275, 425, 575]
      }
    },
    storm: {
      title: 'Storm Spirit',
      subtitle: 'Static Remnant, Overload, Ball Lightning',
      build: {
        q: [1, 3, 5, 7],
        e: [2, 4, 8, 9],
        r: [6, 12, 18]
      },
      damage: {
        q: [100, 160, 220, 280],
        e: [25, 50, 75, 100],
        rPer100: [6, 10, 14]
      }
    }
  };

  const DEFAULT_STATE = {
    hero: 'lina',
    level: 7,
    spellAmp: 0,
    magicResistance: DEFAULT_MAGIC_RESISTANCE,
    incomingAmp: 0,
    dagonLevel: 0,
    damageRune: false,
    extraSpellAmp: 0,
    linaTalentLsa: false,
    linaTalentBurn: false,
    linaEtherealBlade: false,
    linaEbladeAttributes: 0,
    zeusTalentUlt: false,
    zeusTargetHp: 0,
    stormMana: 1000,
    stormDistance: 1000
  };

  function toNumber(value, fallback) {
    const normalized = String(value).replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function roundDamage(value) {
    return Math.round(Math.max(0, value));
  }

  function learnedRank(hero, ability, level) {
    const thresholds = HEROES[hero].build[ability] || [];
    return thresholds.filter((requiredLevel) => level >= requiredLevel).length;
  }

  function valueAt(values, rank) {
    return rank > 0 ? values[rank - 1] : 0;
  }

  function magicDamage(rawDamage, spellAmp, magicResistance, incomingMagicMultiplier) {
    const spellMultiplier = 1 + spellAmp / 100;
    const resistanceMultiplier = 1 - magicResistance / 100;
    const incomingMultiplier = incomingMagicMultiplier ?? 1;
    return rawDamage * spellMultiplier * resistanceMultiplier * incomingMultiplier;
  }

  function outgoingSpellAmp(state) {
    const runeAmp = state.damageRune ? DAMAGE_RUNE_SPELL_AMP : 0;
    return state.spellAmp + state.extraSpellAmp + runeAmp;
  }

  function withExtraSpellAmp(inputState, extraSpellAmp) {
    const state = normalizeState(inputState);
    return normalizeState({
      ...state,
      extraSpellAmp: state.extraSpellAmp + extraSpellAmp
    });
  }

  function activeIncomingMagicMultiplier(state) {
    let multiplier = 1 + state.incomingAmp / 100;

    if (state.hero === 'lina' && state.linaEtherealBlade) {
      multiplier *= 1 + ETHEREAL_BLADE_MAGIC_AMP / 100;
    }

    return multiplier;
  }

  function makeTimedMagicRow(title, rank, instantRawDamage, fullRawDamage, detail, state) {
    const incomingMultiplier = activeIncomingMagicMultiplier(state);
    const spellAmp = outgoingSpellAmp(state);

    return {
      title,
      rank,
      detail,
      instant: roundDamage(magicDamage(instantRawDamage, spellAmp, state.magicResistance, incomingMultiplier)),
      full: roundDamage(magicDamage(fullRawDamage, spellAmp, state.magicResistance, incomingMultiplier)),
      defaultInstant: roundDamage(magicDamage(instantRawDamage, spellAmp, DEFAULT_MAGIC_RESISTANCE, incomingMultiplier)),
      defaultFull: roundDamage(magicDamage(fullRawDamage, spellAmp, DEFAULT_MAGIC_RESISTANCE, incomingMultiplier))
    };
  }

  function makeMagicRow(title, rank, rawDamage, detail, state) {
    return makeTimedMagicRow(title, rank, rawDamage, rawDamage, detail, state);
  }

  function addDagonRow(rows, state) {
    if (state.dagonLevel <= 0) {
      return rows;
    }

    const rawDamage = DAGON_DAMAGE[state.dagonLevel - 1];
    rows.unshift(makeMagicRow('Item Dagon', state.dagonLevel, rawDamage, `level ${state.dagonLevel}: ${rawDamage}`, state));
    return rows;
  }

  function calculateLina(state) {
    const qRank = learnedRank('lina', 'q', state.level);
    const wRank = learnedRank('lina', 'w', state.level);
    const rRank = learnedRank('lina', 'r', state.level);
    const talentLsa = state.level >= 15 && state.linaTalentLsa ? 110 : 0;

    const rows = [
      linaRow('Q Dragon Slave', qRank, valueAt(HEROES.lina.damage.q, qRank), state),
      linaRow('W Light Strike Array', wRank, valueAt(HEROES.lina.damage.w, wRank), state, talentLsa),
      linaRow('R Laguna Blade', rRank, valueAt(HEROES.lina.damage.r, rRank), state)
    ];

    if (state.linaEtherealBlade) {
      rows.unshift(linaEtherealBladeRow(state));
    }

    addDagonRow(rows, state);

    return { rows };
  }

  function linaEtherealBladeRow(state) {
    const attributes = linaEbladeAttributeSum(state);
    const rawDamage = ETHEREAL_BLADE_BASE_DAMAGE + attributes;
    const detail = `50 + ${formatBase(attributes)} attributes, +30% magic taken`;
    return makeMagicRow('Item Ethereal Blade', 1, rawDamage, detail, state);
  }

  function linaRow(title, rank, baseImpactDamage, state, talentDamage) {
    const impactDamage = rank > 0 ? baseImpactDamage + (talentDamage || 0) : 0;
    const hasBurnTalent = state.level >= 25 && state.linaTalentBurn;
    const burnMultiplier = hasBurnTalent
      ? LINA_SLOW_BURN_TALENT_MULTIPLIER
      : LINA_SLOW_BURN_MULTIPLIER;
    const burnDamage = impactDamage * burnMultiplier;
    const rawTotal = rank > 0 ? impactDamage + burnDamage : 0;
    const impactText = talentDamage ? `${baseImpactDamage} + ${talentDamage}` : formatBase(impactDamage);
    const detail = rank > 0
      ? `level ${rank}: ${impactText} impact + ${hasBurnTalent ? '80% burn (+1s talent)' : '64% burn'}`
      : 'not learned';

    return makeTimedMagicRow(title, rank, impactDamage, rawTotal, detail, state);
  }

  function linaEbladeAttributeSum(state) {
    if (state.linaEbladeAttributes > 0) {
      return state.linaEbladeAttributes;
    }

    return defaultLinaEbladeAttributeSum(state.level);
  }

  function defaultLinaEbladeAttributeSum(level) {
    const levelUps = level - 1;
    const baseAttributes =
      LINA_ATTRIBUTES.strength +
      LINA_ATTRIBUTES.agility +
      LINA_ATTRIBUTES.intelligence;
    const gainedAttributes = levelUps * (
      LINA_ATTRIBUTES.strengthGain +
      LINA_ATTRIBUTES.agilityGain +
      LINA_ATTRIBUTES.intelligenceGain
    );

    return baseAttributes + gainedAttributes + ETHEREAL_BLADE_ATTRIBUTE_BONUS;
  }

  function calculateZeus(state) {
    const qRank = learnedRank('zeus', 'q', state.level);
    const wRank = learnedRank('zeus', 'w', state.level);
    const eRank = learnedRank('zeus', 'e', state.level);
    const rRank = learnedRank('zeus', 'r', state.level);
    const talentUlt = state.level >= 15 && state.zeusTalentUlt ? 75 : 0;

    const rows = [
      makeMagicRow('Q Arc Lightning', qRank, valueAt(HEROES.zeus.damage.q, qRank), spellDetail(qRank), state),
      makeMagicRow('W Lightning Bolt', wRank, valueAt(HEROES.zeus.damage.w, wRank), spellDetail(wRank), state),
      makeMagicRow('E Heavenly Jump', eRank, valueAt(HEROES.zeus.damage.e, eRank), spellDetail(eRank), state),
      makeMagicRow('R Thundergod Wrath', rRank, valueAt(HEROES.zeus.damage.r, rRank) + talentUlt, spellDetail(rRank, talentUlt), state)
    ];

    const learnedCasts = rows.filter((row) => row.rank > 0).length;
    if (learnedCasts > 0 && state.zeusTargetHp > 0) {
      rows.push({
        title: 'Static Field',
        rank: learnedCasts,
        detail: `${formatBase(staticFieldPercent(state.level))}% current HP x${learnedCasts}`,
        instant: roundDamage(zeusStaticDamage(state, state.magicResistance, rows)),
        full: roundDamage(zeusStaticDamage(state, state.magicResistance, rows)),
        defaultInstant: roundDamage(zeusStaticDamage(state, DEFAULT_MAGIC_RESISTANCE, rows)),
        defaultFull: roundDamage(zeusStaticDamage(state, DEFAULT_MAGIC_RESISTANCE, rows))
      });
    }

    addDagonRow(rows, state);

    return { rows };
  }

  function zeusStaticDamage(state, magicResistance, directRows) {
    let hp = state.zeusTargetHp;
    let totalStatic = 0;
    const staticPct = staticFieldPercent(state.level) / 100;
    const incomingMultiplier = activeIncomingMagicMultiplier(state);
    const spellAmp = outgoingSpellAmp(state);

    directRows.forEach((row) => {
      if (!row.rank || hp <= 0 || row.title === 'Static Field') {
        return;
      }

      const directDamage = zeusDirectRawDamage(row.title, row.rank, state);
      const direct = magicDamage(directDamage, spellAmp, magicResistance, incomingMultiplier);
      hp = Math.max(0, hp - direct);

      const staticDamage = magicDamage(hp * staticPct, spellAmp, magicResistance, incomingMultiplier);
      totalStatic += Math.max(0, staticDamage);
      hp = Math.max(0, hp - staticDamage);
    });

    return totalStatic;
  }

  function zeusDirectRawDamage(title, rank, state) {
    if (title.startsWith('W')) {
      return valueAt(HEROES.zeus.damage.w, rank);
    }

    if (title.startsWith('E')) {
      return valueAt(HEROES.zeus.damage.e, rank);
    }

    if (title.startsWith('R')) {
      const talentUlt = state.level >= 15 && state.zeusTalentUlt ? 75 : 0;
      return valueAt(HEROES.zeus.damage.r, rank) + talentUlt;
    }

    return valueAt(HEROES.zeus.damage.q, rank);
  }

  function staticFieldPercent(level) {
    return 3.45 + level * 0.05;
  }

  function calculateStorm(state) {
    const qRank = learnedRank('storm', 'q', state.level);
    const eRank = learnedRank('storm', 'e', state.level);
    const rRank = learnedRank('storm', 'r', state.level);
    const distanceSteps = Math.floor(state.stormDistance / 100);
    const ballRawDamage = rRank > 0 ? distanceSteps * valueAt(HEROES.storm.damage.rPer100, rRank) : 0;
    const ballMana = rRank > 0
      ? 25 + state.stormMana * 0.075 + (state.stormDistance / 100) * (10 + state.stormMana * 0.0065)
      : 0;

    const rows = [
      makeMagicRow('Q Static Remnant', qRank, valueAt(HEROES.storm.damage.q, qRank), spellDetail(qRank), state),
      makeMagicRow('E Overload hit', eRank, valueAt(HEROES.storm.damage.e, eRank), spellDetail(eRank), state),
      makeMagicRow(
        'R Ball Lightning',
        rRank,
        ballRawDamage,
        rRank > 0 ? `level ${rRank}: ${distanceSteps} x 100 units, mana ${formatBase(ballMana)}` : 'not learned',
        state
      )
    ];

    addDagonRow(rows, state);

    return { rows };
  }

  function spellDetail(rank, talentDamage) {
    if (rank <= 0) {
      return 'not learned';
    }

    return talentDamage ? `level ${rank} + talent ${talentDamage}` : `level ${rank}`;
  }

  function formatBase(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function calculateHero(inputState) {
    const state = normalizeState(inputState);

    if (state.hero === 'zeus') {
      return calculateZeus(state);
    }

    if (state.hero === 'storm') {
      return calculateStorm(state);
    }

    return calculateLina(state);
  }

  function normalizeState(inputState) {
    const merged = { ...DEFAULT_STATE, ...(inputState || {}) };

    return {
      hero: HEROES[merged.hero] ? merged.hero : DEFAULT_STATE.hero,
      level: clamp(Math.round(toNumber(merged.level, DEFAULT_STATE.level)), 1, 30),
      spellAmp: clamp(toNumber(merged.spellAmp, DEFAULT_STATE.spellAmp), -100, 500),
      magicResistance: clamp(toNumber(merged.magicResistance, DEFAULT_STATE.magicResistance), -100, 100),
      incomingAmp: clamp(toNumber(merged.incomingAmp, DEFAULT_STATE.incomingAmp), -100, 500),
      dagonLevel: clamp(Math.round(toNumber(merged.dagonLevel, DEFAULT_STATE.dagonLevel)), 0, 5),
      damageRune: Boolean(merged.damageRune),
      extraSpellAmp: clamp(toNumber(merged.extraSpellAmp, DEFAULT_STATE.extraSpellAmp), -100, 500),
      linaTalentLsa: Boolean(merged.linaTalentLsa),
      linaTalentBurn: Boolean(merged.linaTalentBurn),
      linaEtherealBlade: Boolean(merged.linaEtherealBlade),
      linaEbladeAttributes: clamp(toNumber(merged.linaEbladeAttributes, DEFAULT_STATE.linaEbladeAttributes), 0, 10000),
      zeusTalentUlt: Boolean(merged.zeusTalentUlt),
      zeusTargetHp: clamp(toNumber(merged.zeusTargetHp, DEFAULT_STATE.zeusTargetHp), 0, 100000),
      stormMana: clamp(toNumber(merged.stormMana, DEFAULT_STATE.stormMana), 0, 100000),
      stormDistance: clamp(toNumber(merged.stormDistance, DEFAULT_STATE.stormDistance), 0, 50000)
    };
  }

  function totalRows(rows, key) {
    return rows.reduce((total, row) => total + row[key], 0);
  }

  function comboNote(hero, state) {
    const pieces = [];

    if (state.hero === 'lina' && state.linaEtherealBlade) {
      pieces.push('E-Blade');
    }

    if (state.damageRune) {
      pieces.push('DD');
    }

    if (state.dagonLevel > 0) {
      pieces.push(`Dagon ${state.dagonLevel}`);
    }

    if (state.hero === 'lina') {
      pieces.push('W', 'R', 'Q');
      return `MR ${formatBase(state.magicResistance)}%: ${pieces.join(' + ')}; full includes burn`;
    }

    if (state.hero === 'zeus') {
      pieces.push('W', 'Q', 'E', 'R');

      if (state.zeusTargetHp > 0) {
        pieces.push('Static Field');
      }

      return `MR ${formatBase(state.magicResistance)}%: ${pieces.join(' + ')}`;
    }

    pieces.push('Q', 'E', 'R');
    return `MR ${formatBase(state.magicResistance)}%: ${pieces.join(' + ')}`;
  }

  return {
    AGHANIM_FLAME_CLOAK_SPELL_AMP,
    DEFAULT_MAGIC_RESISTANCE,
    DEFAULT_STATE,
    HEROES,
    activeIncomingMagicMultiplier,
    calculateHero,
    comboNote,
    normalizeState,
    outgoingSpellAmp,
    totalRows,
    withExtraSpellAmp
  };
});
