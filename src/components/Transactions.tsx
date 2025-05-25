import { useUser } from "../context/UserContext";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

type Transaction = {
  type: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: { seconds: number; nanoseconds: number };
};

function formatDate(ts?: { seconds: number; nanoseconds: number }) {
  if (!ts) return "";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString();
}

export function Transactions() {
  const user = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr: Transaction[] = [];
      snap.forEach((doc) => arr.push(doc.data() as Transaction));
      setTransactions(arr);
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  if (loading) return <div>Loading transactions...</div>;

  return (
    <div className="my-4">
      <h2 className="text-lg font-bold mb-2">Transaction History</h2>
      {transactions.length === 0 ? (
        <div className="text-gray-600">No transactions yet.</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Symbol</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Price</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i}>
                <td className="p-2 border">{formatDate(tx.timestamp)}</td>
                <td className="p-2 border">{tx.type}</td>
                <td className="p-2 border font-mono">{tx.symbol}</td>
                <td className="p-2 border">{tx.quantity}</td>
                <td className="p-2 border">${tx.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
