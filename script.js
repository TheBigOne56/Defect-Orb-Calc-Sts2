function calculateExactStats(targetsHp, orbSequence, comboTargets) {
  let states = new Map();
  const initialState = Object.values(targetsHp);
  states.set(JSON.stringify(initialState), 1.0);

  const targetIds = Object.keys(targetsHp).map(Number);

  for (const [orbType, dmg] of orbSequence) {
    const nextStates = new Map();

    for (const [stateStr, prob] of states.entries()) {
      const state = JSON.parse(stateStr);

      const aliveIndices = state
        .map((hp, i) => (hp > 0 ? i : -1))
        .filter(i => i !== -1);

      if (aliveIndices.length === 0) {
        nextStates.set(stateStr, (nextStates.get(stateStr) || 0) + prob);
        continue;
      }

      if (orbType === "G") {
        const newState = [...state];
        for (const idx of aliveIndices) {
          newState[idx] = Math.max(0, newState[idx] - dmg);
        }

        const key = JSON.stringify(newState);
        nextStates.set(key, (nextStates.get(key) || 0) + prob);

      } else {
        const hitProb = prob / aliveIndices.length;

        for (const idx of aliveIndices) {
          const newState = [...state];
          newState[idx] = Math.max(0, newState[idx] - dmg);

          const key = JSON.stringify(newState);
          nextStates.set(key, (nextStates.get(key) || 0) + hitProb);
        }
      }
    }

    states = nextStates;
  }

  const destructionProbs = {};
  const expectedDamage = {};
  let bothDestroyedProb = 0;
  let eitherDestroyedProb = 0;

  for (const id of targetIds) {
    destructionProbs[id] = 0;
    expectedDamage[id] = 0;
  }

  const checkIndices = comboTargets.map(
    tid => targetIds.indexOf(tid)
  );

  for (const [stateStr, prob] of states.entries()) {
    const state = JSON.parse(stateStr);

    const deadCount = checkIndices.filter(i => state[i] === 0).length;

    if (deadCount === comboTargets.length) {
      bothDestroyedProb += prob;
    }
    if (deadCount > 0) {
      eitherDestroyedProb += prob;
    }

    state.forEach((hp, i) => {
      const tId = targetIds[i];

      if (hp === 0) {
        destructionProbs[tId] += prob;
      }

      const damage = targetsHp[tId] - hp;
      expectedDamage[tId] += damage * prob;
    });
  }

  return {
    destructionProbs,
    expectedDamage,
    bothDestroyedProb,
    eitherDestroyedProb
  };
}

function run() {
  try {
    const targets = JSON.parse(document.getElementById("targets").value);
    const orbs = JSON.parse(document.getElementById("orbs").value);
    const combo = JSON.parse(document.getElementById("combo").value);

    const result = calculateExactStats(targets, orbs, combo);

    let text = "--- Individual Stats ---\n\n";

    for (const id in result.destructionProbs) {
      text += `Target ${id}:\n`;
      text += `  Destroyed: ${(result.destructionProbs[id] * 100).toFixed(2)}%\n`;
      text += `  Exp Damage: ${result.expectedDamage[id].toFixed(2)}\n\n`;
    }

    text += "--- Combo Stats ---\n";
    text += `Both Destroyed: ${(result.bothDestroyedProb * 100).toFixed(2)}%\n`;
    text += `Either Destroyed: ${(result.eitherDestroyedProb * 100).toFixed(2)}%\n`;

    document.getElementById("output").textContent = text;

  } catch (err) {
    document.getElementById("output").textContent =
      "Error in input:\n" + err.message;
  }
}
