/**
 * MCP Server Handler for /api/mcp
 * Protocol: Streamable HTTP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import {
  getStockQuote,
  getStockHistory,
  getCompanyProfile,
  getMaangOverview,
  getMaangPrices,
  getMaangIndicators,
  runBacktest,
  calculatePortfolioAllocation
} from '../lib/stocks.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed' },
      id: null
    });
  }

  // Create fresh server and transport per request (no session state retained)
  const server = new McpServer({ name: 'app-fin-v1-server', version: '1.0.0' });

  // 1. af_pf_alloc
  server.registerTool('af_pf_alloc', {
    description: 'Calculates portfolio allocation and weight breakdown across two to five specified MAANG stocks. Market prices and metrics are retrieved directly from upstream Yahoo Finance servers. Use this tool when an agent needs recommended capital distribution, share quantities, and position sizing across tech equities. It does not execute live market orders or debit brokerage accounts.',
    inputSchema: {
      symbol1: z.string().describe('First stock ticker symbol for portfolio allocation (e.g., AAPL, META, GOOGL, AMZN, NFLX)'),
      symbol2: z.string().describe('Second stock ticker symbol for portfolio allocation'),
      symbol3: z.string().optional().describe('Third stock ticker symbol for portfolio allocation (optional)'),
      symbol4: z.string().optional().describe('Fourth stock ticker symbol for portfolio allocation (optional)'),
      symbol5: z.string().optional().describe('Fifth stock ticker symbol for portfolio allocation (optional)')
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async (args) => {
    try {
      const result = await calculatePortfolioAllocation(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to compute portfolio allocation: upstream ${err.message}` }] };
    }
  });

  // 2. af_get_stock_quote
  server.registerTool('af_get_stock_quote', {
    description: 'Returns real-time or recent price quote metrics including current price, day change, day change percentage, day high, day low, and trading volume for MAANG stocks (META, AAPL, AMZN, NFLX, GOOGL). Quotes are retrieved directly from upstream Yahoo Finance market data feeds. Use this tool when an agent needs an immediate valuation snapshot or intraday pricing update for a MAANG stock. It does not provide historical candle series or options chains.',
    inputSchema: {
      symbol: z.string().describe('The stock ticker symbol of the MAANG company to retrieve quote for (e.g., META, AAPL, AMZN, NFLX, GOOGL)')
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ symbol }) => {
    try {
      const result = await getStockQuote(symbol);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get stock quote for ${symbol}: upstream ${err.message}` }] };
    }
  });

  // 3. af_get_stock_history
  server.registerTool('af_get_stock_history', {
    description: 'Returns historical price performance time-series data including closing prices, highs, lows, and timestamps for a specific MAANG stock. The time series is read directly from upstream Yahoo Finance historical chart endpoints. Use this tool when an agent needs to analyze historical price trends and trajectory over a given timeframe (1d, 5d, 1mo, 3mo, 1y). It does not compute derived technical oscillators or forward price projections.',
    inputSchema: {
      symbol: z.string().describe('The stock ticker symbol of the MAANG company (META, AAPL, AMZN, NFLX, GOOGL)'),
      timeframe: z.string().optional().describe('Timeframe interval for historical performance such as 1d, 5d, 1mo, 3mo, or 1y (defaults to 1mo)')
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ symbol, timeframe }) => {
    try {
      const result = await getStockHistory(symbol, timeframe);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get stock history for ${symbol}: upstream ${err.message}` }] };
    }
  });

  // 4. af_get_company_profile
  server.registerTool('af_get_company_profile', {
    description: 'Returns company profile details, industry sector, headquarters, executive leadership, and fundamental valuation metrics for a MAANG company. Information is retrieved from upstream financial registries and Yahoo Finance fundamental statistics. Use this tool when an agent needs corporate background, market capitalization, or sector classification for a MAANG enterprise. It does not provide real-time order book level 2 depth.',
    inputSchema: {
      symbol: z.string().describe('The stock ticker symbol of the MAANG company (META, AAPL, AMZN, NFLX, GOOGL)')
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ symbol }) => {
    try {
      const result = await getCompanyProfile(symbol);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get company profile for ${symbol}: upstream ${err.message}` }] };
    }
  });

  // 5. af_get_maang_overview
  server.registerTool('af_get_maang_overview', {
    description: 'Returns a consolidated summary matrix of all MAANG stocks (META, AAPL, AMZN, NFLX, GOOGL) tracked by the application with real-time prices, daily change percentages, and intraday ranges. The matrix is assembled directly from upstream Yahoo Finance live market feeds. Use this tool when an agent needs a holistic comparative snapshot of the entire MAANG tech cohort simultaneously. It does not cover non-MAANG equities or foreign currency pairs.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async () => {
    try {
      const result = await getMaangOverview();
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get MAANG overview: upstream ${err.message}` }] };
    }
  });

  // 6. af_maang_prices
  server.registerTool('af_maang_prices', {
    description: 'Wraps GET /api/stocks?symbol= and returns live and historical price data for a given MAANG stock (Meta, Apple, Amazon, Netflix, Google). The result comes from upstream market APIs (Yahoo Finance, Alpha Vantage, Polygon). Use this tool when an agent needs raw OHLC data for analysis. It does not cover non‑MAANG stocks or crypto.',
    inputSchema: {
      symbol: z.string().describe('The MAANG stock ticker symbol (e.g., META, AAPL, AMZN, NFLX, GOOGL)')
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ symbol }) => {
    try {
      const result = await getMaangPrices(symbol);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get MAANG prices for ${symbol}: upstream ${err.message}` }] };
    }
  });

  // 7. af_maang_indicators
  server.registerTool('af_maang_indicators', {
    description: 'Wraps GET /api/indicators?symbol=&indicator= and returns calculated technical indicators (RSI, MACD, SMA50, SMA200) for a given MAANG stock. The result is computed from upstream market data. Use this tool when an agent needs to detect overbought/oversold conditions or trend shifts. It does not cover fundamental metrics like earnings or revenue.',
    inputSchema: {
      symbol: z.string().describe('The MAANG stock ticker symbol (e.g., META, AAPL, AMZN, NFLX, GOOGL)'),
      indicator: z.string().describe("Technical indicator to compute: 'RSI', 'MACD', 'SMA50', 'SMA200', or 'ALL'")
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ symbol, indicator }) => {
    try {
      const result = await getMaangIndicators(symbol, indicator);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to compute indicators for ${symbol}: upstream ${err.message}` }] };
    }
  });

  // 8. af_maang_backtest
  server.registerTool('af_maang_backtest', {
    description: 'Wraps GET /api/backtest?symbol=&strategy= and returns backtest results on historical MAANG stock data using a chosen strategy (e.g., SMA crossover, RSI thresholds, MACD crossover). The result is simulated locally from upstream market data. Use this tool when an agent needs to validate signals historically. It does not cover live trading or execution.',
    inputSchema: {
      symbol: z.string().describe('The MAANG stock ticker symbol (e.g., META, AAPL, AMZN, NFLX, GOOGL)'),
      strategy: z.string().describe("Trading strategy to backtest: 'SMA_CROSSOVER', 'RSI_THRESHOLDS', or 'MACD_CROSSOVER'")
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ symbol, strategy }) => {
    try {
      const result = await runBacktest(symbol, strategy);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Failed to execute backtest for ${symbol}: upstream ${err.message}` }] };
    }
  });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  await server.connect(transport);

  res.on('close', () => {
    try {
      transport.close?.();
      server.close?.();
    } catch (_) {
      // ignore cleanup errors
    }
  });

  await transport.handleRequest(req, res, req.body);
}
