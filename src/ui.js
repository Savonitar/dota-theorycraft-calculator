(function attachUi(root) {
  const model = root.DotaTheorycraft;
  const STORAGE_KEY = 'dota-theorycraft-calculator.state.v1';

  function readStoredState() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function writeStoredState(state) {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      // Persistent form state is optional.
    }
  }

  function init() {
    const elements = {
      heroSelect: document.getElementById('heroSelect'),
      heroSubtitle: document.getElementById('heroSubtitle'),
      heroLevel: document.getElementById('heroLevel'),
      spellAmp: document.getElementById('spellAmp'),
      magicResistance: document.getElementById('magicResistance'),
      incomingAmp: document.getElementById('incomingAmp'),
      dagonLevel: document.getElementById('dagonLevel'),
      heroOptions: document.getElementById('heroOptions'),
      selectedResistLabel: document.getElementById('selectedResistLabel'),
      instantDamage: document.getElementById('instantDamage'),
      fullDamage: document.getElementById('fullDamage'),
      defaultDamageRow: document.getElementById('defaultDamageRow'),
      defaultInstantDamage: document.getElementById('defaultInstantDamage'),
      defaultFullDamage: document.getElementById('defaultFullDamage'),
      aghanimDamageRow: document.getElementById('aghanimDamageRow'),
      aghanimInstantDamage: document.getElementById('aghanimInstantDamage'),
      aghanimFullDamage: document.getElementById('aghanimFullDamage'),
      damageRows: document.getElementById('damageRows'),
      modelNote: document.getElementById('modelNote')
    };

    let state = model.normalizeState({ ...model.DEFAULT_STATE, ...readStoredState() });
    syncCommonInputs(elements, state);
    renderHeroOptions(elements, state);
    render(elements, state);

    const applyCommonChange = (event) => {
      const previousHero = state.hero;
      state = model.normalizeState({
        ...state,
        hero: elements.heroSelect.value,
        level: elements.heroLevel.value,
        spellAmp: elements.spellAmp.value,
        magicResistance: elements.magicResistance.value,
        incomingAmp: elements.incomingAmp.value,
        dagonLevel: elements.dagonLevel.value
      });

      if (event.type === 'change' || event.target === elements.heroSelect) {
        syncCommonInputs(elements, state);
      }

      if (state.hero !== previousHero || event.target === elements.heroSelect || event.target === elements.heroLevel) {
        renderHeroOptions(elements, state);
      }

      render(elements, state);
      writeStoredState(state);
    };

    [
      elements.heroSelect,
      elements.heroLevel,
      elements.spellAmp,
      elements.magicResistance,
      elements.incomingAmp,
      elements.dagonLevel
    ].forEach((element) => {
      element.addEventListener('input', applyCommonChange);
      element.addEventListener('change', applyCommonChange);
    });

    elements.heroOptions.addEventListener('input', (event) => {
      state = readHeroOption(state, event.target);
      render(elements, state);
      writeStoredState(state);
    });

    elements.heroOptions.addEventListener('change', (event) => {
      state = readHeroOption(state, event.target);
      render(elements, state);
      writeStoredState(state);
    });
  }

  function syncCommonInputs(elements, state) {
    elements.heroSelect.value = state.hero;
    elements.heroSubtitle.textContent = model.HEROES[state.hero].subtitle;
    elements.heroLevel.value = state.level;
    elements.spellAmp.value = formatInput(state.spellAmp);
    elements.magicResistance.value = formatInput(state.magicResistance);
    elements.incomingAmp.value = formatInput(state.incomingAmp);
    elements.dagonLevel.value = formatInput(state.dagonLevel);
  }

  function formatInput(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }

  function renderHeroOptions(elements, state) {
    if (state.hero === 'lina') {
      elements.heroOptions.innerHTML = `
        <label class="check-field">
          <input id="linaTalentLsa" type="checkbox">
          <span>LSA +110</span>
        </label>
        <label class="check-field">
          <input id="linaEtherealBlade" type="checkbox">
          <span>E-Blade</span>
        </label>
        <label class="check-field">
          <input id="damageRune" type="checkbox">
          <span>DD +15%</span>
        </label>
      `;
      const lsaTalent = document.getElementById('linaTalentLsa');
      lsaTalent.checked = state.level >= 15 && state.linaTalentLsa;
      lsaTalent.disabled = state.level < 15;
      document.getElementById('linaEtherealBlade').checked = state.linaEtherealBlade;
      document.getElementById('damageRune').checked = state.damageRune;
      return;
    }

    if (state.hero === 'zeus') {
      elements.heroOptions.innerHTML = `
        <label class="check-field">
          <input id="zeusTalentUlt" type="checkbox">
          <span>R +75</span>
        </label>
        <label class="field compact-field">
          <span>HP</span>
          <input id="zeusTargetHp" type="number" min="0" max="100000" step="10">
        </label>
        <label class="check-field">
          <input id="damageRune" type="checkbox">
          <span>DD +15%</span>
        </label>
      `;
      const talent = document.getElementById('zeusTalentUlt');
      talent.checked = state.level >= 15 && state.zeusTalentUlt;
      talent.disabled = state.level < 15;
      document.getElementById('zeusTargetHp').value = formatInput(state.zeusTargetHp);
      document.getElementById('damageRune').checked = state.damageRune;
      return;
    }

    elements.heroOptions.innerHTML = `
      <label class="field compact-field">
        <span>Mana</span>
        <input id="stormMana" type="number" min="0" max="100000" step="1">
      </label>
      <label class="field compact-field">
        <span>Dist</span>
        <input id="stormDistance" type="number" min="0" max="50000" step="50">
      </label>
      <label class="check-field">
        <input id="damageRune" type="checkbox">
        <span>DD +15%</span>
      </label>
    `;
    document.getElementById('stormMana').value = formatInput(state.stormMana);
    document.getElementById('stormDistance').value = formatInput(state.stormDistance);
    document.getElementById('damageRune').checked = state.damageRune;
  }

  function readHeroOption(currentState, target) {
    const nextState = { ...currentState };

    if (target.id === 'linaTalentLsa') {
      nextState.linaTalentLsa = target.checked;
    }

    if (target.id === 'linaEtherealBlade') {
      nextState.linaEtherealBlade = target.checked;
    }

    if (target.id === 'damageRune') {
      nextState.damageRune = target.checked;
    }

    if (target.id === 'zeusTalentUlt') {
      nextState.zeusTalentUlt = target.checked;
    }

    if (target.id === 'zeusTargetHp') {
      nextState.zeusTargetHp = target.value;
    }

    if (target.id === 'stormMana') {
      nextState.stormMana = target.value;
    }

    if (target.id === 'stormDistance') {
      nextState.stormDistance = target.value;
    }

    return model.normalizeState(nextState);
  }

  function render(elements, state) {
    const hero = model.HEROES[state.hero];
    const result = model.calculateHero(state);
    const instantTotal = model.totalRows(result.rows, 'instant');
    const fullTotal = model.totalRows(result.rows, 'full');
    const defaultInstantTotal = model.totalRows(result.rows, 'defaultInstant');
    const defaultFullTotal = model.totalRows(result.rows, 'defaultFull');
    const showAghanim = state.hero === 'lina';

    elements.selectedResistLabel.textContent = `MR ${formatInput(state.magicResistance)}%`;
    elements.defaultDamageRow.hidden = state.magicResistance === model.DEFAULT_MAGIC_RESISTANCE;
    elements.instantDamage.textContent = String(instantTotal);
    elements.fullDamage.textContent = String(fullTotal);
    elements.defaultInstantDamage.textContent = String(defaultInstantTotal);
    elements.defaultFullDamage.textContent = String(defaultFullTotal);
    elements.aghanimDamageRow.hidden = !showAghanim;

    if (showAghanim) {
      const aghanimState = model.withExtraSpellAmp(state, model.AGHANIM_FLAME_CLOAK_SPELL_AMP);
      const aghanimResult = model.calculateHero(aghanimState);
      elements.aghanimInstantDamage.textContent = String(model.totalRows(aghanimResult.rows, 'instant'));
      elements.aghanimFullDamage.textContent = String(model.totalRows(aghanimResult.rows, 'full'));
    }

    elements.damageRows.innerHTML = result.rows.map((row) => `
      <div class="breakdown-row">
        <span title="${escapeAttribute(row.detail)}">${escapeHtml(row.title)}</span>
        <span>${row.rank || '-'}</span>
        <strong>${row.instant}</strong>
        <strong>${row.full}</strong>
      </div>
    `).join('');
    elements.modelNote.textContent = model.comboNote(hero, state);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
