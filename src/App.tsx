import "./App.css";
import { AuthGate } from "./components/AuthGate";
import { MarketList } from "./components/MarketList";

function App() {
  return (
    <AuthGate>
      <div className="p-4">
        <h1 className="text-xl font-bold">Welcome to TradingSchool</h1>
        <p>This is your trading simulator MVP.</p>
        <MarketList />
      </div>
    </AuthGate>
  );
}

export default App;

