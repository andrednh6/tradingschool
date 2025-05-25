import { useTickers } from "../hooks/useTickers";
import { useUser } from "../context/UserContext";
import { useState } from "react";
import { buyStock } from "../hooks/useBuy";
import type { Ticker } from "../hooks/useTickers";

export function MarketList() {
  const { tickers, loading } = useTickers();
  const user = useUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) return <div>Loading market data...</div>;
  if (!tickers.length) return <div>No tickers found.</div>;

  const handleBuy = async (symbol: string, price: number) => {
    setBusy(symbol);
    setMessage(null);
    try {
      await buyStock({ uid: user.uid, symbol, price });
      setMessage(`Successfully bought 1 share of ${symbol}`);
    } catch (err: any) {
      setMessage(err.message);
    }
    setBusy(null);
  };

  return (
    <div className="my-4">
      <h2 className="text-lg font-bold mb-2">Market</h2>
      {message && (
        <div className="mb-2 text-center text-sm text-blue-600 bg-blue-50 rounded p-2">{message}</div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-lg shadow text-sm sm:text-base">
          <thead>
            <tr>
              <th className="p-2 border">Symbol</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Sector</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border">Buy</th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((t: Ticker) => (
              <tr
                key={t.symbol}
                className="hover:bg-blue-50 cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== "BUTTON") {
                    handleBuy(t.symbol, t.current);
                  }
                }}
              >
                <td className="p-2 border font-mono">{t.symbol}</td>
                <td className="p-2 border">{t.name}</td>
                <td className="p-2 border">{t.sector}</td>
                <td className="p-2 border">${t.current}</td>
                <td className="p-2 border">
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={busy === t.symbol}
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
