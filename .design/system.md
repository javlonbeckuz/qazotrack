# The token contract

This is the coordination point. Every agent working on the redesign writes
against **this exact block** — it is the first thing in the new
`client/src/index.css` and nothing may redeclare a colour outside it.

Derived from `.design/reference/Landing.css`. Day values are the reference's
own; night values are the reference's dark-band values (`#0f172a` ground,
`#1e293b` panel, `#94a3b8` muted, `#cbd5e1` body) with the accent lifted so it
survives the dark ground.

```css
:root {
  /* ground */
  --surface-base:#fff;        /* the page */
  --surface-band:#f5f9ff;     /* alternating section band */
  --surface-card:#fff;        /* card fill */
  --surface-chip:#eff6ff;     /* icon tiles, secondary fills */
  --surface-deep:#0f172a;     /* pill nav, about band, quick-add spotlight */
  --surface-deep-2:#1e293b;   /* a panel sitting on --surface-deep */

  /* type */
  --text-ink:#0f172a;
  --text-body:#475569;
  --text-muted:#64748b;
  --text-faint:#94a3b8;
  --text-on-deep:#cbd5e1;

  /* accent */
  --accent:#2563eb;
  --accent-hover:#1d4ed8;
  --accent-contrast:#fff;
  --accent-soft:#bfddff;      /* step ordinals, ghosted marks */

  /* edges */
  --rule:#e2e8f0;
  --rule-strong:#cbd5e1;
  --rule-deep:#334155;        /* an edge on --surface-deep */

  /* backing out */
  --danger:#dc2626;
  --danger-hover:#b91c1c;
  --danger-soft:rgba(220,38,38,.08);

  /* geometry */
  --radius:16px;              /* cards, bands, panels */
  --radius-sm:10px;           /* icon tiles, inputs, small controls */
  --radius-pill:999px;        /* nav, buttons, chips */
  --container:1150px;
  --section-pad:96px;
  --gutter:24px;

  /* motion — unchanged, they were right */
  --dur:160ms; --dur-mid:280ms; --dur-slow:520ms;
  --ease-out:cubic-bezier(.23,1,.32,1);

  /* shadcn bridge — client/src/components/ui/* read these */
  --background:var(--surface-base); --foreground:var(--text-ink);
  --primary:var(--accent); --primary-foreground:var(--accent-contrast);
}

[data-theme="dark"], .site-shell.night {
  --surface-base:#0f172a;
  --surface-band:#111c33;
  --surface-card:#1e293b;
  --surface-chip:#243449;
  --surface-deep:#0b1220;
  --surface-deep-2:#1e293b;

  --text-ink:#f1f5f9;
  --text-body:#cbd5e1;
  --text-muted:#94a3b8;
  --text-faint:#64748b;
  --text-on-deep:#cbd5e1;

  --accent:#60a5fa;
  --accent-hover:#93c5fd;
  --accent-contrast:#0f172a;
  --accent-soft:#1e3a5f;

  --rule:#243449;
  --rule-strong:#334155;
  --rule-deep:#334155;

  --danger:#f87171;
  --danger-hover:#fca5a5;
  --danger-soft:rgba(248,113,113,.12);
}
```

## Type contract

```css
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500&family=Inter:wght@400;500;600;700&display=swap");

body { font-family:Inter,sans-serif; }
h1,h2,h3,.h2,.display,.figure,.row-figure,.how-ordinal,.section-num,.brand-wordmark
  { font-family:"Bricolage Grotesque",sans-serif; font-weight:800; }
.arabic { font-family:"IBM Plex Sans Arabic",sans-serif; }
```

- `.display` (h1): `clamp(40px,7vw,90px)` / `1.02` / `-.02em`
- `.h2`: `clamp(28px,4vw,44px)` / `1.15`, `max-width:560px`
- `h3` in a card: `20px`; `h3` in a row: `17px` weight 700, **Inter** (the
  reference sets step titles in Inter — keep that)
- `.label` / eyebrow: `13px`, `700`, `uppercase`, `.08em`, `var(--accent)`
- `.caption`: `14px`, `var(--text-muted)`, line-height `1.6`
- `.prose`: `16px` / `1.6` / `var(--text-body)`
- `.figure`: Bricolage 800, `clamp(28px,3vw,34px)`, `-.02em`, tabular-nums

## Shape contract

- Card = `background:var(--surface-card); border:1px solid var(--rule);
  border-radius:var(--radius); padding:28px–32px;` — no shadow, no blur.
- Every button that is a call to action is a **pill**.
- Icon tile = `40px` square, `var(--surface-chip)`, `var(--radius-sm)`.
- Section = `padding:var(--section-pad) var(--gutter)`; inner wrapper
  `max-width:var(--container); margin-inline:auto;`
- Bands alternate: white → `--surface-band` → white → `--surface-band`.

## Explicitly retired

`--navy`, `--navy-light`, `--gold`, `--white`, `--ink`, Playfair Display,
Upper Clock (all six numeric selectors), every `backdrop-filter` glass rule,
and `--radius:4px`.
