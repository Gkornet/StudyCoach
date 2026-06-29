"use client";

import { useState } from "react";
import { supabase } from "./lib/supabaseClient";

// Vertaal de (Engelse) Supabase-foutmeldingen naar iets begrijpelijks voor een kind.
function vertaalFout(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail of wachtwoord klopt niet.";
  if (m.includes("already registered") || m.includes("already exists")) return "Dit e-mailadres heeft al een account. Log gewoon in.";
  if (m.includes("password") && m.includes("6")) return "Kies een wachtwoord van minstens 6 tekens.";
  if (m.includes("email") && m.includes("invalid")) return "Dit e-mailadres ziet er niet goed uit.";
  if (m.includes("confirm")) return "Je moet je account eerst bevestigen via de e-mail.";
  return msg;
}

export default function LoginScreen({ onSkip }: { onSkip: () => void }) {
  const [signup, setSignup] = useState(false);
  const [naam, setNaam] = useState("");
  const [ouderEmail, setOuderEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase) return;
    setErr(null);
    setInfo(null);
    if (!email.trim() || !password) { setErr("Vul je e-mail en wachtwoord in."); return; }
    if (signup && !naam.trim()) { setErr("Vul je naam in."); return; }
    setBusy(true);
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) { setErr(vertaalFout(error.message)); return; }
        // Profiel vastleggen (naam + ouder-e-mail voor toestemming). Lukt dit niet,
        // dan is dat niet fataal voor het inloggen zelf.
        if (data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, naam: naam.trim(), ouder_email: ouderEmail.trim() || null });
        }
        if (!data.session) {
          setInfo("Account aangemaakt! Bevestig eventueel je e-mail en log daarna in.");
          setSignup(false);
        }
        // Met "Confirm email" uit is er meteen een sessie → de app sluit het
        // inlogscherm vanzelf via de auth-listener in page.tsx.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setErr(vertaalFout(error.message)); return; }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>📐</div>
        <div style={s.title}>StudyCoach</div>
        <div style={s.sub}>{signup ? "Maak je eigen account" : "Log in om verder te gaan"}</div>

        {signup && (
          <>
            <input style={s.input} placeholder="Jouw naam" value={naam} onChange={(e) => setNaam(e.target.value)} />
            <input style={s.input} placeholder="E-mail van je ouder (voor toestemming)" type="email" value={ouderEmail} onChange={(e) => setOuderEmail(e.target.value)} />
          </>
        )}
        <input style={s.input} placeholder="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={s.input} placeholder="Wachtwoord" type="password" autoComplete={signup ? "new-password" : "current-password"} value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />

        {err && <div style={s.err}>{err}</div>}
        {info && <div style={s.info}>{info}</div>}

        <button style={{ ...s.primary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
          {busy ? "Even geduld…" : signup ? "Account aanmaken" : "Inloggen"}
        </button>

        <button style={s.link} onClick={() => { setSignup((v) => !v); setErr(null); setInfo(null); }}>
          {signup ? "Heb je al een account? Inloggen" : "Nog geen account? Maak er een"}
        </button>

        <button style={s.skip} onClick={onSkip}>Even verder zonder account →</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#2563eb,#4f46e5)", padding: 20, fontFamily: "'Segoe UI', system-ui, sans-serif" },
  card: { background: "white", borderRadius: 24, padding: "32px 26px", width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" },
  logo: { fontSize: "2.4rem", textAlign: "center" },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", textAlign: "center" },
  sub: { fontSize: "0.9rem", color: "#64748b", textAlign: "center", marginBottom: 6 },
  input: { background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", fontSize: "0.95rem", fontFamily: "inherit", color: "#1e293b", outline: "none" },
  primary: { background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", border: "none", borderRadius: 14, padding: "13px 16px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 },
  link: { background: "none", border: "none", color: "#4338ca", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  skip: { background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", marginTop: 2 },
  err: { background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "9px 12px", fontSize: "0.85rem" },
  info: { background: "#dcfce7", color: "#166534", borderRadius: 10, padding: "9px 12px", fontSize: "0.85rem" },
};
