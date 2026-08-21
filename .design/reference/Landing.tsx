// Paste into client/src/pages/Landing.tsx
// Then add a route to it (see bottom of Landing.css for wiring notes).
import "./Landing.css";

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

const FEATURES = [
  {
    title: "One ledger for every prayer",
    body: "Press + after each prayer you make up. Running counts for Fajr, Dhuhr, Asr, Maghrib, and Isha, always in view.",
    dots: [1, 3, 4, 5, 7],
  },
  {
    title: "Prayer times, where you are",
    body: "The sun's real position for your coordinates decides when each of the five prayers falls, not a fixed clock.",
    dots: [1, 3, 4, 5, 7],
  },
  {
    title: "Progress, not pressure",
    body: "A private record from your first entry to today. No streaks, no comparisons — just what's been made up.",
    dots: [0, 4, 8],
  },
  {
    title: "Set your plan once",
    body: "Enter your birth date and when you began praying regularly. Your backlog, including bulugh and menstruation days, is worked out for you.",
    dots: [0, 1, 4, 6, 7],
  },
  {
    title: "Follows the light",
    body: "The page shifts from day to night with the sun at your location, or however you'd rather set it yourself.",
    dots: [0, 3, 4, 6, 7, 8],
  },
];

const STEPS = [
  { n: "01", title: "Create an account", body: "Your record lives with you — the same on your phone and your laptop." },
  { n: "02", title: "Work out your plan", body: "Enter your birth date and when you began praying regularly. The backlog is calculated from those two dates." },
  { n: "03", title: "Mark them off daily", body: "Press + after each prayer you make up. Missed one today? Add it to the list instead." },
  { n: "04", title: "Watch it move", body: "The curve over time shows how many you've made up, from your first entry to today." },
];

const PRAYER_BARS = [
  { name: "Fajr", pct: 82 },
  { name: "Dhuhr", pct: 91 },
  { name: "Asr", pct: 68 },
  { name: "Maghrib", pct: 95 },
  { name: "Isha", pct: 74 },
];

function Dots({ filled }: { filled: number[] }) {
  return (
    <div className="landing-icon">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={filled.includes(i) ? "on" : ""} />
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <a href="#top" className="landing-logo">
          <span className="landing-spark" />
          QazoTrack
        </a>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#process">How it works</a>
          <a href="#stats">Stats</a>
          <a href="#about">About</a>
        </div>
        <a href="#" className="landing-nav-cta">Get started</a>
      </nav>

      <div id="top" className="landing-counter-row">
        <div className="landing-counter">
          <span>128</span>
          <span className="landing-badge">+1</span>
        </div>
        <div className="landing-counter-label">
          <span>prayers counted so far —</span>
          <div className="landing-cycle">
            {PRAYERS.map((p, i) => (
              <span key={p} style={{ animationDelay: `${i * 2000}ms` }}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="landing-hero">
        <h1>Complete your missed prayers, one calm step at a time.</h1>
        <div className="landing-hero-side">
          <p>A simple place to keep your missed prayers visible, manageable, and moving in the right direction.</p>
          <a href="#" className="landing-cta-dark">Count a prayer</a>
        </div>
      </div>

      <section id="features" className="landing-features">
        <div className="landing-section-inner">
          <div className="landing-eyebrow">Features</div>
          <h2>Everything you need to keep going.</h2>
          <div className="landing-feature-grid">
            {FEATURES.map((f) => (
              <div className="landing-feature-card" key={f.title}>
                <Dots filled={f.dots} />
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
            <div className="landing-feature-card">
              <div className="landing-flag-icon">
                <span>🇺🇿</span><span>🇬🇧</span><span>🇷🇺</span>
              </div>
              <h3>Uzbek, English, Russian</h3>
              <p>The whole interface, switchable at any time, in the language you pray in.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="landing-process">
        <div className="landing-section-inner">
          <div className="landing-eyebrow">How it works</div>
          <h2>Four steps, at your pace.</h2>
          <div className="landing-step-grid">
            {STEPS.map((s) => (
              <div className="landing-step" key={s.n}>
                <div className="landing-step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stats" className="landing-stats">
        <div className="landing-section-inner">
          <div className="landing-eyebrow">Stats</div>
          <h2>Your month at a glance.</h2>
          <div className="landing-stat-tiles">
            <div className="landing-stat-tile"><span>128</span><span>prayers counted</span></div>
            <div className="landing-stat-tile"><span>34</span><span>remaining in plan</span></div>
            <div className="landing-stat-tile"><span>79%</span><span>of this month's target</span></div>
          </div>

          <div className="landing-card">
            <span className="landing-card-title">Progress over time</span>
            <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="landing-chart">
              <defs>
                <linearGradient id="statsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--landing-accent)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--landing-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="0,80 0,58 30,52 60,44 90,46 120,34 150,30 180,22 210,20 240,12 270,9 300,4 300,80" fill="url(#statsFill)" />
              <polyline
                points="0,58 30,52 60,44 90,46 120,34 150,30 180,22 210,20 240,12 270,9 300,4"
                fill="none" stroke="var(--landing-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                pathLength={100} className="landing-chart-line"
              />
              <line x1="0" y1="80" x2="300" y2="80" stroke="var(--landing-rule)" strokeWidth="1" />
            </svg>
            <span className="landing-card-caption">Total made up, from the first entry to today</span>
          </div>

          <div className="landing-card">
            <span className="landing-card-title">By prayer</span>
            <div className="landing-bar-rows">
              {PRAYER_BARS.map((b) => (
                <div className="landing-bar-row" key={b.name}>
                  <span>{b.name}</span>
                  <div className="landing-bar-track"><div className="landing-bar-fill" style={{ width: `${b.pct}%` }} /></div>
                  <span>{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="landing-section-inner">
        <div className="landing-quickadd">
          <div className="landing-quickadd-copy">
            <h3>Count a prayer from anywhere</h3>
            <p>One floating button follows you down the page. Press it, pick a prayer, done — no need to scroll back to the ledger.</p>
          </div>
          <div className="landing-quickadd-mock">
            <span className="landing-quickadd-label">Which prayer?</span>
            {[["Asr", 3], ["Maghrib", 0]].map(([name, count]) => (
              <div className="landing-quickadd-row" key={name as string}>
                <span>{name}</span>
                <span className="landing-quickadd-count">{count}</span>
                <div className="landing-quickadd-buttons">
                  <span className="landing-quickadd-minus">−</span>
                  <span className="landing-quickadd-plus">+</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section id="about" className="landing-about">
        <div className="landing-about-inner">
          <div className="landing-eyebrow">About</div>
          <h2>Worked out from two dates, not typed in by hand.</h2>
          <p>
            QazoTrack works out your backlog from your date of birth and the date you began praying regularly.
            Religious maturity, bulugh, is taken at the earliest sign — between 12 and 15 lunar years for boys, 9 and 15
            for girls — or at 15 lunar years if no sign ever appeared. For women, an average number of menstruation days
            each month is excluded from the count. Everything stays in your own account, private by default.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-row">
          <a href="#top" className="landing-logo">
            <span className="landing-spark landing-spark-dark" />
            QazoTrack
          </a>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#process">How it works</a>
            <a href="#about">About</a>
          </div>
          <a href="#" className="landing-cta-dark">Get started</a>
        </div>
        <div className="landing-footer-copy">QazoTrack · Personal use · Built by uno.web · 2026</div>
      </footer>
    </div>
  );
}
