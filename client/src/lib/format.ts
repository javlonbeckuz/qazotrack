/**
 * How every figure in this app is written.
 *
 * There is one rule and it is deliberately not locale-aware. `toLocaleString()`
 * was used in four places and raw numbers in the rest, so the same backlog read
 * "11090" beside the ledger and "11 090" in the meter — and because the locale
 * followed the language, two figures on one screen could disagree the moment a
 * reader switched between Uzbek, English and Russian.
 *
 * The separator is U+202F, a narrow no-break space. It reads correctly in all
 * three languages, cannot be broken across a line, and does not collide with the
 * comma some locales use as a *decimal* mark. Counts here are whole numbers, so
 * there is no decimal case to get wrong.
 *
 * Clock times are the exception and stay locale-aware — see `localeFor` in
 * pages/Home.tsx. Those are not counts.
 */
export const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
