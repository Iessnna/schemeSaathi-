import { Router } from 'express';
import { askSchemeAssistant, geminiAvailable } from '../services/assistant.js';

const router = Router();

router.get('/assistant-status', (req, res) => {
  res.json({ available: geminiAvailable() });
});

router.post('/assistant', async (req, res) => {
  const { query, schemes, language, profile } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'empty_query' });
  }

  if (!geminiAvailable()) {
    return res.status(503).json({
      error: 'gemini_unavailable',
      message: 'AI Assistant requires GEMINI_API_KEY. Using built-in local keyword search fallback.',
    });
  }

  try {
    const result = await askSchemeAssistant({
      query: query.trim(),
      schemes: Array.isArray(schemes) ? schemes : [],
      language: language || 'en',
      profile: profile || null,
    });
    res.json(result);
  } catch (err) {
    console.error('Assistant error:', err.message);
    res.status(502).json({
      error: 'assistant_failed',
      message: 'Could not generate assistant reply. Please use keyword search.',
    });
  }
});

export default router;
