import { runBacktest } from '../lib/stocks.js';

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol || 'AAPL';
    const strategy = req.query.strategy || 'SMA_CROSSOVER';
    const result = await runBacktest(symbol, strategy);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
