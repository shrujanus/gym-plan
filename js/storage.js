(function () {
  const KEY = "ul4x-tracker-v1";

  const defaults = () => ({
    setupComplete: false,
    unit: "lb",
    oneRms: {
      squat: null,
      bench: null,
      deadlift: null,
      ohp: null,
      incline: null,
    },
    currentWeek: 1,
    currentDay: 1,
    weakPoints: {
      upper: { bodypart: "", exercise: "" },
      lower: { bodypart: "", exercise: "" },
    },
    logs: [],
    sessionDrafts: {},
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return Object.assign(defaults(), JSON.parse(raw));
    } catch {
      return defaults();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function draftKey(week, day) {
    return `w${week}-d${day}`;
  }

  function upsertLog(state, log) {
    const idx = state.logs.findIndex(
      (l) => l.week === log.week && l.day === log.day && l.date === log.date
    );
    if (idx >= 0) state.logs[idx] = log;
    else state.logs.push(log);
    state.logs.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  window.Store = { load, save, draftKey, upsertLog, defaults };
})();
