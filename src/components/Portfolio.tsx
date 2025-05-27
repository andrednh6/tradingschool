import { useUser } from "../context/UserContext"; // Assuming UserContext provides UserData
import type { UserData } from "../hooks/useAuth"; // Import UserData directly
import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useTickers } from "../hooks/useTickers";
import type { Ticker } from "../hooks/useTickers";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { sellStock } from "../lib/tradingActions";
import { useToast } from '../hooks/useToast';

// Local type for portfolio items, remains useful
type PortfolioItem = {
  symbol: string;
  quantity: number;
  name?: string;
  sector?: string;
};

// UserWithLevel type is removed, UserData from useAuth will be used.

export function Portfolio({ refreshSignal, onTransaction }: { refreshSignal: number, onTransaction: () => void }) {
  // Use UserData from useAuth, assuming useUser() from context provides this type.
  // The cast might still be needed if useUser() hook itself is not generically typed
  // or doesn't directly return UserData | null.
  // For a cleaner approach, UserContext should be aware of UserData type.
  const user = useUser() as UserData | null;

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { tickers, loading: loadingTickers } = useTickers();
  const { message: toastMessageToDisplay, showToast: showToastFunc } = useToast();

  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setCurrentTheme(mediaQuery.matches ? 'dark' : 'light');
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const themeColors = {
    axis: currentTheme === 'dark' ? "#9ca3af" : "#6b7280",
    tooltipBg: currentTheme === 'dark' ? "rgb(55 65 81 / 0.95)" : "rgb(255 255 255 / 0.95)",
    tooltipBorder: currentTheme === 'dark' ? "rgb(75 85 99)" : "rgb(229 231 235)",
    line: "#10b981",
    activeDotStroke: currentTheme === 'dark' ? '#374151' : '#ffffff',
    grid: currentTheme === 'dark' ? "rgba(100, 116, 139, 0.2)" : "rgba(203, 213, 225, 0.5)"
  };

  const fetchPortfolio = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      setPortfolio(data.portfolio || []);
      setCash(data.cash || 0);
      // User level is now part of the 'user' object from 'useUser' if UserContext is set up correctly
    } else {
      setPortfolio([]);
      setCash(0);
    }
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => {
    fetchPortfolio();
  }, [user?.uid, refreshSignal, fetchPortfolio]);

  const handleSellStock = async (symbol: string, quantity: number) => {
    if (!user || !user.uid) {
      showToastFunc("User not found. Please log in again.");
      return;
    }
    const currentTicker = tickers.find(t => t.symbol === symbol);
    if (!currentTicker) {
      showToastFunc("Stock data not available. Cannot sell.");
      return;
    }

    const result = await sellStock({
      uid: user.uid,
      symbol,
      quantityToSell: quantity,
      price: currentTicker.current,
      showToastFunc,
    });

    if (result.success) {
      await fetchPortfolio();
      if (onTransaction) {
        onTransaction();
      }
    }
  };

  const portfolioWithDetails = portfolio.map(pItem => {
    const tickerInfo: Ticker | undefined = tickers.find(t => t.symbol === pItem.symbol);
    return {
      ...pItem,
      name: tickerInfo?.name || pItem.symbol,
      sector: tickerInfo?.sector || "N/A",
      currentPrice: tickerInfo?.current ?? 0,
      totalValue: (tickerInfo?.current ?? 0) * pItem.quantity,
    };
  });

  const investedValue = portfolioWithDetails.reduce((sum, p) => {
    const t = tickers.find((ticker: Ticker) => ticker.symbol === p.symbol);
    const purchasePrice = t?.history?.[0] ?? t?.current ?? 0;
    return sum + (purchasePrice * p.quantity);
  }, 0);

  const currentValue = portfolioWithDetails.reduce((sum, p) => sum + p.totalValue, 0);
  const totalDiff = currentValue - investedValue;
  const totalPercent = investedValue !== 0 ? ((totalDiff / investedValue) * 100).toFixed(2) : "0.00";

  const historyLength = tickers.length > 0 && tickers[0]?.history?.length > 0 ? tickers[0].history.length : 0;

  let chartData: { name: string; value: number }[] = [];
  if (historyLength > 0 && portfolio.length > 0) {
    chartData = Array(historyLength).fill(null).map((_, idx) => {
      const valueAtTimeIndex = portfolio.reduce((sum, pItem) => {
        const tickerData = tickers.find((t: Ticker) => t.symbol === pItem.symbol);
        if (tickerData?.history && typeof tickerData.history[idx] === 'number') {
          return sum + tickerData.history[idx] * pItem.quantity;
        }
        return sum;
      }, 0);
      return { name: `T-${historyLength - 1 - idx}`, value: valueAtTimeIndex };
    });
  } else if (currentValue > 0 || investedValue > 0) {
    chartData = [
      { name: 'Invested', value: investedValue },
      { name: 'Current', value: currentValue }
    ];
  } else {
    chartData = [{ name: 'Start', value: 0 }, { name: 'Now', value: 0 }];
  }

  const yValues = chartData.map(d => d.value).filter(v => typeof v === 'number' && !isNaN(v));
  let yMinPortfolio = yValues.length > 0 ? Math.min(...yValues) : 0;
  let yMaxPortfolio = yValues.length > 0 ? Math.max(...yValues) : 1;

  if (yMinPortfolio === yMaxPortfolio) {
      yMinPortfolio = Math.max(0, yMinPortfolio - Math.abs(yMinPortfolio * 0.1 || 1));
      yMaxPortfolio = yMaxPortfolio + Math.abs(yMaxPortfolio * 0.1 || 1);
      if (yMinPortfolio === yMaxPortfolio) yMaxPortfolio = yMinPortfolio + 1;
  } else {
      const range = yMaxPortfolio - yMinPortfolio;
      yMinPortfolio = Math.max(0, yMinPortfolio - range * 0.1);
      yMaxPortfolio = yMaxPortfolio + range * 0.1;
  }
  if (yValues.length === 0 && cash > 0) {
    yMinPortfolio = 0;
    yMaxPortfolio = cash * 1.1;
  } else if (yValues.length === 0 && cash === 0) {
    yMinPortfolio = 0;
    yMaxPortfolio = 100;
  }

  const tooltipContentStyle: CSSProperties = {
    backgroundColor: themeColors.tooltipBg,
    borderColor: themeColors.tooltipBorder,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '8px 12px'
  };
  const tooltipLabelStyle: CSSProperties = {
    color: themeColors.axis,
    fontWeight: 'bold',
    marginBottom: '4px',
    fontSize: '0.8rem'
  };
  const tooltipItemStyle: CSSProperties = {
    color: themeColors.line
  };

  const showChartPlaceholderLogic = chartData.length <= 1 && chartData.every(d => d.value === 0) && currentValue === 0 && investedValue === 0 && portfolio.length === 0;

  if (loading || loadingTickers) {
    return <div className="my-6 p-4 text-center text-gray-700 dark:text-gray-300">Loading portfolio...</div>;
  }

  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg text-gray-800 dark:text-gray-100 relative">
      {toastMessageToDisplay && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.375rem',
            backgroundColor: currentTheme === 'dark' ? 'rgb(31 41 55)' : 'rgb(17 24 39)',
            color: 'white',
            zIndex: 1050,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            minWidth: '200px',
          }}
        >
          {toastMessageToDisplay}
        </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Portfolio Evolution</h2>
        {/* Ensure user and user.level are checked before accessing user.level */}
        {user && typeof user.level === 'number' && (
          <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            Player Level: {user.level}
          </div>
        )}
      </div>

      {user && typeof user.level === 'number' && user.level >= 2 && (
        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 rounded-md text-sm text-indigo-700 dark:text-indigo-200">
          🎉 <strong>Level 2 Perk Unlocked!</strong> You now have access to "Advanced Market Insights" (Coming Soon!). Keep trading to unlock more!
        </div>
      )}

      <div className="mb-4 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Cash:</b> <span className="font-mono float-right">${cash.toFixed(2)}</span></div>
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Portfolio Value:</b> <span className="font-mono float-right">${currentValue.toFixed(2)}</span></div>
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Est. Invested:</b> <span className="font-mono float-right">${investedValue.toFixed(2)}</span></div>
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Est. Gain/Loss:</b> <span className={`${totalDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} font-medium float-right`}>${totalDiff.toFixed(2)} ({totalPercent}%)</span></div>
      </div>

      {showChartPlaceholderLogic ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm h-[220px] flex items-center justify-center border-t border-gray-200 dark:border-gray-600 mt-4">
          No portfolio history to display chart.
        </div>
      ) : (
        <div className="h-[220px] border-t border-gray-200 dark:border-gray-600 mt-4 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
              <XAxis dataKey="name" stroke={themeColors.axis} tick={{ fontSize: 10, fill: themeColors.axis }} axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }} tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }} />
              <YAxis stroke={themeColors.axis} tickFormatter={(tick) => `$${Number(tick).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`} tick={{ fontSize: 10, fill: themeColors.axis }} domain={[yMinPortfolio, yMaxPortfolio]} allowDataOverflow={true} axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }} tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }} />
              <Tooltip contentStyle={tooltipContentStyle} formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Value"]} labelFormatter={(label) => chartData.length > 2 || historyLength > 0 ? `Time: ${label}` : label} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ stroke: themeColors.axis, strokeDasharray: '3 3', strokeOpacity: 0.5 }} />
              <Line type="monotone" dataKey="value" stroke={themeColors.line} strokeWidth={2} dot={chartData.length < 25 ? { r: 3, fill: themeColors.line, strokeWidth: 0 } : false} activeDot={{ r: 5, stroke: themeColors.activeDotStroke, strokeWidth: 1, fill: themeColors.line }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {portfolioWithDetails.length === 0 && currentValue === 0 && (
        <div className="text-gray-500 dark:text-gray-400 mt-3 text-sm text-center">Your portfolio is empty. Buy some stocks from the market!</div>
      )}

      {portfolioWithDetails.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Your Holdings</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {portfolioWithDetails.map((item) => (
              <div key={item.symbol} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex-grow">
                  <div className="font-bold text-base text-gray-800 dark:text-gray-100">{item.name} ({item.symbol})</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Sector: {item.sector}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    Qty: <span className="font-medium">{item.quantity}</span> | Value: <span className="font-medium">${(item.totalValue).toFixed(2)}</span> (@ ${item.currentPrice.toFixed(2)})
                  </div>
                </div>
                <div className="flex space-x-2 mt-2 sm:mt-0 sm:flex-shrink-0">
                  <button
                    onClick={() => {
                      const quantity = parseInt(prompt(`How many units of ${item.symbol} to sell? (You have ${item.quantity})`, "1") || "0");
                      if (quantity > 0 && quantity <= item.quantity) {
                        handleSellStock(item.symbol, quantity);
                      } else if (quantity > item.quantity) {
                        showToastFunc(`You only have ${item.quantity} units of ${item.symbol}.`);
                      } else if (quantity !== 0) {
                        showToastFunc("Invalid quantity entered.");
                      }
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