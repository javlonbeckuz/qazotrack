# Design tokens — QazoTrack

Source of truth is `client/src/index.css`. This file explains the intent; the
CSS is what ships. Plain CSS with custom properties — there is no Tailwind
config and no token build step.

> Rewritten 2026-08-13. The previous contents of this file described a
> different codebase entirely: it referenced `app/globals.css`,
> `components/AppShell.tsx`, `components/PixelGirih.tsx` and Tailwind v4, none
> of which exist here, and specified navy `#00336c` with `--radius: 0` where
> this project ships `#1b2951` and `4px`. Following it would have broken the
> design.

---

## How the stylesheet is organised

`index.css` is **append-only in layers**. It opens with the base system and is
followed by a run of sections each headed `/* Refinement: … */`, `/* Unified
palette … */`, `/* Solar-system hero motion … */` and so on. Later rules
deliberately override earlier ones.

**This matters when editing.** A change made in the base block can be silently
overridden a hundred lines further down. Search the whole file for a selector
before changing it, and prefer editing the last rule that touches it.

The clearest example: `--gold: #d4af37` is still declared in `:root` and used
by early rules, but the later "Unified palette: deep navy + light blue only"
section overrides those call sites. The token survives; the colour no longer
reaches the page except in one night-mode orbit gradient.

---

## Colour

Two grounds and one accent, in both states. Night is not a filter over day —
it redeclares the whole token block on `.site-shell.night`, so every rule that
reads a token follows automatically.

| Token | Day | Night | Use |
|---|---|---|---|
| `--surface-base` | `#fff` | `#0a0c10` | The page ground |
| `--surface-band` | `#eef0f2` | `#14171c` | Visual stage, intro and ledger bands |
| `--surface-chip` | `#ededed` | `#1c2027` | Chips and secondary fills |
| `--text-ink` | `#1a1a1a` | `#f5f5f7` | Headings and figures |
| `--text-body` | `#3a3a3a` | `#b9b9c0` | Body copy |
| `--text-muted` | `#5a5a5a` | `#8e8e96` | Captions and labels |
| `--accent` | `#1b2951` | `#7aa7e8` | Actions, progress, the orbit |
| `--accent-hover` | `#111d3b` | `#9cc0f2` | Hover |
| `--accent-contrast` | `#fff` | `#0a0c10` | Type on an accent fill |
| `--rule` | `#d9dde1` | `#24272e` | Hairlines |
| `--rule-strong` | `#9da6b0` | `#6a707a` | Emphasised edges |
| `--navy` | `#1b2951` | `#7aa7e8` | Brand navy; also the logo mark |
| `--navy-light` | `#3d5a99` | `#9cb6e4` | The lighter blue |

**The accent inverts direction between states.** On white it is a deep navy
and hover *darkens*; on the dark ground it is a light blue and hover *lifts*.
Darkening the accent at night would push it into the background.

The logo PNG is drawn in the **day** values — `#1b2951` with a `#3d5a99`
centre — because a PNG cannot follow a CSS variable. At night the header
compensates with `filter: brightness(1.15) saturate(1.05)` on `.brand-logo`
rather than shipping a second file.

---

## Day and night

`.site-shell` carries `day` or `night`, decided in `Home.tsx` by
`getTimeState()`: night runs before 05:00 and from 21:00. Roughly a hundred
selectors hang off `.site-shell.night`, covering the header, hero, orbit, day
arc, ledger, glass cards and footer, so the change is continuous with no light
seams.

A reader can override the clock with the header button; the choice persists in
`localStorage` under `qaza-theme`. **Automatic remains the default** — the
override only applies once someone has explicitly chosen.

---

## Type

| Family | Carries |
|---|---|
| `Playfair Display` | The display headline, `.h2`, and the wordmark |
| `Inter` | Everything else: nav, body, labels, captions, controls |
| `Upper Clock` | **Numerals only** — see the selector list below |
| System Arabic | `.arabic`, the Arabic prayer names |

`Upper Clock` is loaded from `client/src/assets/fonts/upper-clock/` by two
`@font-face` rules (regular 400, solid 700) and Vite fingerprints both `.otf`
files into the build. Every rule that applies it also names
`"Courier New", ui-monospace, monospace` as the fallback, so a failed load
degrades to a tabular face rather than to the body font.

It is applied to exactly six selectors: `.stat-stack .figure`,
`.summary-rail .figure`, `.row-figure`, `.overview .figure`,
`.overview-item .figure` and `.overview-item .figure small`.

**`.sun-kicker` is the instructive exception.** It appears in that same
selector list, and is then reverted to the UI font twenty lines later under
the heading "Upper Clock is numeric-only". The reason is that the kicker reads
`Now · 2:07` — it carries words as well as digits, and the face is for digits
alone. This is the layering described above doing real work, and it is why the
override must not be "tidied up" by deleting the earlier rule: the two
together are what keep the face numeric-only.

---

## Geometry and motion

`--radius: 4px` · `--container: 1280px`.

`--dur: 160ms` for colour and opacity, `--dur-mid: 280ms` for transforms,
`--dur-slow: 520ms` for the slower reveals, easing on `--ease-out`.

The hero orbit is CSS-only: `.solar-system` nests three `.orbit` rings on
`orbit-spin` at 18s, 27s and 38s with a `.sun-core` at the centre. The counter
figure pulses briefly on change via `.row-figure.is-pulsing`.

**Reduced motion is honoured in two places** — a global rule collapsing all
animation and transition durations, and a second rule that sets
`animation: none` on the orbit specifically. Keep both: the global rule alone
would leave the orbit frozen mid-rotation at whatever angle it happened to
hold.

---

## Glass

Cards use a translucent fill with `backdrop-filter` — `blur(16px)` on the
lighter surfaces, and `blur(28px) saturate(155%)` / `blur(30px) saturate(135%)`
on the deeper ones. Because the
blur samples whatever sits behind it, the stat tiles and prayer rows read
differently over the plain ground than over the orbit — that is the intended
effect, not a bug. The fills carry enough alpha that text contrast holds
against both grounds.
