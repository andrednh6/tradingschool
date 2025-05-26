import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

export type Ticker = {
  symbol: string;
  name: string;
  sector: string;
  current: number;
  history: number[]; 
};

export function useTickers() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "prices"),
      (snapshot) => {
        const data: Ticker[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          data.push({
            symbol: d.symbol,
            name: d.name,
            sector: d.sector,
            current: d.current,
            history: d.history,
          });
        });
        setTickers(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  return { tickers, loading };
}
