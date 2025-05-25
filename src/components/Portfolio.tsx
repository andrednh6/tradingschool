import { useUser } from "../context/UserContext";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

type PortfolioItem = {
  symbol: string;
  quantity: number;
};

export function Portfolio({ refreshSignal }: { refreshSignal: number }) {
  const user = useUser();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading portfolio...</div>;

  return (
    <div className="my-4">
      <h2 className="text-lg font-bold mb-2">Your Portfolio</h2>
      <div className="mb-2">Cash: <span className="font-mono">${cash}</span></div>
      {portfolio.length === 0 ? (
        <div className="text-gray-600">No stocks yet.</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="p-2 border">Symbol</th>
              <th className="p-2 border">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((item) => (
              <tr key={item.symbol}>
                <td className="p-2 border font-mono">{item.symbol}</td>
                <td className="p-2 border">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
