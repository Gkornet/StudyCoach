import { NextRequest, NextResponse } from "next/server";

// Grote PDF's + retries kunnen langer duren dan de standaard 10s van Vercel.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, system } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  // Anthropic kan tijdelijk overbelast zijn (429/529) of een 5xx geven.
  // Dat zijn voorbijgaande fouten — opnieuw proberen met oplopende wachttijd.
  const RETRY_STATUSES = new Set([429, 500, 502, 503, 529]);
  const MAX_ATTEMPTS = 4;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let response: Response | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1500,
        // Cache de (lange) systeem-prompt zodat hij niet elke beurt opnieuw telt.
        system: typeof system === "string" && system.length > 0
          ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
          : system,
        messages,
      }),
    });

    if (response.ok || !RETRY_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
      break;
    }

    // Respecteer Retry-After indien aanwezig, anders exponentieel: 1s, 2s, 4s (+ jitter).
    const retryAfter = Number(response.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2 ** (attempt - 1) * 1000 + Math.random() * 250;
    console.warn(`Anthropic ${response.status}, retry ${attempt}/${MAX_ATTEMPTS - 1} na ${Math.round(backoff)}ms`);
    await sleep(backoff);
  }

  if (!response || !response.ok) {
    const status = response?.status ?? 500;
    const errorText = response ? await response.text() : "geen antwoord van API";
    console.error("Anthropic API error:", status, errorText);

    // Probeer de echte reden uit Anthropic's antwoord te halen, zodat we
    // een grote/te-zware aanvraag niet verwarren met tijdelijke drukte.
    let errType = "";
    let errMsg = "";
    try {
      const parsed = JSON.parse(errorText);
      errType = parsed?.error?.type || "";
      errMsg = parsed?.error?.message || "";
    } catch { /* geen JSON — laat leeg */ }

    const looksTooBig = status === 413 ||
      errType === "request_too_large" ||
      /too long|too large|maximum.*token|prompt is too long/i.test(errMsg);

    let friendly: string;
    if (looksTooBig) {
      // Hier helpt wachten niet — de stof past niet in één keer.
      friendly = "De stof is in één keer te groot om te verwerken. 📄\n\nSplits de PDF in kleinere delen (bijvoorbeeld per hoofdstuk of paragraaf) en stuur die één voor één. Een PDF met minder pagina's tegelijk werkt het best.";
    } else if (status === 529 || errType === "overloaded_error") {
      friendly = "De AI is even erg druk. Wacht een paar tellen en probeer het opnieuw. 🙏";
    } else if (status === 429) {
      friendly = "Even te veel achter elkaar gevraagd. Wacht ongeveer een halve minuut en probeer het dan opnieuw. ⏳";
    } else {
      friendly = `Er ging iets mis (fout ${status})${errMsg ? `: ${errMsg}` : ""}. Probeer het opnieuw.`;
    }
    return NextResponse.json({ error: friendly }, { status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
