"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PdfFile {
  data: string;
  name: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  imageType?: string;
  pdfNames?: string[];
}

const SYSTEM_PROMPT = `Jij bent een geduldige studiecoach voor een leerling die moeite heeft met leren. Je helpt met elk vak. Leg alles uit simpel, duidelijk, stap voor stap — zoals aan een kind.

## Markers (altijd gebruiken)
[keuzes: A | B | C] — sluit elk bericht af met 2–4 keuzes. Na uitleg: "📷 Foto gestuurd" + "✍️ Ik typ het". Na opgave: "📷 Mijn uitwerking" + "✍️ Mijn antwoord typen".
[vak: Naam] — één keer bij eerste bijlage (bijv. Wiskunde, Frans, Economie)
[sessie: N stappen] — één keer bij eerste bijlage
[voortgang: N] — na elke voltooide stap
[sessie-klaar: begrip1 | begrip2] — als alles klaar is

## Bij een bijlage
Detecteer het vak. Geef een kort overzicht (max 4 regels): onderwerp + stappen.
Stuur [vak:...] [sessie:...] en [keuzes: Begin bij theorie | Begin bij V1 | ...]

## Sessievolgorde
1. **Uitleg** — gebruik een echt-leven voorbeeld. Daarna: "Schrijf dit in je eigen woorden — typ het of stuur een foto." Wacht. Corrigeer vriendelijk. Pas verder als het klopt.
2. **Ophalen** — voor elke nieuwe stap: "Wat was ook alweer...? Zonder terug te kijken." Fout → leg anders uit.
3. **Opgave** — schrijf de opgave over, laat uitwerken. Fout → vraag "wat dacht je?" Twee keer fout → nieuwe uitleg.
4. **Feynman** — na elke opgave: "Hoe leg jij dit uit aan een vriendin?" Pas verder als ze het in eigen woorden kunnen.
5. **Afsluiting** — spiekbriefje + [sessie-klaar: ...]

## Per vak
**Wiskunde** — formules uitschrijven (geen LaTeX), SVG bij geometrie, stap-voor-stap
**Talen** — woord + voorbeeldzin + vertaling, ezelsbruggetjes, uitspraak in gewone taal
**Economie** — begrip + dagelijks voorbeeld, "als X stijgt dan Y omdat...", SVG-grafieken
**Biologie/Scheikunde** — processen als verhaal, SVG-schema's, ezelsbruggetjes
**Geschiedenis/Aardrijkskunde** — oorzaak-gevolg, tijdlijn-SVG, koppel aan het heden

🔑 **Onthoud:** voor elke kernregel. Geen moeilijke woorden zonder uitleg. Bemoedigend. 😊

## SVG (alleen als het helpt)
[svg]<svg viewBox="0 0 260 200" width="260" height="200" xmlns="http://www.w3.org/2000/svg">...</svg>[/svg]
Stijl: fill="#e0e7ff" stroke="#4338ca" stroke-width="2" — accenten: stroke="#ef4444" stroke-dasharray="5,3" — tekst: font-size="13" fill="#1e293b" font-family="sans-serif"`;

