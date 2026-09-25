import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './api/mcp.js';
import {
  getStockQuote,
  getStockHistory,
  getCompanyProfile,
  getMaangOverview,
  getMaangPrices,
  getMaangIndicators,
  runBacktest,
  calculatePortfolioAllocation
} from './lib/stocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? Number(process.env.PORT) : 3000;

  // JSON middleware
  app.use(express.json());

  // MCP Streamable HTTP endpoint
  // Register the same handler with app.post and app.get, importing from api/mcp.js
  app.post('/api/mcp', handler);
  app.get('/api/mcp', handler);

  // REST API routes
  app.get('/api/stocks/quote', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'AAPL';
      const result = await getStockQuote(symbol);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/stocks/history', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'AAPL';
      const timeframe = (req.query.timeframe as string) || '1mo';
      const result = await getStockHistory(symbol, timeframe);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/stocks/profile', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'AAPL';
      const result = await getCompanyProfile(symbol);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/stocks/overview', async (_req, res) => {
    try {
      const result = await getMaangOverview();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/stocks', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'AAPL';
      const result = await getMaangPrices(symbol);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/indicators', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'AAPL';
      const indicator = (req.query.indicator as string) || 'ALL';
      const result = await getMaangIndicators(symbol, indicator);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/backtest', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'AAPL';
      const strategy = (req.query.strategy as string) || 'SMA_CROSSOVER';
      const result = await runBacktest(symbol, strategy);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.all('/api/portfolio-allocation', async (req, res) => {
    try {
      const params = req.method === 'POST' ? req.body : req.query;
      const result = await calculatePortfolioAllocation(params || {});
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
