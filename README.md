# Flagd — Invoice Fraud Detector

AI-powered invoice fraud scanner built with Next.js and Gemini 2.0 Flash.
Upload any invoice image and get a risk score with a full breakdown of suspicious signals.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Gemini 2.0 Flash** via Google AI Studio
- **CSS Modules** — no UI library, no Tailwind

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/KH4NY0/flagd.git
cd flagd
npm install
```

### 2. Set up your API key

```bash
cp .env.local.example .env.local
```

Open `.env.local` and add your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at [aistudio.google.com](https://aistudio.google.com) → Get API key → Create API key.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Under **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key
4. Deploy

The API key lives server-side only — never exposed to the browser.

## Project structure

```
flagd/
├── app/
│   ├── api/
│   │   └── scan/
│   │       └── route.ts       # Gemini proxy — keeps API key hidden
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── InvoiceScanner.tsx     # Main UI component
│   └── InvoiceScanner.module.css
├── types/
│   └── index.ts               # Shared TypeScript types
├── .env.local.example
└── README.md
```

## Fraud signals checked

- Personal/free email used as business contact
- Missing VAT or company registration number
- No physical business address
- Bank details mismatch
- Suspiciously round amounts or missing line-item breakdown
- Missing or too-simple invoice number
- Urgency pressure tactics in payment terms
- Due date under 3 days
- Vague service/product descriptions
- Font or formatting inconsistencies
- Missing invoice date
- Company name differs from bank account name

## License

MIT
