import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { BUILT_IN_EXERCISES, CATEGORY_META, SUGGESTIONS } from "./data";

// ─── Theme (Soft Light) ───────────────────────────────────────────────────────
const C = {
  bg: "#d7d6c5",
  surface: "#F7FBF9",
  card: "#FFFFFF",
  border: "#D4E6DC",
  accent: "#00A880",
  accentDim: "#00A88015",
  orange: "#F4622A",
  purple: "#7C3AED",
  pink: "#DB2777",
  blue: "#2563EB",
  text: "#1A2E25",
  muted: "#6B7C74",
  light: "#8FA99D",
};
const font = "'Barlow Condensed', 'Impact', sans-serif";
const body = "'DM Sans', 'Segoe UI', sans-serif";

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Badge = ({ label, color = C.accent }) => (
  <span
    style={{
      background: `${color}20`,
      border: `1px solid ${color}44`,
      color,
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 8px",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    }}
  >
    {label}
  </span>
);

const Btn = ({ children, onClick, full, ghost, danger, small, disabled }) => {
  const [h, sh] = useState(false);
  const bg = danger
    ? h
      ? "#FF5252"
      : "#FF304F"
    : ghost
    ? "transparent"
    : h
    ? "#00C496"
    : C.accent;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => sh(true)}
      onMouseLeave={() => sh(false)}
      style={{
        width: full ? "100%" : "auto",
        background: bg,
        color: ghost ? C.muted : danger ? "#fff" : "#fff",
        border: ghost ? `1px solid ${C.border}` : "none",
        borderRadius: 8,
        padding: small ? "8px 14px" : "13px 22px",
        fontSize: small ? 12 : 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: body,
        letterSpacing: "0.02em",
        transition: "all 0.15s",
        opacity: disabled ? 0.4 : 1,
        boxShadow: !ghost && !danger && h ? `0 0 12px ${C.accent}44` : "none",
      }}
    >
      {children}
    </button>
  );
};

