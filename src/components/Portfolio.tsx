import { useUser } from "../context/UserContext";
import { useEffect, useState, type CSSProperties } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useTickers } from "../hooks/useTickers";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type PortfolioItem = {
  symbol: string;
  quantity: number;
};

export function Portfolio({ refreshSignal }: { refreshSignal: number }) {
  const user = useUser();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { tickers, loading: loadingTickers } = useTickers();

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

  async function fetchPortfolio() {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      setPortfolio(data.portfolio || []);
      setCash(data.cash || 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, refreshSignal]);

  if (loading || loadingTickers) return <div className="my-6 p-4 text-center text-gray-700 dark:text-gray-300">Loading portfolio...</div>;

  const investedValue = portfolio.reduce((sum, p) => { 
      const t = tickers.find((t) => t.symbol === p.symbol);
      const purchasePrice = t?.history?.[0] ?? t?.current ?? 0;
      return sum + (purchasePrice * p.quantity);
    }, 0);

  const currentValue = portfolio.reduce((sum, p) => { 
    const t = tickers.find((t) => t.symbol === p.symbol);
    return sum + ((t?.current ?? 0) * p.quantity);
  }, 0);

  const totalDiff = currentValue - investedValue;
  const totalPercent = investedValue !== 0 
    ? ((totalDiff / investedValue) * 100).toFixed(2)
    : "0.00";

  const historyLength = tickers.length > 0 && tickers[0].history && tickers[0].history.length > 0 
    ? tickers[0].history.length 
    : 0;
  
  let chartData;
  if (historyLength > 0 && portfolio.length > 0) {
    const portfolioHistoricalValues = Array(historyLength).fill(0).map((_, idx) => {
      return portfolio.reduce((sum, pItem) => {
        const tickerData = tickers.find((t) => t.symbol === pItem.symbol);
        if (tickerData && tickerData.history && typeof tickerData.history[idx] !== "undefined" && !isNaN(tickerData.history[idx])) {
          return sum + tickerData.history[idx] * pItem.quantity;
        }
        return sum; 
      }, 0);
    });
    chartData = portfolioHistoricalValues.map((val, idx) => ({
      name: `T-${historyLength - 1 - idx}`,
      value: val,
    }));
  } else if (portfolio.length > 0) {
    chartData = [
      { name: 'Invested', value: investedValue },
      { name: 'Current', value: currentValue }
    ];
  } else {
    chartData = [{ name: 'Start', value: 0 }, { name: 'Now', value: 0 }]; 
  }
  
  // console.log("Portfolio chartData (antes de render):", JSON.stringify(chartData)); // Mantener para depuración

  const yValues = chartData.map(d => d.value).filter(v => typeof v === 'number' && !isNaN(v));
  let yMinPortfolio = yValues.length > 0 ? Math.min(...yValues) : 0;
  let yMaxPortfolio = yValues.length > 0 ? Math.max(...yValues) : 1;

  if (isNaN(yMinPortfolio)) yMinPortfolio = 0;
  if (isNaN(yMaxPortfolio)) yMaxPortfolio = 1; 

  const paddingPercentagePortfolio = 0.1;
  const rangePortfolio = yMaxPortfolio - yMinPortfolio;

  if (rangePortfolio === 0) {
    yMinPortfolio = Math.max(0, yMinPortfolio - Math.abs(yMinPortfolio * paddingPercentagePortfolio || 0.1));
    yMaxPortfolio = yMaxPortfolio + Math.abs(yMaxPortfolio * paddingPercentagePortfolio || 0.1);
     if (yMinPortfolio === yMaxPortfolio) { 
        yMaxPortfolio = yMinPortfolio + Math.max(1, Math.abs(yMinPortfolio * 0.2) || 1); 
    }
  } else {
    const paddingValuePortfolio = rangePortfolio * paddingPercentagePortfolio;
    yMinPortfolio = Math.max(0, yMinPortfolio - paddingValuePortfolio); 
    yMaxPortfolio = yMaxPortfolio + paddingValuePortfolio;
  }
   if (yValues.length === 0 && cash > 0 ) {
      yMinPortfolio = 0;
      yMaxPortfolio = cash * 0.1 || 1;
   } else if (yValues.length === 0 && cash === 0){ 
      yMinPortfolio = 0;
      yMaxPortfolio = 1; 
   }

  // console.log(`Portfolio Y-Axis Domain: [${yMinPortfolio}, ${yMaxPortfolio}]`); // Mantener para depuración

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

  // Condición para mostrar placeholder si no hay datos significativos para graficar
  const showChartPlaceholder = chartData.length <= 1 && chartData.every(d => d.value === 0) && currentValue === 0 && investedValue === 0 && portfolio.length === 0;

  if (showChartPlaceholder) { 
     return (
      <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg text-gray-800 dark:text-gray-100">
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Portfolio Evolution</h2>
        <div className="mb-4 text-sm space-y-1">
            <div><b className="font-semibold text-gray-700 dark:text-gray-200">Cash:</b> <span className="font-mono">${cash.toFixed(2)}</span></div>
            <div><b className="font-semibold text-gray-700 dark:text-gray-200">Portfolio Value:</b> <span className="font-mono">${currentValue.toFixed(2)}</span></div>
            <div><b className="font-semibold text-gray-700 dark:text-gray-200">Amount Invested:</b> <span className="font-mono">${investedValue.toFixed(2)}</span></div>
            <div><b className="font-semibold text-gray-700 dark:text-gray-200">Gain/Loss:</b> <span className={`${totalDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} font-medium`}>${totalDiff.toFixed(2)} ({totalPercent}%)</span></div>
        </div>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm h-[220px] flex items-center justify-center">
          No portfolio history to display chart.
        </div>
        {portfolio.length === 0 && ( <div className="text-gray-500 dark:text-gray-400 mt-3 text-sm text-center">Your portfolio is empty. Buy some stocks from the market!</div> )}
      </div>
    );
  }

  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg text-gray-800 dark:text-gray-100">
      <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Portfolio Evolution</h2>
      <div className="mb-4 text-sm space-y-1">
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Cash:</b> <span className="font-mono">${cash.toFixed(2)}</span></div>
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Portfolio Value:</b> <span className="font-mono">${currentValue.toFixed(2)}</span></div>
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Amount Invested:</b> <span className="font-mono">${investedValue.toFixed(2)}</span></div>
        <div><b className="font-semibold text-gray-700 dark:text-gray-200">Gain/Loss:</b> <span className={`${totalDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} font-medium`}>${totalDiff.toFixed(2)} ({totalPercent}%)</span></div>
      </div>
      {/* CAMBIO PRINCIPAL: Pasar LineChart directamente como hijo de ResponsiveContainer */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -25, bottom: 5 }}>
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
            tickFormatter={(tick) => `$${Number(tick).toLocaleString()}`}
            tick={{ fontSize: 10, fill: themeColors.axis }}
            domain={[yMinPortfolio, yMaxPortfolio]}
            allowDataOverflow={true} 
            axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
            tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value: number, _name: string, _props: any) => [`$${Number(value).toFixed(2)}`, "Value"]}
            labelFormatter={(label) => chartData.length > 2 || historyLength > 0 ? `Time: ${label}` : label}
            labelStyle={tooltipLabelStyle} 
            itemStyle={tooltipItemStyle}
            cursor={{ stroke: themeColors.axis, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={themeColors.line} 
            strokeWidth={2.5}
            dot={chartData.length < 15 ? { r: 3, fill: themeColors.line, strokeWidth: 0 } : false}
            activeDot={{ r: 6, stroke: themeColors.activeDotStroke, strokeWidth: 2, fill: themeColors.line }}
            isAnimationActive={false} // Mantener desactivada para depurar error de <rect>
          />
        </LineChart>
      </ResponsiveContainer>
      {portfolio.length === 0 && currentValue === 0 && (
        <div className="text-gray-500 dark:text-gray-400 mt-3 text-sm text-center">Your portfolio is empty. Buy some stocks from the market!</div>
      )}
    </div>
  );
}