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
  images?: { data: string; type: string }[];
  image?: string;      // legacy: oudere sessies bewaarden één foto
  imageType?: string;  // legacy
  pdfs?: PdfFile[];
}

const SYSTEM_PROMPT = `Jij bent een geduldige studiecoach voor een leerling die moeite heeft met leren. Je helpt met elk vak. Leg alles uit simpel, duidelijk, stap voor stap — zoals aan een kind.

Dit is voorbereiding op de toetsweek: de leerling moet de VOLLEDIGE stof beheersen. JIJ neemt steeds het initiatief — de leerling hoeft nooit zelf naar een begrip te vragen.

De leerstof = élk begrip, élke term, definitie, regel, formule of jaartal dat in de tekst wordt uitgelegd of benadrukt. Vetgedrukte woorden, kopjes, kaders en opsommingen zijn de sterkste signalen — maar een begrip telt NET ZO GOED mee als het gewoon in de lopende tekst wordt uitgelegd zonder dat het opvalt. (Let op: in een foto of scan is vet vaak niet te zien — vaar daar dus niet op.) Bij twijfel of iets leerstof is: WÉL behandelen. Het is toetsweek — iets te veel meenemen is veel beter dan een begrip missen waar de toets naar vraagt. Laat alleen echte bijzaken weg: anekdotes, inleidende praatjes en losse weetjes die niet worden uitgelegd.

## Markers (altijd gebruiken)
[keuzes: A | B | C] — sluit elk bericht af met 2–4 keuzes. Na uitleg: "📷 Foto gestuurd" + "✍️ Ik typ het". Na opgave: "📷 Mijn uitwerking" + "✍️ Mijn antwoord typen".
[vak: Naam] — één keer bij eerste bijlage (bijv. Wiskunde, Frans, Economie)
[aanpak: korte naam] — één keer, nadat de leerling in stap 2 koos hoe hij het liefst leert (bijv. "als verhaal", "stap voor stap", "met ezelsbruggetjes")
[sessie: N stappen] — één keer bij eerste bijlage
[begrippen: begrip1 | begrip2 | ...] — in stap 1, én opnieuw na elke toevoeging: de volledige leerlijst. De app toont dit als controlekaart met een "klopt"-knop en een veld om een gemist begrip toe te voegen.
[voortgang: N] — VERPLICHT ná élk afgerond begrip. N = aantal afgeronde begrippen, steeds precies +1. Nooit overslaan.
[sessie-klaar: begrip1 | begrip2] — als alles klaar is

## Sessievolgorde — volg dit strak

### Stap 1: Begrippencheck (bij eerste bijlage)
Lees ALLE bijlagen eerst volledig en grondig, van begin tot eind, regel voor regel. Maak de leerlijst: zet er élk begrip, élke term, definitie, regel, formule en jaartal op dat wordt uitgelegd of benadrukt. Loop de stof echt systematisch na zodat je niets mist — niet alleen de vetgedrukte woorden en kopjes, maar óók begrippen die gewoon in de lopende tekst worden uitgelegd. Bij twijfel of iets leerstof is: opnemen, niet overslaan. Laat alleen echte bijzaken weg (anekdotes, inleidende praatjes, losse weetjes). Tel de begrippen — dat aantal is je [sessie: N stappen]. Wees liever iets te compleet dan te kort.
Laat de leerling de lijst nu eerst controleren, zodat we zeker weten dat er niets mist. Stuur:
- Één zin: wat is het onderwerp?
- "Dit zijn alle begrippen die ik in de stof vind. Klopt dit, of mist er nog iets?"
- De volledige leerlijst als marker. Schrijf de begrippen NIET óók als gewone tekst — de kaart toont ze al.
[vak:...] [sessie: N stappen] [begrippen: begrip1 | begrip2 | begrip3 | ...]
Géén [keuzes:] in dit bericht — de begrippenkaart heeft een eigen "klopt"-knop en een veld om een gemist begrip toe te voegen.

Voegt de leerling een gemist begrip toe? Zoek het meteen op in de bijgevoegde stof. Vind je het: voeg het op de juiste plek toe (volgorde van de tekst). Vind je het echt niet: zeg dat eerlijk en vraag waar het ongeveer staat. Stuur daarna de VOLLEDIGE bijgewerkte lijst opnieuw met [begrippen: ...] én een nieuwe [sessie: N stappen]. Pas wanneer de leerling bevestigt dat de lijst klopt, ga je door naar stap 2.

### Stap 2: Hoe leer jij het best? (één keer, zodra de leerling wil beginnen)
Veel kinderen kennen het woord "leerstijl" niet, maar weten wél hoe iets bij hén blijft hangen. Vraag daarom kort en in gewone taal: "Voordat we beginnen — hoe pak jij [vak] het liefst aan?"
Geef 3 concrete manieren die bij DÍT vak passen, plus altijd een "Weet ik niet"-keuze. Geen moeilijke termen.
Onthoud de keuze en geef de rest van de sessie je uitleg zoveel mogelijk in die vorm. Werkt het niet lekker? Stel zelf voor om een andere aanpak te proberen. Kiest de leerling "Weet ik niet"? Begin dan met stap-voor-stap voordoen mét voorbeelden en kijk wat aanslaat.
Belangrijk: de gekozen vorm bepaalt HÓE je uitlegt, niet óf de leerling iets kan. Onder water gebruik je altijd bewezen methodes (in eigen woorden laten teruggeven, herhalen, ophalen).
Kies de keuzes passend bij het vak, bijvoorbeeld:
- Wiskunde: "Doe het stap voor stap voor" | "Eerst een voorbeeld, dan zelf proberen" | "Geef me trucjes en ezelsbruggetjes"
- Geschiedenis/Aardrijkskunde: "Vertel het als een verhaal" | "Met een tijdlijn — wat kwam eerst" | "Korte steekwoorden + ezelsbruggetjes"
- Frans/talen: "Woordjes met ezelsbruggetjes" | "Met voorbeeldzinnen" | "Overhoor me veel"
- Economie: "Met een voorbeeld uit het echt" | "Als 'als dit… dan dat'" | "Met een tekening of grafiek"
- Biologie/Scheikunde: "Leg het uit als een verhaal" | "Met een tekening of schema" | "Met ezelsbruggetjes"
Zodra de leerling kiest: bevestig kort en warm, en stuur [aanpak: <korte naam van de gekozen manier>] zodat de keuze in het menu zichtbaar blijft.
[keuzes: <drie manieren die bij dit vak passen> | Weet ik niet 🤷]

### Stap 3: Warme vraag
Stel één makkelijke vraag over het onderwerp — iets wat ze misschien al weten of kunnen raden.
Doel: een vroeg ✅ geven, zelfvertrouwen opbouwen vóór het moeilijke begint.
Wacht op antwoord. Reageer bemoedigend, ook als het fout is.
[keuzes: Ik weet het | Ik gok... | Geen idee]

### Stap 4: Één concept per bericht
JIJ kiest zelf het volgende begrip van je leerlijst, in de volgorde van de tekst. De leerling hoeft er nooit naar te vragen — jij brengt het aan.
Noem het begrip, en leg het meteen zelf uit met de definitie zoals die in het boek staat (in simpele woorden), in de vorm die de leerling in stap 2 koos. Niet meer dan één begrip. Max 4 zinnen + één echt-leven voorbeeld. Vraag NOOIT "welk begrip wil je doen?" — dat bepaal jij.
Sluit af met: "Schrijf dit in je eigen woorden op — typ het hier of maak een foto."
Wacht op antwoord. Controleer. Corrigeer vriendelijk.
Pas als het klopt: hoog [voortgang: N] op (precies +1) en ga zelf door naar het volgende begrip.
[voortgang: N]
[keuzes: ✅ Ik snap het | Leg nog eens uit | Geef een ander voorbeeld | 📷 Foto gestuurd]

### Stap 5: Ophaalcheck tussen concepten
Voordat je een nieuw concept introduceert: "Wat was ook alweer [vorig begrip]? Zonder terug te kijken."
Goed → compliment, door. Fout → andere uitleg, nieuw voorbeeld.

### Stap 6: Opgaven (pas nadat alle theorie zit)
Schrijf de opgave letterlijk over. "Werk het uit en stuur je antwoord."
Beoordeel aanpak én antwoord. Fout → vraag "wat dacht je hier?" Twee keer fout → stop, nieuwe uitleg.
Na elke opgave: "Hoe zou jij dit uitleggen aan een vriendin?" Pas verder als ze het in eigen woorden kunnen.
[voortgang: N]
[keuzes: 📷 Mijn uitwerking | ✍️ Mijn antwoord typen | Geef een hint | Leg de opgave nog eens uit]

### Stap 7: Afsluiting (pas als ALLES behandeld is)
Loop eerst je volledige begrippenlijst na tegen de stof: is élk begrip uitgelegd én door de leerling in eigen woorden teruggegeven? Mist er iets, ga eerst terug en behandel dat. Pas als alles zit:
Kort genummerd spiekbriefje van alle begrippen.
[sessie-klaar: begrip1 | begrip2 | ...]

## Volledigheid (cruciaal — het is toetsweek)
- Werk je leerlijst volledig en systematisch af, in de volgorde van de tekst. Sla niets over, ook niet wat klein of moeilijk lijkt.
- Bij twijfel of iets leerstof is: behandel het WÉL. Te veel meenemen is veiliger dan een begrip missen waar de toets naar vraagt. Laat alleen echte bijzaken weg (anekdotes, inleidende praatjes, losse weetjes die niet worden uitgelegd).
- De stof zit bij élk bericht nog bijgevoegd. Controleer steeds de échte bron in de bijlage; vaar niet blind op je geheugen.
- Gebruik UITSLUITEND wat in de stof staat — verzin niets bij, voeg geen extra feiten toe. Is iets onleesbaar of onduidelijk? Vraag het de leerling, raad niet.
- Stuur [voortgang: N] ná élk afgerond begrip (steeds +1) zodat de leerling de balk ziet meebewegen. Hoog alleen op als het begrip echt zit (de leerling gaf het in eigen woorden terug), niet zomaar — maar sla het ophogen ook nooit over als het wél zit.
- Eindig de sessie pas als élk begrip uit je lijst behandeld én teruggegeven is.

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

// Tweede modus: oefentoets. Geheel grounded in de geüploade stof — geen internet,
// geen verzonnen vragen, en bewust GÉÉN cijfer (een zelfgemaakte toets kan geen echt
// cijfer voorspellen). De leerling krijgt per begrip te zien of het zit.
const EXAM_SYSTEM_PROMPT = `Jij bent een rustige, eerlijke toetscoach voor een leerling die moeite heeft met leren. De leerling heeft de stof geleerd en wil nu weten hoe ver hij/zij is. Jij maakt een oefentoets UIT de geüploade stof, neemt die af, kijkt eerlijk na, en laat per begrip zien of het zit.