const Input = ({ placeholder, value, onChange, type = "text", onKeyDown }) => (
  <input
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    type={type}
    onKeyDown={onKeyDown}
    style={{
      background: "#F2F9F5",
      border: `1.5px solid ${C.border}`,
      borderRadius: 8,
      padding: "13px 16px",
      color: C.text,
      fontSize: 14,
      fontFamily: body,
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    }}
  />
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      background: "#F2F9F5",
      border: `1.5px solid ${C.border}`,
      borderRadius: 8,
      padding: "13px 16px",
      color: C.text,
      fontSize: 14,
      fontFamily: body,
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div
      style={{
        width: 32,
        height: 32,
        border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.accent}`,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  </div>
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot | forgot_sent
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  // Blocked disposable/fake email domains
  const BLOCKED_DOMAINS = [
    "mailinator.com",
    "guerrillamail.com",
    "throwaway.email",
    "tempmail.com",
    "10minutemail.com",
    "yopmail.com",
    "trashmail.com",
    "sharklasers.com",
    "guerrillamailblock.com",
    "grr.la",
    "guerrillamail.info",
    "guerrillamail.biz",
    "guerrillamail.de",
    "guerrillamail.net",
    "guerrillamail.org",
    "spam4.me",
    "fakeinbox.com",
    "maildrop.cc",
    "dispostable.com",
    "mailnull.com",
    "spamgourmet.com",
    "trashmail.me",
    "trashmail.net",
    "discard.email",
    "tempr.email",
    "temp-mail.org",
    "getnada.com",
    "anonaddy.com",
    "mohmal.com",
    "tempinbox.com",
    "spambog.com",
    "spamfree24.org",
  ];

  // Known legitimate domains (fast-pass, skip extra checks)
  const KNOWN_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "protonmail.com",
    "live.com",
    "msn.com",
    "me.com",
    "mac.com",
    "googlemail.com",
    "ymail.com",
    "aol.com",
    "mail.com",
    "zoho.com",
    "rediffmail.com",
    "yahoo.in",
    "yahoo.co.uk",
    "yahoo.co.in",
  ];

  const isValidEmailFormat = (e) => {
    // Must have exactly one @, valid chars, proper TLD
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(e)) return false;
    const parts = e.split("@");
    if (parts.length !== 2) return false;
    const local = parts[0];
    const domain = parts[1];
    if (local.startsWith(".") || local.endsWith(".")) return false;
    if (domain.startsWith(".") || domain.endsWith(".")) return false;
    if (domain.indexOf("..") !== -1) return false;
    if (!domain.includes(".")) return false;
    const tld = domain.split(".").pop();
    if (tld.length < 2) return false;
    return true;
  };

  const validate = () => {
    if (mode === "signup") {
      if (!name.trim()) return "Please enter your full name.";
      if (name.trim().length < 2) return "Name must be at least 2 characters.";
      if (!email.trim()) return "Please enter your email address.";

      const emailLower = email.trim().toLowerCase();
      if (!isValidEmailFormat(emailLower))
        return "Please enter a valid email address (e.g. name@example.com).";

      const domain = emailLower.split("@")[1];
      if (BLOCKED_DOMAINS.includes(domain))
        return "Please use a genuine email address. Disposable emails are not allowed.";

      // Extra checks for non-known domains
      if (!KNOWN_DOMAINS.includes(domain)) {
        const domainParts = domain.split(".");
        if (domainParts.some((p) => p.length === 0))
          return "Please enter a valid email address.";
        // Reject clearly fake patterns like "asdf@asdf.asdf"
        const suspicious =
          /^[a-z]{2,6}\.[a-z]{2,6}$/.test(domain) &&
          !["co.uk", "co.in", "com.au", "co.nz", "co.za", "com.br"].includes(
            domain
          );
        if (suspicious && domain.split(".").every((p) => p.length <= 4))
          return "Please use a genuine email address.";
      }

      if (!pass) return "Please enter a password.";
      if (pass.length < 6) return "Password must be at least 6 characters.";
      if (pass !== confirmPass) return "Passwords do not match.";
    }
    if (mode === "login") {
      if (!email.trim()) return "Please enter your email.";
      if (!isValidEmailFormat(email.trim().toLowerCase()))
        return "Please enter a valid email address.";
      if (!pass) return "Please enter your password.";
    }
    if (mode === "forgot") {
      if (!email.trim()) return "Please enter your email address.";
      if (!isValidEmailFormat(email.trim().toLowerCase()))
        return "Please enter a valid email address (e.g. name@example.com).";
    }
    return null;
  };

  const handle = async () => {
    setErr("");
    setOk("");
    const validationErr = validate();
    if (validationErr) {
      setErr(validationErr);
      return;
    }
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "?reset=1",
        });
        if (error) throw error;
        setMode("forgot_sent");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
        });
        if (error) throw error;
        if (data.user && data.user.confirmed_at) {
          // Email confirmation is OFF — log straight in
          await supabase
            .from("profiles")
            .upsert({ id: data.user.id, name: name.trim() });
          setOk("Account created! Welcome to FIT4LESS 🎉");
          setTimeout(() => onAuth(data.user, name.trim()), 1200);
        } else {
          // Email confirmation is ON — save profile and show confirm screen
          try {
            await supabase.from("profiles").upsert({
              id: data.session?.user?.id || data.user?.id,
              name: name.trim(),
            });
          } catch (_) {}
          setMode("confirm_email");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
        const { data: p } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", data.user.id)
          .single();
        const displayName = p?.name || name.trim() || email.split("@")[0];
        setOk(`Welcome back, ${displayName}! ✅`);
        setTimeout(() => onAuth(data.user, displayName), 1000);
      }
    } catch (e) {
      // Make Supabase errors more user-friendly
      const msg = e.message || "";
      if (msg.includes("Invalid login credentials"))
        setErr("Incorrect email or password. Please try again.");
      else if (msg.includes("Email not confirmed"))
        setErr("Please confirm your email first.");
      else if (msg.includes("already registered"))
        setErr("An account with this email already exists. Try signing in.");
      else setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setErr("");
    setOk("");
    setName("");
    setEmail("");
    setPass("");
    setConfirmPass("");
  };

  // Email confirmation pending screen
  if (mode === "confirm_email")
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "32px 24px",
          background: C.bg,
          fontFamily: body,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>📧</div>
        <h2
          style={{
            fontFamily: font,
            fontSize: 32,
            fontWeight: 900,
            margin: "0 0 10px",
            color: C.text,
          }}
        >
          Confirm your email
        </h2>
        <p
          style={{
            color: C.muted,
            fontSize: 14,
            lineHeight: 1.8,
            marginBottom: 8,
          }}
        >
          We sent a confirmation link to
        </p>
        <p
          style={{
            color: C.accent,
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 16,
          }}
        >
          {email}
        </p>
        <p
          style={{
            color: C.muted,
            fontSize: 13,
            lineHeight: 1.8,
            marginBottom: 28,
          }}
        >
          Click the link in the email to activate your account,
          <br />
          then come back here to sign in.
        </p>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "16px",
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <p
            style={{ color: C.muted, fontSize: 12, lineHeight: 1.8, margin: 0 }}
          >
            📌 <strong style={{ color: C.light }}>Can't find the email?</strong>{" "}
            Check your spam/junk folder.
            <br />⏱ The link expires in{" "}
            <strong style={{ color: C.light }}>24 hours</strong>.<br />
            ✉️ Make sure you used a real email address.
          </p>
        </div>
        <Btn full onClick={() => switchMode("login")}>
          ← Back to Sign In
        </Btn>
      </div>
    );

  // Forgot sent screen
  if (mode === "forgot_sent")
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "32px 24px",
          background: C.bg,
          fontFamily: body,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
        <h2
          style={{
            fontFamily: font,
            fontSize: 30,
            fontWeight: 900,
            margin: "0 0 10px",
            color: C.text,
          }}
        >
          Check your email
        </h2>
        <p
          style={{
            color: C.muted,
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          We sent a password reset link to
          <br />
          <span style={{ color: C.accent, fontWeight: 700 }}>{email}</span>.
          <br />
          Click the link in the email to set a new password.
        </p>
        <Btn full onClick={() => switchMode("login")}>
          ← Back to Sign In
        </Btn>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "32px 24px",
        background: C.bg,
        fontFamily: body,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${C.accent}, ${C.orange})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 14px",
            boxShadow: `0 0 40px ${C.accent}44`,
          }}
        >
          ⚡
        </div>
        <h1
          style={{
            fontFamily: font,
            fontSize: 44,
            fontWeight: 900,
            margin: 0,
            letterSpacing: "-0.02em",
            color: C.text,
          }}
        >
          FIT4LESS
        </h1>
        <p style={{ color: C.muted, fontSize: 13, margin: "6px 0 0" }}>
          {mode === "forgot"
            ? "Reset your password"
            : "Your AI-powered workout companion"}
        </p>
      </div>

      {mode !== "forgot" && (
        <div
          style={{
            display: "flex",
            background: C.surface,
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
          }}
        >
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                background: mode === m ? C.card : "transparent",
                border:
                  mode === m
                    ? `1px solid ${C.border}`
                    : "1px solid transparent",
                borderRadius: 8,
                padding: "10px",
                color: mode === m ? C.text : C.muted,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
                fontFamily: body,
                transition: "all 0.2s",
              }}
            >
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mode === "signup" && (
          <div style={{ position: "relative" }}>
            <Input
              placeholder="Full name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {name.trim().length > 0 && name.trim().length < 2 && (
              <p
                style={{
                  color: C.orange,
                  fontSize: 11,
                  margin: "-6px 0 0 4px",
                }}
              >
                Name too short
              </p>
            )}
          </div>
        )}
        <Input
          placeholder="Email address *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "forgot" && (
          <Input
            placeholder="Password (min 6 chars) *"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !confirmPass && handle()}
          />
        )}
        {mode === "signup" && (
          <Input
            placeholder="Confirm password *"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handle()}
          />
        )}

        {/* Error message */}
        {err && (
          <div
            style={{
              background: `${C.orange}15`,
              border: `1px solid ${C.orange}44`,
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 15 }}>⚠️</span>
            <p style={{ color: C.orange, fontSize: 13, margin: 0 }}>{err}</p>
          </div>
        )}

        {/* Success message */}
        {ok && (
          <div
            style={{
              background: `${C.accent}15`,
              border: `1px solid ${C.accent}44`,
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 15 }}>✅</span>
            <p style={{ color: C.accent, fontSize: 13, margin: 0 }}>{ok}</p>
          </div>
        )}

        <Btn full onClick={handle} disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "forgot"
            ? "Send Reset Link →"
            : mode === "login"
            ? "Sign In →"
            : "Create Account →"}
        </Btn>

        <div style={{ textAlign: "center", marginTop: 4 }}>
          {mode === "login" ? (
            <button
              onClick={() => switchMode("forgot")}
              style={{
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: body,
                textDecoration: "underline",
              }}
            >
              Forgot password?
            </button>
          ) : mode === "forgot" ? (
            <button
              onClick={() => switchMode("login")}
              style={{
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: body,
              }}
            >
              ← Back to Sign In
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 1: Exercise Picker ──────────────────────────────────────────────────
function ExercisePicker({ type, allExercises, onStart, onBack }) {
  const [selected, setSelected] = useState({});
  const [filter, setFilter] = useState("All");
  const meta = CATEGORY_META[type] || CATEGORY_META.Custom;
  const muscles = [
    "All",
    ...Array.from(new Set(allExercises.map((e) => e.muscle))),
  ];
  const filtered =
    filter === "All"
      ? allExercises
      : allExercises.filter((e) => e.muscle === filter);
  const selectedList = allExercises.filter((_, i) => selected[i]);
  const toggleAll = () => {
    if (selectedList.length === allExercises.length) setSelected({});
    else setSelected(Object.fromEntries(allExercises.map((_, i) => [i, true])));
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "16px 20px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.muted,
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: body,
            }}
          >
            ← Back
          </button>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: font,
                fontSize: 22,
                fontWeight: 900,
                color: meta.color,
              }}
            >
              {meta.emoji} {type.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {selectedList.length} selected
            </div>
          </div>
          <button
            onClick={toggleAll}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.accent,
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: body,
              fontWeight: 700,
            }}
          >
            {selectedList.length === allExercises.length ? "None" : "All"}
          </button>
        </div>
        {/* Muscle filter pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          {muscles.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              style={{
                background: filter === m ? meta.color : C.card,
                border: `1px solid ${filter === m ? meta.color : C.border}`,
                borderRadius: 99,
                padding: "5px 12px",
                whiteSpace: "nowrap",
                color: filter === m ? "#000" : C.muted,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: body,
                flexShrink: 0,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((ex) => {
            const origIdx = allExercises.indexOf(ex);
            const on = !!selected[origIdx];
            return (
              <button
                key={origIdx}
                onClick={() => setSelected((s) => ({ ...s, [origIdx]: !on }))}
                style={{
                  background: on ? `${meta.color}18` : C.card,
                  border: `1px solid ${on ? meta.color : C.border}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: on ? meta.color : C.surface,
                    border: `2px solid ${on ? meta.color : C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: "#000",
                    fontWeight: 900,
                    transition: "all 0.2s",
                  }}
                >
                  {on ? "✓" : ""}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: on ? meta.color : C.text,
                    }}
                  >
                    {ex.name}
                  </div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                    {ex.sets} sets × {ex.reps} ·{" "}
                    <span style={{ color: C.light }}>{ex.muscle}</span>
                    {ex.difficulty && (
                      <span
                        style={{
                          marginLeft: 6,
                          color:
                            ex.difficulty === "Advanced"
                              ? C.orange
                              : ex.difficulty === "Intermediate"
                              ? C.accent
                              : C.muted,
                        }}
                      >
                        · {ex.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 420,
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          padding: "16px 20px",
        }}
      >
        <Btn
          full
          onClick={() => onStart(selectedList)}
          disabled={selectedList.length === 0}
        >
          {selectedList.length === 0
            ? "Select exercises to start"
            : `Start with ${selectedList.length} exercise${
                selectedList.length > 1 ? "s" : ""
              } →`}
        </Btn>
      </div>
    </div>
  );
}

// ─── Rest Timer Modal ────────────────────────────────────────────────────────
function RestTimer({ duration, onDone, onSkip }) {
  const [left, setLeft] = useState(duration);

  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);

  const pct = Math.round(((duration - left) / duration) * 100);
  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");
  const circumference = 2 * Math.PI * 54;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(8,12,16,0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: body,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: C.muted,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        Rest Timer
      </div>

      {/* Circular progress */}
      <div
        style={{
          position: "relative",
          width: 140,
          height: 140,
          marginBottom: 28,
        }}
      >
        <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke={C.border}
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke={left <= 5 ? "#EF4444" : C.accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: font,
              fontSize: 42,
              fontWeight: 900,
              color: left <= 5 ? "#EF4444" : C.text,
              lineHeight: 1,
            }}
          >
            {mins > 0 ? `${mins}:${secs}` : left}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            seconds
          </div>
        </div>
      </div>

      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
        Rest up — next set incoming
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn ghost small onClick={onSkip}>
          Skip Rest
        </Btn>
        <Btn small onClick={onDone}>
          Start Now →
        </Btn>
      </div>
    </div>
  );
}

// ─── STEP 2: Active Workout ───────────────────────────────────────────────────
const REST_DURATIONS = [0, 30, 60, 90, 120];

function ActiveWorkout({ type, exercises, user, onComplete, onBack }) {
  const [checked, setChecked] = useState({});
  const [start] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [restActive, setRestActive] = useState(false);
  const [restDuration, setRestDuration] = useState(60);
  const [lastChecked, setLastChecked] = useState(null);
  const meta = CATEGORY_META[type] || CATEGORY_META.Custom;

  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [start]);

  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, "0");
  const doneCount = Object.values(checked).filter(Boolean).length;
  const pct = exercises.length
    ? Math.round((doneCount / exercises.length) * 100)
    : 0;
  const allDone = doneCount === exercises.length;

  const toggleExercise = (i) => {
    const nowOn = !checked[i];
    setChecked((c) => ({ ...c, [i]: nowOn }));
    if (nowOn) {
      setLastChecked(i);
      setRestActive(true);
    }
  };

  const finish = async () => {
    setSaving(true);
    const completedExercises = exercises.map((ex, i) => ({
      ...ex,
      completed: !!checked[i],
    }));
    const { data, error } = await supabase
      .from("workout_logs")
      .insert({
        user_id: user.id,
        type,
        exercises_done: doneCount,
        duration_mins: mins || 1,
        completed_exercises: completedExercises,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) console.error(error);
    setSaving(false);
    onComplete({ log: data, completedExercises, duration: mins || 1 });
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {restActive && (
        <RestTimer
          duration={restDuration}
          onDone={() => setRestActive(false)}
          onSkip={() => setRestActive(false)}
        />
      )}

      {/* Sticky header */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.muted,
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: body,
            }}
          >
            ← Back
          </button>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: font,
                fontSize: 28,
                fontWeight: 900,
                color: C.accent,
                lineHeight: 1,
              }}
            >
              {mins}:{secs}
            </div>
            <div
              style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}
            >
              ELAPSED
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: font,
                fontSize: 22,
                fontWeight: 800,
                color: meta.color,
              }}
            >
              {doneCount}/{exercises.length}
            </div>
            <div style={{ fontSize: 10, color: C.muted }}>done</div>
          </div>
        </div>
        <div
          style={{
            background: C.card,
            borderRadius: 99,
            height: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              width: `${pct}%`,
              background: allDone
                ? `linear-gradient(90deg, ${C.accent}, #00FF88)`
                : `linear-gradient(90deg, ${meta.color}, ${C.accent})`,
              transition: "width 0.5s ease",
              boxShadow: allDone
                ? `0 0 12px ${C.accent}`
                : `0 0 8px ${meta.color}88`,
            }}
          />
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontFamily: font,
              fontSize: 28,
              fontWeight: 900,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {meta.emoji} {type}
          </h2>
          {/* Rest duration selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.muted }}>Rest:</span>
            <div style={{ display: "flex", gap: 4 }}>
              {REST_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setRestDuration(d)}
                  style={{
                    background: restDuration === d ? C.accent : C.card,
                    border: `1px solid ${
                      restDuration === d ? C.accent : C.border
                    }`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: restDuration === d ? "#000" : C.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: body,
                  }}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {exercises.map((ex, i) => {
            const on = !!checked[i];
            return (
              <button
                key={i}
                onClick={() => toggleExercise(i)}
                style={{
                  background: on ? `${C.accent}12` : C.card,
                  border: `1px solid ${on ? C.accent : C.border}`,
                  borderRadius: 12,
                  padding: "15px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: on ? 0.75 : 1,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: on ? C.accent : "transparent",
                    border: `2px solid ${on ? C.accent : C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#000",
                    fontWeight: 900,
                    transition: "all 0.2s",
                    boxShadow: on ? `0 0 10px ${C.accent}66` : "none",
                  }}
                >
                  {on ? "✓" : ""}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: on ? C.accent : C.text,
                      textDecoration: on ? "line-through" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {ex.name}
                  </div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
                    {ex.sets} sets × {ex.reps} · {ex.muscle}
                  </div>
                </div>
                {on && <div style={{ fontSize: 18 }}>✅</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 420,
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          padding: "16px 20px",
        }}
      >
        {allDone && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 8,
              color: C.accent,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            🎉 All exercises complete!
          </div>
        )}
        <Btn full onClick={finish} disabled={saving}>
          {saving
            ? "Saving…"
            : doneCount === 0
            ? "Finish Session"
            : `✓ Complete (${doneCount}/${exercises.length} done)`}
        </Btn>
      </div>
    </div>
  );
}

// ─── STEP 3: Completion Summary ───────────────────────────────────────────────
function CompletionSummary({
  type,
  completedExercises,
  duration,
  onHome,
  onGoAgain,
}) {
  const meta = CATEGORY_META[type] || CATEGORY_META.Custom;
  const done = completedExercises.filter((e) => e.completed);
  const skipped = completedExercises.filter((e) => !e.completed);
  const pct = Math.round((done.length / completedExercises.length) * 100);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        padding: "32px 20px 40px",
        fontFamily: body,
      }}
    >
      {/* Trophy */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            fontSize: 64,
            marginBottom: 10,
            filter: pct === 100 ? "drop-shadow(0 0 20px gold)" : "none",
          }}
        >
          {pct === 100 ? "🏆" : pct >= 50 ? "💪" : "👊"}
        </div>
        <h1
          style={{
            fontFamily: font,
            fontSize: 36,
            fontWeight: 900,
            margin: "0 0 6px",
            color: pct === 100 ? "black" : C.text,
          }}
        >
          {pct === 100
            ? "PERFECT SESSION!"
            : pct >= 50
            ? "GREAT WORK!"
            : "SESSION DONE!"}
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
          {type} Workout saved to your history
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Completed",
            value: `${done.length}/${completedExercises.length}`,
          },
          { label: "Duration", value: `${duration}m` },
          { label: "Score", value: `${pct}%` },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "14px 10px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: font,
                fontSize: 26,
                fontWeight: 800,
                color: meta.color,
              }}
            >
              {s.value}
            </div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Completed exercises */}
      {done.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4
            style={{
              color: C.muted,
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}
          >
            ✅ Completed ({done.length})
          </h4>
          {done.map((ex, i) => (
            <div
              key={i}
              style={{
                background: `${C.accent}10`,
                border: `1px solid ${C.accent}33`,
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 7,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ color: C.accent, fontSize: 16 }}>✓</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                  {ex.name}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>
                  {ex.sets} sets × {ex.reps}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skipped */}
      {skipped.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4
            style={{
              color: C.muted,
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}
          >
            ⏭ Skipped ({skipped.length})
          </h4>
          {skipped.map((ex, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 7,
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: 0.5,
              }}
            >
              <span style={{ color: C.muted, fontSize: 16 }}>—</span>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.muted }}>
                {ex.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn full onClick={onHome}>
          ← Home
        </Btn>
        <Btn full ghost onClick={onGoAgain}>
          Go Again →
        </Btn>
      </div>
    </div>
  );
}

// ─── Activity Rings ───────────────────────────────────────────────────────────
function ActivityRings({ logs }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  // Move ring — calories proxy: exercises done today × 12 kcal, goal 300
  const todayLogs = logs.filter((l) => {
    const d = new Date(l.logged_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    return k === todayStr;
  });
  const moveVal = Math.min(
    todayLogs.reduce((a, l) => a + (l.exercises_done || 0) * 12, 0),
    600
  );
  const moveGoal = 300;

  // Exercise ring — workout minutes today, goal 30
  const exVal = Math.min(
    todayLogs.reduce((a, l) => a + (l.duration_mins || 0), 0),
    60
  );
  const exGoal = 30;

  // Stand ring — days worked out this week, goal 5
  const weekDays = new Set(
    logs
      .filter((l) => new Date(l.logged_at) >= weekAgo)
      .map((l) => {
        const d = new Date(l.logged_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );
  const standVal = Math.min(weekDays.size, 7);
  const standGoal = 5;

  const rings = [
    {
      label: "Move",
      value: moveVal,
      goal: moveGoal,
      unit: "CAL",
      color: "#FF3B5C",
      trackColor: "#3D0010",
      r: 54,
    },
    {
      label: "Exercise",
      value: exVal,
      goal: exGoal,
      unit: "MIN",
      color: "#00FF90",
      trackColor: "#003D1F",
      r: 40,
    },
    {
      label: "Stand",
      value: standVal,
      goal: standGoal,
      unit: "DAYS",
      color: "#00CFFF",
      trackColor: "#002233",
      r: 26,
    },
  ];

  const SIZE = 140;
  const CX = SIZE / 2;
  const STROKE = 10;

  return (
    <div
      style={{
        background: "#1A2E25",
        borderRadius: 20,
        padding: "20px",
        marginBottom: 22,
        display: "flex",
        alignItems: "center",
        gap: 20,
        border: `1px solid #2A4A38`,
      }}
    >
      {/* SVG Rings */}
      <div style={{ flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE}>
          {rings.map(({ r, color, trackColor, value, goal }) => {
            const circumference = 2 * Math.PI * r;
            const pct = Math.min(value / goal, 1.1); // allow slight over 100
            const offset = circumference * (1 - (animated ? pct : 0));
            // Dot at the tip
            const angle = (animated ? pct : 0) * 2 * Math.PI - Math.PI / 2;
            const dotX = CX + r * Math.cos(angle);
            const dotY = CX + r * Math.sin(angle);
            return (
              <g key={r}>
                {/* Track */}
                <circle
                  cx={CX}
                  cy={CX}
                  r={r}
                  fill="none"
                  stroke={trackColor}
                  strokeWidth={STROKE}
                />
                {/* Progress arc */}
                <circle
                  cx={CX}
                  cy={CX}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${CX} ${CX})`}
                  style={{
                    transition: animated
                      ? "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)"
                      : "none",
                  }}
                />
                {/* Tip glow dot */}
                {animated && pct > 0.02 && (
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r={STROKE / 2}
                    fill={color}
                    style={{
                      filter: `drop-shadow(0 0 4px ${color})`,
                      transition:
                        "cx 1.2s cubic-bezier(0.4,0,0.2,1), cy 1.2s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}
      >
        {rings.map(({ label, value, goal, unit, color }) => {
          const pct = Math.min(Math.round((value / goal) * 100), 100);
          return (
            <div key={label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#888",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "#555" }}>{pct}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontFamily: font,
                    fontSize: 22,
                    fontWeight: 900,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {value}
                </span>
                <span style={{ fontSize: 10, color: "#444" }}>
                  / {goal} {unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ user, userName, onPickExercises, onNav }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(20);
    setLogs(data || []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const streak = Math.min(logs.length, 7);
  const thisWeek = logs.filter(
    (l) => (Date.now() - new Date(l.logged_at)) / 86400000 < 7
  ).length;
  const suggestion = SUGGESTIONS[logs.length % SUGGESTIONS.length];

  return (
    <div style={{ paddingBottom: 80 }}>
      <div
        style={{
          padding: "24px 20px 0",
          background: `linear-gradient(180deg, ${C.surface} 0%, transparent 100%)`,
        }}
      >
        <p style={{ color: C.muted, fontSize: 13, margin: "0 0 2px" }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <h2
          style={{
            fontFamily: font,
            fontSize: 34,
            fontWeight: 800,
            margin: "0 0 18px",
            letterSpacing: "-0.01em",
          }}
        >
          Hey, {userName.split(" ")[0]}! 💪
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 22,
          }}
        >
          {[
            { label: "🔥 Streak", value: streak },
            { label: "📅 This Week", value: thisWeek },
            { label: "🏆 Total", value: logs.length },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: font, fontSize: 26, fontWeight: 800 }}>
                {s.value}
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* Activity Rings */}
        {!loading && <ActivityRings logs={logs} />}
        {/* Suggestion card */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.accentDim}, ${C.card})`,
            border: `1px solid ${C.accent}44`,
            borderRadius: 14,
            padding: "20px",
            marginBottom: 20,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -8,
              top: -8,
              fontSize: 80,
              opacity: 0.1,
            }}
          >
            {suggestion.emoji}
          </div>
          <Badge label="🎯 Today's Suggestion" />
          <h3
            style={{
              fontFamily: font,
              fontSize: 30,
              fontWeight: 800,
              margin: "8px 0 6px",
            }}
          >
            {suggestion.type} Day
          </h3>
          <p
            style={{
              color: C.light,
              fontSize: 13,
              margin: "0 0 14px",
              lineHeight: 1.6,
            }}
          >
            {suggestion.reason}
          </p>
          <Btn
            onClick={() =>
              onPickExercises(
                suggestion.type,
                BUILT_IN_EXERCISES[suggestion.type] || []
              )
            }
          >
            Pick Exercises →
          </Btn>
        </div>

        {/* Category grid */}
        <h4
          style={{
            color: C.muted,
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: "0 0 12px",
          }}
        >
          🗂 All Categories
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 22,
          }}
        >
          {Object.entries(CATEGORY_META)
            .filter(([k]) => k !== "Custom")
            .map(([type, meta]) => (
              <button
                key={type}
                onClick={() =>
                  onPickExercises(type, BUILT_IN_EXERCISES[type] || [])
                }
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderTop: `2px solid ${meta.color}`,
                  borderRadius: 10,
                  padding: "16px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>
                  {meta.emoji}
                </div>
                <div
                  style={{
                    fontFamily: font,
                    fontSize: 20,
                    fontWeight: 800,
                    color: C.text,
                  }}
                >
                  {type}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                  {BUILT_IN_EXERCISES[type]?.length || 0} exercises
                </div>
              </button>
            ))}
        </div>

        {/* Custom shortcut */}
        <button
          onClick={() => onNav("custom")}
          style={{
            width: "100%",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderTop: `2px solid ${C.purple}`,
            borderRadius: 10,
            padding: "16px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <div
                style={{
                  fontFamily: font,
                  fontSize: 20,
                  fontWeight: 800,
                  color: C.text,
                }}
              >
                My Custom Workouts
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                Create & manage your own plans
              </div>
            </div>
          </div>
          <span style={{ color: C.muted }}>→</span>
        </button>

        {/* Recent logs */}
        {loading ? (
          <Spinner />
        ) : (
          logs.length > 0 && (
            <>
              <h4
                style={{
                  color: C.muted,
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  margin: "0 0 12px",
                }}
              >
                ⏱ Recent Sessions
              </h4>
              {logs.slice(0, 3).map((log, i) => {
                const meta = CATEGORY_META[log.type] || CATEGORY_META.Custom;
                const exList = log.completed_exercises || [];
                const doneCnt = exList.filter((e) => e.completed).length;
                return (
                  <div
                    key={i}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft: `3px solid ${meta.color}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {meta.emoji} {log.type}
                      </div>
                      <div
                        style={{ color: C.muted, fontSize: 12, marginTop: 2 }}
                      >
                        {exList.length > 0
                          ? `${doneCnt}/${exList.length} exercises`
                          : `${log.exercises_done} exercises`}{" "}
                        · {log.duration_mins}m
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {exList.length > 0 && (
                        <div
                          style={{
                            fontSize: 11,
                            color:
                              doneCnt === exList.length ? C.accent : C.orange,
                            fontWeight: 700,
                            marginBottom: 2,
                          }}
                        >
                          {Math.round((doneCnt / exList.length) * 100)}%
                        </div>
                      )}
                      <div style={{ color: C.muted, fontSize: 11 }}>
                        {new Date(log.logged_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )
        )}
      </div>
    </div>
  );
}

// ─── Custom Workouts ──────────────────────────────────────────────────────────
function CustomWorkoutsScreen({ user, onPickExercises }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [wName, setWName] = useState("");
  const [wDesc, setWDesc] = useState("");
  const [wPublic, setWPublic] = useState(false);
  const [exRows, setExRows] = useState([
    { name: "", sets: "3", reps: "10-12", muscle: "General", notes: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("custom_workouts")
      .select("*, custom_exercises(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWorkouts(data || []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const saveWorkout = async () => {
    if (!wName.trim()) return;
    setSaving(true);
    const { data: w, error } = await supabase
      .from("custom_workouts")
      .insert({
        user_id: user.id,
        name: wName,
        description: wDesc,
        is_public: wPublic,
      })
      .select()
      .single();
    if (error) {
      setSaving(false);
      return;
    }
    const exInserts = exRows
      .filter((e) => e.name.trim())
      .map((e, i) => ({
        workout_id: w.id,
        ...e,
        sets: parseInt(e.sets) || 3,
        sort_order: i,
      }));
    if (exInserts.length)
      await supabase.from("custom_exercises").insert(exInserts);
    setSaving(false);
    setWName("");
    setWDesc("");
    setWPublic(false);
    setExRows([
      { name: "", sets: "3", reps: "10-12", muscle: "General", notes: "" },
    ]);
    await fetchWorkouts();
    setView("list");
  };

  const deleteWorkout = async (id) => {
    await supabase.from("custom_workouts").delete().eq("id", id);
    await fetchWorkouts();
    setView("list");
  };

  const togglePublic = async (workout) => {
    await supabase
      .from("custom_workouts")
      .update({ is_public: !workout.is_public })
      .eq("id", workout.id);
    await fetchWorkouts();
    setSelected({ ...workout, is_public: !workout.is_public });
    if (!workout.is_public) {
      setShareUrl(`${window.location.origin}?share=${workout.id}`);
      setView("share");
    }
  };

  const addExRow = () =>
    setExRows((r) => [
      ...r,
      { name: "", sets: "3", reps: "10-12", muscle: "General", notes: "" },
    ]);
  const updateEx = (i, f, v) =>
    setExRows((r) => r.map((e, idx) => (idx === i ? { ...e, [f]: v } : e)));
  const removeEx = (i) => setExRows((r) => r.filter((_, idx) => idx !== i));

  if (view === "list")
    return (
      <div style={{ paddingBottom: 80 }}>
        <div style={{ padding: "24px 20px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: font,
                  fontSize: 32,
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                My Workouts
              </h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>
                Custom plans you've built
              </p>
            </div>
            <Btn small onClick={() => setView("create")}>
              + New
            </Btn>
          </div>
          {loading ? (
            <Spinner />
          ) : workouts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>⚡</div>
              <h3 style={{ fontFamily: font, fontSize: 26, margin: "0 0 8px" }}>
                No custom workouts yet
              </h3>
              <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
                Build your first personalised plan
              </p>
              <Btn onClick={() => setView("create")}>Create Workout →</Btn>
            </div>
          ) : (
            workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setSelected(w);
                  setView("detail");
                }}
                style={{
                  width: "100%",
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  textAlign: "left",
                  cursor: "pointer",
                  marginBottom: 10,
                  borderLeft: `3px solid ${C.purple}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {w.name}
                    </div>
                    {w.description && (
                      <div
                        style={{ color: C.muted, fontSize: 12, marginTop: 3 }}
                      >
                        {w.description}
                      </div>
                    )}
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                      {w.custom_exercises?.length || 0} exercises
                      {w.is_public && (
                        <span style={{ color: C.accent, marginLeft: 8 }}>
                          · 🔗 Shared
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: C.muted }}>→</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );

  if (view === "create")
    return (
      <div style={{ paddingBottom: 80 }}>
        <div style={{ padding: "20px 20px 0" }}>
          <button
            onClick={() => setView("list")}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.muted,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: body,
              marginBottom: 20,
            }}
          >
            ← Back
          </button>
          <h2
            style={{
              fontFamily: font,
              fontSize: 30,
              fontWeight: 800,
              margin: "0 0 20px",
            }}
          >
            Create Workout
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <Input
              placeholder="Workout name"
              value={wName}
              onChange={(e) => setWName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={wDesc}
              onChange={(e) => setWDesc(e.target.value)}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
              onClick={() => setWPublic((v) => !v)}
            >
              <div
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 99,
                  background: wPublic ? C.accent : C.surface,
                  border: `1px solid ${wPublic ? C.accent : C.border}`,
                  position: "relative",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: wPublic ? 22 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: wPublic ? "#000" : C.muted,
                    transition: "left 0.2s",
                  }}
                />
              </div>
              <span style={{ color: C.light, fontSize: 13 }}>
                Make shareable
              </span>
            </label>
          </div>
          <h4
            style={{
              color: C.muted,
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            Exercises
          </h4>
          {exRows.map((ex, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span style={{ color: C.muted, fontSize: 12 }}>
                  Exercise {i + 1}
                </span>
                {exRows.length > 1 && (
                  <button
                    onClick={() => removeEx(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.muted,
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Input
                  placeholder="Exercise name"
                  value={ex.name}
                  onChange={(e) => updateEx(i, "name", e.target.value)}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <Input
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={(e) => updateEx(i, "sets", e.target.value)}
                  />
                  <Input
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => updateEx(i, "reps", e.target.value)}
                  />
                </div>
                <Select
                  value={ex.muscle}
                  onChange={(v) => updateEx(i, "muscle", v)}
                  options={[
                    "General",
                    "Chest",
                    "Back",
                    "Shoulders",
                    "Biceps",
                    "Triceps",
                    "Quads",
                    "Hamstrings",
                    "Glutes",
                    "Calves",
                    "Core",
                    "Full Body",
                  ]}
                />
              </div>
            </div>
          ))}
          <Btn ghost full onClick={addExRow} small>
            + Add Exercise
          </Btn>
          <div style={{ marginTop: 16 }}>
            <Btn full onClick={saveWorkout} disabled={saving || !wName.trim()}>
              {saving ? "Saving…" : "Save Workout →"}
            </Btn>
          </div>
        </div>
      </div>
    );

  if (view === "detail" && selected)
    return (
      <div style={{ paddingBottom: 80 }}>
        <div style={{ padding: "20px 20px 0" }}>
          <button
            onClick={() => setView("list")}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.muted,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: body,
              marginBottom: 20,
            }}
          >
            ← Back
          </button>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 6,
            }}
          >
            <h2
              style={{
                fontFamily: font,
                fontSize: 30,
                fontWeight: 800,
                margin: 0,
              }}
            >
              {selected.name}
            </h2>
            <Btn danger small onClick={() => deleteWorkout(selected.id)}>
              Delete
            </Btn>
          </div>
          {selected.description && (
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 20px" }}>
              {selected.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
            <Btn
              onClick={() =>
                onPickExercises(selected.name, selected.custom_exercises || [])
              }
            >
              Pick & Start →
            </Btn>
            <Btn ghost small onClick={() => togglePublic(selected)}>
              {selected.is_public ? "🔗 Shared" : "Share →"}
            </Btn>
          </div>
          <h4
            style={{
              color: C.muted,
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            {selected.custom_exercises?.length || 0} Exercises
          </h4>
          {(selected.custom_exercises || []).map((ex, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: C.accentDim,
                  border: `1px solid ${C.accent}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: C.accent,
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {ex.sets} sets × {ex.reps} · {ex.muscle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (view === "share")
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h3 style={{ fontFamily: font, fontSize: 28, margin: "0 0 10px" }}>
          Workout Shared!
        </h3>
        <p
          style={{
            color: C.muted,
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          Anyone with this link can view your workout.
        </p>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 12,
            color: C.light,
            wordBreak: "break-all",
            textAlign: "left",
          }}
        >
          {shareUrl}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn onClick={() => navigator.clipboard.writeText(shareUrl)}>
            Copy Link
          </Btn>
          <Btn ghost onClick={() => setView("list")}>
            Done
          </Btn>
        </div>
      </div>
    );

  return null;
}

// ─── Completion status helper ─────────────────────────────────────────────────
function completionStatus(exList) {
  if (!exList || exList.length === 0) return null;
  const done = exList.filter((e) => e.completed).length;
  const pct = Math.round((done / exList.length) * 100);
  if (pct === 100)
    return {
      label: "Complete",
      color: "#00D4AA",
      bg: "#00D4AA18",
      pct,
      done,
      total: exList.length,
    };
  if (pct >= 50)
    return {
      label: "Partial",
      color: "#FF7043",
      bg: "#FF704318",
      pct,
      done,
      total: exList.length,
    };
  if (pct > 0)
    return {
      label: "Incomplete",
      color: "#EF4444",
      bg: "#EF444418",
      pct,
      done,
      total: exList.length,
    };
  return {
    label: "Not started",
    color: "#4A5568",
    bg: "#4A556818",
    pct,
    done,
    total: exList.length,
  };
}

// ─── Log Screen ───────────────────────────────────────────────────────────────
function LogScreen({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [user.id]);

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: "24px 20px 0" }}>
        <h2
          style={{
            fontFamily: font,
            fontSize: 32,
            fontWeight: 800,
            margin: "0 0 20px",
          }}
        >
          📜 Workout History
        </h2>
        {loading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
            <h3 style={{ fontFamily: font, fontSize: 26, margin: "0 0 8px" }}>
              No sessions yet
            </h3>
            <p style={{ color: C.muted, fontSize: 14 }}>
              Complete your first workout to see it here.
            </p>
          </div>
        ) : (
          logs.map((log, i) => {
            const meta = CATEGORY_META[log.type] || CATEGORY_META.Custom;
            const exList = log.completed_exercises || [];
            const status = completionStatus(exList);
            const isOpen = expanded === i;

            return (
              <div
                key={i}
                style={{
                  background: C.card,
                  borderRadius: 12,
                  marginBottom: 10,
                  overflow: "hidden",
                  border: `1px solid ${
                    status ? status.color + "44" : C.border
                  }`,
                  borderLeft: `4px solid ${status ? status.color : meta.color}`,
                }}
              >
                {/* Tap to expand */}
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "14px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: font,
                          fontSize: 20,
                          fontWeight: 800,
                          color: C.text,
                        }}
                      >
                        {meta.emoji} {log.type}
                      </div>
                      <div
                        style={{ color: C.muted, fontSize: 12, marginTop: 3 }}
                      >
                        {new Date(log.logged_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {log.duration_mins}m
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 5,
                        marginLeft: 10,
                      }}
                    >
                      {status ? (
                        <span
                          style={{
                            background: status.bg,
                            border: `1px solid ${status.color}55`,
                            color: status.color,
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 10px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {status.label} · {status.pct}%
                        </span>
                      ) : (
                        <span style={{ color: C.muted, fontSize: 12 }}>
                          {log.exercises_done} exercises
                        </span>
                      )}
                      <span style={{ color: C.muted, fontSize: 12 }}>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Mini progress bar — always visible */}
                  {status && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 11, color: C.muted }}>
                          {status.done} of {status.total} exercises
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: status.color,
                            fontWeight: 700,
                          }}
                        >
                          {status.pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          background: C.surface,
                          borderRadius: 99,
                          height: 5,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 99,
                            width: `${status.pct}%`,
                            background:
                              status.pct === 100
                                ? "linear-gradient(90deg, #00D4AA, #00FF88)"
                                : `linear-gradient(90deg, ${status.color}, ${status.color}88)`,
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </button>

                {/* Expanded exercise breakdown */}
                {isOpen && exList.length > 0 && (
                  <div
                    style={{
                      borderTop: `1px solid ${C.border}`,
                      padding: "12px 16px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                      }}
                    >
                      {exList.map((ex, j) => (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background: ex.completed
                              ? "#00D4AA10"
                              : "#EF444408",
                            border: `1px solid ${
                              ex.completed ? "#00D4AA33" : "#EF444422"
                            }`,
                            borderRadius: 8,
                            padding: "9px 12px",
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 5,
                              flexShrink: 0,
                              background: ex.completed
                                ? "#00D4AA"
                                : "transparent",
                              border: `2px solid ${
                                ex.completed ? "#00D4AA" : "#EF4444"
                              }`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              color: "#000",
                              fontWeight: 900,
                            }}
                          >
                            {ex.completed ? "✓" : ""}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: ex.completed ? C.text : C.muted,
                                textDecoration: ex.completed
                                  ? "none"
                                  : "line-through",
                              }}
                            >
                              {ex.name}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: C.muted,
                                marginLeft: 8,
                              }}
                            >
                              {ex.sets}×{ex.reps}
                            </span>
                          </div>
                          {!ex.completed && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#EF4444",
                                fontWeight: 700,
                                letterSpacing: "0.05em",
                              }}
                            >
                              SKIPPED
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function ProfileScreen({ user, userName, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [user.id]);

  const totalMins = logs.reduce((a, l) => a + (l.duration_mins || 0), 0);
  const fav = logs.length
    ? Object.entries(
        logs.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] || 0) + 1 }), {})
      ).sort((a, b) => b[1] - a[1])[0][0]
    : "—";
  const totalEx = logs.reduce((a, l) => a + (l.exercises_done || 0), 0);

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: "24px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.accent}, ${C.orange})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 900,
              color: "#000",
              fontFamily: font,
            }}
          >
            {userName[0]?.toUpperCase()}
          </div>
          <div>
            <h2
              style={{
                fontFamily: font,
                fontSize: 28,
                fontWeight: 800,
                margin: 0,
              }}
            >
              {userName}
            </h2>
            <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>
              {user.email}
            </p>
          </div>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 28,
            }}
          >
            {[
              { label: "🏋️ Sessions", value: logs.length },
              { label: "⏱ Minutes", value: totalMins },
              { label: "💥 Exercises", value: totalEx },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontFamily: font, fontSize: 24, fontWeight: 800 }}
                >
                  {s.value}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
        {fav !== "—" && (
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>{CATEGORY_META[fav]?.emoji}</span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Favourite workout
              </div>
              <div
                style={{
                  fontFamily: font,
                  fontSize: 20,
                  fontWeight: 800,
                  color: C.text,
                }}
              >
                {fav}
              </div>
            </div>
          </div>
        )}
        <Btn full ghost onClick={onLogout}>
          Sign Out
        </Btn>
      </div>
    </div>
  );
}

// ─── Calendar Screen ──────────────────────────────────────────────────────────
function CalendarScreen({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState(null); // date string "YYYY-MM-DD"

  useEffect(() => {
    supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [user.id]);

  // Build a map of date → logs
  const logsByDate = logs.reduce((acc, log) => {
    const d = new Date(log.logged_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const year = current.getFullYear();
  const month = current.getMonth();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = current.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  const selectedLogs = selected ? logsByDate[selected] || [] : [];

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: "24px 20px 0" }}>
        <h2
          style={{
            fontFamily: font,
            fontSize: 32,
            fontWeight: 800,
            margin: "0 0 20px",
          }}
        >
          📅 Calendar
        </h2>

        {/* Month navigator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <button
            onClick={prevMonth}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 16,
              fontFamily: body,
            }}
          >
            ‹
          </button>
          <span
            style={{
              fontFamily: font,
              fontSize: 22,
              fontWeight: 800,
              color: C.text,
            }}
          >
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 16,
              fontFamily: body,
            }}
          >
            ›
          </button>
        </div>

        {/* Day labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 6,
          }}
        >
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontSize: 11,
                color: C.muted,
                fontWeight: 700,
                padding: "4px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <Spinner />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 24,
            }}
          >
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const key = `${year}-${String(month + 1).padStart(
                2,
                "0"
              )}-${String(day).padStart(2, "0")}`;
              const dayLogs = logsByDate[key] || [];
              const hasLog = dayLogs.length > 0;
              const isToday = key === todayKey;
              const isSel = key === selected;
              const types = [...new Set(dayLogs.map((l) => l.type))];

              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSel ? null : key)}
                  style={{
                    background: isSel
                      ? C.accent
                      : isToday
                      ? C.surface
                      : hasLog
                      ? `${C.accent}12`
                      : "transparent",
                    border: `1px solid ${
                      isSel
                        ? C.accent
                        : isToday
                        ? C.accent + "66"
                        : hasLog
                        ? C.accent + "33"
                        : C.border
                    }`,
                    borderRadius: 10,
                    padding: "6px 2px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    transition: "all 0.15s",
                    minHeight: 52,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isToday || isSel ? 800 : 400,
                      color: isSel
                        ? "#000"
                        : isToday
                        ? C.accent
                        : hasLog
                        ? C.text
                        : C.muted,
                    }}
                  >
                    {day}
                  </span>

                  {/* Workout type dots */}
                  {hasLog && (
                    <div
                      style={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        justifyContent: "center",
                      }}
                    >
                      {types.slice(0, 3).map((t) => {
                        const meta = CATEGORY_META[t] || CATEGORY_META.Custom;
                        return (
                          <div
                            key={t}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isSel ? "#00000066" : meta.color,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {hasLog && (
                    <span
                      style={{
                        fontSize: 9,
                        color: isSel ? "#00000099" : C.muted,
                      }}
                    >
                      {dayLogs.length > 1 ? `${dayLogs.length}×` : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected day detail */}
        {selected && (
          <div style={{ animation: "fadeUp 0.2s ease" }}>
            <h4
              style={{
                color: C.muted,
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                margin: "0 0 12px",
              }}
            >
              {new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h4>

            {selectedLogs.length === 0 ? (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>😴</div>
                <div style={{ color: C.muted, fontSize: 14 }}>Rest day</div>
              </div>
            ) : (
              selectedLogs.map((log, i) => {
                const meta = CATEGORY_META[log.type] || CATEGORY_META.Custom;
                const exList = log.completed_exercises || [];
                const status = completionStatus(exList);
                const doneCnt = exList.filter((e) => e.completed).length;

                return (
                  <div
                    key={i}
                    style={{
                      background: C.card,
                      border: `1px solid ${
                        status ? status.color + "44" : C.border
                      }`,
                      borderLeft: `4px solid ${
                        status ? status.color : meta.color
                      }`,
                      borderRadius: 12,
                      padding: "16px",
                      marginBottom: 10,
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: font,
                            fontSize: 22,
                            fontWeight: 800,
                          }}
                        >
                          {meta.emoji} {log.type}
                        </div>
                        <div
                          style={{ color: C.muted, fontSize: 12, marginTop: 2 }}
                        >
                          {log.duration_mins} min
                        </div>
                      </div>
                      {status && (
                        <span
                          style={{
                            background: status.bg,
                            border: `1px solid ${status.color}55`,
                            color: status.color,
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 10px",
                          }}
                        >
                          {status.label} · {status.pct}%
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {status && (
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            background: C.surface,
                            borderRadius: 99,
                            height: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 99,
                              width: `${status.pct}%`,
                              background:
                                status.pct === 100
                                  ? "linear-gradient(90deg, #00D4AA, #00FF88)"
                                  : `linear-gradient(90deg, ${status.color}, ${status.color}88)`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Exercise list */}
                    {exList.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {exList.map((ex, j) => (
                          <div
                            key={j}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              background: ex.completed
                                ? "#00D4AA10"
                                : "#EF444408",
                              border: `1px solid ${
                                ex.completed ? "#00D4AA33" : "#EF444422"
                              }`,
                              borderRadius: 7,
                              padding: "8px 10px",
                            }}
                          >
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                flexShrink: 0,
                                background: ex.completed
                                  ? "#00D4AA"
                                  : "transparent",
                                border: `2px solid ${
                                  ex.completed ? "#00D4AA" : "#EF4444"
                                }`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                color: "#000",
                                fontWeight: 900,
                              }}
                            >
                              {ex.completed ? "✓" : ""}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: ex.completed ? C.text : C.muted,
                                  textDecoration: ex.completed
                                    ? "none"
                                    : "line-through",
                                }}
                              >
                                {ex.name}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: C.muted,
                                  marginLeft: 6,
                                }}
                              >
                                {ex.sets}×{ex.reps}
                              </span>
                            </div>
                            {!ex.completed && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#EF4444",
                                  fontWeight: 700,
                                }}
                              >
                                SKIPPED
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Legend */}
        {!selected && !loading && (
          <div
            style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}
          >
            {Object.entries(CATEGORY_META)
              .filter(([k]) => k !== "Custom")
              .map(([type, meta]) => {
                const hasAny = Object.values(logsByDate)
                  .flat()
                  .some((l) => l.type === type);
                if (!hasAny) return null;
                return (
                  <div
                    key={type}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: meta.color,
                      }}
                    />
                    <span style={{ fontSize: 11, color: C.muted }}>
                      {meta.emoji} {type}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavBar({ active, onNav }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 420,
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        zIndex: 100,
      }}
    >
      {[
        { id: "home", icon: "🏋️", label: "Home" },
        { id: "custom", icon: "⚡", label: "Mine" },
        { id: "calendar", icon: "📅", label: "Calendar" },
        { id: "log", icon: "📜", label: "History" },
        { id: "profile", icon: "🧑‍💪", label: "Profile" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => onNav(tab.id)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            padding: "12px 0",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            opacity: active === tab.id ? 1 : 0.38,
          }}
        >
          <span style={{ fontSize: 18 }}>{tab.icon}</span>
          <span
            style={{
              fontSize: 10,
              color: active === tab.id ? C.accent : C.muted,
              fontWeight: active === tab.id ? 700 : 400,
              fontFamily: body,
              letterSpacing: "0.05em",
            }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [screen, setScreen] = useState("home");
  const [authLoading, setAuthLoading] = useState(true);

  // Workout flow state
  const [workoutType, setWorkoutType] = useState(null);
  const [workoutExercises, setWorkoutExercises] = useState([]);
  const [pickedExercises, setPickedExercises] = useState([]);
  const [completionData, setCompletionData] = useState(null);
  const [workoutPhase, setWorkoutPhase] = useState(null); // null | "pick" | "active" | "done"

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();
        setUser(session.user);
        setUserName(p?.name || session.user.email.split("@")[0]);
      }
      setAuthLoading(false);
    });
    supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        setUser(null);
        setUserName("");
      }
    });
  }, []);

  const handleAuth = (u, name) => {
    setUser(u);
    setUserName(name);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserName("");
    setScreen("home");
  };

  // Start the pick-exercises flow
  const handlePickExercises = (type, exercises) => {
    setWorkoutType(type);
    setWorkoutExercises(exercises);
    setWorkoutPhase("pick");
  };

  // User picked their exercises, go to active workout
  const handleStartActive = (picked) => {
    setPickedExercises(picked);
    setWorkoutPhase("active");
  };

  // Workout finished, show summary
  const handleComplete = (data) => {
    setCompletionData(data);
    setWorkoutPhase("done");
  };

  // Back to home from any workout screen
  const handleHomeFromWorkout = () => {
    setWorkoutPhase(null);
    setWorkoutType(null);
    setWorkoutExercises([]);
    setPickedExercises([]);
    setCompletionData(null);
    setScreen("home");
  };

  if (authLoading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner />
      </div>
    );
  if (!user) return <AuthScreen onAuth={handleAuth} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: body,
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; }
        input, select { color: #1A2E25 !important; background: #F9FBFA !important; }
        input::placeholder { color: #8FA99D; }
        body { background: #EEF6F2; }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:active { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #C8D8D0; border-radius: 99px; }
      `}</style>

      {/* Workout flow: pick → active → done */}
      {workoutPhase === "pick" && (
        <ExercisePicker
          type={workoutType}
          allExercises={workoutExercises}
          onStart={handleStartActive}
          onBack={handleHomeFromWorkout}
        />
      )}
      {workoutPhase === "active" && (
        <ActiveWorkout
          type={workoutType}
          exercises={pickedExercises}
          user={user}
          onComplete={handleComplete}
          onBack={() => setWorkoutPhase("pick")}
        />
      )}
      {workoutPhase === "done" && completionData && (
        <CompletionSummary
          type={workoutType}
          completedExercises={completionData.completedExercises}
          duration={completionData.duration}
          onHome={handleHomeFromWorkout}
          onGoAgain={() => setWorkoutPhase("pick")}
        />
      )}

      {/* Main app screens */}
      {!workoutPhase && (
        <>
          {screen === "home" && (
            <Dashboard
              user={user}
              userName={userName}
              onPickExercises={handlePickExercises}
              onNav={setScreen}
            />
          )}
          {screen === "custom" && (
            <CustomWorkoutsScreen
              user={user}
              onPickExercises={handlePickExercises}
            />
          )}
          {screen === "calendar" && <CalendarScreen user={user} />}
          {screen === "log" && <LogScreen user={user} />}
          {screen === "profile" && (
            <ProfileScreen
              user={user}
              userName={userName}
              onLogout={handleLogout}
            />
          )}
          <NavBar active={screen} onNav={setScreen} />
        </>
      )}
    </div>
  );
}
