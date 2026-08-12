# QazoTrack — Local Integration Guide

QazoTrack is a React + Vite frontend project with a lightweight Express production server. The project includes the multilingual Qaza prayer counter UI, time-aware prayer status, solar-system motion, glass surfaces, the supplied Upper Clock numeric font, and the QazoTrack logo asset reference.

## Run locally

```bash
npm install --legacy-peer-deps
npm run dev
```

`--legacy-peer-deps` is required. `@builder.io/vite-plugin-jsx-loc` declares a
peer range of `vite@^4 || ^5` and this project runs Vite 7, so a plain
`npm install` aborts with `ERESOLVE`. The flag only relaxes peer resolution;
the build itself is unaffected.

The project was authored with pnpm — it ships `pnpm-lock.yaml` and declares
`packageManager: pnpm@10.4.1` — and pnpm tolerates that peer mismatch on its
own. If you have pnpm, `pnpm install` works without any flag and honours the
committed lockfile, which npm ignores.

The development server runs on the Vite host port shown in the terminal; it
falls back to the next free port if 3000 is taken. For validation, use
`npm run check` and `npm run build`.

## Main files

- `client/src/pages/Home.tsx` — main QazoTrack interface and interactions.
- `client/src/index.css` — visual system, motion, responsive rules, glass treatment, and font loading.
- `client/index.html` — document metadata and favicon reference.
- `client/src/assets/fonts/upper-clock/` — local Upper Clock font files.
- `package.json` — scripts and dependencies.

## Notes for Claude Code or VS Code

Open the extracted folder as the workspace root. Do not commit `node_modules/` or generated `dist/` output. After editing, run `npm run check` and `npm run build` before previewing or deploying.
