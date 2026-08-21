# Motion contract — QazoTrack

Authored from the user's motion brief (2026-08-21), reconciled against what
this codebase actually is. Same role as `.design/system.md`: the frozen
coordination point. Agents write against THIS, not against the brief directly,
because the brief names four components the app does not have.

## Principles (verbatim from the brief, non-negotiable)

- Calm, not exciting. Every animation earns its place; cut anything decorative.
- **150ms–350ms.** Nothing outside that window.
- ease-out for entrances. ease-in-out for state changes.
- No bounce. No confetti. No celebratory scale-pops.
- Animate **only `transform` and `opacity`**. Never width, height, top, left, margin.
- IntersectionObserver for scroll reveals, never scroll listeners.
- `prefers-reduced-motion` matters more here than average — some readers open
  this during or after prayer and want stillness.
- 60fps on low-end Android. Compositor-only properties, no layout thrash.

## Stack correction

The brief assumes Next.js + Tailwind + Framer Motion. This app is **Vite +
React 19 + wouter**, styled entirely with plain CSS custom properties in
`client/src/index.css` — there is not one Tailwind utility in the app code.

**Do not add Framer Motion.** It is listed in `package.json` but imported
nowhere. It would cost ~40kB gzipped to do a stagger that CSS already does with
a `--step` / `--delay` custom property, in an app the brief says must stay
lean. Everything below is CSS transitions and CSS keyframes.

## Timing tokens

Retire `--dur-slow: 520ms` from *motion* use — it is outside the window.

```css
--dur-fast:160ms;   /* colour, opacity, press feedback */
--dur:200ms;        /* the default: state changes, theme, nav */
--dur-mid:250ms;    /* indicator slide, progress fills, reveals */
--dur-slow:320ms;   /* the longest permitted; scroll reveals only */
--ease-out:cubic-bezier(.23,1,.32,1);      /* entrances */
--ease-inout:cubic-bezier(.65,0,.35,1);    /* state changes */
--stagger:26ms;     /* per-item delay; brief says 20–30ms */
```

## DELETE — these violate the brief and the taste profile

| Keyframe | Where | Why it goes |
|---|---|---|
| `counterPop` | `.counter-row .figure` | 10s-loop `scale(1.1)` pulse on a number that is not changing. A celebratory scale-pop, explicitly banned. |
| `badgePop` | `.counter-badge` | A `+1` flies upward every 10 seconds against a static total. Implies a live count that isn't. |
| `count-settle` | `.row-figure.is-pulsing` | `translateY(-5px)` bounce on count change. Bounce is banned. |
| `quick-breathe` | `.quick-trigger` | Perpetual scale pulse on the floating button. Decorative. |
| `quick-halo` | `.quick-trigger::after` | Expanding halo ring. Decorative. |
| `tick-pop` | the confirm tick | `scale(.86)` pop. Replace with a fade. |

Delete the keyframes AND their call sites AND their now-dead entries in the
reduced-motion lists. `labelCycle` on `.counter-cycle span` **stays** — it is a
crossfade, not a pop — but re-time it so each name holds longer and the fade
itself is 200ms.

## REPLACE — same intent, legal implementation

1. **Count change** (`.row-figure.is-pulsing`) — the brief's "number fade, not
   a slot-machine roll". `opacity: 1 → .45 → 1` over 200ms, `--ease-inout`, no
   transform. The existing accent-colour swap stays; it is a colour transition.

2. **Progress fills** — `.progress-track span`, `.big-progress span`,
   `.meter-fill`, `.stats-bar-fill` currently `transition: width`. Convert to
   `transform: scaleX(var(--fill))` with `transform-origin: left` and
   `transition: transform var(--dur-mid) var(--ease-inout)`. The markup passes
   a 0–1 ratio in `--fill` instead of a percentage width. **Watch the caveat:**
   `scaleX` also scales the border-radius on the fill, so give the *track*
   `overflow:hidden` + the radius and leave the fill square.

3. **Sun marker** — `transition: left 900ms, top 900ms` is banned twice over
   (layout properties, and 900ms). Convert to
   `transform: translate(...) ` driven by `--sun-progress`, at `--dur-slow`.

4. **Row hover / completed state** — background colour transition only,
   200ms `--ease-inout`. No bounce, no lift. (The brief's "row background fades
   to a subtle completed state" maps here; there is no binary complete state,
   so this is the hover/active tint.)

## The four orphans — agreed mapping

The brief names four components this app does not have. Confirmed mapping:

