import { useUser } from "../context/UserContext";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useTickers } from "../hooks/useTickers";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type PortfolioItem = {
  symbol: string;
  quantity: number;
};

// Helper para determinar si el modo oscuro está activo
const isDarkMode = () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

export function Portfolio({ refreshSignal }: { refreshSignal: number }) {
  const user = useUser();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { tickers, loading: loadingTickers } = useTickers();

  const [themeColor, setThemeColor] = useState(isDarkMode() ? "#9ca3af" : "#4b5563"); // For Recharts elements

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeColor(isDarkMode() ? "#9ca3af" : "#4b5563");
    });
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, []);

  async function fetchPortfolio() {
    if (!user?.uid) { // Asegurarse que user.uid exista
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
  }, [user?.uid, refreshSignal]); // Añadir user.uid como dependencia

  if (loading || loadingTickers) return <div className="my-6 p-4 text-center text-gray-700 dark:text-gray-300">Loading portfolio...</div>;

  const investedValue = portfolio.reduce((sum, p) => {
      const t = tickers.find((t) => t.symbol === p.symbol);
      return sum + ((t?.history?.[0] ?? t?.current ?? 0) * p.quantity);
    }, 0);

  const currentValue = portfolio.reduce((sum, p) => {
    const t = tickers.find((t) => t.symbol === p.symbol);
    return sum + ((t?.current ?? 0) * p.quantity);
  }, 0);

  const totalDiff = currentValue - investedValue;
  const totalPercent = investedValue
    ? ((totalDiff / investedValue) * 100).toFixed(2)
    : "0.00";

  const historyLength = tickers.length > 0 && tickers[0].history && tickers[0].history.length > 0 
    ? tickers[0].history.length 
    : 0;
  
  let chartData;

  if (historyLength > 0) {
    const portfolioHistory = Array(historyLength).fill(0).map((_, idx) => {
      return portfolio.reduce((sum, p) => {
        const t = tickers.find((t) => t.symbol === p.symbol);
        if (t && t.history && typeof t.history[idx] !== "undefined") {
          return sum + t.history[idx] * p.quantity;
        }
        // Si no hay historial para ese punto, podríamos intentar mantener el valor anterior o no sumar
        // Para simplificar, si no hay dato histórico, no se suma para ese ticker en ese punto.
        return sum; 
      }, 0);
    });
    chartData = portfolioHistory.map((val, idx) => ({
      name: `T-${historyLength - idx}`,
      value: val,
    }));
  } else {
    // Si no hay historial, mostrar al menos el valor invertido y el actual si hay portafolio
    // O un punto si el portafolio está vacío pero hay efectivo (aunque el gráfico sería de valor 0)
    if (portfolio.length > 0) {
      chartData = [
        { name: 'Invested', value: investedValue },
        { name: 'Current', value: currentValue }
      ];
    } else {
      chartData = [{ name: 'Start', value: 0 }]; // Gráfico plano en 0 si no hay nada
    }
  }


  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg text-gray-800 dark:text-gray-100">
      <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Portfolio Evolution</h2>
      <div className="mb-4 text-sm space-y-1">
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Cash:</b> <span className="font-mono">${cash.toFixed(2)}</span>
        </div>
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Portfolio Value:</b> <span className="font-mono">${currentValue.toFixed(2)}</span>
        </div>
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Amount Invested:</b> <span className="font-mono">${investedValue.toFixed(2)}</span>
        </div>
        <div>
          <b className="font-semibold text-gray-700 dark:text-gray-200">Gain/Loss:</b>{" "}
          <span className={`${totalDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} font-medium`}>
             ${totalDiff.toFixed(2)} ({totalPercent}%)
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -25, bottom: 5 }}>
          <XAxis 
            dataKey="name" 
            hide={chartData.length <= 2 && historyLength === 0} // Ocultar eje X si solo es invertido/actual o un punto
            stroke={themeColor} 
            tick={{ fontSize: 10 }} 
          />
          <YAxis 
            stroke={themeColor} 
            tickFormatter={(tick) => `$${Number(tick).toLocaleString()}`}
            tick={{ fontSize: 10 }}
            domain={['auto', 'auto']}
            width={currentValue > 0 || investedValue > 0 || cash > 0 ? undefined : 0} 
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: isDarkMode() ? 'rgb(55 65 81 / 0.9)' : 'rgb(255 255 255 / 0.9)',
              borderColor: isDarkMode() ? 'rgb(75 85 99)' : 'rgb(209 213 219)',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
            // Corregido: prefijar 'name' y 'props' con guion bajo si no se usan.
            formatter={(value: number, _name: string, _props: any) => [`$${Number(value).toFixed(2)}`, "Value"]}
            labelStyle={{ color: themeColor, fontWeight: 'bold' }}
            itemStyle={{ color: themeColor }} // Usar un color que se vea bien en ambos temas para la línea del tooltip
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981" 
            strokeWidth={2.5}
            dot={chartData.length < 5 ? { r: 3, fill: "#10b981" } : false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {portfolio.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 mt-3 text-sm text-center">Your portfolio is empty. Buy some stocks from the market!</div>
      )}
    </div>
  );
}