import { useTickers } from "../hooks/useTickers";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import { buyStock } from "../hooks/useBuy";
import { useToast } from "../hooks/useToast";
import { PriceChart } from "./PriceChart";
import type { Ticker } from "../hooks/useTickers";

// Eliminada la función isDarkMode que no se usaba en este componente.

export function MarketList({ onBuySuccess }: { onBuySuccess: () => void }) {
  const { tickers, loading } = useTickers();
  const user = useUser();
  const [busy, setBusy] = useState<string | null>(null);
  const { message, showToast } = useToast();
  const [selected, setSelected] = useState<Ticker | null>(null);

  // Este useEffect puede ser útil si PriceChart u otros hijos directos
  // necesitan un re-render forzado cuando cambia el tema global.
  // Si PriceChart ya maneja sus propios cambios de tema internamente (como lo hace ahora),
  // este setThemeTrigger podría no ser estrictamente necesario para ese caso.
  // Lo mantendremos por si otros elementos dentro de MarketList lo necesitaran.
  const [, setThemeTrigger] = useState(false); 

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeTrigger(prev => !prev); 
    });
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, []);


  if (loading) return <div className="my-6 p-4 text-center text-gray-700 dark:text-gray-300">Loading market data...</div>;
  if (!tickers || tickers.length === 0) return <div className="my-6 p-4 text-center text-gray-700 dark:text-gray-300">No tickers found.</div>;

  const handleBuy = async (symbol: string, price: number) => {
    if (!user?.uid) {
      showToast("❌ User not found. Please log in."); // Mensaje si no hay usuario
      return;
    }
    setBusy(symbol);
    try {
      await buyStock({ uid: user.uid, symbol, price });
      showToast(`✅ Bought 1 share of ${symbol}!`);
      onBuySuccess();
    } catch (err: any) {
      showToast(`❌ ${err.message}`);
    }
    setBusy(null);
  };

  if (selected) {
    return (
      <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg text-gray-800 dark:text-gray-100">
        <button
          className="text-blue-600 dark:text-blue-400 hover:underline mb-3 text-sm font-medium"
          onClick={() => setSelected(null)}
        >
          ← Back to market
        </button>
        <div className="font-bold text-xl mb-1 text-gray-900 dark:text-white">{selected.name} ({selected.symbol})</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sector: {selected.sector}</div>
        <div className="text-lg text-gray-700 dark:text-gray-200 mb-3">Current price: <span className="font-mono font-semibold">${selected.current.toFixed(2)}</span></div>
        <div className="mb-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            disabled={busy === selected.symbol || !user} // Deshabilitar si no hay usuario
            onClick={() => handleBuy(selected.symbol, selected.current)}
          >
            {busy === selected.symbol ? "Buying..." : "Buy 1 Share"}
          </button>
        </div>
        <PriceChart history={selected.history} symbol={selected.symbol} currentPrice={selected.current} />
        {message && (
          <div className={`mt-3 text-center text-sm p-2 rounded-md transition-all duration-300 ${message.includes('✅') ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Market</h2>
      {message && (
         <div className={`mb-3 text-center text-sm p-2 rounded-md transition-all duration-300 ${message.includes('✅') ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
          {message}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse rounded-lg text-sm">
          <thead className="bg-gray-50 dark:bg-gray-600">
            <tr>
              <th className="p-3 border-b dark:border-gray-500 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
              <th className="p-3 border-b dark:border-gray-500 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="p-3 border-b dark:border-gray-500 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sector</th>
              <th className="p-3 border-b dark:border-gray-500 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
              <th className="p-3 border-b dark:border-gray-500 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Buy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {tickers.map((t: Ticker) => (
              <tr
                key={t.symbol}
                className="hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                onClick={() => setSelected(t)}
              >
                <td className="p-3 whitespace-nowrap font-mono text-gray-700 dark:text-gray-300">{t.symbol}</td>
                <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{t.name}</td>
                <td className="p-3 whitespace-nowrap text-gray-500 dark:text-gray-400">{t.sector}</td>
                <td className="p-3 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">${t.current.toFixed(2)}</td>
                <td className="p-3 whitespace-nowrap">
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                    disabled={busy === t.symbol || !user} // Deshabilitar si no hay usuario
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuy(t.symbol, t.current);
                    }}
                  >
                    {busy === t.symbol ? "Buying..." : "Buy"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}