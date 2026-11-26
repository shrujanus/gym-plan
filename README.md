# Upper / Lower 4x Tracker

Personal web app for running a 9-week upper/lower (4×/week) size & strength block: calculated working weights from your 1RMs, general + primary warm-ups, set logging, rest timer, and local progress history.

## Features

- Enter squat / bench / deadlift / OHP (and optional incline) 1RMs
- Browse all 9 weeks × 4 days with wave loading baked in
- General warm-up checklist plus primary-lift loading pyramids
- Auto-suggested working weights from `%1RM`
- Log weight, reps, and RPE per set (saved in `localStorage`)
- Weak-point exercise picker for upper/lower slots

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## GitHub Pages

1. Push this repo (without the PDF — see below).
2. GitHub → **Settings** → **Pages**.
3. Source: **Deploy from a branch** → `main` (or this branch) → `/ (root)`.
4. Site will be at `https://<user>.github.io/<repo>/`.

## Important

The original program PDF must **not** be published with this site. It is listed in `.gitignore` and removed from the working tree. This tracker stores structured workout prescriptions for personal logging only — it is not a redistribution of the e-book.
