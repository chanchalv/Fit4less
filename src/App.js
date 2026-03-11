import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { BUILT_IN_EXERCISES, CATEGORY_META, SUGGESTIONS } from "./data";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#080C10",
  surface: "#0F1419",
  card: "#141B22",
  border: "#1E2832",
  accent: "#00D4AA",
  accentDim: "#00D4AA18",
  orange: "#FF7043",
  purple: "#8B5CF6",
  pink: "#EC4899",
  blue: "#3B82F6",
  text: "#E8EDF2",
  muted: "#4A5568",
  light: "#8899AA",
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
    ? "#00FFCC"
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
        color: ghost ? C.light : danger ? "#fff" : "#000",
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
        boxShadow: !ghost && !danger && h ? `0 0 24px ${C.accent}55` : "none",
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
      background: C.surface,
      border: `1px solid ${C.border}`,
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
      background: C.surface,
      border: `1px solid ${C.border}`,
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

// ─── Setup Guide ──────────────────────────────────────────────────────────────
function SetupGuide({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Create a free Supabase project",
      body: "Go to supabase.com → 'Start for free' → sign up → 'New Project'. Pick any name and a strong password. Wait ~2 min for it to boot.",
      action: "I created the project →",
      link: "https://supabase.com",
      linkLabel: "Open Supabase →",
    },
    {
      title: "Run the database SQL",
      body: "Supabase → SQL Editor → New query → paste the SQL below → Run.",
      sql: `create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text, created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id);

create table workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  type text not null,
  exercises_done int default 0,
  duration_mins int default 0,
  completed_exercises jsonb default '[]',
  logged_at timestamptz default now()
);
alter table workout_logs enable row level security;
create policy "own logs" on workout_logs for all using (auth.uid() = user_id);

create table custom_workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null, description text,
  is_public boolean default false,
  created_at timestamptz default now()
);
alter table custom_workouts enable row level security;
create policy "owner manage" on custom_workouts for all using (auth.uid() = user_id);
create policy "public view" on custom_workouts for select using (is_public = true);

create table custom_exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references custom_workouts on delete cascade,
  name text not null, sets int default 3,
  reps text default '10-12', muscle text default 'General',
  notes text, sort_order int default 0
);
alter table custom_exercises enable row level security;
create policy "owner manage ex" on custom_exercises for all using (
  exists (select 1 from custom_workouts where id = workout_id and user_id = auth.uid())
);
create policy "public view ex" on custom_exercises for select using (
  exists (select 1 from custom_workouts where id = workout_id and is_public = true)
);`,
      action: "SQL ran successfully →",
    },
    {
      title: "Paste your API keys",
      body: "Supabase → Settings (⚙️) → API. Copy Project URL and anon public key into supabaseClient.js.",
      code: `const SUPABASE_URL = 'https://xxxx.supabase.co'\nconst SUPABASE_ANON_KEY = 'eyJhbGci...'`,
      action: "Keys are set — let's go! 🚀",
    },
  ];
  const cur = steps[step];
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        padding: "24px 20px",
        fontFamily: body,
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${C.accent}, ${C.orange})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            ⚡
          </div>
          <div>
            <div
              style={{
                fontFamily: font,
                fontSize: 26,
                fontWeight: 900,
                color: C.text,
              }}
            >
              FORGEFIT
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Supabase Setup Guide
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 99,
                background: i <= step ? C.accent : C.border,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "24px",
            marginBottom: 16,
            borderTop: `2px solid ${C.accent}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.accent,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Step {step + 1} of {steps.length}
          </div>
          <h2
            style={{
              fontFamily: font,
              fontSize: 26,
              fontWeight: 800,
              margin: "0 0 14px",
              color: C.text,
            }}
          >
            {cur.title}
          </h2>
          <p
            style={{
              color: C.light,
              fontSize: 14,
              lineHeight: 1.7,
              margin: "0 0 16px",
            }}
          >
            {cur.body}
          </p>
          {cur.link && (
            <a
              href={cur.link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                background: C.accentDim,
                border: `1px solid ${C.accent}44`,
                color: C.accent,
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                textDecoration: "none",
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              {cur.linkLabel}
            </a>
          )}
          {cur.sql && (
            <pre
              style={{
                background: "#050810",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "14px",
                fontSize: 11,
                color: "#7DD3FC",
                overflowX: "auto",
                marginBottom: 16,
                maxHeight: 240,
                overflowY: "auto",
                lineHeight: 1.6,
              }}
            >
              {cur.sql}
            </pre>
          )}
          {cur.code && (
            <pre
              style={{
                background: "#050810",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "14px",
                fontSize: 12,
                color: "#7DD3FC",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {cur.code}
            </pre>
          )}
          <Btn
            full
            onClick={() =>
              step < steps.length - 1 ? setStep((s) => s + 1) : onDone()
            }
          >
            {cur.action}
          </Btn>
        </div>
        <p style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>
          Already set up?{" "}
          <button
            onClick={onDone}
            style={{
              background: "none",
              border: "none",
              color: C.accent,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: body,
            }}
          >
            Skip →
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
        });
        if (error) throw error;
        if (data.user) {
          await supabase
            .from("profiles")
            .upsert({ id: data.user.id, name: name || email.split("@")[0] });
          onAuth(data.user, name || email.split("@")[0]);
        } else setErr("Check your email to confirm, then sign in.");
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
        onAuth(data.user, p?.name || email.split("@")[0]);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

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
          FORGEFIT
        </h1>
        <p style={{ color: C.muted, fontSize: 13, margin: "6px 0 0" }}>
          Your AI-powered workout companion
        </p>
      </div>
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
            onClick={() => {
              setMode(m);
              setErr("");
            }}
            style={{
              flex: 1,
              background: mode === m ? C.card : "transparent",
              border:
                mode === m ? `1px solid ${C.border}` : "1px solid transparent",
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mode === "signup" && (
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Password (min 6 chars)"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
        />
        {err && (
          <p style={{ color: C.orange, fontSize: 13, margin: 0 }}>{err}</p>
        )}
        <Btn full onClick={handle} disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "login"
            ? "Sign In →"
            : "Create Account →"}
        </Btn>
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

// ─── STEP 2: Active Workout ───────────────────────────────────────────────────
function ActiveWorkout({ type, exercises, user, onComplete, onBack }) {
  const [checked, setChecked] = useState({});
  const [start] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
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
      {/* Sticky header with timer + progress */}
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
        {/* Progress bar */}
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
        <h2
          style={{
            fontFamily: font,
            fontSize: 32,
            fontWeight: 900,
            margin: "0 0 16px",
            letterSpacing: "-0.01em",
          }}
        >
          {meta.emoji} {type} Workout
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {exercises.map((ex, i) => {
            const on = !!checked[i];
            return (
              <button
                key={i}
                onClick={() => setChecked((c) => ({ ...c, [i]: !on }))}
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
                {/* Checkbox */}
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
                {/* Exercise info */}
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

      {/* Finish button */}
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
            color: pct === 100 ? "#FFD700" : C.text,
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
          Hey, {userName.split(" ")[0]} 👋
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
            { label: "Streak", value: `${streak}🔥` },
            { label: "This Week", value: thisWeek },
            { label: "Total", value: logs.length },
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
          <Badge label="Today's Suggestion" />
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
          All Categories
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
                Recent Sessions
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
          History
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
              { label: "Sessions", value: logs.length },
              { label: "Minutes", value: totalMins },
              { label: "Exercises", value: totalEx },
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
        { id: "home", icon: "🏠", label: "Home" },
        { id: "custom", icon: "⚡", label: "Mine" },
        { id: "log", icon: "📋", label: "History" },
        { id: "profile", icon: "👤", label: "Profile" },
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
  const [setupDone, setSetupDone] = useState(false);
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
        setSetupDone(true);
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
  if (!setupDone) return <SetupGuide onDone={() => setSetupDone(true)} />;
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
        input, select { color: #E8EDF2 !important; }
        input::placeholder { color: #4A5568; }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:active { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2832; border-radius: 99px; }
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
