/**
 * MCP Team 6 - MAANG Stock Intelligence & MCP Server Dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  PieChart as PieIcon,
  Terminal,
  ShieldCheck,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Play,
  Briefcase
} from 'lucide-react';

interface StockQuote {
  symbol: string;
  company_name: string;
  current_price: number;
  previous_close: number;
  day_change: number;
  day_change_percent: number;
  day_high: number;
  day_low: number;
  volume: number;
  currency: string;
  source: string;
  fetched_at: string;
}

interface StockOverviewItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  day_high: number;
  day_low: number;
  volume: number;
}

const MAANG_SYMBOLS = ['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'indicators' | 'backtest' | 'allocation' | 'mcp'>('overview');
  const [selectedStock, setSelectedStock] = useState<string>('AAPL');
  const [overview, setOverview] = useState<StockOverviewItem[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Timeframe and chart state
  const [timeframe, setTimeframe] = useState<string>('1mo');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Indicator state
  const [indicatorData, setIndicatorData] = useState<any>(null);
  const [indicatorLoading, setIndicatorLoading] = useState<boolean>(false);

  // Backtest state
  const [backtestStrategy, setBacktestStrategy] = useState<string>('SMA_CROSSOVER');
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);

  // Allocation state
  const [allocSymbols, setAllocSymbols] = useState<string[]>(['AAPL', 'GOOGL', 'AMZN']);
  const [allocResult, setAllocResult] = useState<any>(null);
  const [allocLoading, setAllocLoading] = useState<boolean>(false);

  // MCP Sandbox state
  const [mcpMethod, setMcpMethod] = useState<'tools/list' | 'tools/call'>('tools/list');
  const [mcpSelectedTool, setMcpSelectedTool] = useState<string>('af_get_stock_quote');
  const [mcpToolArgs, setMcpToolArgs] = useState<string>('{\n  "symbol": "AAPL"\n}');
  const [mcpResponse, setMcpResponse] = useState<any>(null);
  const [mcpLoading, setMcpLoading] = useState<boolean>(false);

  // Load MAANG overview on mount
  useEffect(() => {
    loadOverview();
  }, []);

  // When selectedStock changes, load quote, history, indicators
  useEffect(() => {
    loadStockData(selectedStock);
  }, [selectedStock, timeframe]);

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await fetch('/api/stocks/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data.maang_overview || []);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStockData(sym: string) {
    setHistoryLoading(true);
    try {
      const [quoteRes, histRes, indRes] = await Promise.all([
        fetch(`/api/stocks/quote?symbol=${sym}`),
        fetch(`/api/stocks/history?symbol=${sym}&timeframe=${timeframe}`),
        fetch(`/api/indicators?symbol=${sym}&indicator=ALL`)
      ]);

      if (quoteRes.ok) {
        const qData = await quoteRes.json();
        setSelectedQuote(qData);
      }
      if (histRes.ok) {
        const hData = await histRes.json();
        setHistoryData(hData.history || []);
      }
      if (indRes.ok) {
        const iData = await indRes.json();
        setIndicatorData(iData);
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function runBacktestAction() {
    setBacktestLoading(true);
    try {
      const res = await fetch(`/api/backtest?symbol=${selectedStock}&strategy=${backtestStrategy}`);
      const data = await res.json();
      setBacktestResult(data);
    } catch (err) {
      console.error('Error running backtest:', err);
    } finally {
      setBacktestLoading(false);
    }
  }

  async function runAllocationAction() {
    setAllocLoading(true);
    try {
      const payload: any = {};
      allocSymbols.forEach((s, idx) => {
        payload[`symbol${idx + 1}`] = s;
      });
      const res = await fetch('/api/portfolio-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setAllocResult(data);
    } catch (err) {
      console.error('Error calculating allocation:', err);
    } finally {
      setAllocLoading(false);
    }
  }

  async function executeMcpRequest() {
    setMcpLoading(true);
    setMcpResponse(null);
    try {
      let body: any = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: mcpMethod
      };

      if (mcpMethod === 'tools/list') {
        body.params = {};
      } else {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(mcpToolArgs);
        } catch (e) {
          setMcpResponse({ error: 'Invalid JSON in tool arguments' });
          setMcpLoading(false);
          return;
        }
        body.params = {
          name: mcpSelectedTool,
          arguments: parsedArgs
        };
      }

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      setMcpResponse(data);
    } catch (err: any) {
      setMcpResponse({ error: err.message });
    } finally {
      setMcpLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">MCP Team 6</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  MCP Active
                </span>
              </div>
              <p className="text-xs text-slate-400">MAANG Stock Intelligence &amp; Streamable HTTP Server</p>
            </div>
          </div>

          {/* Quick MCP Endpoint Info */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Endpoint:</span>
              <code className="text-indigo-300 font-mono">/api/mcp</code>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-mono">8 tools ready</span>
            </div>
            <button
              onClick={() => {
                setRefreshing(true);
                loadOverview();
                loadStockData(selectedStock);
                setTimeout(() => setRefreshing(false), 600);
              }}
              disabled={refreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 flex items-center gap-1 text-xs"
              title="Refresh quotes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Live MAANG Ticker Bar */}
        <div className="border-t border-slate-800/80 bg-slate-900/60 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4 text-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">MAANG Cohort:</span>
            {overview.map((item) => {
              const isPositive = (item.change ?? 0) >= 0;
              return (
                <button
                  key={item.symbol}
                  onClick={() => setSelectedStock(item.symbol)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-md transition border ${
                    selectedStock === item.symbol
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">{item.symbol}</span>
                  <span className="font-mono">${item.price?.toFixed(2) ?? '--'}</span>
                  <span className={`flex items-center text-[11px] font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{item.change_percent?.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & MAANG Quotes', icon: Layers },
            { id: 'chart', label: 'Price Performance', icon: Activity },
            { id: 'indicators', label: 'Technical Indicators', icon: TrendingUp },
            { id: 'backtest', label: 'Strategy Backtest', icon: Play },
            { id: 'allocation', label: 'Portfolio Allocation', icon: PieIcon },
            { id: 'mcp', label: 'MCP Server Sandbox', icon: Terminal }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Tab 1: Overview & MAANG Quotes */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {overview.map((stock) => {
                const isSelected = selectedStock === stock.symbol;
                const isPos = (stock.change ?? 0) >= 0;
                return (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock.symbol)}
                    className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-extrabold text-base text-white">{stock.symbol}</span>
                        <div className="text-[11px] text-slate-400 truncate max-w-[120px]">{stock.name}</div>
                      </div>
                      <span className={`p-1 rounded-md text-xs ${isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-bold font-mono text-white">${stock.price?.toFixed(2)}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs font-mono font-medium ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}{stock.change?.toFixed(2)} ({isPos ? '+' : ''}{stock.change_percent?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
                      <span>H: ${stock.day_high?.toFixed(2)}</span>
                      <span>L: ${stock.day_low?.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Stock Detail Card */}
            {selectedQuote && (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-lg">
                      {selectedQuote.symbol}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedQuote.company_name}</h2>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>NASDAQ: {selectedQuote.symbol}</span>
                        <span>•</span>
                        <span>Currency: {selectedQuote.currency}</span>
                        <span>•</span>
                        <span className="text-slate-500">Source: {selectedQuote.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-extrabold font-mono text-white">${selectedQuote.current_price?.toFixed(2)}</div>
                    <div className={`text-sm font-mono font-medium mt-0.5 ${selectedQuote.day_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedQuote.day_change >= 0 ? '+' : ''}{selectedQuote.day_change?.toFixed(2)} ({selectedQuote.day_change_percent?.toFixed(2)}%) Today
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-400">Day High</span>
                    <p className="text-lg font-bold font-mono text-white mt-1">${selectedQuote.day_high?.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-400">Day Low</span>
                    <p className="text-lg font-bold font-mono text-white mt-1">${selectedQuote.day_low?.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-400">Previous Close</span>
                    <p className="text-lg font-bold font-mono text-white mt-1">${selectedQuote.previous_close?.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-400">Volume</span>
                    <p className="text-lg font-bold font-mono text-white mt-1">{(selectedQuote.volume || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Price Performance & Chart */}
        {activeTab === 'chart' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Select Equity:</span>
                <div className="flex gap-1">
                  {MAANG_SYMBOLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStock(s)}
                      className={`px-3 py-1 text-xs rounded-lg font-bold transition ${
                        selectedStock === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {['1d', '5d', '1mo', '3mo', '1y'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 text-xs rounded-md uppercase font-semibold transition ${
                      timeframe === tf ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Chart Card */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedStock} Price History</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-indigo-300 uppercase">
                      {timeframe}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Time series data read from upstream Yahoo Finance endpoints</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Latest Data Points</div>
                  <div className="text-sm font-bold text-white font-mono">{historyData.length} candles</div>
                </div>
              </div>

              {historyLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Loading market candles...</span>
                </div>
              ) : historyData.length > 0 ? (
                <div className="space-y-4">
                  {/* SVG Line visualization */}
                  <div className="h-64 w-full bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Max: ${Math.max(...historyData.map(d => d.high || d.close)).toFixed(2)}</span>
                      <span>Min: ${Math.min(...historyData.map(d => d.low || d.close)).toFixed(2)}</span>
                    </div>

                    <div className="h-44 w-full flex items-end gap-1.5 pt-4">
                      {historyData.map((pt, idx) => {
                        const closes = historyData.map(d => d.close);
                        const min = Math.min(...closes);
                        const max = Math.max(...closes);
                        const range = max - min || 1;
                        const heightPct = Math.max(10, ((pt.close - min) / range) * 100);
                        const isUp = idx === 0 || pt.close >= historyData[idx - 1].close;

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          >
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-t-sm transition-all duration-300 ${
                                isUp ? 'bg-emerald-500/80 group-hover:bg-emerald-400' : 'bg-rose-500/80 group-hover:bg-rose-400'
                              }`}
                            />
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-800 border border-slate-700 text-white text-[10px] p-2 rounded shadow-xl pointer-events-none z-10 whitespace-nowrap font-mono">
                              <span className="text-slate-400">{new Date(pt.timestamp).toLocaleDateString()}</span>
                              <span className="font-bold">${pt.close?.toFixed(2)}</span>
                              <span>Vol: {pt.volume?.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/60 pt-1">
                      <span>{historyData[0]?.timestamp ? new Date(historyData[0].timestamp).toLocaleDateString() : ''}</span>
                      <span>{historyData[historyData.length - 1]?.timestamp ? new Date(historyData[historyData.length - 1].timestamp).toLocaleDateString() : ''}</span>
                    </div>
                  </div>

                  {/* Recent Candles Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300 font-mono">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Open</th>
                          <th className="py-2.5 px-3">High</th>
                          <th className="py-2.5 px-3">Low</th>
                          <th className="py-2.5 px-3">Close</th>
                          <th className="py-2.5 px-3">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {historyData.slice(-8).reverse().map((row, i) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-slate-400">{new Date(row.timestamp).toLocaleDateString()}</td>
                            <td className="py-2 px-3">${row.open?.toFixed(2)}</td>
                            <td className="py-2 px-3 text-emerald-400">${row.high?.toFixed(2)}</td>
                            <td className="py-2 px-3 text-rose-400">${row.low?.toFixed(2)}</td>
                            <td className="py-2 px-3 font-bold text-white">${row.close?.toFixed(2)}</td>
                            <td className="py-2 px-3 text-slate-400">{row.volume?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">No historical data available.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Technical Indicators */}
        {activeTab === 'indicators' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Equity:</span>
                <div className="flex gap-1">
                  {MAANG_SYMBOLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStock(s)}
                      className={`px-3 py-1 text-xs rounded-lg font-bold transition ${
                        selectedStock === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-slate-400">Computed via /api/indicators</div>
            </div>

            {indicatorData?.indicators ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RSI Card */}
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-base text-white">Relative Strength Index (14)</h4>
                      <p className="text-xs text-slate-400">Momentum oscillator measuring speed and change of price</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                      indicatorData.indicators.rsi?.status === 'OVERBOUGHT'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : indicatorData.indicators.rsi?.status === 'OVERSOLD'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {indicatorData.indicators.rsi?.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="text-3xl font-extrabold font-mono text-white">
                      {indicatorData.indicators.rsi?.value?.toFixed(1)}
                    </div>
                    {/* Gauge bar */}
                    <div className="w-full h-3 bg-slate-950 rounded-full mt-3 overflow-hidden flex border border-slate-800">
                      <div className="w-[30%] bg-emerald-500/30 h-full border-r border-slate-800" title="Oversold (<30)" />
                      <div className="w-[40%] bg-slate-800 h-full" title="Neutral (30-70)" />
                      <div className="w-[30%] bg-rose-500/30 h-full border-l border-slate-800" title="Overbought (>70)" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>0 (Oversold)</span>
                      <span>30</span>
                      <span>70</span>
                      <span>100 (Overbought)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    {indicatorData.indicators.rsi?.interpretation}
                  </p>
                </div>

                {/* MACD Card */}
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-base text-white">MACD (12, 26, 9)</h4>
                      <p className="text-xs text-slate-400">Trend-following momentum indicator</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                      indicatorData.indicators.macd?.status === 'BULLISH'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {indicatorData.indicators.macd?.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center font-mono">
                      <div className="text-[10px] text-slate-400">MACD Line</div>
                      <div className="text-base font-bold text-white mt-1">{indicatorData.indicators.macd?.macd_line?.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center font-mono">
                      <div className="text-[10px] text-slate-400">Signal Line</div>
                      <div className="text-base font-bold text-white mt-1">{indicatorData.indicators.macd?.signal_line?.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center font-mono">
                      <div className="text-[10px] text-slate-400">Histogram</div>
                      <div className={`text-base font-bold mt-1 ${indicatorData.indicators.macd?.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {indicatorData.indicators.macd?.histogram?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Moving Averages Card */}
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 md:col-span-2">
                  <h4 className="font-bold text-base text-white mb-4">Moving Average Trends (SMA 50 &amp; SMA 200)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">50-Day Simple Moving Average</span>
                        <span className="text-xs font-mono text-indigo-400 font-bold">{indicatorData.indicators.sma50?.trend}</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-white mt-2">
                        ${indicatorData.indicators.sma50?.value ? indicatorData.indicators.sma50.value.toFixed(2) : 'N/A'}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">200-Day Simple Moving Average</span>
                        <span className="text-xs font-mono text-indigo-400 font-bold">{indicatorData.indicators.sma200?.trend}</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-white mt-2">
                        ${indicatorData.indicators.sma200?.value ? indicatorData.indicators.sma200.value.toFixed(2) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">Loading indicators...</div>
            )}
          </div>
        )}

        {/* Tab 4: Strategy Backtester */}
        {activeTab === 'backtest' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">Algorithmic Strategy Backtester</h3>
                  <p className="text-xs text-slate-400">Simulate algorithmic trade execution against historical MAANG price series</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedStock}
                    onChange={(e) => setSelectedStock(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {MAANG_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    value={backtestStrategy}
                    onChange={(e) => setBacktestStrategy(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SMA_CROSSOVER">SMA Crossover (10 / 30 MA)</option>
                    <option value="RSI_THRESHOLDS">RSI Thresholds (35 / 65)</option>
                    <option value="MACD_CROSSOVER">MACD Momentum Crossover</option>
                  </select>

                  <button
                    onClick={runBacktestAction}
                    disabled={backtestLoading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{backtestLoading ? 'Simulating...' : 'Run Simulation'}</span>
                  </button>
                </div>
              </div>

              {backtestResult ? (
                <div className="mt-6 space-y-6">
                  {/* Performance stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Initial Capital</span>
                      <p className="text-xl font-bold text-white mt-1">${backtestResult.initial_capital?.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Final Portfolio Value</span>
                      <p className="text-xl font-bold text-white mt-1">${backtestResult.final_capital?.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Total Return</span>
                      <p className={`text-xl font-bold mt-1 ${backtestResult.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {backtestResult.total_return_pct >= 0 ? '+' : ''}{backtestResult.total_return_pct}%
                      </p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Win Rate / Trades</span>
                      <p className="text-xl font-bold text-white mt-1">{backtestResult.win_rate_pct}% ({backtestResult.total_trades})</p>
                    </div>
                  </div>

                  {/* Trades log */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3">Executed Trade Log (Latest {backtestResult.trades?.length || 0})</h4>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs font-mono text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Execution Price</th>
                            <th className="py-2.5 px-3">Shares</th>
                            <th className="py-2.5 px-3">P&amp;L</th>
                            <th className="py-2.5 px-3">Trigger Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {backtestResult.trades?.map((t: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 text-slate-400">{t.date}</td>
                              <td className="py-2 px-3 font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="py-2 px-3">${t.price?.toFixed(2)}</td>
                              <td className="py-2 px-3">{t.shares}</td>
                              <td className={`py-2 px-3 font-bold ${
                                t.pnl == null ? 'text-slate-500' : t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '--'}
                              </td>
                              <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-xs">{t.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Select a strategy and click &quot;Run Simulation&quot; to test performance.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Portfolio Allocation */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
              <div className="pb-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">MAANG Portfolio Capital Allocator</h3>
                  <p className="text-xs text-slate-400">Calculates balanced weights, target capital distribution, and share sizing for a $10,000 base capital</p>
                </div>

                <button
                  onClick={runAllocationAction}
                  disabled={allocLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  <PieIcon className="w-3.5 h-3.5" />
                  <span>{allocLoading ? 'Computing...' : 'Calculate Allocation'}</span>
                </button>
              </div>

              {/* Selector for 2-5 stocks */}
              <div className="mt-6">
                <span className="text-xs text-slate-400 font-semibold block mb-2">Select 2 to 5 equities to include in portfolio:</span>
                <div className="flex flex-wrap gap-2">
                  {MAANG_SYMBOLS.map((sym) => {
                    const included = allocSymbols.includes(sym);
                    return (
                      <button
                        key={sym}
                        onClick={() => {
                          if (included) {
                            if (allocSymbols.length > 2) {
                              setAllocSymbols(allocSymbols.filter(s => s !== sym));
                            }
                          } else {
                            if (allocSymbols.length < 5) {
                              setAllocSymbols([...allocSymbols, sym]);
                            }
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                          included
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white'
                        }`}
                      >
                        {sym} {included && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {allocResult ? (
                <div className="mt-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Base Capital</span>
                      <p className="text-2xl font-bold text-white mt-1">${allocResult.base_capital?.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Total Invested</span>
                      <p className="text-2xl font-bold text-indigo-400 mt-1">${allocResult.total_invested?.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Cash Reserve</span>
                      <p className="text-2xl font-bold text-emerald-400 mt-1">${allocResult.cash_reserve?.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Allocation table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Symbol</th>
                          <th className="py-2.5 px-3">Current Price</th>
                          <th className="py-2.5 px-3">Target Weight</th>
                          <th className="py-2.5 px-3">Target Capital</th>
                          <th className="py-2.5 px-3">Recommended Shares</th>
                          <th className="py-2.5 px-3">Invested Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {allocResult.portfolio_allocation?.map((item: any) => (
                          <tr key={item.symbol} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-bold text-white">{item.symbol}</td>
                            <td className="py-2.5 px-3">${item.current_price?.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-indigo-400 font-bold">{item.target_weight_percent}%</td>
                            <td className="py-2.5 px-3">${item.recommended_allocation_amount?.toFixed(2)}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-400">{item.recommended_shares} shares</td>
                            <td className="py-2.5 px-3">${item.allocated_value?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Click &quot;Calculate Allocation&quot; to compute portfolio position weights.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: MCP Server Sandbox & Inspector */}
        {activeTab === 'mcp' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Streamable HTTP MCP Server Explorer</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      RFC 2025-11-25
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test live JSON-RPC requests against <code className="text-indigo-300 font-mono">/api/mcp</code> directly from this sandbox
                  </p>
                </div>

                <button
                  onClick={executeMcpRequest}
                  disabled={mcpLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition shadow-lg shadow-indigo-600/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{mcpLoading ? 'Dispatching MCP RPC...' : 'Execute Request'}</span>
                </button>
              </div>

              {/* RPC Builder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">JSON-RPC Method</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMcpMethod('tools/list')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-semibold transition border ${
                          mcpMethod === 'tools/list'
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        tools/list
                      </button>
                      <button
                        onClick={() => setMcpMethod('tools/call')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-semibold transition border ${
                          mcpMethod === 'tools/call'
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        tools/call
                      </button>
                    </div>
                  </div>

                  {mcpMethod === 'tools/call' && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">Registered Tool</label>
                        <select
                          value={mcpSelectedTool}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMcpSelectedTool(val);
                            if (val === 'af_pf_alloc') {
                              setMcpToolArgs('{\n  "symbol1": "AAPL",\n  "symbol2": "GOOGL",\n  "symbol3": "MSFT"\n}');
                            } else if (val === 'af_get_stock_history') {
                              setMcpToolArgs('{\n  "symbol": "AAPL",\n  "timeframe": "1mo"\n}');
                            } else if (val === 'af_maang_indicators') {
                              setMcpToolArgs('{\n  "symbol": "META",\n  "indicator": "ALL"\n}');
                            } else if (val === 'af_maang_backtest') {
                              setMcpToolArgs('{\n  "symbol": "AAPL",\n  "strategy": "SMA_CROSSOVER"\n}');
                            } else if (val === 'af_get_maang_overview') {
                              setMcpToolArgs('{}');
                            } else {
                              setMcpToolArgs('{\n  "symbol": "AAPL"\n}');
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="af_get_stock_quote">af_get_stock_quote</option>
                          <option value="af_get_stock_history">af_get_stock_history</option>
                          <option value="af_get_company_profile">af_get_company_profile</option>
                          <option value="af_get_maang_overview">af_get_maang_overview</option>
                          <option value="af_maang_prices">af_maang_prices</option>
                          <option value="af_maang_indicators">af_maang_indicators</option>
                          <option value="af_maang_backtest">af_maang_backtest</option>
                          <option value="af_pf_alloc">af_pf_alloc</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tool Arguments (JSON)</label>
                        <textarea
                          rows={6}
                          value={mcpToolArgs}
                          onChange={(e) => setMcpToolArgs(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Registered Tools Reference Card */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                    <span className="text-xs font-bold text-slate-300 block mb-2">Available MCP Tools (8):</span>
                    <ul className="text-[11px] text-slate-400 font-mono space-y-1">
                      <li>• <span className="text-indigo-300">af_pf_alloc</span> (symbol1, symbol2, ...)</li>
                      <li>• <span className="text-indigo-300">af_get_stock_quote</span> (symbol)</li>
                      <li>• <span className="text-indigo-300">af_get_stock_history</span> (symbol, timeframe)</li>
                      <li>• <span className="text-indigo-300">af_get_company_profile</span> (symbol)</li>
                      <li>• <span className="text-indigo-300">af_get_maang_overview</span> ()</li>
                      <li>• <span className="text-indigo-300">af_maang_prices</span> (symbol)</li>
                      <li>• <span className="text-indigo-300">af_maang_indicators</span> (symbol, indicator)</li>
                      <li>• <span className="text-indigo-300">af_maang_backtest</span> (symbol, strategy)</li>
                    </ul>
                  </div>
                </div>

                {/* Response Viewer */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Raw JSON-RPC Response</label>
                    <span className="text-[10px] text-slate-500 font-mono">POST /api/mcp</span>
                  </div>
                  <div className="h-[380px] bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-y-auto font-mono text-xs">
                    {mcpLoading ? (
                      <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Sending Streamable HTTP request...</span>
                      </div>
                    ) : mcpResponse ? (
                      <pre className="text-emerald-400 whitespace-pre-wrap">
                        {JSON.stringify(mcpResponse, null, 2)}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600 text-center px-6">
                        Click &quot;Execute Request&quot; above to query the MCP server.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
        MCP Team 6 • Streamable HTTP Protocol 2025-11-25 • Upstream Market Quotes via Yahoo Finance
      </footer>
    </div>
  );
}