## Absoluut verboden
- Geef NOOIT een cijfer, punten of percentage als eindoordeel. De leerling wil weten WELKE begrippen zitten en welke nog niet — geen rapportcijfer. Een zelfgemaakte oefentoets kan geen echt cijfer voorspellen; doen alsof zou oneerlijk zijn.
- Verzin NOOIT vragen, feiten, bronnen of antwoorden buiten de geüploade stof. Elke vraag én elk goed antwoord moet herleidbaar zijn naar de bijgevoegde stof. Staat iets er niet in? Dan toets je het niet. Zoek niets op internet.
- Verklap het antwoord niet vóórdat de leerling heeft geantwoord.

## Markers (altijd gebruiken)
[vak: Naam] — één keer bij de eerste bijlage (bijv. Geschiedenis, Wiskunde).
[begrippen: begrip1 | begrip2 | ...] — in stap 1: de volledige lijst onderwerpen die je gaat toetsen. De app toont dit als controlekaart met een "klopt"-knop en een veld om een gemist begrip toe te voegen.
[sessie: M vragen] — één keer, nadat de lijst klopt. M = aantal vragen.
[voortgang: N] — VERPLICHT ná élke nagekeken vraag, steeds precies +1. Zo ziet de leerling de balk meebewegen. Nooit overslaan.
[keuzes: Ik weet het niet 🤷] — sluit élke vraag hiermee af, zodat de leerling eerlijk kan passen in plaats van gokken.
[uitslag: begrip1=✅ | begrip2=⚠️ | begrip3=❌] — helemaal aan het eind: per begrip of het zit (✅), wankel is (⚠️) of nog niet zit (❌). De app toont hiermee de uitslagkaart.

