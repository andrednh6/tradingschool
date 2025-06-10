import { useState, useEffect } from 'react';
import type { SimulatedMarketTicker, ShowToastFunction } from '../types/simulation';
import { useToast } from '../hooks/useToast';
import {useSimulationSession} from '../hooks/useSimulationSession';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"; 
//import {Legend} from "recharts" //

// Helper function to interpret fundamental data
const getOutlook = (trend: number): { text: string; color: string; } => {
  if (trend > 0.0015) return { text: 'Strong Positive', color: 'text-green-500 dark:text-green-400' };
  if (trend > 0) return { text: 'Positive', color: 'text-green-600 dark:text-green-500' };
  if (trend === 0) return { text: 'Neutral', color: 'text-gray-500 dark:text-gray-400' };
  return { text: 'Negative', color: 'text-red-500 dark:text-red-400' };
};
const getRiskProfile = (volatility: number): { text: string; color: string; } => {
  if (volatility > 0.035) return { text: 'High', color: 'text-red-600 dark:text-red-500' };
  if (volatility > 0.02) return { text: 'Medium', color: 'text-yellow-600 dark:text-yellow-500' };
  return { text: 'Low', color: 'text-green-600 dark:text-green-500' };
};

export function MarketList() {
  const { sessionData, recordBuyInSession, isLoadingSession } = useSimulationSession();
  const { showToast } = useToast();
  const [selectedTicker, setSelectedTicker] = useState<SimulatedMarketTicker | null>(null);
  const [buyQuantityInput, setBuyQuantityInput] = useState<string>("1");

  // Theme state for chart
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () =>
      setCurrentTheme(mediaQuery.matches ? "dark" : "light");
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const themeColors = {
    axis: currentTheme === "dark" ? "#9ca3af" : "#6b7280",
    tooltipBg: currentTheme === "dark" ? "rgb(55 65 81 / 0.95)" : "rgb(255 255 255 / 0.95)",
    tooltipBorder: currentTheme === "dark" ? "rgb(75 85 99)" : "rgb(229 231 235)",
    line: "#8b5cf6", // Violet for individual stock chart
    grid: currentTheme === "dark" ? "rgba(100, 116, 139, 0.15)" : "rgba(203, 213, 225, 0.4)",
  };


  useEffect(() => {
    // When market data changes (e.g., after advancing a week), update the selected ticker's data
    if (selectedTicker && sessionData?.marketTickers) {
      const updatedSelectedTicker = sessionData.marketTickers.find(t => t.symbol === selectedTicker.symbol);
      if (updatedSelectedTicker) {
        setSelectedTicker(updatedSelectedTicker);
      } else {
        setSelectedTicker(null); // Ticker might no longer exist
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.marketTickers]); // Depend only on marketTickers part of sessionData for this effect

  const handleSelectTicker = (ticker: SimulatedMarketTicker) => {
    setSelectedTicker(ticker);
    setBuyQuantityInput("1"); 
  };

  const handleBuyStockInternal = async () => {
    const quantity = parseInt(buyQuantityInput, 10);

    if (!selectedTicker || isNaN(quantity) || quantity <= 0) {
      showToast("Please select a stock and enter a valid positive quantity.");
      return;
    }
    if (!sessionData?.isActive) {
      showToast("No active simulation session to buy stock.");
      return;
    }
    if (sessionData.cash < selectedTicker.currentPrice * quantity) {
        showToast("Insufficient cash for this purchase.");
        return;
    }

    await recordBuyInSession({
      symbol: selectedTicker.symbol, name: selectedTicker.name, sector: selectedTicker.sector,
      quantity: quantity, showToastFunc: showToast as ShowToastFunction,
    });
    setBuyQuantityInput("1");
  };
  
  const selectedTickerChartData = selectedTicker?.history.map((price, index) => ({
    week: `W${index}`,
    price: price,
  })) || [];

  // Y-Axis domain calculation for selected ticker chart
  let yMinTicker = 0, yMaxTicker = 100; 
  if (selectedTicker && selectedTickerChartData.length > 0) {
      const yValues = selectedTickerChartData.map(d => d.price);
      yMinTicker = Math.min(...yValues);
      yMaxTicker = Math.max(...yValues);
      if (isNaN(yMinTicker) || !isFinite(yMinTicker)) yMinTicker = 0;
      if (isNaN(yMaxTicker) || !isFinite(yMaxTicker)) yMaxTicker = selectedTicker.currentPrice * 1.2 || 100;
      const range = yMaxTicker - yMinTicker;
      const padding = range === 0 ? (yMinTicker === 0 ? 10 : Math.abs(yMinTicker * 0.1)) : range * 0.1;
      yMinTicker = Math.max(0, yMinTicker - padding);
      yMaxTicker = yMaxTicker + padding;
      if (yMinTicker === yMaxTicker) {
          yMaxTicker = yMinTicker + (yMinTicker === 0 ? 10 : Math.abs(yMinTicker * 0.2) || 10);
      }
  }

  if (isLoadingSession) return <div className="my-4 p-4 text-center">Loading market...</div>;
  if (!sessionData || !sessionData.isActive || !sessionData.marketTickers || sessionData.marketTickers.length === 0) {
    return <div className="my-4 p-4 text-center text-gray-500 dark:text-gray-400">Market data not available. Please start a new session.</div>;
  }
  
 const { marketTickers, cash: sessionCash, currentLevel } = sessionData;

  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Simulation Market</h2>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
           {/* Ticker List */}
        <div className="space-y-2 pr-2 max-h-96 md:max-h-[calc(100vh-25rem)] overflow-y-auto custom-scrollbar">
          {marketTickers.map((ticker) => (
            <div
              key={ticker.symbol}
              onClick={() => handleSelectTicker(ticker)}
              className={`p-3 rounded-md cursor-pointer transition-all border
                ${selectedTicker?.symbol === ticker.symbol 
                  ? 'bg-indigo-100 dark:bg-indigo-900/70 border-indigo-500 ring-2 ring-indigo-500' 
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/70'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{ticker.name} ({ticker.symbol})</span>
                <span className="font-mono text-sm text-green-600 dark:text-green-400">${ticker.currentPrice.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{ticker.sector}</div>
            </div>
          ))}
        </div>
        {/* Buy Panel / Selected Ticker Details */}
        <div className="p-1">
          {selectedTicker ? (
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner">
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{selectedTicker.name} ({selectedTicker.symbol})</h3>
              <p className="text-xs mb-1 text-gray-600 dark:text-gray-400"><span className="font-semibold">Sector:</span> {selectedTicker.sector}</p>
              <p className="text-sm mb-3"><span className="font-semibold">Current Price:</span> 
                <span className="font-mono ml-1 text-green-600 dark:text-green-400">${selectedTicker.currentPrice.toFixed(2)}</span>
              </p>
              
              <div className="my-3 h-40 bg-gray-200 dark:bg-gray-700/50 rounded p-2">
                {selectedTickerChartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedTickerChartData} margin={{ top: 5, right: 20, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                      <XAxis dataKey="week" stroke={themeColors.axis} tick={{ fontSize: 9, fill: themeColors.axis }} />
                      <YAxis 
                        stroke={themeColors.axis} 
                        tickFormatter={(tick) => `$${Number(tick).toFixed(0)}`}
                        tick={{ fontSize: 9, fill: themeColors.axis }}
                        domain={[yMinTicker, yMaxTicker]}
                        allowDataOverflow={true}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: themeColors.tooltipBg, borderColor: themeColors.tooltipBorder, borderRadius: '0.375rem', fontSize: '0.75rem' }}
                        labelStyle={{ color: themeColors.axis, fontWeight: 'bold', fontSize: '0.7rem' }}
                        itemStyle={{ color: themeColors.line }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                      />
                      <Line type="monotone" dataKey="price" stroke={themeColors.line} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                    Not enough price history to display chart.
                  </div>
                )}
              </div>
{/* Fundamental Insights - UNLOCKED AT LEVEL 3 */}
              {currentLevel >= 3 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/40 rounded-md text-sm">
                    <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Fundamental Insights</h4>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Company Outlook:</span>
                            <span className={`font-semibold ${getOutlook(selectedTicker.baseTrend).color}`}>{getOutlook(selectedTicker.baseTrend).text}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Volatility / Risk:</span>
                            <span className={`font-semibold ${getRiskProfile(selectedTicker.baseVolatility).color}`}>{getRiskProfile(selectedTicker.baseVolatility).text}</span>
                        </div>
                    </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="buyQuantityInput" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Buy:</label>
                  <input
                    type="text" 
                    id="buyQuantityInput"
                    name="buyQuantityInput"
                    value={buyQuantityInput}
                    onChange={(e) => {
                        const val = e.target.value;
                        // Allow empty or positive integers
                                          if (val === "" || /^[1-9]\d*$/.test(val)) {
                           if (parseInt(val, 10) > 9999) { setBuyQuantityInput("9999"); }
                           else { setBuyQuantityInput(val); }
                        }
                    }}
                    onBlur={(e) => {
                        if (e.target.value === "") { setBuyQuantityInput("1"); }
                    }}
                    className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <p className="text-sm font-semibold">
                  Estimated Cost: 
                  <span className="font-mono ml-1">
                    ${(selectedTicker.currentPrice * (parseInt(buyQuantityInput, 10) || 0)).toFixed(2)}
                  </span>
                </p>
                <button
                  onClick={handleBuyStockInternal}
                  disabled={!sessionData?.isActive || sessionCash < selectedTicker.currentPrice * (parseInt(buyQuantityInput, 10) || 0) || (parseInt(buyQuantityInput, 10) || 0) < 1}
                  className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Buy {parseInt(buyQuantityInput, 10) || ""} {selectedTicker.symbol}
                </button>
                {sessionData?.isActive && sessionCash < selectedTicker.currentPrice * (parseInt(buyQuantityInput, 10) || 0) && (parseInt(buyQuantityInput,10) || 0) >=1 && (
                    <p className="text-xs text-red-500 dark:text-red-400 text-center mt-1">Insufficient cash.</p>
                )}
                 {(parseInt(buyQuantityInput, 10) || 0) < 1 && (
                    <p className="text-xs text-red-500 dark:text-red-400 text-center mt-1">Quantity must be at least 1.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center h-full flex flex-col justify-center items-center p-10 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.525 8.475l-4.5 4.5-1.875-1.875m0 0A2.25 2.25 0 105.25 12.75a2.25 2.25 0 001.875-1.875M19.5 12a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" /> {/* Changed icon */}
              </svg>
              <p className="text-sm">Select a stock from the list to view details and buy options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
