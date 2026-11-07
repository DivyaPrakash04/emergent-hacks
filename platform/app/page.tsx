"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Fingerprint,
  Home,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  X,
  CircleHelp,
  AlertCircle,
  ArrowUpRight,
  Clock3,
  Building2,
} from "lucide-react";
type User = {
  id: string;
  name: string;
  email: string;
  role: "seeker" | "host";
  emailVerified: boolean;
  identityStatus: string;
  cardStatus: string;
  cardLast4: string | null;
  consent: boolean;
  verified: boolean;
  createdAt: number;
};
type Payment = {
  id: string;
  amount: number;
  status: string;
  created_at: number;
};
type Activity = { id: number; message: string; created_at: number };
type Snapshot = {
  user: User | null;
  mode: "demo" | "stripe";
  payments?: Payment[];
  activity?: Activity[];
};
type Tab = "overview" | "identity" | "payments" | "security";
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const shortDate = (time: number) =>
  new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Home size={21} strokeWidth={2.2} />
      </span>
      roomsure<span className="brand-dot">.</span>
    </div>
  );
}
export default function Page() {
  const [state, setState] = useState<Snapshot | null>(null),
    [fatal, setFatal] = useState(""),
    [tab, setTab] = useState<Tab>("overview");
  const [login, setLogin] = useState(false),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(
      null,
    );
  const [code, setCode] = useState(""),
    [demoCode, setDemoCode] = useState(""),
    [modal, setModal] = useState<"identity" | "card" | "payment" | null>(null);
  const [consented, setConsented] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setState(data);
    setFatal("");
  }, []);
  useEffect(() => {
    refresh().catch((e) => setFatal(e.message));
    const p = new URLSearchParams(window.location.search);
    if (p.has("returned")) {
      setNotice({
        text: "You’re back. We’ll update your status when Stripe confirms the result.",
      });
      setTab(p.get("returned") === "identity" ? "identity" : "payments");
      window.history.replaceState({}, "", "/");
    }
    if (p.has("canceled")) {
      setNotice({
        text: "Checkout canceled. You can try again whenever you’re ready.",
      });
      window.history.replaceState({}, "", "/");
    }
  }, [refresh]);
  useEffect(() => {
    if (!state?.user || state.mode !== "stripe") return;
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [state?.user?.id, state?.mode, refresh]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModal(null);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".modal button:not(:disabled), .modal input:not(:disabled)",
        ),
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  async function action(path: string, data: unknown = {}, success?: string) {
    if (busy) return;
    setBusy(path);
    setNotice(null);
    try {
      const response = await fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      if (result.demo) {
        setModal(result.kind);
        setConsented(false);
      }
      if (path.startsWith("auth/")) setTab("overview");
      if (path === "auth/logout") {
        setDemoCode("");
        setCode("");
      }
      if (result.demoCode) setDemoCode(result.demoCode);
      await refresh();
      if (success) setNotice({ text: success });
      return result;
    } catch (e) {
      setNotice({
        text: e instanceof Error ? e.message : "Please try again.",
        error: true,
      });
    } finally {
      setBusy("");
    }
  }
  function switchTab(value: Tab) {
    setTab(value);
    setNotice(null);
  }
  const user = state?.user;
  const pending = !!busy;
  const toast = notice && (
    <div
      className={"notice " + (notice.error ? "error" : "")}
      role={notice.error ? "alert" : "status"}
    >
      {notice.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{notice.text}</span>
      <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>
        <X size={16} />
      </button>
    </div>
  );
  if (!state)
    return (
      <main className="loading">
        <Brand />
        {fatal ? (
          <>
            <p role="alert">{fatal}</p>
            <button
              className="primary"
              onClick={() => refresh().catch((e) => setFatal(e.message))}
            >
              Try again
            </button>
          </>
        ) : (
          <LoaderCircle className="spin" />
        )}
      </main>
    );
  if (!user)
    return (
      <main className="auth-layout">
        <section className="auth-story">
          <Brand />
          <div className="story-content">
            <div className="eyebrow light">
              <span /> YOUR NEXT CHAPTER STARTS HERE
            </div>
            <h1>
              A new place.
              <br />A familiar feeling.
            </h1>
            <p>
              Find your room. Know your people.
              <br />
              Feel good about what comes next.
            </p>
            <div className="illustration">
              <div className="arch arch-one" />
              <div className="arch arch-two" />
              <div className="arch arch-three" />
              <div className="window">
                <div />
                <div />
                <div />
                <div />
              </div>
              <div className="plant">
                <span />
                <span />
                <span />
              </div>
              <div className="floating-trust">
                <ShieldCheck size={23} />
                <div>
                  <strong>A little more peace of mind</strong>
                  <small>Identity and payments, in one place.</small>
                </div>
              </div>
            </div>
          </div>
          <p className="story-footer">
            MADE FOR THE IN-BETWEEN. BUILT ON TRUST.
          </p>
        </section>
        <section className="auth-form-side">
          <span className="mode-pill">
            <span />
            {state.mode === "demo"
              ? "Interactive demo"
              : "Stripe test environment"}
          </span>
          <div className="auth-form">
            <span className="mini-icon">
              <KeyRound size={24} />
            </span>
            <h2>{login ? "Welcome back." : "Make yourself at home."}</h2>
            <p>
              {login
                ? "Sign in to your Roomsure account."
                : "A few details now. More peace of mind later."}
            </p>
            {toast}
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                action(
                  login ? "auth/login" : "auth/signup",
                  Object.fromEntries(f),
                );
              }}
            >
              {!login && (
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="Maya Chen"
                    maxLength={80}
                    required
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={login ? "current-password" : "new-password"}
                  placeholder="At least 12 characters"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              {!login && (
                <fieldset>
                  <legend>I’m here to</legend>
                  <label className="role-choice">
                    <input
                      name="role"
                      type="radio"
                      value="seeker"
                      defaultChecked
                    />
                    <Home size={18} /> Find a room
                  </label>
                  <label className="role-choice">
                    <input name="role" type="radio" value="host" />
                    <Building2 size={18} /> Host someone
                  </label>
                </fieldset>
              )}
              <button className="primary full" disabled={pending}>
                {pending ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <>
                    {login ? "Sign in" : "Create account"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
            <p className="auth-toggle">
              {login ? "New to Roomsure?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setLogin(!login);
                  setNotice(null);
                }}
              >
                {login ? "Create an account" : "Sign in"}
              </button>
            </p>
            <div className="auth-disclaimer">
              <LockKeyhole size={15} />
              <span>
                {state.mode === "demo"
                  ? "Use a sample email and a unique demo password. Identity and payments are simulated."
                  : "Identity and payment checks use Stripe test mode. No real money moves."}
              </span>
            </div>
          </div>
          <div className="auth-bottom">
            © {new Date().getFullYear()} Roomsure{" "}
            <span>Your next place, with confidence.</span>
          </div>
        </section>
      </main>
    );
  const checks = [
    {
      id: "email",
      title: "Email address",
      description: "A good place to reach you.",
      done: user.emailVerified,
      icon: Mail,
    },
    {
      id: "identity",
      title: "Identity check",
      description: "A real person behind every profile.",
      done: user.identityStatus === "verified",
      icon: Fingerprint,
    },
    {
      id: "card",
      title: "Payment method",
      description: "Ready for your next chapter.",
      done: user.cardStatus === "verified",
      icon: CreditCard,
    },
    ...(user.role === "host"
      ? [
          {
            id: "consent",
            title: "Permission to rent",
            description: "Confirm your right to offer a room.",
            done: user.consent,
            icon: Building2,
          },
        ]
      : []),
  ];
  const complete = checks.filter((c) => c.done).length;
  const paid = state.payments?.find((p) => p.status === "paid");
  const checkActions = (id: string) => {
    if (id === "email") {
      switchTab("identity");
      action("email/send", {}, "Your verification code is ready.");
    } else if (id === "consent") {
      switchTab("identity");
    } else action(id + "/start");
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">YOUR SPACE</div>
        <nav>
          {(
            [
              { id: "overview", title: "Overview", icon: LayoutDashboard },
              { id: "identity", title: "Identity & trust", icon: Fingerprint },
              { id: "payments", title: "Payments", icon: CreditCard },
              {
                id: "security",
                title: "Account & security",
                icon: LockKeyhole,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-label={item.title}
              aria-current={tab === item.id ? "page" : undefined}
              className={tab === item.id ? "active" : ""}
              onClick={() => switchTab(item.id)}
            >
              <item.icon size={19} />
              <span>{item.title}</span>
              {tab === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <CircleHelp size={21} />
            <strong>A place for questions.</strong>
            <p>Not sure what a check means?</p>
            <button onClick={() => switchTab("identity")}>
              Explore your trust checklist <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="user-menu" onClick={() => switchTab("security")}>
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>
                {user.role === "host" ? "Host account" : "Room seeker"}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Your space <ChevronRight size={13} />
            <strong>
              {
                {
                  overview: "Overview",
                  identity: "Identity & trust",
                  payments: "Payments",
                  security: "Account & security",
                }[tab]
              }
            </strong>
          </div>
          <div className="top-right">
            <span className="mode-pill">
              <span />
              {state.mode === "demo" ? "Demo mode" : "Stripe test mode"}
            </span>
            <span className="top-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="dashboard">
          {toast}
          <div className="page-heading">
            <div className="eyebrow">
              {tab === "overview"
                ? "SETTLE IN. YOU’RE IN THE RIGHT PLACE."
                : tab === "identity"
                  ? "A LITTLE TRUST GOES A LONG WAY."
                  : tab === "payments"
                    ? "LESS GUESSWORK. MORE CLARITY."
                    : "YOUR ACCOUNT. YOUR CONTROL."}
            </div>
            <h1>
              {tab === "overview"
                ? `Good to have you here, ${user.name.split(" ")[0]}.`
                : tab === "identity"
                  ? "Good people. Real peace of mind."
                  : tab === "payments"
                    ? "Your money, accounted for."
                    : "Keep your space secure."}
            </h1>
            <p>
              {tab === "overview"
                ? "Let’s get the little things sorted, so you can focus on the big move."
                : tab === "identity"
                  ? "A few simple checks help everyone feel more at home."
                  : tab === "payments"
                    ? "Payment methods, reservation details, and every transaction in one place."
                    : "Manage your sign-in details and the things that keep them safe."}
            </p>
          </div>
          {tab === "overview" && (
            <>
              <section className="hero-card">
                <div className="hero-copy">
                  <div className="eyebrow light">
                    <ShieldCheck size={15} /> YOUR ROOMSURE PASSPORT
                  </div>
                  <h2>
                    {user.verified
                      ? "You’re all set for what’s next."
                      : "Great connections start with a little trust."}
                  </h2>
                  <p>
                    {user.verified
                      ? "Your account checks are complete. Your next chapter is one step closer."
                      : "Complete your profile checks to show up with confidence and get ready to reserve your room."}
                  </p>
                  <button
                    className="cream-button"
                    onClick={() => switchTab("identity")}
                  >
                    {user.verified
                      ? "View your passport"
                      : "Finish your verification"}
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="passport">
                  <div className="passport-top">
                    <Home size={19} /> ROOMSURE <span>MEMBER PASS</span>
                  </div>
                  <div className="passport-person">
                    <span className="passport-avatar">
                      {user.name.charAt(0)}
                    </span>
                    <div>
                      <h3>{user.name}</h3>
                      <span>
                        {user.role === "host" ? "HOST" : "ROOM SEEKER"} ·
                        PROVIDENCE, RI
                      </span>
                    </div>
                  </div>
                  <div className="passport-bottom">
                    <span>
                      <span
                        className={user.verified ? "green-dot" : "amber-dot"}
                      />
                      {user.verified
                        ? "Checks complete"
                        : "Verification in progress"}
                    </span>
                    <Fingerprint size={36} />
                  </div>
                </div>
                <div className="hero-grid" />
              </section>
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat-icon">
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <small>Profile checks</small>
                    <strong>
                      {complete}
                      <span> / {checks.length} complete</span>
                    </strong>
                  </div>
                  <span className="stat-tag">
                    {user.verified ? "All set" : "Let’s finish up"}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-icon sand">
                    <CreditCard size={21} />
                  </span>
                  <div>
                    <small>Payment method</small>
                    <strong>
                      {user.cardStatus === "verified"
                        ? "Card connected"
                        : "Not connected"}
                    </strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon blue">
                    <KeyRound size={21} />
                  </span>
                  <div>
                    <small>Reservation payment</small>
                    <strong>
                      {paid ? money(paid.amount) : "$0.00"}
                      <span> {paid ? "paid" : "paid so far"}</span>
                    </strong>
                  </div>
                </div>
              </div>
              <div className="content-grid">
                <section className="panel">
                  <div className="panel-title">
                    <h2>Your getting-started checklist</h2>
                    <span>
                      {complete} of {checks.length}
                    </span>
                  </div>
                  <div className="progress">
                    <div
                      style={{ width: `${(complete / checks.length) * 100}%` }}
                    />
                  </div>
                  {checks.map((check) => (
                    <div className="check-row" key={check.id}>
                      <span
                        className={"check-icon " + (check.done ? "done" : "")}
                      >
                        {check.done ? (
                          <Check size={18} />
                        ) : (
                          <check.icon size={19} />
                        )}
                      </span>
                      <div>
                        <strong>{check.title}</strong>
                        <p>{check.description}</p>
                      </div>
                      {check.done ? (
                        <span className="complete-label">Complete</span>
                      ) : (
                        <button
                          className="text-button"
                          disabled={
                            pending ||
                            (check.id !== "email" && !user.emailVerified)
                          }
                          onClick={() => checkActions(check.id)}
                        >
                          Get started <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </section>
                <section className="panel next-panel">
                  <div className="eyebrow">YOUR NEXT CHAPTER</div>
                  <div className="room-art">
                    <div className="art-window" />
                    <div className="art-bed" />
                    <div className="art-table" />
                    <div className="room-tag">
                      <Sparkles size={13} /> SAMPLE RESERVATION
                    </div>
                  </div>
                  <h3>A sunny room in Fox Point</h3>
                  <p>
                    <MapPin size={14} /> Fox Point · Providence, RI
                  </p>
                  <div className="room-price">
                    <strong>
                      $950<span> / month</span>
                    </strong>
                    <button
                      aria-label="View reservation"
                      onClick={() => switchTab("payments")}
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                  <small>Seeded room for testing the payment flow.</small>
                </section>
              </div>
              <section className="activity-section">
                <div className="panel-title">
                  <h2>A little account activity</h2>
                  <span>Just the latest</span>
                </div>
                {state.activity?.slice(0, 3).map((item) => (
                  <div className="activity-row" key={item.id}>
                    <span>
                      <CheckCircle2 size={16} />
                    </span>
                    <strong>{item.message}</strong>
                    <time>{shortDate(item.created_at)}</time>
                  </div>
                ))}
              </section>
            </>
          )}
          {tab === "identity" && (
            <div className="identity-grid">
              <section className="panel verification-panel">
                <div className="panel-title">
                  <h2>Your trust checklist</h2>
                  <span className={"badge " + (user.verified ? "success" : "")}>
                    {user.verified
                      ? "Checks complete"
                      : `${complete} of ${checks.length} complete`}
                  </span>
                </div>
                <p className="muted">
                  {state.mode === "demo"
                    ? "All identity and card results on this page are simulated. No documents or card numbers are collected."
                    : "Documents are collected by Stripe Identity. Roomsure stores the verification result, not your ID or selfie."}
                </p>
                {checks.map((check, index) => (
                  <div className="verification-step" key={check.id}>
                    <div className="step-heading">
                      <span
                        className={"step-number " + (check.done ? "done" : "")}
                      >
                        {check.done ? <Check size={18} /> : index + 1}
                      </span>
                      <div>
                        <h3>{check.title}</h3>
                        <p>{check.description}</p>
                      </div>
                      <span
                        className={"badge " + (check.done ? "success" : "")}
                      >
                        {check.done ? "Complete" : "Pending"}
                      </span>
                    </div>
                    {!check.done && (
                      <div className="step-content">
                        {check.id === "email" ? (
                          <>
                            <button
                              className="secondary"
                              disabled={pending}
                              onClick={() =>
                                action(
                                  "email/send",
                                  {},
                                  "Verification code sent. Check your email, or the demo code below.",
                                )
                              }
                            >
                              Send verification code <Mail size={16} />
                            </button>
                            {demoCode && (
                              <div className="demo-code">
                                Demo inbox · Your code is{" "}
                                <strong>{demoCode}</strong>
                                <small>
                                  Expires in 10 minutes. No email was sent.
                                </small>
                              </div>
                            )}
                            <form
                              className="code-form"
                              onSubmit={(e) => {
                                e.preventDefault();
                                action(
                                  "email/verify",
                                  { code },
                                  "Email verified. You’re off to a good start.",
                                );
                              }}
                            >
                              <label>
                                Six-digit code
                                <input
                                  aria-label="Six-digit code"
                                  value={code}
                                  onChange={(e) =>
                                    setCode(
                                      e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 6),
                                    )
                                  }
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  placeholder="000000"
                                  pattern="[0-9]{6}"
                                  required
                                />
                              </label>
                              <button
                                className="primary"
                                disabled={pending || code.length !== 6}
                              >
                                Verify email
                              </button>
                            </form>
                          </>
                        ) : check.id === "consent" ? (
                          <>
                            <p>
                              This is a self-attestation, not an ownership
                              check.
                            </p>
                            <button
                              className="secondary"
                              disabled={pending || !user.emailVerified}
                              onClick={() =>
                                action(
                                  "host/consent",
                                  { consent: true },
                                  "Permission-to-rent confirmation saved.",
                                )
                              }
                            >
                              I have permission to rent this room{" "}
                              <Check size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <p>
                              {check.id === "identity"
                                ? "Verify a government-issued ID and matching selfie."
                                : "Connect a card through a secure hosted form. Adding a card does not charge it."}
                            </p>
                            <button
                              className="primary"
                              disabled={pending || !user.emailVerified}
                              onClick={() => action(check.id + "/start")}
                            >
                              {check.id === "identity"
                                ? "Start identity check"
                                : "Connect payment method"}
                              <ArrowUpRight size={16} />
                            </button>
                            {!user.emailVerified && (
                              <small>Complete your email check first.</small>
                            )}
                            {(check.id === "identity"
                              ? user.identityStatus
                              : user.cardStatus) === "needs_input" && (
                              <p className="warning-text">
                                The previous check needs another attempt. You
                                can try again.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </section>
              <aside>
                <div className="privacy-card">
                  <span className="mini-icon">
                    <ShieldCheck size={24} />
                  </span>
                  <h2>Your details stay yours.</h2>
                  <p>
                    Roomsure never asks you to send ID photos or card details in
                    a message.
                  </p>
                  <div>
                    <Check size={16} /> No raw identity documents stored here
                  </div>
                  <div>
                    <Check size={16} /> No card numbers on our servers
                  </div>
                  <div>
                    <Check size={16} /> Your verification status is kept private
                  </div>
                </div>
                <div className="footnote-card">
                  <strong>What does “verified” mean?</strong>
                  <p>
                    Your account has completed our checks. It isn’t a guarantee
                    about a room, a host, or a future interaction. Always
                    arrange a viewing before committing.
                  </p>
                </div>
              </aside>
            </div>
          )}
          {tab === "payments" && (
            <>
              <div className="payment-grid">
                <section className="panel">
                  <div className="panel-title">
                    <h2>Payment method</h2>
                    <CreditCard size={20} />
                  </div>
                  {user.cardStatus === "verified" ? (
                    <div className="bank-card">
                      <div>
                        ROOMSURE <span>CARD</span>
                      </div>
                      <p>
                        •••• &nbsp; •••• &nbsp; •••• &nbsp;{" "}
                        {user.cardLast4 || "4242"}
                      </p>
                      <small>{user.name.toUpperCase()}</small>
                      <span className="card-chip" />
                    </div>
                  ) : (
                    <div className="empty-card">
                      <CreditCard size={32} />
                      <h3>A home for your payment method.</h3>
                      <p>Add a card to complete your trust checklist.</p>
                      <button
                        className="primary"
                        disabled={pending || !user.emailVerified}
                        onClick={() => action("card/start")}
                      >
                        Connect a card <ArrowRight size={16} />
                      </button>
                      {!user.emailVerified && (
                        <small>Verify your email first.</small>
                      )}
                    </div>
                  )}
                  <p className="payment-note">
                    <LockKeyhole size={14} />
                    {state.mode === "demo"
                      ? "Simulated card. No card information is collected."
                      : "Card details are securely collected and stored by Stripe."}
                  </p>
                </section>
                <section className="panel reservation">
                  <div className="panel-title">
                    <h2>Your sample reservation</h2>
                    <span className="badge">Test booking</span>
                  </div>
                  <h3>Sunny room in Fox Point</h3>
                  <p>
                    <MapPin size={14} /> Providence, Rhode Island
                  </p>
                  <dl>
                    <div>
                      <dt>First month’s rent</dt>
                      <dd>$950.00</dd>
                    </div>
                    <div>
                      <dt>Platform fee</dt>
                      <dd>$0.00</dd>
                    </div>
                    <div className="total">
                      <dt>Total</dt>
                      <dd>
                        $950.00 <span>USD</span>
                      </dd>
                    </div>
                  </dl>
                  {paid ? (
                    <div className="paid-banner">
                      <CheckCircle2 size={20} /> Test payment complete ·{" "}
                      {money(paid.amount)}
                    </div>
                  ) : (
                    <button
                      className="primary full"
                      disabled={
                        pending || !user.verified || user.role === "host"
                      }
                      onClick={() => action("payment/start")}
                    >
                      Pay $950.00 in test mode <ArrowRight size={17} />
                    </button>
                  )}
                  <small>
                    {user.role === "host"
                      ? "This sample booking is available to seeker accounts."
                      : !user.verified
                        ? "Finish your trust checklist to unlock checkout."
                        : "No real money moves. This is not escrow or a real reservation."}
                  </small>
                </section>
              </div>
              <section className="panel ledger">
                <div className="panel-title">
                  <h2>Transaction history</h2>
                  <span>
                    USD ·{" "}
                    {state.mode === "demo" ? "simulated" : "Stripe test mode"}
                  </span>
                </div>
                {!state.payments?.length ? (
                  <div className="empty-ledger">
                    <ArrowDownLeft size={27} />
                    <h3>A clean slate.</h3>
                    <p>
                      Your test payments will show up here, with every dollar
                      accounted for.
                    </p>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Transaction</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>
                              <strong>Fox Point · first month</strong>
                              <small>
                                {payment.id.slice(0, 8).toUpperCase()}
                              </small>
                            </td>
                            <td>{shortDate(payment.created_at)}</td>
                            <td>
                              <span
                                className={
                                  "badge " +
                                  (payment.status === "paid"
                                    ? "success"
                                    : payment.status === "failed"
                                      ? "failed"
                                      : "")
                                }
                              >
                                {payment.status === "paid"
                                  ? "Paid"
                                  : payment.status === "failed"
                                    ? "Declined"
                                    : payment.status}
                              </span>
                            </td>
                            <td>
                              <strong>{money(payment.amount)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
          {tab === "security" && (
            <div className="identity-grid">
              <section className="panel security-panel">
                <div className="panel-title">
                  <h2>Account details</h2>
                  <span className="badge">
                    {user.role === "host" ? "Host" : "Room seeker"}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Full name</span>
                  <strong>{user.name}</strong>
                </div>
                <div className="detail-row">
                  <span>Email address</span>
                  <strong>{user.email}</strong>
                </div>
                <div className="detail-row">
                  <span>Member since</span>
                  <strong>{shortDate(user.createdAt)}</strong>
                </div>
                <h2 className="section-divider">Change password</h2>
                <p className="muted">
                  Use at least 12 characters. Updating your password signs out
                  your other sessions.
                </p>
                <form
                  onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const result = await action(
                      "security/password",
                      Object.fromEntries(new FormData(form)),
                      "Password updated. Your other sessions have been signed out.",
                    );
                    if (result) form.reset();
                  }}
                >
                  <label>
                    Current password
                    <input
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      required
                      maxLength={128}
                    />
                  </label>
                  <label>
                    New password
                    <input
                      name="newPassword"
                      type="password"
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                  <button className="primary" disabled={pending}>
                    Update password <ArrowRight size={16} />
                  </button>
                </form>
              </section>
              <aside>
                <div className="privacy-card">
                  <span className="mini-icon">
                    <LockKeyhole size={24} />
                  </span>
                  <h2>A safer sign-in.</h2>
                  <p>
                    Your password is hashed on the server. Your session lives in
                    an HTTP-only cookie and expires after seven days.
                  </p>
                  <p>Roomsure never stores your password in your browser.</p>
                </div>
                <div className="panel signout-panel">
                  <h3>Heading out?</h3>
                  <p>You can pick up where you left off.</p>
                  <button
                    className="secondary full"
                    disabled={pending}
                    onClick={() => {
                      action("auth/logout", {}, "You’ve been signed out.");
                      setDemoCode("");
                      setCode("");
                    }}
                  >
                    Sign out <LogOut size={16} />
                  </button>
                </div>
              </aside>
            </div>
          )}
          <footer className="dashboard-footer">
            <span>
              <LockKeyhole size={13} /> A little more peace of mind.
            </span>
            <span>
              Roomsure ·{" "}
              {state.mode === "demo" ? "Demo environment" : "Test environment"}{" "}
              <span className="footer-dot">·</span> No real money moves
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close"
              disabled={pending}
              aria-label="Close simulation"
              onClick={() => setModal(null)}
              autoFocus
            >
              <X size={20} />
            </button>
            <span className="mini-icon">
              {modal === "identity" ? (
                <Fingerprint size={27} />
              ) : (
                <CreditCard size={27} />
              )}
            </span>
            <div className="eyebrow">DEMO SIMULATION</div>
            <h2 id="modal-title">
              {modal === "identity"
                ? "A real person. A little reassurance."
                : modal === "card"
                  ? "Ready when you are."
                  : "Your next chapter, confirmed."}
            </h2>
            <p>
              {modal === "identity"
                ? "In test integration mode, Stripe Identity collects an ID and matching selfie. Here, choose a result to try the flow."
                : modal === "card"
                  ? "In test integration mode, Stripe securely collects a test card. Here, we’ll simulate connecting a card ending in 4242."
                  : "Try a $950.00 payment for the sample Fox Point room. This does not reserve a real room or move money."}
            </p>
            <div className="simulation-note">
              <ShieldCheck size={19} />
              <span>
                No real {modal === "identity" ? "ID or photos" : "card details"}{" "}
                required. This result is simulated.
              </span>
            </div>
            {modal === "payment" && (
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />
                I understand this is a simulated $950 payment for a sample room.
              </label>
            )}
            <button
              className="primary full"
              disabled={pending || (modal === "payment" && !consented)}
              onClick={async () => {
                const result = await action(
                  "demo/complete",
                  { kind: modal, outcome: "success" },
                  modal === "payment"
                    ? "Test payment complete. Your receipt is in transaction history."
                    : "Check complete. One step closer.",
                );
                if (result) setModal(null);
              }}
            >
              {" "}
              {pending ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <>
                  Simulate{" "}
                  {modal === "payment"
                    ? "successful payment"
                    : "successful check"}
                  <Check size={17} />
                </>
              )}
            </button>
            <button
              className="text-button full simulate-failure"
              disabled={pending}
              onClick={async () => {
                const result = await action(
                  "demo/complete",
                  { kind: modal, outcome: "failure" },
                  "Simulated failure recorded. You can retry the check.",
                );
                if (result) setModal(null);
              }}
            >
              Try{" "}
              {modal === "payment" ? "a declined payment" : "a failed check"}{" "}
              instead
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
