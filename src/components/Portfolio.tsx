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

export function Portfolio({ refreshSignal }: { refreshSignal: number }) {
  const user = useUser();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Agrega el hook para traer los tickers
  const { tickers, loading: loadingTickers } = useTickers();

  async function fetchPortfolio() {
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
    // eslint-disable-next-line
  }, [user.uid, refreshSignal]);

  if (loading || loadingTickers) return <div>Loading portfolio...</div>;

  // Calcula el valor del portafolio en cada punto histórico
  const historyLength =
    tickers.length > 0 ? tickers[0].history.length : 0;
  const portfolioHistory = Array(historyLength)
    .fill(0)
    .map((_, idx) => {
      return portfolio.reduce((sum, p) => {
        const t = tickers.find((t) => t.symbol === p.symbol);
        if (t && t.history && typeof t.history[idx] !== "undefined") {
          return sum + t.history[idx] * p.quantity;
        }
        return sum;
      }, 0);
    });

  // Valores para mostrar el rendimiento
  const invested =
    portfolio.reduce((sum, p) => {
      const t = tickers.find((t) => t.symbol === p.symbol);
      return sum + ((t?.history?.[0] ?? 0) * p.quantity);
    }, 0) || 0;
  const value =
    portfolio.reduce((sum, p) => {
      const t = tickers.find((t) => t.symbol === p.symbol);
      return sum + ((t?.current ?? 0) * p.quantity);
    }, 0) || 0;
  const totalDiff = value - invested;
  const totalPercent = invested
    ? ((totalDiff / invested) * 100).toFixed(2)
    : "0.00";

  // Prepara los datos para la gráfica
  const chartData = portfolioHistory.map((val, idx) => ({
    name: `T-${historyLength - idx}`,
    value: val,
  }));

  return (
    <div className="my-4 bg-white rounded shadow p-4">
      <h2 className="text-lg font-bold mb-2">Portfolio Evolution</h2>
      <div className="mb-2">
        <b>Cash:</b> <span className="font-mono">${cash}</span><br />
        <b>Total value:</b> ${value.toFixed(2)}<br />
        <b>Invested:</b> ${invested.toFixed(2)}<br />
        <b>Gain/Loss:</b>{" "}
        <span className={totalDiff >= 0 ? "text-green-600" : "text-red-600"}>
          ${totalDiff.toFixed(2)} ({totalPercent}%)
        </span>
      </div>
      {/* Gráfica de la evolución del portafolio */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <XAxis dataKey="name" hide />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#059669"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {portfolio.length === 0 && (
        <div className="text-gray-600 mt-2">No stocks yet.</div>
      )}
    </div>
  );
}
