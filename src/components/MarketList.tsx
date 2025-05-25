import { useTickers } from "../hooks/useTickers";
import type { Ticker } from "../hooks/useTickers";

export function MarketList() {
  const { tickers, loading } = useTickers();

  if (loading) return <div>Loading market data...</div>;
  if (!tickers.length) return <div>No tickers found.</div>;

  return (
    <div className="my-4">
      <h2 className="text-lg font-bold mb-2">Market</h2>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="p-2 border">Symbol</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Sector</th>
            <th className="p-2 border">Price</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map((t: Ticker) => (
            <tr key={t.symbol}>
              <td className="p-2 border font-mono">{t.symbol}</td>
              <td className="p-2 border">{t.name}</td>
              <td className="p-2 border">{t.sector}</td>
              <td className="p-2 border">${t.current}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
