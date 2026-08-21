# Taste profile — QazoTrack

Not elicited through an interview. The user supplied a finished reference
design (`Landing.tsx` + `Landing.css`, kept at `.design/reference/`) and asked
for it to be applied to the entire site, exactly. That artefact **is** the
taste profile. This file states what it commits to, so every later change can
be checked against it rather than re-argued.

## The one-line read

Bright, editorial SaaS. A wide white page, blue as the single accent, a heavy
grotesque for anything that counts as a headline, Inter for everything else,
and content parked inside generously padded 16px cards on a pale blue band.
Nothing shouts. Nothing is decorative for its own sake.

## Committed decisions

| Decision | Value | Why it is not negotiable |
|---|---|---|
| Display face | Bricolage Grotesque 800 | Replaces Playfair Display. The reference sets *every* h1/h2/h3 and every large figure in it. A serif anywhere is off-design. |
| Text face | Inter 400/500/600/700 | Nav, body, labels, captions, controls, form fields. |
| Accent | `#2563eb` | One blue. Not navy `#1b2951`, not gold `#d4af37`. Gold is retired. |
| Ink | `#0f172a` | Headings, figures, the dark bands, the pill nav. |
| Bands | white `#fff` / `#f5f9ff` | Sections alternate. The pale blue is a band, never a card. |
| Card | `#fff`, `1px solid #e2e8f0`, `16px` radius, `28–32px` padding | Replaces the old hairline-ruled, near-square (`4px`) frames. |
| Pill | `999px` | Nav bar, nav CTA, primary buttons. |
| Eyebrow | 13px / 700 / uppercase / `.08em` / accent blue | Every section opens with one. |
| Heading scale | h1 `clamp(40px,7vw,90px)` @ 1.02 · h2 `clamp(28px,4vw,44px)` @ 1.15 | |
| Section rhythm | `96px` block padding, `1150px` max width | Replaces `82px` / `1280px`. |

## What this profile rejects

- Playfair Display, and the italic closing phrase it carried.
- Navy `#1b2951` / `#3d5a99` and gold `#d4af37` as accents.
- `--radius: 4px` square-ish frames and the hairline `border-bottom` list rhythm.
- Frosted glass (`backdrop-filter`) panels — the reference uses flat white cards.
- Upper Clock as a numeral face — figures are Bricolage Grotesque 800 at
  `-0.02em`, which is what the reference does for `128`, `34`, `79%`.

## Carried forward from the old design

Two things survive the change because they are product behaviour, not styling:

1. **Day/night.** The reference is light-only, but the app has a real theme
   toggle and a sun-following default. Night is rebuilt from the reference's
   own dark values — ground `#0f172a`, panel `#1e293b`, muted `#94a3b8`, and
   the accent lifting to `#60a5fa` so it stays legible on the dark ground.
   That is the same design in its dark register, not a second design.
2. **Danger.** Backing out (Cancel, Reset, discard) keeps a distinct tint so it
   never reads as an equal of the primary action. Restated in the slate family
   as `#dc2626`, still an outline with a soft wash — never a solid red slab.

## The standing rule

Nothing in this app should shout at somebody counting prayers they owe. The
reference is calm by construction; keep it that way. No streak badges, no
congratulatory colour, no urgency.
