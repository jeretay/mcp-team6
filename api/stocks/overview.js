import { getMaangOverview } from '../../lib/stocks.js';

export default async function handler(req, res) {
  try {
    const result = await getMaangOverview();
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
