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
    const friendly = status === 529 || status === 429
      ? "De AI is even erg druk. Wacht een paar tellen en probeer het opnieuw. 🙏"
      : `API fout (${status}): ${errorText}`;
    return NextResponse.json({ error: friendly }, { status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
