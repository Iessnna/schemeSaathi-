// Simple-language Scheme Assistant service.
// STRICT GUARDRAILS:
// 1. Only answers using the provided local schemes database.
// 2. Never invents government schemes, benefits, or criteria.
// 3. Never makes final official eligibility decisions.
// 4. Always clarifies that it is an informational aid, not official approval.

import { GoogleGenAI } from '@google/genai';

export const geminiAvailable = () => Boolean(process.env.GEMINI_API_KEY);

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export async function askSchemeAssistant({ query, schemes = [], language = 'en', profile = null }) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query is required');
  }

  const ai = getGenAI();
  if (!ai) {
    throw new Error('gemini_unavailable');
  }

  // Build condensed context of the local database
  const catalogContext = schemes.slice(0, 20).map((s) => ({
    id: s.id,
    name: typeof s.name === 'object' ? s.name[language] || s.name.en : s.name,
    description: typeof s.description === 'object' ? s.description[language] || s.description.en : s.description,
    level: s.level,
    governingState: s.governingState,
    applicableStates: s.applicableStates,
    eligibility: s.eligibility,
    documents: s.documents,
    verificationStatus: s.verificationStatus,
    lastVerified: s.lastVerified,
    officialPortal: s.applicationUrl || s.sourceUrl || 'None specified',
  }));

  const systemInstruction = `You are SchemeSaathi Assistant, a helpful Indian public welfare information assistant.
STRICT RULES:
1. ONLY answer questions using the schemes listed in the DATA below. Do not cite schemes that are not in this list.
2. If the user asks about a scheme or topic not covered in the data, state clearly and politely: "I do not have verified information on that scheme in the local SchemeSaathi database. Please check the official government portals like myscheme.gov.in or data.gov.in."
3. NEVER make final legal eligibility determinations. Use advisory language like "Based on the criteria, you may qualify if..." or "This scheme requires...".
4. If a scheme is marked as "demo", remind the user that it is an illustrative sample.
5. Keep explanations simple, respectful, and easy to understand for citizens in India.
6. Respond in the requested language: ${language === 'hi' ? 'Hindi (हिन्दी)' : language === 'ur' ? 'Urdu (اردو)' : 'English'}.

DATA:
${JSON.stringify(catalogContext, null, 2)}

User Profile Context (if provided):
${profile ? JSON.stringify(profile, null, 2) : 'No user profile provided'}`;

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const reply = response.text;
    return {
      reply,
      source: 'gemini',
      disclaimer: 'This information is generated to help simplify guidelines. Official approval is subject to government rules and document verification.',
    };
  } catch (err) {
    console.error('Assistant AI error:', err.message);
    throw err;
  }
}
