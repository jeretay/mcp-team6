import { getMaangIndicators } from '../lib/stocks.js';

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol || 'AAPL';
    const indicator = req.query.indicator || 'ALL';
    const result = await getMaangIndicators(symbol, indicator);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
