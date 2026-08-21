# Markup brief — reshape Home.tsx into the reference layout

Files you may edit: `client/src/pages/Home.tsx` and `client/src/pages/NotFound.tsx`.
**Do not touch `client/src/index.css`** — another agent owns it and has already
rewritten it against `.design/system.md`. Read that CSS to learn what class names
are available; write markup that uses them.

Read first: `.design/system.md`, `.design/taste-profile.md`,
`.design/new-copy.md`, `.design/reference/Landing.tsx`, and the new
`client/src/index.css`.

## The rule that governs everything

Behaviour does not change. Every handler, every piece of state, every
conditional branch, every `aria-*` attribute and every `id` used by
`lib/scroll.ts` and `SectionNav` stays exactly as it is. This is a
presentation change: you are re-shaping JSX and adding copy, not rewriting the
app. If a change would alter what a button does, don't make it.

## Page order after the change

    header (pill nav)
    counter strip  ← new
    hero (h1 left, side copy + CTA right)
    intro band
    [workspace: auth / setup / ledger / overview / stats]  — unchanged branching
    features grid  ← new
    how it works (4-step grid)
    about band (dark)  ← new
    suggestions
    quick add (floating)
    footer

Features and About are marketing sections and must render for **everyone**,
signed in or not — put them outside the `#workspace` branching, next to
`<HowItWorks />`.

## What to build

1. **Counter strip.** Port `landing-counter-row` from the reference into a
   small component above the hero: the big live figure, a `+1` badge that pops,
   and the label `t.countedSoFar` followed by a cycling list of the five
   `t.prayerNames`. Classes: `.counter-row`, `.counter-badge`, `.counter-cycle`.
   The figure must be the reader's real `totals.completed` when signed in.
   When there is no account yet, show the same strip with `0` — do not fake a
   number. The cycling names keep the reference's `${i * 2000}ms` delays.
   Mark the whole strip `aria-hidden` on the decorative parts only; the figure
   itself is real information and stays readable.

2. **Hero.** Split `.hero-copy` into the reference's two columns: the `h1.display`
   on the left, and a new `.hero-side` on the right holding `t.heroBody` and the
   primary CTA. The existing `.hero-actions` buttons keep their handlers
   (`openLedger`, `scrollToId("how")`) — the primary goes in `.hero-side`, the
   secondary stays with it.

3. **Features section.** A `<section id="features">` on the white ground with a
   `.label` eyebrow (`t.featuresLabel`), an `h2.h2` (`t.featuresTitle`) and a
   `.feature-grid` of six `.feature-card`s. Cards 1–5 take an `.icon-tile`
   holding nine `<span>` cells with `.on` for the filled ones — reuse the
   reference's `dots` arrays verbatim (`[1,3,4,5,7]`, `[1,3,4,5,7]`, `[0,4,8]`,
   `[0,1,4,6,7]`, `[0,3,4,6,7,8]`). Card 6 takes the three flag emoji instead,
   in an `.icon-tile`. Copy comes from `.design/new-copy.md`.

4. **How it works.** Keep the component, its IntersectionObserver and its
   `--step` stagger. It already renders `.how-steps` > `li` > `.how-ordinal` +
   `h3` + `p.caption`, which is exactly the reference's step grid — no markup
   change needed beyond confirming it still reads correctly.

5. **About band.** A `<section id="about" class="how-band deep">` with the
   `.label` eyebrow (`t.aboutLabel`), `h2.h2` (`t.aboutTitle`) and one
   `p.prose` (`t.aboutBody`), inside a `max-width:760px` inner wrapper.

6. **Nav.** The header is now a pill. Add in-page links to the new sections
   where the reference has them — `Features`, `How it works`, `About` — using
   `scrollToId` (NOT bare `href="#…"`; `lib/scroll.ts` exists because native
   smooth scroll is a no-op on at least one browser, and there is a comment in
   `index.css` saying so). Keep the language switcher, the account controls and
   the theme toggle. On narrow screens the CSS hides the link list; make sure
   nothing else is lost.

7. **Footer.** Reshape to the reference's two-part footer: a row with the
   wordmark, the same nav links and a pill CTA, then the existing
   `.site-credit` line (QazoTrack · personal use · Built by uno.web · year)
   under a rule. Keep `<UnoMark />` and its comment intact.

8. **NotFound.tsx.** Restyle to the same system — it currently uses the old
   classes. It should read as the same site: `.display`, `.prose`, a
   `.btn.btn-primary` home link.

## Copy

Add every key in `.design/new-copy.md` to **all three** language objects in
`const copy`. `type Copy = (typeof copy)[Language]` is derived from the object,
so a key missing from any one language is a type error, which is the check.

## Verify

- `npx tsc --noEmit` passes.
- `npm run build` succeeds.
- Grep Home.tsx for any class name that does not exist in the new
  `client/src/index.css` — there should be none.
- Switch through all three languages mentally: no key you added is missing.
