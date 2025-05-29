import { useEffect, useState, type CSSProperties } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
// Removed: import { useSimulationSession } from "../hooks/useSimulationSession";
import type { SimulationSessionData} from "../types/simulation";
import { useToast } from "../hooks/useToast"; // Still used for sell action feedback
//import type {ShowToastFunction} from "../types/simulation";

interface PortfolioProps {
  sessionData: SimulationSessionData | null;
  isLoadingSession: boolean;
  onSellStock: (params: { symbol: string; quantityToSell: number; /* price determined by hook */ }) => Promise<void>;
}

export function Portfolio({ sessionData, isLoadingSession, onSellStock }: PortfolioProps) {
  const { showToast } = useToast();

  useEffect(() => {
    console.log('[Portfolio.tsx] Props received. isLoadingSession:', isLoadingSession, 'sessionData:', sessionData);
  }, [sessionData, isLoadingSession]);

  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(() => {
    // ... (theme logic same as before) ...
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  });

  useEffect(() => {
    // ... (theme effect same as before) ...
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () =>
      setCurrentTheme(mediaQuery.matches ? "dark" : "light");
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const themeColors = { /* ... (same as before) ... */ 
    axis: currentTheme === "dark" ? "#9ca3af" : "#6b7280",
    tooltipBg: currentTheme === "dark" ? "rgb(55 65 81 / 0.95)" : "rgb(255 255 255 / 0.95)",
    tooltipBorder: currentTheme === "dark" ? "rgb(75 85 99)" : "rgb(229 231 235)",
    line: "#10b981",
    activeDotStroke: currentTheme === "dark" ? '#374151' : '#ffffff',
    grid: currentTheme === "dark" ? "rgba(100, 116, 139, 0.2)" : "rgba(203, 213, 225, 0.5)",
  };

  const handleSellStockInternal = async (symbol: string, quantity: number) => {
    await onSellStock({ symbol, quantityToSell: quantity });
  };

  if (isLoadingSession) {
    return (
      <div className="my-6 p-4 text-center text-gray-700 dark:text-gray-300">
        Loading simulation portfolio data...
      </div>
    );
  }

  if (!sessionData || !sessionData.isActive) {
    return (
      <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl text-gray-800 dark:text-gray-100">
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
          Simulation Portfolio
        </h2>
        <p className="text-center py-10 text-gray-500 dark:text-gray-400">
          No active simulation session. Please start a new guided session.
        </p>
      </div>
    );
  }

  const {
    cash,
    portfolio: localPortfolio,
    marketTickers,
    currentLevel,
    simulatedWeeksPassed,
  } = sessionData;
  
  console.log('[Portfolio.tsx] Rendering with PROPS: cash:', cash, 'localPortfolio:', localPortfolio, 'marketTickers:', marketTickers);

  // ... (ALL THE CALCULATION LOGIC for portfolioWithCurrentValues, currentStockValue, totalPortfolioValue,
  //      estimatedInvestedValue, stockPnL, stockPnLPercent, chartData, yMin/MaxPortfolio, etc.
  //      REMAINS EXACTLY THE SAME AS IN THE PREVIOUS `portfolio_tsx_simulation_refactor_v2` immersive,
  //      as it correctly uses the destructured `cash`, `localPortfolio`, `marketTickers` from `sessionData` prop)

  // For brevity, I'm not repeating all the calculation logic, but it should be identical
  // to the version in your immersive "portfolio_tsx_simulation_refactor_v2"
  // starting from: const portfolioWithCurrentValues = localPortfolio.map((item) => { ...
  // and ending before the final return statement.

  // --- PASTE THE CALCULATION LOGIC FROM `portfolio_tsx_simulation_refactor_v2` HERE ---
  const portfolioWithCurrentValues = localPortfolio.map((item) => {
    const marketData = marketTickers.find((t) => t.symbol === item.symbol);
    const currentPrice = marketData ? marketData.currentPrice : 0;
    return { ...item, currentPrice: currentPrice, totalValue: item.quantity * currentPrice, };
  });
  const currentStockValue = portfolioWithCurrentValues.reduce( (sum, item) => sum + item.totalValue, 0 );
  const totalPortfolioValue = cash + currentStockValue;
  const estimatedInvestedValue = localPortfolio.reduce((sum, pItem) => {
    const marketTicker = marketTickers.find((t) => t.symbol === pItem.symbol);
    const purchasePriceApproximation = marketTicker?.history?.[0] ?? marketTicker?.currentPrice ?? 0;
    return sum + purchasePriceApproximation * pItem.quantity;
  }, 0);
  const stockPnL = currentStockValue - estimatedInvestedValue;
  const stockPnLPercent = estimatedInvestedValue !== 0 ? ((stockPnL / estimatedInvestedValue) * 100).toFixed(2) : "0.00";
  let chartData: { name: string; value: number }[] = [];
  const maxHistoryLength = marketTickers.reduce( (maxLen, ticker) => Math.max(maxLen, ticker.history.length), 0 );
  if (maxHistoryLength > 0 && localPortfolio.length > 0) {
    for (let i = 0; i < maxHistoryLength; i++) {
      let portfolioStockValueAtWeek_i = 0;
      localPortfolio.forEach((ownedStock) => {
        const marketTicker = marketTickers.find( (t) => t.symbol === ownedStock.symbol );
        if (marketTicker && marketTicker.history[i] !== undefined) {
          portfolioStockValueAtWeek_i += ownedStock.quantity * marketTicker.history[i];
        }
      });
      chartData.push({ name: `W${i}`, value: portfolioStockValueAtWeek_i });
    }
  } else if (localPortfolio.length > 0) {
    chartData = [ { name: "Start", value: estimatedInvestedValue }, { name: "Now", value: currentStockValue }, ];
  } else {
    chartData = [{ name: "Start", value: 0 }];
  }
  if (chartData.length === 0 && cash > 0) {
      chartData = [{ name: 'Cash', value: 0 }];
  } else if (chartData.length === 0) {
      chartData = [{ name: 'Start', value: 0 }];
  }
  const yValues = chartData.map(d => d.value).filter(v => typeof v === 'number' && !isNaN(v));
  let yMinPortfolio = yValues.length > 0 ? Math.min(...yValues) : 0;
  let yMaxPortfolio = yValues.length > 0 ? Math.max(...yValues) : Math.max(100, cash * 0.1);
  if (isNaN(yMinPortfolio) || !isFinite(yMinPortfolio)) yMinPortfolio = 0;
  if (isNaN(yMaxPortfolio) || !isFinite(yMaxPortfolio)) yMaxPortfolio = Math.max(100, cash > 0 ? cash * 1.1 : 100);
  const paddingPercentagePortfolio = 0.1;
  const rangePortfolio = yMaxPortfolio - yMinPortfolio;
  if (rangePortfolio === 0) {
    const basePadding = yMinPortfolio === 0 ? 10 : Math.abs(yMinPortfolio * paddingPercentagePortfolio);
    yMinPortfolio = Math.max(0, yMinPortfolio - basePadding);
    yMaxPortfolio = yMaxPortfolio + basePadding;
    if (yMinPortfolio === yMaxPortfolio) yMaxPortfolio = yMinPortfolio + (yMinPortfolio === 0 ? 100 : Math.abs(yMinPortfolio * 0.2) || 10);
  } else {
    const paddingValuePortfolio = rangePortfolio * paddingPercentagePortfolio;
    yMinPortfolio = Math.max(0, yMinPortfolio - paddingValuePortfolio);
    yMaxPortfolio = yMaxPortfolio + paddingValuePortfolio;
  }
  if (yMinPortfolio === yMaxPortfolio) {
      yMaxPortfolio = yMinPortfolio + 100;
  }
  const tooltipContentStyle: CSSProperties = { backgroundColor: themeColors.tooltipBg, borderColor: themeColors.tooltipBorder, borderStyle: 'solid', borderWidth: '1px', borderRadius: '0.5rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px' };
  const tooltipLabelStyle: CSSProperties = { color: themeColors.axis, fontWeight: 'bold', marginBottom: '4px', fontSize: '0.8rem' };
  const tooltipItemStyle: CSSProperties = { color: themeColors.line };
  const showChartPlaceholder = chartData.length <= 1 && chartData.every(d => d.value === 0) && currentStockValue === 0 && localPortfolio.length === 0;
  // --- END OF PASTED CALCULATION LOGIC ---


  // JSX for rendering (identical to previous, uses calculated values)
  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Simulation Portfolio
        </h2>
        <div className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Level: {currentLevel} | Week: {simulatedWeeksPassed}
        </div>
      </div>

      {currentLevel >= 2 && (
        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 rounded-md text-sm text-indigo-700 dark:text-indigo-200">
          <p><strong>Level {currentLevel} Perk:</strong> Advanced Market Insights (Feature coming soon!).</p>
        </div>
      )}

      <div className="mb-4 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Cash:</b>
          <span className="font-mono float-right">${cash.toFixed(2)}</span>
        </div>
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Stock Value:</b>
          <span className="font-mono float-right">${currentStockValue.toFixed(2)}</span>
        </div>
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Total Value:</b>
          <span className="font-mono float-right">${totalPortfolioValue.toFixed(2)}</span>
        </div>
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Stock P&L (Est.):</b>
          <span
            className={`${
              stockPnL >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            } font-medium float-right`}
          >
            ${stockPnL.toFixed(2)} ({stockPnLPercent}%)
          </span>
        </div>
      </div>

      {showChartPlaceholder ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm h-[220px] flex items-center justify-center border-t border-gray-200 dark:border-gray-600 mt-4">
          No portfolio history to display chart. Buy some stocks to get started!
        </div>
      ) : (
        <div className="h-[220px] border-t border-gray-200 dark:border-gray-600 mt-4 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
              <XAxis
                dataKey="name"
                stroke={themeColors.axis}
                tick={{ fontSize: 10, fill: themeColors.axis }}
                axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
                tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
              />
              <YAxis
                stroke={themeColors.axis}
                tickFormatter={(tick) =>
                  `$${Number(tick).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}`
                }
                tick={{ fontSize: 10, fill: themeColors.axis }}
                domain={[yMinPortfolio, yMaxPortfolio]}
                allowDataOverflow={true}
                axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
                tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                formatter={(value: number | string) => [
                  `$${Number(value).toFixed(2)}`,
                  "Stock Value",
                ]}
                labelFormatter={(label: string) => {
                    const weekNum = label.startsWith('W') ? label.substring(1) : label;
                    return `Week ${weekNum}`;
                }}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                cursor={{
                  stroke: themeColors.axis,
                  strokeDasharray: "3 3",
                  strokeOpacity: 0.5,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={themeColors.line}
                strokeWidth={2}
                dot={
                  chartData.length < 25
                    ? { r: 3, fill: themeColors.line, strokeWidth: 0 }
                    : false
                }
                activeDot={{
                  r: 5,
                  stroke: themeColors.activeDotStroke,
                  strokeWidth: 1,
                  fill: themeColors.line,
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {localPortfolio.length === 0 && currentStockValue === 0 && (
        <div className="text-gray-500 dark:text-gray-400 mt-6 text-sm text-center">
          Your simulation portfolio is empty. Visit the Market to buy stocks!
        </div>
      )}

      {portfolioWithCurrentValues.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            Your Holdings (Simulation)
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {portfolioWithCurrentValues.map((item) => (
              <div
                key={item.symbol}
                className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg shadow-md flex flex-col sm:flex-row justify-between sm:items-center gap-2"
              >
                <div className="flex-grow">
                  <div className="font-bold text-base text-gray-800 dark:text-gray-100">
                    {item.name} ({item.symbol})
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Sector: {item.sector}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    Qty: <span className="font-medium">{item.quantity}</span> |
                    Value:{" "}
                    <span className="font-medium">
                      ${item.totalValue.toFixed(2)}
                    </span>{" "}
                    (@ ${item.currentPrice.toFixed(2)})
                  </div>
                </div>
                <div className="flex space-x-2 mt-2 sm:mt-0 sm:flex-shrink-0">
                  <button
                    onClick={() => {
                      const quantityStr = prompt(
                        `How many units of ${item.symbol} to sell? (You have ${item.quantity})`,
                        "1"
                      );
                      if (quantityStr === null) return; 

                      const quantityToSell = parseInt(quantityStr);
                      if (isNaN(quantityToSell) || quantityToSell <= 0) {
                        showToast("Please enter a valid positive quantity.");
                        return;
                      }
                      if (quantityToSell > item.quantity) {
                        showToast(
                          `You only have ${item.quantity} units of ${item.symbol} to sell.`
                        );
                        return;
                      }
                      handleSellStockInternal(item.symbol, quantityToSell);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 focus:ring-opacity-75 transition ease-in-out duration-150"
                  >
                    Sell
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
