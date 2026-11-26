(function () {
  const KEY = "ul4x-tracker-v1";
  const TOKEN_KEY = "ul4x-github-token";

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
    githubPath: "data/workouts.json",
    githubSha: null,
    lastSyncedAt: null,
    autoSync: true,
  });

  function loadToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveToken(token) {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const state = raw ? Object.assign(defaults(), JSON.parse(raw)) : defaults();
      // Token stays in a separate key so it is never written into workouts.json
      state.githubToken = loadToken();
      return state;
    } catch {
      const state = defaults();
      state.githubToken = loadToken();
      return state;
    }
  }

  function save(state) {
    const copy = { ...state };
    const token = copy.githubToken || "";
    delete copy.githubToken;
    localStorage.setItem(KEY, JSON.stringify(copy));
    saveToken(token);
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

  window.Store = { load, save, draftKey, upsertLog, defaults, saveToken };
})();
