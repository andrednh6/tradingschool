import "./App.css";
import { AuthGate } from "./components/AuthGate";
import { MarketList } from "./components/MarketList";
import { Portfolio } from "./components/Portfolio";
import { Transactions } from "./components/Transactions";
import { useState } from "react";


function App() {
  const [refresh, setRefresh] = useState(0);

  return (
    <AuthGate>
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-center mb-2">Welcome to TradingSchool</h1>
        <Portfolio refreshSignal={refresh} />
        <MarketList onBuySuccess={() => setRefresh((n) => n + 1)} />
        <Transactions />
      </div>
    </AuthGate>
  );
}

export default App;
