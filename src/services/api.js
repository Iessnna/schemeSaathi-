// Calls to our own Express server (which holds the Gemini key).
export async function getStatus() {
  try {
    const r = await fetch('/api/status');
    if (!r.ok) return { gemini: false };
    return await r.json();
  } catch { return { gemini: false }; } // server not running: the form still works
}

export async function parseProfileText(text) {
  const r = await fetch('/api/parse-profile', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error('parse_failed');
  return (await r.json()).fields;
}
