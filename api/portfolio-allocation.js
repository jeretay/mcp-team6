import { calculatePortfolioAllocation } from '../lib/stocks.js';

export default async function handler(req, res) {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const result = await calculatePortfolioAllocation(params || {});
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