| Brief | Maps to | Note |
|---|---|---|
| Checkbox fill / strikethrough | `.step-button` press + `.row-figure` fade | Prayers are **counted** (10 of 3291), not binary. There is nothing to check or strike through. Do NOT add a checkbox or strikethrough. |
| Calendar cell stagger | `.stats-col-group` — the 30-day bar chart | Stagger by `--stagger` off an `--i` index the markup supplies. |
| Streak counter | **nothing — dropped** | The product refuses streaks: `t.statsNote` "no comparisons and no streaks", `t.intro` "No streaks. No pressure.", `feat3Body` "No streaks, no comparisons". Building one to animate it would contradict the app. |
| Bottom nav / tab transitions | `.section-index` sliding indicator | Not tabs any more — all three sections render at once under a sticky index. The `.is-here` border-colour swap becomes a real sliding underline. |

## New hooks — pinned so CSS and markup agree

Both agents must use exactly these. Neither may invent a name.

- `.section-index { --active: 0 | 1 | 2 }` — set by markup from `active`.
  CSS draws one `::after` underline and slides it with
  `transform: translateX(calc(var(--active) * 100%))` at `--dur-mid`
  `--ease-inout`. Requires the three `li` to be equal-width (grid, 3 columns).
- `.stats-col-group { --i: <0-29> }` — set by markup from the map index.
  CSS delays the cell reveal by `calc(var(--i) * var(--stagger))`.
- `--fill: <0-1>` on every progress fill element, replacing the `width` style.
- `.site-shell { transition: background-color var(--dur) var(--ease-inout),
  color var(--dur) var(--ease-inout) }` for the theme cross-fade — **on the
  root only**. The brief is explicit: do not animate every element separately.
  Because night redeclares the whole token block, one root transition carries
  the change. Cards and rules that need to follow get the same two-property
  transition, nothing more.

## Empty states and onboarding

Fade in only — no slide, no scale. Applies to `.stat-empty`, `.stats-empty`,
`.setup-row` reveals and the first-run Setup form. These screens should feel
settled.

## Reduced motion

Keep the two-rule structure. The global rule collapses durations; the second
rule sets `animation: none` on anything whose *resting* state differs from its
animated state, and then states that resting state explicitly — the bug already
found once, where `animation:none` left the `+1` badge pinned visible forever.
After the deletions above, the second list should be much shorter. Audit it:
every entry must still exist in the markup.

---

# Known traps in THIS codebase (learned the hard way, 2026-08-21)

Two Chrome behaviours cost real debugging time during the redesign. Both are
transition bugs and both are directly in the path of this motion work.

## 1. Never transition a property whose value comes from a custom property that
changes in the same style recalc

`.site-shell { background: var(--surface-base); transition: background-color … }`
looked correct and computed correctly — `--surface-base` resolved to the night
value on the element — yet the painted background **stayed on the previous
theme's colour indefinitely**. Removing the transition made it snap correct,
which is how it was diagnosed.

The fix that shipped: tokens are declared in exactly ONE place (`[data-theme]`
on `<html>`), `<body>` is the only painted ground, and `.site-shell` paints
`transparent`. Do not reintroduce a second painted layer, and do not add a
`transition` to any element that also redeclares the token it is reading.

## 2. Never transition `visibility` alongside `opacity`

`.profile-menu` had
`transition: opacity …, transform …, visibility 0s linear var(--dur)`.
On open the element went `visibility: visible` but **`opacity` stayed wedged at
0** even though the open rule matched and declared `opacity: 1`.

The fix that shipped: gate the closed state with `pointer-events: none`, not
`visibility`, and transition only `opacity` and `transform`. This also keeps the
element in the tab order, which is what makes `:focus-within` reveal it for
keyboard readers.

Apply the same pattern to `.quick-sheet` and anything else that reveals.

## 3. Margin collapse through `.site-shell`

`.site-shell` is `display: flow-root` on purpose. The header's 20px top margin
was collapsing through it, so the shell's box began 20px down the page and the
profile dock positioned against it inherited the offset. Do not remove it.

---

# Current state — what is already done

Do not redo these; verify and move on.

- `--ease-inout: cubic-bezier(.65,0,.35,1)` exists in the token block.
- Theme cross-fade is done: `body` carries
  `transition: background-color var(--dur) var(--ease-inout), color …`, tokens
  flip once at `[data-theme]` on `<html>`, set by an effect in `Home.tsx`.
- `.profile-menu` already follows the contract: 200ms, ease-out, opacity +
  transform only, `pointer-events` gating, hover + focus-within + click.
- `.site-shell`'s old 520ms cross-fade is gone.

# Still to do — the whole rest of this document

Note `--dur` is currently **160ms**, not the 200ms this contract specifies.
Raising it changes every existing transition at once; do it, and check the press
feedback on `.step-button` still feels immediate at the new value (that one may
want `--dur-fast`).
