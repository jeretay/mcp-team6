import { getStockHistory } from '../../lib/stocks.js';

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol || 'AAPL';
    const timeframe = req.query.timeframe || '1mo';
    const result = await getStockHistory(symbol, timeframe);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
