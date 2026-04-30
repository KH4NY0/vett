import { NextRequest, NextResponse } from "next/server";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a professional invoice fraud analyst. Analyse the provided invoice and identify signs of potential fraud or billing irregularities.

Return ONLY a valid JSON object — no markdown, no backticks, no explanation — with this exact structure:
{
  "risk_score": <integer 0-100>,
  "risk_level": "<low|medium|high>",
  "summary": "<2-3 sentence plain-language summary of your assessment>",
  "signals": [
    { "name": "<signal name>", "detail": "<specific detail about why this is suspicious>", "severity": "<high|medium|low>" }
  ],
  "safe_signals": ["<list of things that look legitimate>"]
}

Risk score guide: 0-30 = low, 31-65 = medium, 66-100 = high.

Fraud signals to check:
- Personal/free email (gmail, yahoo, hotmail) used as business contact
- Missing company registration or VAT/tax number
- No physical business address or a vague address
- Bank details that seem mismatched or incomplete
- Suspiciously round amounts or no line-item breakdown for large totals
- Missing or too-simple invoice number (e.g. "1", "001")
- Missing or inconsistent company logo/branding
- Urgency language or pressure tactics in payment terms
- Due date less than 3 days away
- Vague or missing service/product description
- Mismatched sender and recipient details
- Font or formatting inconsistencies suggesting document alteration
- Tax or currency calculation errors
- Missing invoice date
- Company name on invoice differs from bank account name

If the file is not an invoice, return: risk_score 0, risk_level "low", summary "No invoice detected in this file.", signals [], safe_signals [].`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Groq API key not configured on server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { fileData, mimeType } = body;

    if (!fileData || !mimeType) {
      return NextResponse.json(
        { error: "Missing fileData or mimeType in request body." },
        { status: 400 }
      );
    }

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${fileData}`,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });

    const groqData = await groqRes.json();

    if (groqData.error) {
      return NextResponse.json(
        { error: groqData.error.message },
        { status: 502 }
      );
    }

    const raw = groqData.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const report = JSON.parse(clean);

    return NextResponse.json({ report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}