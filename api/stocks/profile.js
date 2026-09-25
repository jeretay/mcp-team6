import { getCompanyProfile } from '../../lib/stocks.js';

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol || 'AAPL';
    const result = await getCompanyProfile(symbol);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
