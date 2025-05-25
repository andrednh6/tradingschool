import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export async function buyStock({ uid, symbol, price }: { uid: string; symbol: string; price: number }) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) throw new Error("User not found");
  const data = userSnap.data();
  if (data.cash < price) throw new Error("Insufficient funds");

  // Portfolio as array of { symbol, quantity }
  let newPortfolio = data.portfolio || [];
  const idx = newPortfolio.findIndex((item: any) => item.symbol === symbol);
  if (idx >= 0) {
    newPortfolio[idx].quantity += 1;
  } else {
    newPortfolio.push({ symbol, quantity: 1 });
  }

  await updateDoc(userRef, {
    cash: data.cash - price,
    portfolio: newPortfolio,
  });

  return { success: true };
}
