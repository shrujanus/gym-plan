(function () {
  const DEFAULT_PATH = "data/workouts.json";

  function repoFromLocation() {
    // GitHub Pages: https://user.github.io/repo/
    const host = window.location.hostname || "";
    const parts = (window.location.pathname || "/").split("/").filter(Boolean);
    if (host.endsWith(".github.io") && parts[0]) {
      return { owner: host.replace(".github.io", ""), repo: parts[0] };
    }
    // Local / custom: fall back to known repo
    return { owner: "shrujanus", repo: "gym-plan" };
  }

  function headers(token) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };
  }

  function encodeContent(obj) {
    const json = JSON.stringify(obj, null, 2) + "\n";
    return btoa(unescape(encodeURIComponent(json)));
  }

  function decodeContent(b64) {
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }

  async function getRemote(token, path = DEFAULT_PATH) {
    const { owner, repo } = repoFromLocation();
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, { headers: headers(token) });
    if (res.status === 404) return { exists: false, data: null, sha: null, path };
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub read failed (${res.status})`);
    }
    const body = await res.json();
    return {
      exists: true,
      data: decodeContent(body.content),
      sha: body.sha,
      path,
    };
  }

  async function putRemote(token, payload, sha, path = DEFAULT_PATH) {
    const { owner, repo } = repoFromLocation();
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const body = {
      message: `chore: sync workout log ${new Date().toISOString().slice(0, 19)}Z`,
      content: encodeContent(payload),
      branch: "main",
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub write failed (${res.status})`);
    }
    return res.json();
  }

  function snapshotFromState(state) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      unit: state.unit,
      oneRms: state.oneRms,
      weakPoints: state.weakPoints,
      currentWeek: state.currentWeek,
      currentDay: state.currentDay,
      setupComplete: state.setupComplete,
      logs: state.logs,
    };
  }

  function applyRemoteToState(state, remote) {
    if (!remote) return state;
    if (remote.unit) state.unit = remote.unit;
    if (remote.oneRms) state.oneRms = Object.assign({}, state.oneRms, remote.oneRms);
    if (remote.weakPoints) state.weakPoints = remote.weakPoints;
    if (remote.currentWeek) state.currentWeek = remote.currentWeek;
    if (remote.currentDay) state.currentDay = remote.currentDay;
    if (typeof remote.setupComplete === "boolean") state.setupComplete = remote.setupComplete;
    if (Array.isArray(remote.logs)) {
      // Merge by week+day+date; remote wins on conflict
      const map = new Map();
      for (const log of state.logs || []) {
        map.set(`${log.week}-${log.day}-${log.date}`, log);
      }
      for (const log of remote.logs) {
        map.set(`${log.week}-${log.day}-${log.date}`, log);
      }
      state.logs = [...map.values()].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );
    }
    if (
      remote.oneRms &&
      (remote.oneRms.squat || remote.oneRms.bench || remote.oneRms.deadlift)
    ) {
      state.setupComplete = true;
    }
    return state;
  }

  async function pull(state) {
    if (!state.githubToken) throw new Error("Add a GitHub token in Settings first");
    const remote = await getRemote(state.githubToken, state.githubPath || DEFAULT_PATH);
    if (remote.exists) applyRemoteToState(state, remote.data);
    state.githubSha = remote.sha || null;
    state.lastSyncedAt = new Date().toISOString();
    return { pulled: remote.exists, sha: remote.sha };
  }

  async function push(state) {
    if (!state.githubToken) throw new Error("Add a GitHub token in Settings first");
    const path = state.githubPath || DEFAULT_PATH;
    let sha = state.githubSha || null;
    if (!sha) {
      const current = await getRemote(state.githubToken, path);
      sha = current.sha;
    }
    const payload = snapshotFromState(state);
    const result = await putRemote(state.githubToken, payload, sha, path);
    state.githubSha = result.content?.sha || null;
    state.lastSyncedAt = payload.updatedAt;
    return result;
  }

  window.GithubDb = {
    DEFAULT_PATH,
    repoFromLocation,
    pull,
    push,
    snapshotFromState,
    applyRemoteToState,
  };
})();
