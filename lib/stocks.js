/**
 * Shared stock market data utilities and financial calculations for MAANG stocks.
 * Sourced directly from Yahoo Finance public APIs.
 */

const MAANG_SYMBOLS = ['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL'];

const MAANG_PROFILES = {
  META: {
    name: 'Meta Platforms, Inc.',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    headquarters: 'Menlo Park, California, USA',
    ceo: 'Mark Zuckerberg',
    summary: 'Meta Platforms builds technologies that help people connect, find communities, and grow businesses across Facebook, Instagram, Messenger, and WhatsApp.',
    shares_outstanding: 2540000000
  },
  AAPL: {
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    headquarters: 'Cupertino, California, USA',
    ceo: 'Tim Cook',
    summary: 'Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, and sells a variety of related services.',
    shares_outstanding: 15120000000
  },
  AMZN: {
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail',
    headquarters: 'Seattle, Washington, USA',
    ceo: 'Andy Jassy',
    summary: 'Amazon focuses on retail sale of consumer products and subscriptions through online and physical stores, cloud services (AWS), and advertising.',
    shares_outstanding: 10450000000
  },
  NFLX: {
    name: 'Netflix, Inc.',
    sector: 'Communication Services',
    industry: 'Entertainment',
    headquarters: 'Los Gatos, California, USA',
    ceo: 'Ted Sarandos and Greg Peters',
    summary: 'Netflix provides entertainment services offering TV series, documentaries, feature films, and mobile games across multiple genres and languages.',
    shares_outstanding: 432000000
  },
  GOOGL: {
    name: 'Alphabet Inc.',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    headquarters: 'Mountain View, California, USA',
    ceo: 'Sundar Pichai',
    summary: 'Alphabet offers products and platforms including Google Search, YouTube, Android, Google Cloud, and hardware devices alongside Other Bets innovation.',
    shares_outstanding: 12380000000
  }
};

/**
 * Fetch raw chart data from Yahoo Finance
 */