## Sessievolgorde — volg dit strak

### Stap 1: Begrippencheck (bij de eerste bijlage)
Lees ALLE bijlagen eerst volledig en grondig, van begin tot eind, regel voor regel. Maak de lijst met onderwerpen die je gaat toetsen: élk begrip, élke term, definitie, regel, formule of jaartal dat in de stof wordt uitgelegd of benadrukt — óók wat gewoon in de lopende tekst staat. Bij twijfel: opnemen. Laat alleen echte bijzaken weg (anekdotes, losse weetjes).
Stuur:
- Eén zin: wat is het onderwerp?
- "Dit ga ik je overhoren. Klopt deze lijst, of mist er nog iets?"
- De volledige lijst als marker. Schrijf de begrippen NIET óók als gewone tekst — de kaart toont ze al.
[vak: ...] [begrippen: begrip1 | begrip2 | ...]
Géén [keuzes:] in dit bericht — de kaart heeft een eigen "klopt"-knop. Voegt de leerling een gemist begrip toe? Zoek het op in de stof, voeg het toe en stuur de volledige lijst opnieuw. Pas wanneer de leerling bevestigt dat de lijst klopt, ga je door naar stap 2.

### Stap 2: De toets afnemen — één vraag per keer
Bepaal het aantal vragen: minstens één vraag per begrip, zodat ALLE begrippen aan bod komen. Stuur [sessie: M vragen].
Stel de vragen dan één voor één. JIJ bepaalt de volgorde; de leerling hoeft nooit om een vraag te vragen. Wissel de soort vraag af, passend bij de stof:
- Kennis: een begrip, definitie, jaartal of feit ("Wat betekent ...?", "In welk jaar ...?").
- Inzicht: oorzaak en gevolg, een verband ("Waarom ...?", "Wat was het gevolg van ...?").
- Bron: alleen als er een bron, afbeelding of citaat in de stof staat — laat de leerling die uitleggen of aan een begrip koppelen.
Per vraag:
- Stel de vraag kort en duidelijk. Verklap niet vooraf welk begrip je toetst — stel gewoon de vraag.
- Sluit af met [keuzes: Ik weet het niet 🤷]. De leerling typt het antwoord of stuurt een foto.
- Wacht op antwoord.
- Kijk eerlijk na tegen het goede antwoord uit de stof: goed / deels goed / fout. Geef daarna kort en vriendelijk het juiste antwoord uit de stof, zodat de leerling er meteen van leert. Geen cijfer, geen punten.
- Stuur [voortgang: N] (+1) en ga door naar de volgende vraag.
Houd per begrip bij of de antwoorden goed waren — dat bepaalt straks de uitslag.

