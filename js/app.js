(function () {
  const state = Store.load();
  let view = state.setupComplete ? "home" : "setup";
  let restEndsAt = null;
  let restTimerId = null;
  let toastTimer = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function persist() {
    Store.save(state);
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function unit() {
    return state.unit || "lb";
  }

  function weekData(week = state.currentWeek) {
    return window.PROGRAM.weeks[String(week)];
  }

  function dayData(week = state.currentWeek, day = state.currentDay) {
    return weekData(week).days[day - 1];
  }

  function logsFor(week, day) {
    return state.logs.filter((l) => l.week === week && l.day === day);
  }

  function isDayDone(week, day) {
    return logsFor(week, day).some((l) => l.completed);
  }

  function completedCount() {
    let n = 0;
    for (let w = 1; w <= 9; w += 1) {
      for (let d = 1; d <= 4; d += 1) if (isDayDone(w, d)) n += 1;
    }
    return n;
  }

  function getDraft() {
    const key = Store.draftKey(state.currentWeek, state.currentDay);
    if (!state.sessionDrafts[key]) {
      state.sessionDrafts[key] = {
        warmupDone: {},
        exercises: {},
      };
    }
    return state.sessionDrafts[key];
  }

  function ensureExerciseDraft(ex, idx) {
    const draft = getDraft();
    const id = `${idx}:${ex.name}`;
    if (!draft.exercises[id]) {
      const sets = [];
      for (let i = 0; i < ex.sets; i += 1) {
        sets.push({ weight: "", reps: "", rpe: "", done: false });
      }
      draft.exercises[id] = {
        name: ex.name,
        chosenWeak: "",
        sets,
      };
    }
    return { id, data: draft.exercises[id] };
  }

  function targetFor(ex) {
    if (!ex.pct1rm || !ex.oneRmKey) return null;
    const oneRm = Number(state.oneRms[ex.oneRmKey]);
    return Weights.workingWeight(oneRm, ex.pct1rm, unit());
  }

  function startRest(minutesHint) {
    let secs = 120;
    if (minutesHint) {
      const m = String(minutesHint).match(/(\d+)/);
      if (m) secs = Number(m[1]) * 60;
    }
    restEndsAt = Date.now() + secs * 1000;
    $("#rest-bar").classList.add("visible");
    tickRest();
    clearInterval(restTimerId);
    restTimerId = setInterval(tickRest, 250);
  }

  function stopRest() {
    restEndsAt = null;
    clearInterval(restTimerId);
    $("#rest-bar").classList.remove("visible");
  }

  function tickRest() {
    if (!restEndsAt) return;
    const left = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
    const mm = String(Math.floor(left / 60)).padStart(2, "0");
    const ss = String(left % 60).padStart(2, "0");
    $("#rest-time").textContent = `${mm}:${ss}`;
    if (left <= 0) {
      stopRest();
      toast("Rest done — next set");
    }
  }

  function setView(next) {
    view = next;
    render();
  }

  function navActive() {
    $$(".nav button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function renderSetup() {
    const oneRmFields = window.PROGRAM.oneRms
      .map(
        (lift) => `
      <div class="field">
        <label for="orm-${lift.key}">${lift.label} 1RM (${unit()})</label>
        <input id="orm-${lift.key}" type="number" min="0" step="any" value="${
          state.oneRms[lift.key] ?? ""
        }" data-orm="${lift.key}" />
      </div>`
      )
      .join("");

    return `
      <section class="panel">
        <p class="eyebrow">Get set</p>
        <h2>Dial in your lifts</h2>
        <p class="muted">Enter estimated 1RMs. Working weights and primary warm-up pyramids are calculated from these.</p>
        <div class="form-grid" style="margin-top:1rem">
          <div class="field">
            <label for="unit">Units</label>
            <select id="unit">
              <option value="lb" ${state.unit === "lb" ? "selected" : ""}>Pounds (lb)</option>
              <option value="kg" ${state.unit === "kg" ? "selected" : ""}>Kilograms (kg)</option>
            </select>
          </div>
          ${oneRmFields}
        </div>
        <div class="btn-row">
          <button class="btn btn-accent" id="save-setup">Save & start training</button>
        </div>
        <p class="attribution">${window.PROGRAM.attribution}</p>
      </section>`;
  }

  function renderHome() {
    const wd = weekData();
    const day = dayData();
    const done = completedCount();
    const pct = Math.round((done / 36) * 100);

    const chips = wd.days
      .map((d, i) => {
        const dayNum = i + 1;
        const finished = isDayDone(state.currentWeek, dayNum);
        return `
        <button class="day-chip ${state.currentDay === dayNum ? "active" : ""} ${
          finished ? "done" : ""
        }" data-day="${dayNum}">
          <div class="d-label">${d.label}</div>
          <div class="d-meta">${finished ? "Logged ✓" : `Day ${dayNum}`}</div>
        </button>`;
      })
      .join("");

    return `
      <div class="hero-stat">
        <div class="stat-card">
          <div>
            <p class="eyebrow">Current block</p>
            <h2>${wd.label}</h2>
            <p class="muted">${day.label} · ${day.exercises.length} lifts</p>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="stat-card alt">
          <div>
            <p class="eyebrow">Program progress</p>
            <h2>${done}/36</h2>
            <p class="muted">Sessions logged across 9 weeks</p>
          </div>
          <p class="muted" style="margin:0">Wave ${wd.wave} of 3</p>
        </div>
      </div>

      <section class="panel">
        <div class="week-nav">
          <button class="icon-btn" id="week-prev" aria-label="Previous week">‹</button>
          <select id="week-select">
            ${[...Array(9)].map((_, i) => {
              const w = i + 1;
              return `<option value="${w}" ${
                state.currentWeek === w ? "selected" : ""
              }>Week ${w} · Wave ${window.PROGRAM.weeks[w].wave}</option>`;
            }).join("")}
          </select>
          <button class="icon-btn" id="week-next" aria-label="Next week">›</button>
        </div>
        <div class="day-grid">${chips}</div>
        <div class="btn-row">
          <button class="btn btn-accent" id="start-workout">Open ${day.label}</button>
          <button class="btn btn-ghost" data-goto="warmup">Warm-up protocol</button>
        </div>
      </section>`;
  }

  function renderWarmup() {
    const draft = getDraft();
    const items = window.PROGRAM.warmup.protocol
      .map((item, i) => {
        const done = !!draft.warmupDone[i];
        return `
        <button class="warmup-item ${done ? "done" : ""}" data-wu="${i}">
          <span class="check">${done ? "✓" : ""}</span>
          <span>
            <strong>${item.name}</strong>
            <div class="notes" style="margin:0.2rem 0 0">${item.notes || ""}</div>
          </span>
          <span class="wu-meta badge">${item.sets ? `${item.sets}×` : ""} ${item.reps}</span>
        </button>`;
      })
      .join("");

    return `
      <section class="panel">
        <p class="eyebrow">Before heavy lifting</p>
        <h2>General warm-up</h2>
        <p class="muted">Keep this under 10–20 minutes. Primary lifts also get a loading pyramid in the workout view.</p>
        <div class="warmup-list" style="margin-top:1rem">${items}</div>
        <div class="btn-row">
          <button class="btn btn-accent" data-goto="workout">Continue to workout</button>
          <button class="btn btn-ghost" id="clear-warmup">Reset checks</button>
        </div>
      </section>`;
  }

  function weakSelect(ex) {
    const isUpper = /upper/i.test(ex.name);
    const group = isUpper ? "upper" : "lower";
    const parts = window.PROGRAM.weakPoints[group];
    const saved = state.weakPoints[group];
    const options = Object.entries(parts)
      .map(([body, list]) => {
        const opts = list
          .map(
            (name) =>
              `<option value="${name}" ${
                saved.exercise === name ? "selected" : ""
              }>${name}</option>`
          )
          .join("");
        return `<optgroup label="${body}">${opts}</optgroup>`;
      })
      .join("");
    return `
      <div class="field" style="margin-bottom:0.75rem">
        <label>Weak-point exercise</label>
        <select data-weak-group="${group}">
          <option value="">Select one…</option>
          ${options}
        </select>
      </div>`;
  }

  function renderExerciseCard(ex, idx) {
    const { id, data } = ensureExerciseDraft(ex, idx);
    const target = targetFor(ex);
    const oneRm = ex.oneRmKey ? Number(state.oneRms[ex.oneRmKey]) : null;
    const hist = Weights.suggestFromHistory(state.logs, ex.name);
    const isWeak = /weak point/i.test(ex.name);

    let pyramidHtml = "";
    if (ex.primary && ex.warmups > 0) {
      const rows = Weights.pyramidSets(oneRm, unit())
        .map(
          (row) => `
        <div class="pyramid-row">
          <span>${row.label}</span>
          <span>${Weights.formatWeight(row.weight, unit())} × ${row.reps}</span>
        </div>`
        )
        .join("");
      pyramidHtml = `<div class="pyramid"><h4>Warm-up pyramid</h4>${rows}</div>`;
    } else if (ex.warmups > 0) {
      pyramidHtml = `<div class="pyramid"><h4>Warm-up</h4><div class="pyramid-row"><span>${ex.warmups} light warm-up set${
        ex.warmups > 1 ? "s" : ""
      }</span><span>build to working weight</span></div></div>`;
    }

    const setHead = `<div class="set-head"><span></span><span>Weight</span><span>Reps</span><span>RPE</span><span></span></div>`;
    const setRows = data.sets
      .map((set, sIdx) => {
        return `
        <div class="set-row ${set.done ? "done" : ""}" data-ex="${id}" data-set="${sIdx}">
          <span class="set-label">${sIdx + 1}</span>
          <input type="number" inputmode="decimal" placeholder="${
            target ?? hist ?? ""
          }" value="${set.weight}" data-field="weight" />
          <input type="text" placeholder="${ex.reps}" value="${set.reps}" data-field="reps" />
          <input type="number" inputmode="decimal" min="1" max="10" step="0.5" placeholder="${
            ex.rpe || ""
          }" value="${set.rpe}" data-field="rpe" />
          <button class="check" data-toggle-set title="Mark set done">${
            set.done ? "✓" : ""
          }</button>
        </div>`;
      })
      .join("");

    const badges = [
      `<span class="badge">${ex.sets} × ${ex.reps}</span>`,
      ex.pct1rm != null ? `<span class="badge accent">${ex.pct1rm}% 1RM</span>` : "",
      ex.rpe ? `<span class="badge">RPE ${ex.rpe}</span>` : "",
      ex.rest ? `<span class="badge">Rest ${ex.rest}</span>` : "",
      ex.superset ? `<span class="badge hot">Superset ${ex.superset}</span>` : "",
      ex.primary ? `<span class="badge hot">Primary</span>` : "",
    ]
      .filter(Boolean)
      .join("");

    return `
      <article class="exercise-card" data-exercise="${id}">
        <div class="exercise-head">
          <div>
            <h3>${ex.name}</h3>
            <div class="badge-row">${badges}</div>
          </div>
          <div class="target-weight">${
            target != null ? Weights.formatWeight(target, unit()) : hist != null ? `~${Weights.formatWeight(hist, unit())}` : "—"
          }</div>
        </div>
        <p class="notes">${ex.notes || ""}</p>
        ${isWeak ? weakSelect(ex) : ""}
        ${pyramidHtml}
        ${setHead}
        <div class="set-table">${setRows}</div>
        <div class="btn-row">
          <button class="btn btn-ghost" data-rest="${ex.rest || "2 min"}">Start rest</button>
        </div>
      </article>`;
  }

  function renderWorkout() {
    const day = dayData();
    const cards = day.exercises.map(renderExerciseCard).join("");
    return `
      <section class="panel">
        <p class="eyebrow">Week ${state.currentWeek} · Day ${state.currentDay}</p>
        <h2>${day.label}</h2>
        <p class="muted">Log every working set. Primary lifts show calculated weight from your 1RMs.</p>
        <div class="btn-row">
          <button class="btn btn-ghost" data-goto="warmup">Warm-up checklist</button>
        </div>
      </section>
      <div class="exercise-list" style="margin-top:1rem">${cards}</div>
      <div class="btn-row" style="margin-top:1rem">
        <button class="btn btn-accent" id="finish-session">Finish & save session</button>
        <button class="btn btn-ghost" id="save-draft">Save draft</button>
      </div>`;
  }

  function renderLog() {
    if (!state.logs.length) {
      return `<section class="panel"><h2>Training log</h2><div class="empty">No sessions logged yet. Finish a workout to build history.</div></section>`;
    }
    const items = [...state.logs]
      .reverse()
      .map((log) => {
        const lifts = (log.exercises || [])
          .slice(0, 4)
          .map((e) => e.name)
          .join(" · ");
        return `
        <div class="log-item">
          <h3>Week ${log.week} · Day ${log.day} · ${log.dayLabel || ""}</h3>
          <p class="muted" style="margin:0.25rem 0">${log.date}${
            log.completed ? " · completed" : ""
          }</p>
          <p class="muted" style="margin:0">${lifts}${(log.exercises || []).length > 4 ? "…" : ""}</p>
        </div>`;
      })
      .join("");
    return `<section class="panel"><h2>Training log</h2><div class="log-list" style="margin-top:1rem">${items}</div></section>`;
  }

  function renderSettings() {
    const oneRmFields = window.PROGRAM.oneRms
      .map(
        (lift) => `
      <div class="field">
        <label for="set-orm-${lift.key}">${lift.label}</label>
        <input id="set-orm-${lift.key}" type="number" min="0" step="any" value="${
          state.oneRms[lift.key] ?? ""
        }" data-orm="${lift.key}" />
      </div>`
      )
      .join("");

    return `
      <section class="panel">
        <h2>Settings</h2>
        <div class="form-grid" style="margin-top:1rem">
          <div class="field">
            <label for="set-unit">Units</label>
            <select id="set-unit">
              <option value="lb" ${state.unit === "lb" ? "selected" : ""}>lb</option>
              <option value="kg" ${state.unit === "kg" ? "selected" : ""}>kg</option>
            </select>
          </div>
          ${oneRmFields}
        </div>
        <div class="btn-row">
          <button class="btn btn-accent" id="save-settings">Save settings</button>
          <button class="btn btn-warn" id="reset-data">Reset all data</button>
        </div>
        <p class="attribution">${window.PROGRAM.attribution}</p>
      </section>`;
  }

  function render() {
    const root = $("#view");
    navActive();
    $("#main-nav").classList.toggle("hidden", !state.setupComplete || view === "setup");

    if (!state.setupComplete || view === "setup") {
      root.innerHTML = renderSetup();
      bindSetup();
      return;
    }

    const map = {
      home: renderHome,
      warmup: renderWarmup,
      workout: renderWorkout,
      log: renderLog,
      settings: renderSettings,
    };
    root.innerHTML = (map[view] || renderHome)();
    bindView();
  }

  function bindSetup() {
    $("#unit")?.addEventListener("change", (e) => {
      state.unit = e.target.value;
      persist();
      render();
    });
    $$("[data-orm]").forEach((input) => {
      input.addEventListener("change", () => {
        state.oneRms[input.dataset.orm] = input.value ? Number(input.value) : null;
      });
    });
    $("#save-setup")?.addEventListener("click", () => {
      $$("[data-orm]").forEach((input) => {
        state.oneRms[input.dataset.orm] = input.value ? Number(input.value) : null;
      });
      if (!state.oneRms.squat || !state.oneRms.bench || !state.oneRms.deadlift) {
        toast("Add squat, bench, and deadlift 1RMs");
        return;
      }
      state.setupComplete = true;
      persist();
      setView("home");
      toast("Ready to train");
    });
  }

  function bindView() {
    $$("[data-goto]").forEach((btn) =>
      btn.addEventListener("click", () => setView(btn.dataset.goto))
    );

    $("#week-prev")?.addEventListener("click", () => {
      state.currentWeek = Math.max(1, state.currentWeek - 1);
      persist();
      render();
    });
    $("#week-next")?.addEventListener("click", () => {
      state.currentWeek = Math.min(9, state.currentWeek + 1);
      persist();
      render();
    });
    $("#week-select")?.addEventListener("change", (e) => {
      state.currentWeek = Number(e.target.value);
      persist();
      render();
    });
    $$("[data-day]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.currentDay = Number(btn.dataset.day);
        persist();
        render();
      })
    );
    $("#start-workout")?.addEventListener("click", () => setView("workout"));

    $$("[data-wu]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const draft = getDraft();
        const i = btn.dataset.wu;
        draft.warmupDone[i] = !draft.warmupDone[i];
        persist();
        render();
      })
    );
    $("#clear-warmup")?.addEventListener("click", () => {
      getDraft().warmupDone = {};
      persist();
      render();
    });

    $$("[data-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const row = input.closest("[data-ex]");
        const draft = getDraft().exercises[row.dataset.ex];
        draft.sets[Number(row.dataset.set)][input.dataset.field] = input.value;
        persist();
      });
    });

    $$("[data-toggle-set]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest("[data-ex]");
        const draft = getDraft().exercises[row.dataset.ex];
        const set = draft.sets[Number(row.dataset.set)];
        set.done = !set.done;
        if (set.done && !set.weight) {
          const ex = dayData().exercises.find((e, i) => `${i}:${e.name}` === row.dataset.ex);
          const t = ex ? targetFor(ex) : null;
          if (t) set.weight = String(t);
          if (ex && !set.reps) set.reps = String(ex.reps).split("/")[0];
        }
        persist();
        if (set.done) {
          const ex = dayData().exercises.find((e, i) => `${i}:${e.name}` === row.dataset.ex);
          if (ex) startRest(ex.rest);
        }
        render();
      });
    });

    $$("[data-rest]").forEach((btn) =>
      btn.addEventListener("click", () => startRest(btn.dataset.rest))
    );

    $$("[data-weak-group]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const group = sel.dataset.weakGroup;
        state.weakPoints[group].exercise = sel.value;
        const parts = window.PROGRAM.weakPoints[group];
        for (const [body, list] of Object.entries(parts)) {
          if (list.includes(sel.value)) {
            state.weakPoints[group].bodypart = body;
            break;
          }
        }
        persist();
      });
    });

    $("#save-draft")?.addEventListener("click", () => {
      persist();
      toast("Draft saved");
    });

    $("#finish-session")?.addEventListener("click", () => {
      const day = dayData();
      const draft = getDraft();
      const exercises = day.exercises.map((ex, idx) => {
        const { id, data } = ensureExerciseDraft(ex, idx);
        return {
          name: ex.name,
          weakPoint: /weak point/i.test(ex.name)
            ? state.weakPoints[/upper/i.test(ex.name) ? "upper" : "lower"].exercise
            : "",
          sets: data.sets.map((s) => ({ ...s })),
          draftId: id,
        };
      });
      const log = {
        week: state.currentWeek,
        day: state.currentDay,
        dayLabel: day.label,
        date: new Date().toISOString().slice(0, 10),
        completed: true,
        unit: unit(),
        exercises,
        warmupDone: { ...draft.warmupDone },
      };
      Store.upsertLog(state, log);
      persist();
      toast("Session saved");
      setView("log");
    });

    $("#save-settings")?.addEventListener("click", () => {
      state.unit = $("#set-unit").value;
      $$("[data-orm]").forEach((input) => {
        state.oneRms[input.dataset.orm] = input.value ? Number(input.value) : null;
      });
      persist();
      toast("Settings saved");
    });

    $("#reset-data")?.addEventListener("click", () => {
      if (!confirm("Erase all logs, drafts, and 1RMs?")) return;
      Object.assign(state, Store.defaults());
      persist();
      setView("setup");
      toast("Data reset");
    });
  }

  function bindGlobal() {
    $$(".nav button").forEach((btn) =>
      btn.addEventListener("click", () => setView(btn.dataset.view))
    );
    $("#open-settings")?.addEventListener("click", () => setView("settings"));
    $("#stop-rest")?.addEventListener("click", stopRest);
  }

  bindGlobal();
  render();
})();
