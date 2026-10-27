import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { homePathFor, useAuth, useSignOut } from "../lib/auth";
import { COLLEGE_NAME, CollegeLogo } from "./Logo";
import { NotificationBell } from "./NotificationBell";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

function navFor(user: ReturnType<typeof useAuth>["user"]): NavItem[] {
  if (!user) return [];
  if (user.role === "faculty") {
    return [
      { to: "/faculty", label: "Home", end: true },
      { to: "/doubts", label: "All doubts" },
      { to: "/library", label: "Library" },
      { to: "/profile", label: "Profile" },
    ];
  }
  return [
    { to: "/app", label: "Home", end: true },
    { to: "/doubts", label: "All doubts" },
    { to: "/app/questions", label: "My questions" },
    { to: "/library", label: "Library" },
    { to: "/profile", label: "Profile" },
  ];
}

/** Scroll to #section after a client-side navigation to "/#section". */
function useScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

export function Layout() {
  const { user } = useAuth();
  const logout = useSignOut();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useScrollToHash();

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  const items = navFor(user);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to={user ? homePathFor(user) : "/"} className="brand">
            <CollegeLogo size={46} />
            <span className="brand-text">
              <span className="brand-name">Doubt Solver</span>
              <span className="brand-sub">St. Ann’s College · Chirala</span>
            </span>
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>

          {user ? (
            <nav id="site-nav" aria-label="Main" className={`nav ${open ? "nav-open" : ""}`}>
              <ul>
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="nav-user">
                <NotificationBell />
                {user.role === "student" && (
                  <Link to="/app/ask" className="btn btn-primary btn-small">
                    Ask a doubt
                  </Link>
                )}
                <span className="nav-name" title={user.name}>
                  {user.name}
                </span>
                <button type="button" className="btn btn-outline btn-small" onClick={logout}>
                  Sign out
                </button>
              </div>
            </nav>
          ) : (
            <nav id="site-nav" aria-label="Main" className={`nav nav-public ${open ? "nav-open" : ""}`}>
              <ul>
                <li><NavLink to="/" end>Home</NavLink></li>
                <li><Link to="/#about">About</Link></li>
                <li><Link to="/#how">How it works</Link></li>
                <li><Link to="/#contact">Contact</Link></li>
              </ul>
              <div className="nav-user">
                <Link to="/login" className="btn btn-outline btn-small">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-small">
                  Enroll now
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="footer" id="contact">
        <div className="footer-inner">
          <div className="footer-brand">
            <CollegeLogo size={64} />
            <div>
              <p className="footer-title">{COLLEGE_NAME}</p>
              <p>An Autonomous Institution · Chirala, Bapatla District · Estd. 2001</p>
            </div>
          </div>
          <p className="footer-note">
            Students and faculty answer each other’s doubts here. Abusive language is blocked
            automatically, and faculty answers are always marked. Automatic suggestions are labelled
            and never replace a faculty answer.
          </p>
        </div>
      </footer>
    </>
  );
}

/** The column every signed-in page sits in. */
export function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`page ${wide ? "page-wide" : ""}`}>{children}</div>;
}