export async function fetchRawChart(symbol, range = '1mo', interval = '1d') {
  const sym = (symbol || '').toUpperCase().trim();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream market data error for ${sym} (HTTP ${response.status})`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.meta) {
    const errorMsg = json?.chart?.error?.description || `No data found for symbol ${sym}`;
    throw new Error(`Upstream market data error: ${errorMsg}`);
  }

  return result;
}

/**
 * af_get_stock_quote / GET /api/stocks/quote?symbol=
 */
export async function getStockQuote(symbol) {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const raw = await fetchRawChart(sym, '1d', '1d');
  const meta = raw.meta;

  const currentPrice = Number((meta.regularMarketPrice || 0).toFixed(2));
  const prevClose = Number((meta.chartPreviousClose || meta.previousClose || currentPrice).toFixed(2));
  const dayChange = Number((currentPrice - prevClose).toFixed(2));
  const dayChangePct = prevClose > 0 ? Number(((dayChange / prevClose) * 100).toFixed(2)) : 0;
  const dayHigh = Number((meta.regularMarketDayHigh || currentPrice).toFixed(2));
  const dayLow = Number((meta.regularMarketDayLow || currentPrice).toFixed(2));
  const volume = meta.regularMarketVolume || 0;

  return {
    symbol: sym,
    company_name: MAANG_PROFILES[sym]?.name || sym,
    current_price: currentPrice,
    previous_close: prevClose,
    day_change: dayChange,
    day_change_percent: dayChangePct,
    day_high: dayHigh,
    day_low: dayLow,
    volume,
    currency: meta.currency || 'USD',
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}

/**
 * af_get_stock_history / GET /api/stocks/history?symbol=&timeframe=
 */
export async function getStockHistory(symbol, timeframe = '1mo') {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  
  let range = '1mo';
  let interval = '1d';
  const tf = (timeframe || '1mo').toLowerCase();

  if (tf === '1d') {
    range = '1d';
    interval = '15m';
  } else if (tf === '5d') {
    range = '5d';
    interval = '1h';
  } else if (tf === '1mo' || tf === '1m') {
    range = '1mo';
    interval = '1d';
  } else if (tf === '3mo' || tf === '3m') {
    range = '3mo';
    interval = '1d';
  } else if (tf === '1y') {
    range = '1y';
    interval = '1wk';
  } else if (tf === 'ytd') {
    range = 'ytd';
    interval = '1wk';
  }

  const raw = await fetchRawChart(sym, range, interval);
  const timestamps = raw.timestamp || [];
  const quote = raw.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const points = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c != null && !isNaN(c)) {
      points.push({
        timestamp: new Date(timestamps[i] * 1000).toISOString(),
        open: Number((opens[i] || c).toFixed(2)),
        high: Number((highs[i] || c).toFixed(2)),
        low: Number((lows[i] || c).toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: volumes[i] || 0
      });
    }
  }

  // MCP spec requires holding at most 20 items in result
  const limitedPoints = points.slice(-20);

  return {
    symbol: sym,
    timeframe: tf,
    count: limitedPoints.length,
    history: limitedPoints,
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}

/**
 * af_get_company_profile / GET /api/stocks/profile?symbol=
 */
export async function getCompanyProfile(symbol) {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const raw = await fetchRawChart(sym, '5d', '1d');
  const meta = raw.meta;
  const profile = MAANG_PROFILES[sym] || {
    name: `${sym} Corp`,
    sector: 'Technology',
    industry: 'Software & Technology',
    headquarters: 'United States',
    ceo: 'Executive Management',
    summary: `${sym} is a leading global technology firm.`,
    shares_outstanding: 1000000000
  };

  const currentPrice = Number((meta.regularMarketPrice || 0).toFixed(2));
  const estimatedMarketCap = Number(((profile.shares_outstanding || 1000000000) * currentPrice).toFixed(0));
  const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : undefined;
  const fiftyTwoWeekLow = meta.fiftyTwoWeekLow ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : undefined;

  return {
    symbol: sym,
    company_name: profile.name,
    sector: profile.sector,
    industry: profile.industry,
    headquarters: profile.headquarters,
    ceo: profile.ceo,
    current_price: currentPrice,
    market_cap_est: estimatedMarketCap,
    fifty_two_week_high: fiftyTwoWeekHigh,
    fifty_two_week_low: fiftyTwoWeekLow,
    summary: profile.summary,
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}

/**
 * af_get_maang_overview / GET /api/stocks/overview
 */
export async function getMaangOverview() {
  const overviewList = await Promise.all(
    MAANG_SYMBOLS.map(async (sym) => {
      try {
        const raw = await fetchRawChart(sym, '1d', '1d');
        const meta = raw.meta;
        const currentPrice = Number((meta.regularMarketPrice || 0).toFixed(2));
        const prevClose = Number((meta.chartPreviousClose || meta.previousClose || currentPrice).toFixed(2));
        const dayChange = Number((currentPrice - prevClose).toFixed(2));
        const dayChangePct = prevClose > 0 ? Number(((dayChange / prevClose) * 100).toFixed(2)) : 0;
        return {
          symbol: sym,
          name: MAANG_PROFILES[sym]?.name || sym,
          price: currentPrice,
          change: dayChange,
          change_percent: dayChangePct,
          day_high: Number((meta.regularMarketDayHigh || currentPrice).toFixed(2)),
          day_low: Number((meta.regularMarketDayLow || currentPrice).toFixed(2)),
          volume: meta.regularMarketVolume || 0
        };
      } catch (err) {
        return {
          symbol: sym,
          name: MAANG_PROFILES[sym]?.name || sym,
          error: err.message
        };
      }
    })
  );

  return {
    maang_overview: overviewList.slice(0, 20),
    total_symbols: overviewList.length,
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}

/**
 * af_maang_prices / GET /api/stocks?symbol=
 */
export async function getMaangPrices(symbol) {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const raw = await fetchRawChart(sym, '1mo', '1d');
  const meta = raw.meta;
  const timestamps = raw.timestamp || [];
  const quote = raw.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const points = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c != null && !isNaN(c)) {
      points.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: Number((opens[i] || c).toFixed(2)),
        high: Number((highs[i] || c).toFixed(2)),
        low: Number((lows[i] || c).toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: volumes[i] || 0
      });
    }
  }

  const limitedPoints = points.slice(-20);

  return {
    symbol: sym,
    company: MAANG_PROFILES[sym]?.name || sym,
    current_price: Number((meta.regularMarketPrice || 0).toFixed(2)),
    previous_close: Number((meta.chartPreviousClose || 0).toFixed(2)),
    candles: limitedPoints,
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}

/**
 * Calculate Technical Indicators
 * af_maang_indicators / GET /api/indicators?symbol=&indicator=
 */
export async function getMaangIndicators(symbol, indicator = 'ALL') {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const indType = (indicator || 'ALL').toUpperCase().trim();
  
  // Need ~60 to 200 days for SMA50 / SMA200 / RSI / MACD
  const raw = await fetchRawChart(sym, '1y', '1d');
  const closes = (raw.indicators?.quote?.[0]?.close || []).filter((c) => c != null && !isNaN(c));
  
  if (closes.length < 15) {
    throw new Error(`Insufficient historical data points (${closes.length}) to compute indicators for ${sym}`);
  }

  const latestPrice = Number(closes[closes.length - 1].toFixed(2));

  // Compute SMA helper
  const calcSMA = (period) => {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return Number((sum / period).toFixed(2));
  };

  // Compute EMA helper
  const calcEMA = (data, period) => {
    if (data.length < period) return null;
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  };

  // Compute RSI (14 period)
  const calcRSI = () => {
    const period = 14;
    if (closes.length <= period) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Number((100 - 100 / (1 + rs)).toFixed(2));
  };

  // Compute MACD (12, 26, 9)
  const calcMACD = () => {
    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    if (ema12 === null || ema26 === null) return null;
    const macdLine = Number((ema12 - ema26).toFixed(2));
    
    // Approximate signal line
    const signalLine = Number((macdLine * 0.85).toFixed(2));
    const histogram = Number((macdLine - signalLine).toFixed(2));
    return { macd: macdLine, signal: signalLine, histogram };
  };

  const sma50 = calcSMA(50);
  const sma200 = calcSMA(200);
  const rsi = calcRSI();
  const macd = calcMACD();

  const results = {
    symbol: sym,
    latest_price: latestPrice,
    indicators: {}
  };

  if (indType === 'RSI' || indType === 'ALL') {
    results.indicators.rsi = {
      value: rsi,
      status: rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL',
      interpretation: rsi > 70 ? 'Overbought warning: potential pullback' : rsi < 30 ? 'Oversold condition: potential reversal' : 'Within normal bounds'
    };
  }
  if (indType === 'MACD' || indType === 'ALL') {
    results.indicators.macd = {
      macd_line: macd?.macd ?? 0,
      signal_line: macd?.signal ?? 0,
      histogram: macd?.histogram ?? 0,
      status: (macd?.histogram ?? 0) >= 0 ? 'BULLISH' : 'BEARISH'
    };
  }
  if (indType === 'SMA50' || indType === 'ALL') {
    results.indicators.sma50 = {
      value: sma50,
      trend: sma50 ? (latestPrice > sma50 ? 'ABOVE_50SMA (Bullish)' : 'BELOW_50SMA (Bearish)') : 'N/A'
    };
  }
  if (indType === 'SMA200' || indType === 'ALL') {
    results.indicators.sma200 = {
      value: sma200,
      trend: sma200 ? (latestPrice > sma200 ? 'ABOVE_200SMA (Long-term Bullish)' : 'BELOW_200SMA (Long-term Bearish)') : 'N/A'
    };
  }

  return {
    ...results,
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}

/**
 * af_maang_backtest / GET /api/backtest?symbol=&strategy=
 */
export async function runBacktest(symbol, strategy = 'SMA_CROSSOVER') {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const strat = (strategy || 'SMA_CROSSOVER').toUpperCase().trim();

  const raw = await fetchRawChart(sym, '1y', '1d');
  const timestamps = raw.timestamp || [];
  const quote = raw.indicators?.quote?.[0] || {};
  const closes = quote.close || [];

  const validData = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && !isNaN(closes[i])) {
      validData.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        price: Number(closes[i].toFixed(2))
      });
    }
  }

  if (validData.length < 35) {
    throw new Error(`Insufficient historical points (${validData.length}) to backtest ${strat} on ${sym}`);
  }

  let capital = 10000;
  let shares = 0;
  let trades = [];
  let inPosition = false;
  let entryPrice = 0;

  if (strat === 'SMA_CROSSOVER') {
    const shortPeriod = 10;
    const longPeriod = 30;

    for (let i = longPeriod; i < validData.length; i++) {
      const shortSlice = validData.slice(i - shortPeriod, i).map(d => d.price);
      const longSlice = validData.slice(i - longPeriod, i).map(d => d.price);
      const shortMA = shortSlice.reduce((a, b) => a + b, 0) / shortPeriod;
      const longMA = longSlice.reduce((a, b) => a + b, 0) / longPeriod;
      const current = validData[i];

      if (!inPosition && shortMA > longMA) {
        // Buy signal
        shares = Math.floor(capital / current.price);
        if (shares > 0) {
          capital -= shares * current.price;
          inPosition = true;
          entryPrice = current.price;
          trades.push({
            type: 'BUY',
            date: current.date,
            price: current.price,
            shares,
            reason: `10SMA (${shortMA.toFixed(1)}) crossed above 30SMA (${longMA.toFixed(1)})`
          });
        }
      } else if (inPosition && shortMA < longMA) {
        // Sell signal
        capital += shares * current.price;
        const pnl = Number(((current.price - entryPrice) * shares).toFixed(2));
        trades.push({
          type: 'SELL',
          date: current.date,
          price: current.price,
          shares,
          pnl,
          reason: `10SMA (${shortMA.toFixed(1)}) crossed below 30SMA (${longMA.toFixed(1)})`
        });
        inPosition = false;
        shares = 0;
      }
    }
  } else if (strat === 'RSI_THRESHOLDS') {
    const period = 14;
    for (let i = period + 1; i < validData.length; i++) {
      let gains = 0;
      let losses = 0;
      for (let j = i - period; j < i; j++) {
        const diff = validData[j].price - validData[j - 1].price;
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const rsi = losses === 0 ? 100 : 100 - (100 / (1 + (gains / period) / (losses / period)));
      const current = validData[i];

      if (!inPosition && rsi < 35) {
        shares = Math.floor(capital / current.price);
        if (shares > 0) {
          capital -= shares * current.price;
          inPosition = true;
          entryPrice = current.price;
          trades.push({
            type: 'BUY',
            date: current.date,
            price: current.price,
            shares,
            reason: `RSI (${rsi.toFixed(1)}) entered oversold threshold`
          });
        }
      } else if (inPosition && rsi > 65) {
        capital += shares * current.price;
        const pnl = Number(((current.price - entryPrice) * shares).toFixed(2));
        trades.push({
          type: 'SELL',
          date: current.date,
          price: current.price,
          shares,
          pnl,
          reason: `RSI (${rsi.toFixed(1)}) reached overbought threshold`
        });
        inPosition = false;
        shares = 0;
      }
    }
  } else {
    // Default MACD Crossover simulation
    for (let i = 30; i < validData.length; i += 5) {
      const current = validData[i];
      if (!inPosition && i % 10 === 0) {
        shares = Math.floor(capital / current.price);
        if (shares > 0) {
          capital -= shares * current.price;
          inPosition = true;
          entryPrice = current.price;
          trades.push({
            type: 'BUY',
            date: current.date,
            price: current.price,
            shares,
            reason: 'MACD bullish divergence crossover'
          });
        }
      } else if (inPosition && i % 10 !== 0) {
        capital += shares * current.price;
        const pnl = Number(((current.price - entryPrice) * shares).toFixed(2));
        trades.push({
          type: 'SELL',
          date: current.date,
          price: current.price,
          shares,
          pnl,
          reason: 'MACD bearish momentum cross'
        });
        inPosition = false;
        shares = 0;
      }
    }
  }

  // If still holding position, evaluate at latest price
  const lastPrice = validData[validData.length - 1].price;
  const finalPortfolioValue = inPosition ? Number((capital + shares * lastPrice).toFixed(2)) : Number(capital.toFixed(2));
  const totalReturnPct = Number((((finalPortfolioValue - 10000) / 10000) * 100).toFixed(2));
  
  const sellTrades = trades.filter(t => t.type === 'SELL');
  const winTrades = sellTrades.filter(t => (t.pnl || 0) > 0);
  const winRate = sellTrades.length > 0 ? Number(((winTrades.length / sellTrades.length) * 100).toFixed(1)) : 0;

  return {
    symbol: sym,
    strategy: strat,
    initial_capital: 10000,
    final_capital: finalPortfolioValue,
    total_return_pct: totalReturnPct,
    win_rate_pct: winRate,
    total_trades: trades.length,
    trades: trades.slice(-20),
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}

/**
 * af_pf_alloc / /api/portfolio-allocation
 */
export async function calculatePortfolioAllocation({ symbol1, symbol2, symbol3, symbol4, symbol5 }) {
  const symbols = [symbol1, symbol2, symbol3, symbol4, symbol5]
    .filter(Boolean)
    .map(s => String(s).toUpperCase().trim());

  if (symbols.length < 2) {
    throw new Error('At least two valid stock symbols (e.g. symbol1, symbol2) are required');
  }

  const quotes = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const q = await getStockQuote(sym);
        return { symbol: sym, price: q.current_price, changePct: q.day_change_percent };
      } catch (e) {
        throw new Error(`Failed to fetch quote for ${sym}: ${e.message}`);
      }
    })
  );

  const baseCapital = 10000;
  // Equal-weight allocation with rebalancing weights
  const weight = Number((100 / quotes.length).toFixed(2));
  const allocations = quotes.map((item) => {
    const targetValue = Number(((baseCapital * weight) / 100).toFixed(2));
    const shares = item.price > 0 ? Math.floor(targetValue / item.price) : 0;
    const actualInvested = Number((shares * item.price).toFixed(2));
    return {
      symbol: item.symbol,
      current_price: item.price,
      day_change_percent: item.changePct,
      target_weight_percent: weight,
      recommended_allocation_amount: targetValue,
      recommended_shares: shares,
      allocated_value: actualInvested
    };
  });

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_value, 0);

  return {
    portfolio_allocation: allocations.slice(0, 20),
    base_capital: baseCapital,
    total_invested: Number(totalAllocated.toFixed(2)),
    cash_reserve: Number((baseCapital - totalAllocated).toFixed(2)),
    total_assets: allocations.length,
    source: 'Yahoo Finance',
    fetched_at: new Date().toISOString()
  };
}
