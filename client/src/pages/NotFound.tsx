import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

/**
 * The same site, at an address that has nothing on it.
 *
 * It wears the page's own type and buttons rather than a component library's
 * card: a reader who lands here has not left QazoTrack, and a panel in another
 * design would tell them they had. Nothing here is decorative — a number, a
 * sentence, and the one way back.
 */
export default function NotFound() {
  const [, setLocation] = useLocation();
  /* This page is outside Home, so it cannot read the shell's theme state.
     Without a day/night class it falls through to the :root day tokens and
     hands a reader in night mode a full-white page. The stored override is
     the same key Home writes. With none set this falls back to a plain clock
     window rather than Home's solar calculation — that one needs coordinates
     and a geolocation prompt, which is far too much to ask of a 404. */
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("qaza-theme") : null;
  const hour = new Date().getHours();
  const isNight = stored ? stored === "night" : hour < 5 || hour >= 21;
  // The tokens live on <html>, so the class alone would leave body white.
  if (typeof document !== "undefined") document.documentElement.dataset.theme = isNight ? "dark" : "light";

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <main className={`site-shell ${isNight ? "night" : "day"}`} lang="en">
      <div className="hero container">
        <div className="hero-copy">
          <p className="label">Error 404</p>
          <h1 className="display">This page isn’t here.</h1>
          <p className="prose">
            The address you followed doesn’t match anything on QazoTrack. It may have been
            moved, or the link may have been mistyped. Your record is untouched.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={handleGoHome}>
              Back to the ledger <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
