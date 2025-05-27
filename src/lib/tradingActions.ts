import {
  doc,
  getDoc,
  updateDoc,
  collection,
  serverTimestamp, // serverTimestamp is used
  runTransaction
  // addDoc was removed as it's not used. transaction.set with a new doc ref is used instead.
} from "firebase/firestore";
import { db } from "../config/firebase";

// Local type, no import needed
type PortfolioItem = {
  symbol: string;
  quantity: number;
  name?: string;
  sector?: string;
};

// Local type, no import needed
type ShowToastFunction = (message: string) => void;

async function checkAndTriggerLevelUp(uid: string, showToastFunc: ShowToastFunction) {
  const userRef = doc(db, "users", uid);
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentLevel = userData.level || 1;

      if (currentLevel === 1) {
        const newLevel = 2;
        await updateDoc(userRef, { level: newLevel });
        showToastFunc(`Congratulations! You've reached Level ${newLevel}! New perks unlocked.`);
      }
    }
  } catch (error) {
    console.error("Error checking/triggering level up:", error);
    showToastFunc("Could not update level, please try again.");
  }
}

export async function buyStock({
  uid,
  symbol,
  price,
  name,
  sector,
  showToastFunc
}: {
  uid: string;
  symbol: string;
  price: number;
  name: string;
  sector: string;
  showToastFunc: ShowToastFunction;
}) {
  const userRef = doc(db, "users", uid);
  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User not found");

      const data = userSnap.data();
      if (data.cash < price) throw new Error("Insufficient funds");

      let newPortfolio: PortfolioItem[] = data.portfolio || [];
      const idx = newPortfolio.findIndex((item: PortfolioItem) => item.symbol === symbol);

      if (idx >= 0) {
        newPortfolio[idx].quantity += 1;
      } else {
        newPortfolio.push({ symbol, quantity: 1, name, sector });
      }

      transaction.update(userRef, {
        cash: data.cash - price,
        portfolio: newPortfolio,
      });

      const txCollectionRef = collection(db, "users", uid, "transactions");
      const newTxRef = doc(txCollectionRef); // Automatically generates an ID for the new transaction document

      transaction.set(newTxRef, { // Use the generated reference with transaction.set
        type: "buy",
        symbol,
        name: name || "Unknown Stock",
        sector: sector || "N/A",
        quantity: 1,
        price,
        timestamp: serverTimestamp(),
      });
    });

    showToastFunc(`Successfully bought 1 ${symbol}!`);
    await checkAndTriggerLevelUp(uid, showToastFunc);
    return { success: true };
  } catch (error: any) {
    console.error("Error buying stock:", error);
    showToastFunc(error.message || "Failed to buy stock.");
    return { success: false, error: error.message };
  }
}

export async function sellStock({
  uid,
  symbol,
  quantityToSell,
  price,
  showToastFunc
}: {
  uid: string;
  symbol: string;
  quantityToSell: number;
  price: number;
  showToastFunc: ShowToastFunction;
}) {
  if (quantityToSell <= 0) {
    showToastFunc("Quantity to sell must be positive.");
    return { success: false, error: "Invalid quantity" };
  }

  const userRef = doc(db, "users", uid);
  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User not found.");

      const userData = userSnap.data();
      const portfolio: PortfolioItem[] = userData.portfolio || [];
      const stockIndex = portfolio.findIndex(item => item.symbol === symbol);

      if (stockIndex === -1) throw new Error(`Stock ${symbol} not found in portfolio.`);

      const stockToSell = portfolio[stockIndex];
      if (stockToSell.quantity < quantityToSell) {
        throw new Error(`Not enough shares of ${symbol} to sell. You have ${stockToSell.quantity}.`);
      }

      const updatedPortfolio = [...portfolio];
      if (stockToSell.quantity === quantityToSell) {
        updatedPortfolio.splice(stockIndex, 1);
      } else {
        updatedPortfolio[stockIndex] = {
          ...stockToSell,
          quantity: stockToSell.quantity - quantityToSell,
        };
      }

      const newCash = userData.cash + (price * quantityToSell);

      transaction.update(userRef, {
        cash: newCash,
        portfolio: updatedPortfolio,
      });

      const txCollectionRef = collection(db, "users", uid, "transactions");
      const newTxRef = doc(txCollectionRef); // Automatically generates an ID for the new transaction document

      transaction.set(newTxRef, { // Use the generated reference with transaction.set
        type: "sell",
        symbol,
        name: stockToSell.name || "Unknown Stock",
        sector: stockToSell.sector || "N/A",
        quantity: quantityToSell,
        price,
        timestamp: serverTimestamp(),
      });
    });

    showToastFunc(`Successfully sold ${quantityToSell} of ${symbol}!`);
    await checkAndTriggerLevelUp(uid, showToastFunc);
    return { success: true };
  } catch (error: any) {
    console.error("Error selling stock:", error);
    showToastFunc(error.message || "Failed to sell stock.");
    return { success: false, error: error.message };
  }
}