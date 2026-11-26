(function () {
  const PLATE_LB = 5;
  const PLATE_KG = 2.5;

  function unitStep(unit) {
    return unit === "kg" ? PLATE_KG : PLATE_LB;
  }

  function roundTo(value, step) {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.round(value / step) * step;
  }

  function formatWeight(value, unit) {
    if (!Number.isFinite(value) || value <= 0) return "—";
    const n = Number(value);
    const shown = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
    return `${shown} ${unit}`;
  }

  function workingWeight(oneRm, pct, unit) {
    if (!oneRm || !pct) return null;
    return roundTo(oneRm * (pct / 100), unitStep(unit));
  }

  function pyramidSets(oneRm, unit, barWeight) {
    const steps = window.PROGRAM.warmup.pyramid;
    const bar = barWeight ?? (unit === "kg" ? 20 : 45);
    return steps.map((step) => {
      let weight;
      if (step.fixed != null && !oneRm) {
        weight = unit === "kg" ? 20 : step.fixed;
      } else if (step.pct == null) {
        weight = unit === "kg" ? 20 : bar;
      } else if (!oneRm) {
        weight = null;
      } else {
        weight = roundTo(oneRm * (step.pct / 100), unitStep(unit));
        if (weight < bar) weight = bar;
      }
      return {
        label: step.label,
        reps: step.reps,
        weight,
      };
    });
  }

  function suggestFromHistory(logs, exerciseName) {
    if (!logs || !logs.length) return null;
    for (let i = logs.length - 1; i >= 0; i -= 1) {
      const session = logs[i];
      const entry = (session.exercises || []).find((e) => e.name === exerciseName);
      if (!entry || !entry.sets || !entry.sets.length) continue;
      const last = entry.sets.filter((s) => s.weight).pop();
      if (last) return last.weight;
    }
    return null;
  }

  window.Weights = {
    roundTo,
    formatWeight,
    workingWeight,
    pyramidSets,
    suggestFromHistory,
    unitStep,
  };
})();