### Stap 3: Uitslag (pas als ALLE vragen gehad zijn)
Loop élk begrip uit je lijst na: waren de vragen erover goed (✅), deels (⚠️) of fout/overgeslagen (❌)?
Stuur:
- Een korte, warme samenvatting in gewone taal: wat zit goed, wat moet nog. NOEM GEEN CIJFER.
- Welke begrippen de leerling nog moet oefenen (de ⚠️ en ❌), als concreet lijstje.
- De marker met de volledige uitslag, élk begrip uit de lijst erin.
[uitslag: begrip1=✅ | begrip2=⚠️ | begrip3=❌ | ...]

## Toon
Rustig, eerlijk, bemoedigend. Dit is een óefentoets, geen examen — fouten zijn nuttig, want ze laten precies zien wat nog aandacht nodig heeft. Geen moeilijke woorden zonder uitleg. 😊 Gebruik UITSLUITEND wat in de stof staat; is iets onleesbaar, vraag het de leerling in plaats van te raden.`;

const WELCOME_MESSAGE =
  "Hoi! 👋 Ik ben jouw studiecoach.\n\nWat wil je doen?\n\n📚 **Samen leren** — we lopen de stof stap voor stap door tot je alles snapt.\n📝 **Oefentoets maken** — ik overhoor je over de stof en laat zien welke begrippen al zitten en welke nog niet.\n\nKies hieronder. 😊";

const LEER_WELCOME =
  "Top, we gaan **samen leren**! 📚\n\n📸 **Zo beginnen we:**\nMaak met de 📷-knop een **foto van elke bladzijde** die je moet leren — de theorie, de voorbeelden én de opgaven. Je mag in één keer meerdere foto's kiezen. Geen PDF nodig!\n\nDan weet ik precies wat we gaan doen!";

const TOETS_WELCOME =
  "Top, we maken een **oefentoets**! 📝\n\n📸 **Zo beginnen we:**\nMaak met de 📷-knop een **foto van elke bladzijde** die je geleerd hebt — de theorie, de voorbeelden én de bronnen. Je mag in één keer meerdere foto's kiezen. Geen PDF nodig!\n\nDan maak ik er vragen bij, overhoor ik je, en laat ik je zien welke begrippen al zitten en welke nog aandacht nodig hebben.\n\n⚠️ Let op: dit is een óefentoets uit jouw eigen stof, geen echt proefwerk. Daarom geef ik geen cijfer — wél per onderwerp hoe ver je bent.";

// ── Sessie onthouden ──────────────────────────────────────────────
// We bewaren de hele sessie (gesprek, voortgang én de geüploade stof)
// in IndexedDB. Dat kan grote PDF's aan — localStorage (max ~5 MB) niet.
// Zo kan de leerling de pagina sluiten en later verder waar ze gebleven was.
const DB_NAME = "studycoach";
const STORE = "session";
const KEY = "current";

interface BegripScore {
  begrip: string;
  score: string; // ✅ | ⚠️ | ❌
}

interface SavedSession {
  messages: Message[];
  mode: "leren" | "toets" | null;
  sessionTotal: number;
  sessionDone: number;
  sessionMinutes: number;
  vak: string | null;
  aanpak: string | null;
  sessionConcepts: string[];
  sessionStartTime: number;
  choices: string[];
  begrippen: string[];
  toetsResult: BegripScore[];
  savedAt: number;
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("geen IndexedDB")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(value: SavedSession): Promise<void> {
  const db = await idbOpen();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbGet(): Promise<SavedSession | undefined> {
  const db = await idbOpen();
  try {
    return await new Promise<SavedSession | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve(r.result as SavedSession | undefined);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}

async function idbClear(): Promise<void> {
  const db = await idbOpen();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Foto's van een telefoon zijn al snel 3-4 MB. We verkleinen ze in de browser naar
// een lange zijde van ~1600px en heren-coderen als JPEG. Dat houdt boektekst goed
// leesbaar (belangrijk — anders leest de coach de stof verkeerd) maar brengt de
// omvang terug naar enkele honderden KB, zodat meerdere pagina's samen passen.
// Lukt decoderen niet (bijv. een exotisch formaat), dan sturen we de foto ongemoeid.
function downscaleImage(file: File, maxEdge = 1600, quality = 0.75): Promise<{ data: string; type: string }> {
  return new Promise((resolve) => {
    const fallback = () => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve({ data: (ev.target?.result as string).split(",")[1], type: file.type || "image/jpeg" });
      reader.onerror = () => resolve({ data: "", type: file.type || "image/jpeg" });
      reader.readAsDataURL(file);
    };
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { fallback(); return; }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ data: dataUrl.split(",")[1], type: "image/jpeg" });
      } catch {
        fallback();
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); fallback(); };
    img.src = url;
  });
}

export default function StudyCoach() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [mode, setMode] = useState<"leren" | "toets" | null>(null);
  const [toetsResult, setToetsResult] = useState<BegripScore[]>([]);
  const [toetsComplete, setToetsComplete] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ data: string; type: string }[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [begrippen, setBegrippen] = useState<string[]>([]);
  const [missingBegrip, setMissingBegrip] = useState("");
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionConcepts, setSessionConcepts] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState(() => Date.now());
  const [vak, setVak] = useState<string | null>(null);
  const [aanpak, setAanpak] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Eenmalig bij openen: eerdere sessie terughalen (verder waar ze was gebleven).
  useEffect(() => {
    let cancelled = false;
    idbGet()
      .then((saved) => {
        if (cancelled || !saved || !Array.isArray(saved.messages) || saved.messages.length <= 1) return;
        setMessages(saved.messages);
        // Oudere sessies hebben nog geen mode — die waren altijd "leren".
        setMode(saved.mode ?? "leren");
        setToetsResult(saved.toetsResult || []);
        setSessionTotal(saved.sessionTotal || 0);
        setSessionDone(saved.sessionDone || 0);
        setSessionMinutes(saved.sessionMinutes || 0);
        setVak(saved.vak ?? null);
        setAanpak(saved.aanpak ?? null);
        setSessionConcepts(saved.sessionConcepts || []);
        if (saved.sessionStartTime) setSessionStartTime(saved.sessionStartTime);
        setChoices(saved.choices || []);
        setBegrippen(saved.begrippen || []);
        setRestored(true);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Na elke wijziging de sessie bewaren — maar pas nadat we hebben geprobeerd
  // een bestaande sessie te laden, anders overschrijven we die met het startscherm.
  useEffect(() => {
    if (!loaded || messages.length <= 1) return;
    idbSet({
      messages, mode, sessionTotal, sessionDone, sessionMinutes, vak, aanpak,
      sessionConcepts, sessionStartTime, choices, begrippen, toetsResult, savedAt: Date.now(),
    }).catch(() => {});
  }, [loaded, messages, mode, sessionTotal, sessionDone, sessionMinutes, vak, aanpak, sessionConcepts, sessionStartTime, choices, begrippen, toetsResult]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!files.length) return;
    setProcessingPhotos(true);
    try {
      const processed = await Promise.all(files.map((f) => downscaleImage(f)));
      setImages((prev) => [...prev, ...processed.filter((p) => p.data)]);
    } finally {
      setProcessingPhotos(false);
    }
  };

  // Foto's uit een bericht ophalen — ondersteunt het nieuwe images[] én het oude
  // enkele image-veld van eerder opgeslagen sessies.
  const msgImages = (m: Message): { data: string; type: string }[] => {
    if (m.images?.length) return m.images;
    if (m.image) return [{ data: m.image, type: m.imageType || "image/jpeg" }];
    return [];
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const tooBig = files.find(f => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      alert(`"${tooBig.name}" is te groot (max 10 MB per PDF). Comprimeer het bestand.`);
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
    const sessie = text.match(/\[sessie:\s*(\d+)\s*(?:stappen?|begrippen?)?(?:[^\]\d]*~?(\d+)\s*min)?[^\]]*\]/i);
    if (sessie) {
      setSessionTotal(parseInt(sessie[1]));
      if (sessie[2]) setSessionMinutes(parseInt(sessie[2]));
      setSessionDone(0);
    }
    const voortgang = text.match(/\[voortgang:\s*(\d+)[^\]]*\]/i);
    if (voortgang) {
      const n = parseInt(voortgang[1]);
      setSessionDone(prev => {
        if (n > prev) { setCelebrate(true); setTimeout(() => setCelebrate(false), 1200); }
        return n;
      });
    }
    const vakMatch = text.match(/\[vak:\s*([^\]]+)\]/i);
    if (vakMatch) setVak(vakMatch[1].trim());

    const aanpakMatch = text.match(/\[aanpak:\s*([^\]]+)\]/i);
    if (aanpakMatch) setAanpak(aanpakMatch[1].trim());

    const begrippenMatch = text.match(/\[begrippen:\s*([^\]]+)\]/i);
    if (begrippenMatch) {
      setBegrippen(begrippenMatch[1].split("|").map(s => s.trim()).filter(Boolean));
    }

    const klaar = text.match(/\[sessie-klaar:\s*([^\]]+)\]/i);
    if (klaar) {
      const concepts = klaar[1].split("|").map(s => s.trim()).filter(Boolean);
      setSessionConcepts(concepts);
      setTimeout(() => setSessionComplete(true), 600);
    }

    // Examen-modus: de uitslag per begrip (✅ zit / ⚠️ wankel / ❌ nog niet).
    const uitslag = text.match(/\[uitslag:\s*([^\]]+)\]/i);
    if (uitslag) {
      const items = uitslag[1].split("|").map(s => s.trim()).filter(Boolean).map((pair) => {
        const eq = pair.lastIndexOf("=");
        const begrip = eq >= 0 ? pair.slice(0, eq).trim() : pair;
        const score = eq >= 0 ? pair.slice(eq + 1).trim() : "⚠️";
        return { begrip, score };
      });
      setToetsResult(items);
      setTimeout(() => setToetsComplete(true), 600);
    }
  };

  const chooseMode = (m: "leren" | "toets") => {
    setMode(m);
    setMessages([{ role: "assistant", content: m === "toets" ? TOETS_WELCOME : LEER_WELCOME }]);
  };

  const sendChoice = (choice: string) => {
    setChoices([]);
    setInput("");
    sendMessageWith(choice);
  };

  const confirmBegrippen = () =>
    sendMessageWith("De begrippenlijst klopt helemaal. Laten we beginnen! 💪");

  const addMissingBegrip = () => {
    const term = missingBegrip.trim();
    if (!term) return;
    setMissingBegrip("");
    sendMessageWith(`Er mist nog een begrip in de lijst: "${term}". Zoek het op in de stof en voeg het toe; stuur daarna de volledige bijgewerkte begrippenlijst opnieuw zodat ik kan controleren.`);
  };

  const sendMessage = async () => {
    const text = input;
    setInput("");
    await sendMessageWith(text);
  };

  const sendMessageWith = async (text: string) => {
    if (!text.trim() && !images.length && !pdfs.length) return;
    setChoices([]);
    setBegrippen([]);
    setRestored(false);

    let userContent = text;
    if (!userContent && images.length) userContent = images.length > 1 ? `📷 [${images.length} foto's gestuurd]` : "📷 [Foto gestuurd]";
    if (!userContent && pdfs.length) userContent = pdfs.map(p => `📄 [PDF gestuurd: ${p.name}]`).join("\n");

    const userMsg: Message = {
      role: "user",
      content: userContent,
      images: images.length ? images : undefined,
      pdfs: pdfs.length ? pdfs : undefined,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setImages([]);
    setPdfs([]);
    setLoading(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";

    try {
      // Stof (PDF's) en foto's blijven bij ELKE beurt meegestuurd, zodat de coach
      // altijd de echte bron heeft en de volledige stof kan afwerken zonder te gokken.
      const apiMessages = newMessages.map((m) => {
        const blocks: Record<string, unknown>[] = [];
        if (m.pdfs?.length) {
          for (const p of m.pdfs) {
            blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: p.data } });
          }
        }
        for (const im of msgImages(m)) {
          blocks.push({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } });
        }
        if (!blocks.length) return { role: m.role, content: m.content };
        blocks.push({ type: "text", text: m.content });
        return { role: m.role, content: blocks };
      });

      // Markeer het laatst bijgevoegde document voor prompt-caching, zodat het
      // herhaald meesturen van de volledige stof goedkoop en snel blijft.
      outer: for (let i = apiMessages.length - 1; i >= 0; i--) {
        const content = apiMessages[i].content;
        if (Array.isArray(content)) {
          for (let j = content.length - 1; j >= 0; j--) {
            if (content[j].type === "document") {
              content[j].cache_control = { type: "ephemeral" };
              break outer;
            }
          }
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, system: mode === "toets" ? EXAM_SYSTEM_PROMPT : SYSTEM_PROMPT }),
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

  const startNewSession = () => {
    idbClear().catch(() => {});
    setMode(null);
    setToetsResult([]);
    setToetsComplete(false);
    setSessionComplete(false);
    setSessionTotal(0);
    setSessionDone(0);
    setSessionMinutes(0);
    setSessionConcepts([]);
    setVak(null);
    setAanpak(null);
    setChoices([]);
    setBegrippen([]);
    setMissingBegrip("");
    setRestored(false);
    setSessionStartTime(Date.now());
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const stripMarkers = (text: string) =>
    text.replace(/\[(keuzes|sessie|voortgang|sessie-klaar|vak|aanpak|begrippen|uitslag):[^\]]*\]/gi, "").trim();

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
              {(vak || aanpak || mode === "toets") && (
                <div style={styles.logoSub}>{[mode === "toets" ? "📝 Oefentoets" : null, vak, aanpak && `📖 ${aanpak}`].filter(Boolean).join(" · ")}</div>
              )}
            </div>
          </div>
          {sessionTotal > 0 ? (
            <div style={styles.progressWrap}>
              <div style={styles.progressInfo}>
                <span style={{ ...styles.progressLabel, animation: celebrate ? "pop 0.6s ease" : "none" }}>
                  {celebrate ? "⭐" : `${mode === "toets" ? "Vraag" : "Stap"} ${sessionDone}/${sessionTotal}`}
                </span>
                <span style={styles.progressTime}>
                  {sessionDone >= sessionTotal
                    ? "🎉 Klaar!"
                    : sessionMinutes > 0
                      ? `~${Math.round((sessionTotal - sessionDone) * (sessionMinutes / sessionTotal))} min`
                      : ""}
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
        {restored && (
          <div style={styles.resumeBar}>
            <span>👋 Welkom terug! Je gaat verder waar je was gebleven.</span>
            <button style={styles.resumeBtn} onClick={startNewSession}>Opnieuw beginnen</button>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.row, ...(msg.role === "user" ? styles.rowUser : {}) }}>
            {msg.role === "assistant" && <div style={styles.avatar}>🤖</div>}
            <div style={{ ...styles.bubble, ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleBot) }}>
              {msgImages(msg).map((im, j) => (
                <img key={j} src={`data:${im.type};base64,${im.data}`} alt="opgave" style={styles.uploadedImg} />
              ))}
              {msg.pdfs?.map((p, j) => (
                <div key={j} style={styles.pdfBadge}>📄 {p.name}</div>
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

      {begrippen.length > 0 && !loading && (
        <div style={styles.begrippenCard}>
          <div style={styles.begrippenTitle}>📋 {mode === "toets" ? "Dit ga ik je overhoren" : "Dit ga ik je leren"} — klopt deze lijst?</div>
          <div style={styles.begrippenList}>
            {begrippen.map((b, i) => (
              <span key={i} style={styles.begripChip}>{b}</span>
            ))}
          </div>
          <button style={styles.begrippenConfirm} onClick={confirmBegrippen}>
            {mode === "toets" ? "✅ Ja, dit klopt — overhoor me!" : "✅ Ja, dit klopt — beginnen!"}
          </button>
          <div style={styles.begrippenAddRow}>
            <input
              value={missingBegrip}
              onChange={(e) => setMissingBegrip(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMissingBegrip(); } }}
              placeholder="Mist er een begrip? Typ het hier…"
              style={styles.begrippenInput}
            />
            <button style={styles.begrippenAddBtn} onClick={addMissingBegrip} disabled={!missingBegrip.trim()}>
              + Toevoegen
            </button>
          </div>
        </div>
      )}

      {mode === null && loaded && !loading && (
        <div style={styles.choicesBar}>
          <button style={styles.modeBtn} onClick={() => chooseMode("leren")}>📚 Samen leren</button>
          <button style={styles.modeBtn} onClick={() => chooseMode("toets")}>📝 Oefentoets maken</button>
        </div>
      )}

      {choices.length > 0 && !loading && (
        <div style={styles.choicesBar}>
          {choices.map((c, i) => (
            <button key={i} style={styles.choiceBtn} onClick={() => sendChoice(c)}>{c}</button>
          ))}
        </div>
      )}

      {mode !== null && (
      <footer style={styles.footer}>
        {(images.length > 0 || pdfs.length > 0 || processingPhotos) && (
          <div style={styles.attachments}>
            {images.map((im, i) => (
              <div key={i} style={styles.previewWrap}>
                <img src={`data:${im.type};base64,${im.data}`} alt="preview" style={styles.preview} />
                <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} style={styles.removeBtn}>✕</button>
              </div>
            ))}
            {processingPhotos && <div style={styles.pdfPreview}>📷 Foto’s verkleinen…</div>}
            {pdfs.map((p, i) => (
              <div key={i} style={styles.pdfPreview}>
                <span>📄 {p.name}</span>
                <button onClick={() => setPdfs(prev => prev.filter((_, j) => j !== i))} style={styles.removeBtn2}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={styles.inputRow}>
          <button style={styles.iconBtn} onClick={() => fileInputRef.current?.click()} title="Foto's">📷</button>
          <button style={styles.iconBtn} onClick={() => pdfInputRef.current?.click()} title="PDF">📄</button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: "none" }} />
          <input ref={pdfInputRef} type="file" accept="application/pdf" multiple onChange={handlePdfUpload} style={{ display: "none" }} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Stel een vraag of stuur een opgave..."
            rows={1}
            style={styles.textarea}
          />
          <button onClick={sendMessage} disabled={loading || processingPhotos || (!input.trim() && !images.length && !pdfs.length)} style={{ ...styles.sendBtn, opacity: loading || processingPhotos || (!input.trim() && !images.length && !pdfs.length) ? 0.4 : 1 }}>
            ➤
          </button>
        </div>
        <p style={styles.hint}>Enter om te sturen · 📷 foto’s (meerdere mag) · 📄 PDF met lesstof</p>
      </footer>
      )}
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

            <button style={styles.endBtn} onClick={startNewSession}>
              Nieuwe sessie starten →
            </button>
          </div>
        </div>
      )}

      {toetsComplete && (() => {
        const total = toetsResult.length;
        const beheerst = toetsResult.filter((r) => r.score === "✅").length;
        const nogLeren = toetsResult.filter((r) => r.score !== "✅");
        const pct = total ? Math.round((beheerst / total) * 100) : 0;
        const chipStyle = (score: string): React.CSSProperties =>
          score === "✅"
            ? { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }
            : score === "❌"
              ? { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }
              : { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" };
        return (
          <div style={styles.overlay}>
            <div style={styles.endCard}>
              <div style={styles.endTrophy}>📝</div>
              <div style={styles.endTitle}>Oefentoets klaar!</div>
              <div style={styles.endSub}>
                {beheerst} van de {total} begrippen zitten al
              </div>

              <div style={styles.readyTrack}>
                <div style={{ ...styles.readyFill, width: `${pct}%` }} />
              </div>

              <div style={styles.endSection}>
                <div style={styles.endSectionTitle}>Hoe ver ben je?</div>
                <div style={styles.conceptsWrap}>
                  {toetsResult.map((r, i) => (
                    <span key={i} style={{ ...styles.conceptChip, ...chipStyle(r.score) }}>
                      {r.score} {r.begrip}
                    </span>
                  ))}
                </div>
              </div>

              {nogLeren.length > 0 ? (
                <div style={styles.endMessage}>
                  <strong>Dit kun je nog oefenen:</strong> {nogLeren.map((r) => r.begrip).join(", ")}.
                  <br />Ga terug naar de stof voor deze onderwerpen en toets jezelf later opnieuw. 💪
                </div>
              ) : (
                <div style={styles.endMessage}>
                  Alles zit! 🎉 Je hebt elk onderwerp goed beantwoord. Sterk gedaan — succes met de toets!
                </div>
              )}

              <div style={styles.endBtnRow}>
                <button style={styles.endBtnSecondary} onClick={() => setToetsComplete(false)}>
                  Mijn antwoorden bekijken
                </button>
                <button style={{ ...styles.endBtn, flex: 1, minWidth: 140, width: "auto" }} onClick={startNewSession}>
                  Nieuwe sessie →
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
  begrippenCard: { display: "flex", flexDirection: "column" as const, gap: 10, padding: "14px 16px", background: "white", borderTop: "1px solid #e2e8f0" },
  begrippenTitle: { fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" },
  begrippenList: { display: "flex", flexWrap: "wrap" as const, gap: 6, maxHeight: 168, overflowY: "auto" as const },
  begripChip: { background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 14, padding: "4px 10px", fontSize: "0.82rem", fontWeight: 600 },
  begrippenConfirm: { background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", border: "none", borderRadius: 14, padding: "11px 16px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  begrippenAddRow: { display: "flex", gap: 8, alignItems: "center" },
  begrippenInput: { flex: 1, background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: 12, padding: "9px 12px", fontSize: "0.9rem", fontFamily: "inherit", color: "#1e293b", outline: "none" },
  begrippenAddBtn: { background: "#eef2ff", border: "2px solid #c7d2fe", color: "#4338ca", borderRadius: 12, padding: "9px 14px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  choiceBtn: { background: "#f0f4ff", border: "2px solid #c7d2fe", color: "#4338ca", borderRadius: 20, padding: "7px 16px", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  modeBtn: { flex: 1, minWidth: 150, background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", border: "none", borderRadius: 16, padding: "13px 18px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  readyTrack: { width: "100%", height: 10, background: "#e2e8f0", borderRadius: 8, overflow: "hidden", marginBottom: 24 },
  readyFill: { height: "100%", background: "linear-gradient(90deg,#22c55e,#16a34a)", borderRadius: 8, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" },
  endBtnRow: { display: "flex", gap: 10, flexWrap: "wrap" as const },
  endBtnSecondary: { flex: 1, minWidth: 140, background: "white", color: "#4338ca", border: "2px solid #c7d2fe", borderRadius: 50, padding: "12px 20px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  resumeBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" as const, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 14, padding: "10px 14px", fontSize: "0.85rem", fontWeight: 500 },
  resumeBtn: { background: "white", border: "1px solid #6ee7b7", color: "#047857", borderRadius: 20, padding: "5px 12px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  svgWrap: { margin: "10px 0", lineHeight: 0 },
  mdTable: { borderCollapse: "collapse" as const, margin: "8px 0", fontSize: "0.9rem", width: "100%" },
  mdTh: { border: "1px solid #cbd5e1", padding: "6px 12px", background: "#f1f5f9", textAlign: "left" as const },
  mdTd: { border: "1px solid #cbd5e1", padding: "6px 12px" },
};