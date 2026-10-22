# SchemeSaathi

Find government welfare schemes that fit your circumstances. Enter a profile, and a deterministic
rule engine compares it with each scheme's written criteria, explains every result, lists the
documents and steps, and exports a PDF checklist in English, Hindi or Urdu.

> **AI helps people understand information. Deterministic rules evaluate eligibility. Official sources establish the facts.**

**This is an independent prototype. It is not affiliated with the Government of India.**
All bundled schemes are **fictional demo data** and are labelled
"DEMO DATA — NOT A REAL GOVERNMENT SCHEME" everywhere they appear.

## Run it

You need [Node.js](https://nodejs.org) 18 or newer (20+ recommended).

```bash
npm install          # one time
npm run dev          # starts the website (http://localhost:5173) and the API (port 8787)
npm test             # runs the eligibility + translation tests (no extra packages needed)
```

Open **http://localhost:5173**. Without any API key everything works except the optional
"describe yourself in a sentence" box, which tells you it is switched off.

### Optional: turn on the sentence feature (Gemini)

```bash
cp .env.example .env     # then open .env and paste your key after GEMINI_API_KEY=
npm run dev
```

The key stays on the server (`server/`) and is never sent to the browser. `.env` is git-ignored.
You can change the model with `GEMINI_MODEL` if the default is retired.

### Production build

```bash
npm run build && npm start     # serves the built site and the API on http://localhost:8787
```

## How it decides

`src/eligibility/index.js` is plain JavaScript with no React and no AI. For each scheme it runs
checks (age, income, occupation, gender, residence state, **domicile**, domicile certificate, extra
yes/no conditions). Each check is `pass`, `fail` or `unknown`.

| Any check… | Result |
| --- | --- |
| fails | **Not eligible** |
| unknown (and none fail) | **Maybe: more information needed** |
| all pass | **Eligible** |

Choosing "I'm not sure" or leaving an optional answer blank gives *unknown*, never a rejection.
**Domicile is its own field** and is never copied from the state you live in.

Gemini only turns a typed sentence into *suggested* form answers. They are validated against strict
whitelists on the server, domicile is only accepted if you said it, and you confirm them in the form.

Results are ordered: Eligible, then Maybe (fewest missing answers first), then Not eligible.

## Adding real schemes later

Edit `src/data/schemes.json` (same shape, no code changes). Per scheme:

```jsonc
{
  "id": "unique-id",
  "name": { "en": "…", "hi": "…", "ur": "…" },
  "description": { "en": "…", "hi": "…", "ur": "…" },
  "level": "central",                 // or "state"
  "governingState": null,             // e.g. "Bihar" when level is "state"
  "applicableStates": ["ALL"],        // or ["Kerala", …]: where the person must LIVE
  "eligibility": {
    "age": { "min": 18, "max": null },
    "income": { "max": 150000 },      // or null
    "occupations": ["farmer"],        // [] = any: farmer, student, employed, unemployed, selfEmployed, other
    "genders": [],                    // [] = any: male, female, other
    "domicile": { "states": ["Bihar"], "certificateRequired": true },   // or null
    "requires": [{ "field": "ownsLand", "equals": "yes" }]  // fields: isStudent, ownsLand, hasDisabilityCertificate
  },
  "documents": ["doc.aadhaar"],       // dictionary keys (see src/i18n) or { en, hi, ur } text
  "steps": ["step.gather"],
  "applicationUrl": "https://…",      // copy from the official source only; null if unknown
  "sourceUrl": "https://…",
  "lastVerified": "2026-10-01",
  "verificationStatus": "verified"    // "demo" | "verified" | "unverified"
}
```

Rules: never invent a scheme, criterion or URL; copy them from the official notice and record the
date. Anything not `"demo"` stops showing the demo labels automatically. To support a new yes/no
question, add its field to `REQUIRABLE_FIELDS` in the engine and to the form.

## Project map

```
server/                  Express: Gemini proxy only (routes/, services/)
src/eligibility/         The rule engine + its unit tests (start here)
src/data/                schemes.json, states list
src/i18n/                en / hi / ur dictionaries, provider, translation tests
src/state/               Form answers + results (React context)
src/pages/               Home, Profile (form), Results, SchemeDetail
src/components/          Fields (inputs), Chrome (header/footer/badges), SchemeParts, HeroArt, Icons
src/services/            api.js (talks to server), pdf.js (checklist export)
src/styles/              tokens.css (colours, type, spacing), base.css, components.css
```

## Manual test checklist (about 5 minutes)

1. Open the app. The form is pre-filled with **sample values** (Bihar farmer, ₹80,000) and says so. Click *Find my schemes*.
2. Results: "Demo Farmer Income Support" is **Maybe** (land ownership unanswered); "Demo Bihar Crop Season Aid" is **Maybe** (certificate unanswered). Open *Edit my profile*, answer **Yes** to land and the domicile certificate: both become **Eligible**.
3. Change **Domicile** to another state (keep "state you live in" as Bihar): only schemes that have a domicile rule can change (here, the Bihar scheme); every other result stays identical.
4. Set domicile to *I'm not sure*: those schemes become **Maybe**, not rejected.
5. Click a scheme, then *Download checklist (PDF)*. Try it again after switching to हिन्दी and اردو.
6. Switch language: labels, results, and reasons change; Urdu flips to right-to-left.
7. Resize to a phone width: menu collapses, rows and form stack.
8. Leave `GEMINI_API_KEY` empty: the sentence box says it is off and everything else works.
