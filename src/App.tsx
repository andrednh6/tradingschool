import "./App.css";
import { AuthGate } from "./components/AuthGate";
import { MarketList } from "./components/MarketList";
import { Portfolio } from "./components/Portfolio";

function App() {
  return (
    <AuthGate>
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-center mb-2">Welcome to TradingSchool</h1>
        <Portfolio />
        <MarketList />
      </div>
    </AuthGate>
  );
}

export default App;

