import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import profileRoutes from './server/routes/profile.js';
import assistantRoutes from './server/routes/assistant.js';
import dataRoutes from './server/routes/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Backend API routes
app.use('/api', profileRoutes);
app.use('/api', assistantRoutes);
app.use('/api', dataRoutes);

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(__dirname, 'dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
  });
} else {
  // Vite dev server in middleware mode
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(Number(PORT), '0.0.0.0', () => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  console.log(`SchemeSaathi unified server running on http://localhost:${PORT}`);
  console.log(`Gemini status: ${hasGemini ? 'Enabled' : 'Offline/Fallback mode'}`);
});
