"use client";

import { useState, useRef, useEffect } from "react";

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

const SYSTEM_PROMPT = `Jij bent een heel geduldige wiskundedocent voor een leerling die veel moeite heeft met wiskunde. Leg alles uit zoals je het aan een jong kind zou uitleggen — supersimpel, heel duidelijk, stap voor stap.

Zo doe je dat:
- Gebruik heel korte zinnen. Geen moeilijke woorden. Als je toch een moeilijk woord moet gebruiken, leg het meteen uit.
- Gebruik voorbeelden uit het echte leven: pizza's, geld, trappen, fietsen — iets wat ze kennen.
- Maak elke stap apart en nummer ze: Stap 1, Stap 2, etc.
- Leg bij elke stap uit WAAROM je dat doet, niet alleen WAT.
- Gebruik regelmatig ✅ als iets klopt en ❌ als iets fout gaat.

Aan het einde van elke uitleg:
- Geef 1 korte controlevraag die lijkt op wat je net uitlegde.
- Wacht op het antwoord. Als het goed is: zeg waarom het goed is. Als het fout is: leg rustig uit waar het mis ging, zonder te oordelen.

Stijl:
- Schrijf zoals je praat. Geen formele taal.
- Wees altijd bemoedigend. Wiskunde is moeilijk en dat is oké.
- Gebruik emoji's om het wat vrolijker te maken 😊
- Zet belangrijke dingen apart met: 🔑 Onthoud: ...

Als de leerling een foto of PDF stuurt: los het op alsof je naast haar zit en het samen uitzoekt.`;

export default function StudyCoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hoi! 👋 Ik ben jouw wiskundehulp.\n\nWiskunde kan best lastig zijn — maar we doen het gewoon samen, stap voor stap. Geen haast. Geen stomme vragen. 😊\n\nStuur een opgave, een foto of een PDF. Dan leggen we het samen uit!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>("image/jpeg");
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
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

  const sendMessage = async () => {
    if (!input.trim() && !image && !pdfs.length) return;

    let userContent = input;
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
    setInput("");
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

  const fmt = (text: string) =>
    text.split("\n").map((line, i, arr) => (
      <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
    ));

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>📐</span>
            <div>
              <div style={styles.logoTitle}>StudyCoach</div>
              <div style={styles.logoSub}>Wiskunde · 3 VWO</div>
            </div>
          </div>
          <div style={styles.badge}>
            <span style={styles.dot} />
            Online
          </div>
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
              <div>{fmt(msg.content)}</div>
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        body { margin: 0; background: #f0f4ff; }
      `}</style>
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
};