export default function StudyCoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hoi! 👋 Ik ben jouw studiecoach.\n\nIk help je met elk vak — wiskunde, Frans, economie, biologie, je noemt het maar. Stap voor stap, geen haast, geen stomme vragen. 😊\n\n📸 **Zo beginnen we:**\nFotografeer of scan **alle stof** die je moet leren — de theorie, de voorbeelden én de opgaven. Stuur alles in één keer op.\n\nDan weet ik precies wat we gaan doen!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>("image/jpeg");
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionConcepts, setSessionConcepts] = useState<string[]>([]);
  const [sessionStartTime] = useState(() => Date.now());
  const [vak, setVak] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage((ev.target?.result as string).split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const tooBig = files.find(f => f.size > 3 * 1024 * 1024);
    if (tooBig) {
      alert(`"${tooBig.name}" is te groot (max 3 MB per PDF). Comprimeer het bestand.`);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      return;
    }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = (ev.target?.result as string).split(",")[1];
        setPdfs(prev => [...prev, { data, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const parseChoices = (text: string): string[] => {
    const match = text.match(/\[keuzes:\s*([^\]]+)\]/i);
    if (!match) return [];
    return match[1].split("|").map(s => s.trim()).filter(Boolean);
  };

  const parseMeta = (text: string) => {
    const sessie = text.match(/\[sessie:\s*(\d+)\s*stappen?\s*\|\s*~?(\d+)\s*min\]/i);
    if (sessie) {
      setSessionTotal(parseInt(sessie[1]));
      setSessionMinutes(parseInt(sessie[2]));
      setSessionDone(0);
    }
    const voortgang = text.match(/\[voortgang:\s*(\d+)\]/i);
    if (voortgang) {
      const n = parseInt(voortgang[1]);
      setSessionDone(prev => {
        if (n > prev) { setCelebrate(true); setTimeout(() => setCelebrate(false), 1200); }
        return n;
      });
    }
    const vakMatch = text.match(/\[vak:\s*([^\]]+)\]/i);
    if (vakMatch) setVak(vakMatch[1].trim());

    const klaar = text.match(/\[sessie-klaar:\s*([^\]]+)\]/i);
    if (klaar) {
      const concepts = klaar[1].split("|").map(s => s.trim()).filter(Boolean);
      setSessionConcepts(concepts);
      setTimeout(() => setSessionComplete(true), 600);
    }
  };

  const sendChoice = (choice: string) => {
    setChoices([]);
    setInput(choice);
    setTimeout(() => sendMessageWith(choice), 0);
  };

  const sendMessage = async () => {
    const text = input;
    setInput("");
    await sendMessageWith(text);
  };

  const sendMessageWith = async (text: string) => {
    if (!text.trim() && !image && !pdfs.length) return;
    setChoices([]);

    let userContent = text;
    if (!userContent && image) userContent = "📷 [Foto gestuurd — los deze opgave op]";
    if (!userContent && pdfs.length) userContent = pdfs.map(p => `📄 [PDF gestuurd: ${p.name}]`).join("\n");

    const userMsg: Message = {
      role: "user",
      content: userContent,
      image: image || undefined,
      imageType: image ? imageType : undefined,
      pdfNames: pdfs.length ? pdfs.map(p => p.name) : undefined,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const sentImage = image;
    const sentImageType = imageType;
    const sentPdfs = pdfs;
    setImage(null);
    setPdfs([]);
    setLoading(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";

    try {
      const apiMessages = newMessages.map((m) => {
        if (m.image) {
          return {
            role: m.role,
            content: [
              { type: "image", source: { type: "base64", media_type: m.imageType, data: m.image } },
              { type: "text", text: m.content },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      if (sentPdfs.length) {
        const last = apiMessages[apiMessages.length - 1];
        apiMessages[apiMessages.length - 1] = {
          role: last.role,
          content: [
            ...sentPdfs.map(p => ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: p.data } })),
            { type: "text", text: userContent || "Leg de lesstof in deze PDFs uit en geef een samenvatting van de belangrijkste punten." },
          ],
        };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, system: SYSTEM_PROMPT }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server antwoord onleesbaar (status ${res.status})`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `Fout ${res.status}`);
      }

      const reply = data.content?.[0]?.text || "Er ging iets mis, probeer het opnieuw!";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      setChoices(parseChoices(reply));
      parseMeta(reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setMessages([...newMessages, { role: "assistant", content: `Oeps! Er ging iets mis 😅\n\n${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const stripMarkers = (text: string) =>
    text.replace(/\[(keuzes|sessie|voortgang|sessie-klaar|vak):[^\]]*\]/gi, "").trim();

  const sanitizeSvg = (svg: string) =>
    svg.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");

  const MdBlock = ({ text }: { text: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: (props) => <table style={styles.mdTable} {...props} />,
        th: (props) => <th style={styles.mdTh} {...props} />,
        td: (props) => <td style={styles.mdTd} {...props} />,
        p: (props) => <p style={{ margin: "4px 0" }} {...props} />,
      }}
    >
      {text}
    </ReactMarkdown>
  );

  const MessageContent = ({ text }: { text: string }) => {
    const clean = stripMarkers(text);
    const parts = clean.split(/\[svg\]([\s\S]*?)\[\/svg\]/gi);
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1
            ? <div key={i} style={styles.svgWrap} dangerouslySetInnerHTML={{ __html: sanitizeSvg(part) }} />
            : <MdBlock key={i} text={part} />
        )}
      </>
    );
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>📐</span>
            <div>
              <div style={styles.logoTitle}>StudyCoach</div>
              {vak && <div style={styles.logoSub}>{vak}</div>}
            </div>
          </div>
          {sessionTotal > 0 ? (
            <div style={styles.progressWrap}>
              <div style={styles.progressInfo}>
                <span style={{ ...styles.progressLabel, animation: celebrate ? "pop 0.6s ease" : "none" }}>
                  {celebrate ? "⭐" : `Stap ${sessionDone}/${sessionTotal}`}
                </span>
                <span style={styles.progressTime}>
                  {sessionDone < sessionTotal
                    ? `~${Math.round((sessionTotal - sessionDone) * (sessionMinutes / sessionTotal))} min`
                    : "🎉 Klaar!"}
                </span>
              </div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${Math.round((sessionDone / sessionTotal) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <div style={styles.badge}><span style={styles.dot} />Online</div>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.row, ...(msg.role === "user" ? styles.rowUser : {}) }}>
            {msg.role === "assistant" && <div style={styles.avatar}>🤖</div>}
            <div style={{ ...styles.bubble, ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleBot) }}>
              {msg.image && (
                <img src={`data:${msg.imageType};base64,${msg.image}`} alt="opgave" style={styles.uploadedImg} />
              )}
              {msg.pdfNames?.map((name, j) => (
                <div key={j} style={styles.pdfBadge}>📄 {name}</div>
              ))}
              <div><MessageContent text={msg.content} /></div>
            </div>
            {msg.role === "user" && <div style={styles.avatar}>🙋</div>}
          </div>
        ))}
        {loading && (
          <div style={styles.row}>
            <div style={styles.avatar}>🤖</div>
            <div style={{ ...styles.bubble, ...styles.bubbleBot, ...styles.typing }}>
              <span style={styles.dot2} />
              <span style={{ ...styles.dot2, animationDelay: "0.2s" }} />
              <span style={{ ...styles.dot2, animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {choices.length > 0 && !loading && (
        <div style={styles.choicesBar}>
          {choices.map((c, i) => (
            <button key={i} style={styles.choiceBtn} onClick={() => sendChoice(c)}>{c}</button>
          ))}
        </div>
      )}

      <footer style={styles.footer}>
        {(image || pdfs.length > 0) && (
          <div style={styles.attachments}>
            {image && (
              <div style={styles.previewWrap}>
                <img src={`data:${imageType};base64,${image}`} alt="preview" style={styles.preview} />
                <button onClick={() => setImage(null)} style={styles.removeBtn}>✕</button>
              </div>
            )}
            {pdfs.map((p, i) => (
              <div key={i} style={styles.pdfPreview}>
                <span>📄 {p.name}</span>
                <button onClick={() => setPdfs(prev => prev.filter((_, j) => j !== i))} style={styles.removeBtn2}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={styles.inputRow}>
          <button style={styles.iconBtn} onClick={() => fileInputRef.current?.click()} title="Foto">📷</button>
          <button style={styles.iconBtn} onClick={() => pdfInputRef.current?.click()} title="PDF">📄</button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <input ref={pdfInputRef} type="file" accept="application/pdf" multiple onChange={handlePdfUpload} style={{ display: "none" }} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Stel een vraag of stuur een opgave..."
            rows={1}
            style={styles.textarea}
          />
          <button onClick={sendMessage} disabled={loading || (!input.trim() && !image && !pdfs.length)} style={{ ...styles.sendBtn, opacity: loading || (!input.trim() && !image && !pdfs.length) ? 0.4 : 1 }}>
            ➤
          </button>
        </div>
        <p style={styles.hint}>Enter om te sturen · 📷 foto · 📄 PDF met lesstof</p>
      </footer>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
        @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.5)} 100%{transform:scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        body { margin: 0; background: #f0f4ff; }
        .choiceBtn:hover { background: #e0e7ff !important; transform: translateY(-1px); transition: all 0.15s; }
      `}</style>

      {sessionComplete && (
        <div style={styles.overlay}>
          <div style={styles.endCard}>
            <div style={styles.endTrophy}>🏆</div>
            <div style={styles.endTitle}>Sessie voltooid!</div>
            <div style={styles.endSub}>
              {sessionTotal} stappen · {Math.round((Date.now() - sessionStartTime) / 60000)} minuten
            </div>

            {sessionConcepts.length > 0 && (
              <div style={styles.endSection}>
                <div style={styles.endSectionTitle}>Dit snap je nu 🎓</div>
                <div style={styles.conceptsWrap}>
                  {sessionConcepts.map((c, i) => (
                    <span key={i} style={styles.conceptChip}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.endMessage}>
              Super gedaan! Je hebt hard gewerkt en nieuwe dingen geleerd. Succes bij de toets — je kan dit! 💪
            </div>

            <button
              style={styles.endBtn}
              onClick={() => {
                setSessionComplete(false);
                setSessionTotal(0);
                setSessionDone(0);
                setSessionConcepts([]);
                setVak(null);
                setMessages([{
                  role: "assistant",
                  content: "Hoi! 👋 Ik ben jouw studiecoach.\n\nIk help je met elk vak — wiskunde, Frans, economie, biologie, je noemt het maar. Stap voor stap, geen haast, geen stomme vragen. 😊\n\n📸 **Zo beginnen we:**\nFotografeer of scan **alle stof** die je moet leren — de theorie, de voorbeelden én de opgaven. Stuur alles in één keer op.\n\nDan weet ik precies wat we gaan doen!",
                }]);
                setChoices([]);
              }}
            >
              Nieuwe sessie starten →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#f0f4ff", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 780, margin: "0 auto" },
  header: { background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 16px rgba(37,99,235,0.35)" },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { fontSize: "2rem", background: "rgba(255,255,255,0.2)", borderRadius: 12, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" },
  logoTitle: { fontSize: "1.2rem", fontWeight: 700, letterSpacing: -0.5 },
  logoSub: { fontSize: "0.72rem", opacity: 0.8 },
  badge: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: "0.78rem", fontWeight: 500 },
  dot: { width: 8, height: 8, background: "#4ade80", borderRadius: "50%", animation: "pulse 2s infinite", display: "inline-block" },
  main: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  row: { display: "flex", alignItems: "flex-end", gap: 8 },
  rowUser: { flexDirection: "row-reverse" },
  avatar: { fontSize: "1.4rem", width: 36, height: 36, background: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", flexShrink: 0 },
  bubble: { maxWidth: "75%", padding: "12px 16px", borderRadius: 18, lineHeight: 1.6, fontSize: "0.95rem", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  bubbleBot: { background: "white", borderBottomLeftRadius: 4, color: "#1e293b" },
  bubbleUser: { background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", borderBottomRightRadius: 4 },
  typing: { display: "flex", gap: 5, alignItems: "center", padding: "14px 18px" },
  dot2: { width: 8, height: 8, background: "#94a3b8", borderRadius: "50%", animation: "bounce 1.2s infinite", display: "inline-block" },
  uploadedImg: { maxWidth: 200, borderRadius: 8, marginBottom: 8, display: "block" },
  pdfBadge: { background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 8px", fontSize: "0.8rem", marginBottom: 6, display: "inline-block" },
  footer: { background: "white", borderTop: "1px solid #e2e8f0", padding: "12px 16px 16px", position: "sticky", bottom: 0 },
  attachments: { display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" as const },
  previewWrap: { position: "relative", display: "inline-block" },
  preview: { height: 60, borderRadius: 8, border: "2px solid #e2e8f0" },
  pdfPreview: { display: "flex", alignItems: "center", gap: 6, background: "#f0f4ff", border: "2px solid #c7d2fe", borderRadius: 8, padding: "6px 10px", fontSize: "0.85rem", color: "#4f46e5", fontWeight: 500 },
  removeBtn: { position: "absolute", top: -6, right: -6, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: "0.6rem", cursor: "pointer" },
  removeBtn2: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem", padding: 0, marginLeft: 4 },
  inputRow: { display: "flex", alignItems: "flex-end", gap: 8, background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: 24, padding: "6px 6px 6px 12px" },
  iconBtn: { fontSize: "1.3rem", background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8, flexShrink: 0 },
  textarea: { flex: 1, background: "none", border: "none", outline: "none", resize: "none", fontSize: "0.95rem", fontFamily: "inherit", color: "#1e293b", padding: "4px 0", maxHeight: 120 },
  sendBtn: { background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  hint: { fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", margin: "6px 0 0" },
  progressWrap: { display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 4, minWidth: 140 },
  progressInfo: { display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", fontWeight: 600 },
  progressLabel: { transition: "all 0.3s" },
  progressTime: {},
  progressTrack: { width: "100%", height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 6, overflow: "hidden" },
  progressFill: { height: "100%", background: "#4ade80", borderRadius: 6, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(15,23,42,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  endCard: { background: "white", borderRadius: 28, padding: "40px 32px", maxWidth: 420, width: "100%", textAlign: "center" as const, animation: "slideUp 0.5s cubic-bezier(.4,0,.2,1)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" },
  endTrophy: { fontSize: "4rem", marginBottom: 12, display: "block", animation: "pop 0.6s 0.3s both" },
  endTitle: { fontSize: "1.7rem", fontWeight: 800, color: "#1e293b", marginBottom: 4 },
  endSub: { fontSize: "0.9rem", color: "#94a3b8", marginBottom: 28 },
  endSection: { background: "#f8fafc", borderRadius: 16, padding: "16px 20px", marginBottom: 20, textAlign: "left" as const },
  endSectionTitle: { fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 10 },
  conceptsWrap: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  conceptChip: { background: "#e0e7ff", color: "#4338ca", borderRadius: 20, padding: "5px 14px", fontSize: "0.85rem", fontWeight: 600 },
  endMessage: { fontSize: "0.95rem", color: "#475569", lineHeight: 1.6, marginBottom: 28 },
  endBtn: { background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", border: "none", borderRadius: 50, padding: "14px 32px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", width: "100%" },
  choicesBar: { display: "flex", flexWrap: "wrap" as const, gap: 8, padding: "8px 16px", background: "white", borderTop: "1px solid #e2e8f0" },
  choiceBtn: { background: "#f0f4ff", border: "2px solid #c7d2fe", color: "#4338ca", borderRadius: 20, padding: "7px 16px", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  svgWrap: { margin: "10px 0", lineHeight: 0 },
  mdTable: { borderCollapse: "collapse" as const, margin: "8px 0", fontSize: "0.9rem", width: "100%" },
  mdTh: { border: "1px solid #cbd5e1", padding: "6px 12px", background: "#f1f5f9", textAlign: "left" as const },
  mdTd: { border: "1px solid #cbd5e1", padding: "6px 12px" },
};