import { Router } from 'express';

const router = Router();

// Endpoint for Government Open Data (data.gov.in) status and documentation
router.get('/data-gov/status', (req, res) => {
  const hasApiKey = Boolean(process.env.DATA_GOV_IN_API_KEY);
  res.json({
    configured: hasApiKey,
    source: 'data.gov.in & myscheme.gov.in',
    docs: 'https://data.gov.in/apis',
    fallbackAvailable: true,
    message: hasApiKey
      ? 'data.gov.in API credentials detected.'
      : 'No DATA_GOV_IN_API_KEY detected in server environment. SchemeSaathi is using its local verified catalog with support for CSV and JSON dataset imports.',
  });
});

export default router;
