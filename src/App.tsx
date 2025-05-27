import { useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { Portfolio } from "./components/Portfolio";
import { MarketList } from "./components/MarketList";
import { Transactions } from "./components/Transactions";
import { OnboardingDialog } from "./components/OnboardingDialog";
import { useOnboarding } from "./hooks/useOnboarding";

function App() {
  const [refresh, setRefresh] = useState(0); // This state is used as refreshSignal
  const { show: showOnboarding, finish: finishOnboarding } = useOnboarding();

  // This function will be passed to Portfolio's onTransaction prop
  const handlePortfolioTransaction = () => {
    setRefresh((n) => n + 1); // Increment refresh state, same as onBuySuccess
  };

  // Para forzar la visualización del OnboardingDialog en tus pruebas:
  // const showOnboarding = true;
  // const finishOnboarding = () => console.log("Onboarding cerrado (prueba)");

  return (
    <AuthGate>
      {/* This usage of OnboardingDialog seems correct if its props are { open: boolean; onClose: () => void; } */}
      {showOnboarding && <OnboardingDialog open={showOnboarding} onClose={finishOnboarding} />}
      
      {!showOnboarding && (
        <div className="p-4 w-full max-w-xl mx-auto"> 
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
            Welcome to TradingSchool
          </h1>
          
          {/* Pass handlePortfolioTransaction to the onTransaction prop */}
          <Portfolio
            refreshSignal={refresh}
            onTransaction={handlePortfolioTransaction} // <-- PROP AÑADIDA AQUÍ
          />
          <MarketList onBuySuccess={() => setRefresh((n) => n + 1)} />
          <Transactions />
        </div>
      )}
    </AuthGate>
  );
}

export default App;