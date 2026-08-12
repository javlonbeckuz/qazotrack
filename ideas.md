# QazoTrack — Design Direction

## Three directions considered

### Theme Name: Quiet Editorial
Very high-contrast, law-firm-inspired editorial interface with a soft grey lower ground, crisp rules, and one confident navy accent. It should feel trustworthy, reflective, and composed.
**Probability:** 0.08

### Theme Name: Tactile Notebook
A warm paper-and-ink tracker with visible annotations, soft cream tones, and a more personal journaling feeling. It should feel intimate and handwritten without becoming playful.
**Probability:** 0.04

### Theme Name: Midnight Ledger
A dark, contemplative counter with blue highlights, sparse data, and ritual-like progress moments. It should feel focused and private rather than technical.
**Probability:** 0.06

## Chosen approach: Quiet Editorial

### Design Movement
Contemporary editorial minimalism, borrowing the measured spacing, ruled stat ladders, and typographic confidence of a premium legal or cultural publication.

### Core Principles
1. One strong serif voice: Playfair Display is reserved for the primary count and section headings.
2. Structural contrast: white and soft-grey grounds create the page's hierarchy without cards, shadows, or decorative gradients.
3. Measured progress: every number is legible, tabular, and paired with a plain-language caption.
4. Calm agency: controls feel direct and tactile, with no gamification or emotional pressure.

### Color Philosophy
White is the upper ground for clarity and attention. `#f4f4f4` is the lower ground for reflection and review. A single deep navy (`#00336c`) carries all action and progress emphasis, giving the product a sense of dependable forward motion without competing with the content.

### Layout Paradigm
A wide editorial rail with an asymmetric hero: a narrow text column introduces today's intention while a broad counter field lets the active number breathe. The lower half becomes a ruled ledger, with the daily rhythm and prayer breakdown arranged as a series of horizontal readings rather than floating cards.

### Signature Elements
- Hairline rules that act as the primary grouping device.
- A small eight-point khatam-inspired mark, rendered as a crisp geometric SVG.
- Tall square actions with labels anchored to the lower edge and simple directional arrows.

### Interaction Philosophy
Interactions should feel like marking a page: immediate, reversible, and visually quiet. Tapping a prayer action changes its tally and briefly acknowledges the update; no interaction relies on a loud toast or a bouncing animation.

### Animation
Use only color, opacity, and a small 12px rise on entrance. The active counter may transition its number and progress bar, but there is no scale, bounce, parallax, or rotation. Respect reduced motion.

### Typography System
- Playfair Display 400 for `.display` and `.h2` only.
- Inter for navigation, labels, body, figures, and controls.
- IBM Plex Sans Arabic for Arabic prayer names.
- Sentence-case labels; no all-caps UI.
- Figures use tabular numerals and strong weight.

### Brand Essence
A quiet daily companion for making steady, sincere progress on missed prayers — designed for people who want structure without pressure.

Personality: **clear, grounded, reverent**.

### Brand Voice
Headlines are concise and reflective. CTAs are direct and non-judgmental. Microcopy names the next useful action without promising transformation.

Example lines:
- “A little done is still done.”
- “Keep today light. Keep going.”

### Wordmark & Logo
The wordmark is set in a restrained serif with a small navy geometric mark: two overlapping squares forming an eight-point star, representing order gathered from repetition. The mark is always used without text as the app icon.

### Signature Brand Color
Deep Qaza Navy — `#00336c`.
