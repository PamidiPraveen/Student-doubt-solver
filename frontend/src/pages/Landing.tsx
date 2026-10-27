import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { stats } from "../api/endpoints";
import { HeroArt } from "../components/HeroArt";
import { COLLEGE_NAME } from "../components/Logo";
import { homePathFor, useAuth } from "../lib/auth";

function StatIcon({ kind }: { kind: "ask" | "answer" | "faculty" | "student" }) {
  const paths = {
    ask: "M12 3a8 8 0 0 0-8 8c0 2 .8 3.8 2 5.2L5 21l4.2-1.6A8 8 0 1 0 12 3Zm0 11.5v.01M12 7.5a2 2 0 0 1 1 3.7c-.7.4-1 .8-1 1.3",
    answer: "M5 12.5 10 17.5 19.5 7",
    faculty: "M3 9.5 12 5l9 4.5-9 4.5-9-4.5Zm4.5 3.2V16c0 1.2 2 2.5 4.5 2.5s4.5-1.3 4.5-2.5v-3.3",
    student: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8.5c.6-3.5 3.4-5.5 7-5.5s6.4 2 7 5.5",
  } as const;
  return (
    <span className="stat-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[kind]} />
      </svg>
    </span>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const live = useQuery({ queryKey: ["stats"], queryFn: stats.get, staleTime: 60_000, retry: 1 });
  const n = (v: number | undefined) => (v === undefined ? "–" : v.toLocaleString("en-IN"));

  return (
    <>
      <section className="hero" id="home" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">{COLLEGE_NAME}</p>
          <h1 id="hero-title">
            Solving Student <em>Doubts</em> for a <em>Bright</em> Future
          </h1>
          <p className="hero-lede">
            Ask a doubt and get a clear answer from your faculty or a classmate who has been there. Every
            conversation stays respectful, because abusive language is stopped before it is posted.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to={homePathFor(user)} className="btn btn-primary btn-large">
                Open your dashboard <span aria-hidden="true">›</span>
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  Start asking today <span aria-hidden="true">›</span>
                </Link>
                <Link to="/login" className="btn btn-outline btn-large">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <HeroArt />
        </div>
      </section>

      <section className="stats" aria-label="Doubt Solver in numbers">
        <div className="stats-inner">
          <div className="stat">
            <StatIcon kind="ask" />
            <div>
              <p className="stat-num">{n(live.data?.questions)}</p>
              <p className="stat-label">Doubts asked</p>
            </div>
          </div>
          <div className="stat">
            <StatIcon kind="answer" />
            <div>
              <p className="stat-num">{n(live.data?.answers)}</p>
              <p className="stat-label">Answers shared</p>
            </div>
          </div>
          <div className="stat">
            <StatIcon kind="faculty" />
            <div>
              <p className="stat-num">{n(live.data?.faculty)}</p>
              <p className="stat-label">Faculty mentors</p>
            </div>
          </div>
          <div className="stat">
            <StatIcon kind="student" />
            <div>
              <p className="stat-num">{n(live.data?.students)}</p>
              <p className="stat-label">Student learners</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="about" aria-labelledby="about-title">
        <div className="section-inner">
          <p className="eyebrow">About</p>
          <h2 id="about-title">A doubt shared is a doubt halved</h2>
          <p className="section-lede">
            Doubt Solver is the St. Ann’s space for questions that did not get answered in class. Anyone
            signed in can ask, and anyone signed in can help.
          </p>
          <ul className="cards">
            <li className="card">
              <span className="card-icon card-icon-orange" aria-hidden="true">?</span>
              <h3>Ask without hesitating</h3>
              <p>Post a doubt with a subject and a clear title. Similar questions already answered by faculty are suggested as you type.</p>
            </li>
            <li className="card">
              <span className="card-icon card-icon-green" aria-hidden="true">✓</span>
              <h3>Students and faculty both answer</h3>
              <p>Classmates can explain it their way. Faculty answers carry a Faculty tag so you always know which to trust most.</p>
            </li>
            <li className="card">
              <span className="card-icon card-icon-navy" aria-hidden="true">!</span>
              <h3>Respectful by design</h3>
              <p>Abusive or offensive questions and answers are blocked automatically. The author gets a notification instead.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="section section-tint" id="how" aria-labelledby="how-title">
        <div className="section-inner">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title">From stuck to solved in three steps</h2>
          <ol className="how">
            <li>
              <h3>Create your account</h3>
              <p>Sign up as a student or as faculty. You can start straight away.</p>
            </li>
            <li>
              <h3>Ask or answer a doubt</h3>
              <p>Post your own doubt, or open any doubt on the board and help out.</p>
            </li>
            <li>
              <h3>Get notified</h3>
              <p>The bell tells you when someone answers, or when a post of yours was blocked for language.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="safe-title">
        <div className="section-inner safe">
          <div>
            <p className="eyebrow">Safe for everyone</p>
            <h2 id="safe-title">Bad words never reach the board</h2>
            <p className="section-lede">
              Every question and answer is checked before it is saved. If it contains abusive, hateful or
              threatening language, it is not posted, nothing of it is stored, and you are told why.
            </p>
          </div>
          <div className="safe-demo" role="img" aria-label="Example of a blocked post and its notification">
            <div className="safe-note">
              <span className="note-icon note-icon-warn" aria-hidden="true">!</span>
              <div>
                <p className="note-title">Your answer was not posted</p>
                <p className="note-text">
                  It contained abusive or offensive language. Please keep the discussion respectful.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!user && (
        <section className="cta" aria-labelledby="cta-title">
          <div className="cta-inner">
            <h2 id="cta-title">Ready to clear your doubts?</h2>
            <Link to="/register" className="btn btn-light btn-large">
              Enroll now <span aria-hidden="true">›</span>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
