//import { useState, useEffect } from "react";
import { AuthGate } from "./components/AuthGate";
import { Portfolio } from "./components/Portfolio";
import { MarketList } from "./components/MarketList";
import { Transactions } from "./components/Transactions";
import { OnboardingDialog } from "./components/OnboardingDialog";
import { useOnboarding } from "./hooks/useOnboarding";
import { TheoryGuideWrapper } from "./components/TheoryGuideWrapper";
import { useSimulationSession } from "./hooks/useSimulationSession";
import { useToast } from "./hooks/useToast";
import type { ShowToastFunction } from "./types/simulation";
import { NextLevelGoals } from "./components/NextLevelGoals"; 

function App() {
  const { show: showOnboarding, finish: finishOnboarding } = useOnboarding();
  
  // Call the hook once here to be the single source of truth

  const { 
    sessionData, 
    isLoadingSession, 
    startNewGuidedSession, 
    resetCurrentSession, 
    advanceSimulatedWeek,
    recordSellInSession,
  } = useSimulationSession();
  
  const { showToast } = useToast();

  const handleAdvanceWeek = () => {
    if (sessionData?.isActive) {
      advanceSimulatedWeek(showToast as ShowToastFunction);
    } else {
      showToast("Please start a guided simulation session to advance the week.");
    }
  };

  return (
    <AuthGate>
      {showOnboarding && <OnboardingDialog open={showOnboarding} onClose={finishOnboarding} />}
      
      {!showOnboarding && <TheoryGuideWrapper />}

      {!showOnboarding && (
        <div className="p-4 w-full max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6"> 
          <div className="lg:col-span-1 space-y-6">

            <MarketList/>
            <Transactions 
              transactions={sessionData?.transactions || []}
              isLoadingSession={isLoadingSession}
              isActiveSession={!!sessionData?.isActive}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="p-3 bg-gray-200 dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Simulation Controls (Dev)</h2>
              {isLoadingSession && <p className="text-sm text-gray-600 dark:text-gray-400">Loading simulation session...</p>}
              {!isLoadingSession && (
                <div className="space-y-2">
                  {!sessionData || !sessionData.isActive ? (
                    <button 
                      onClick={() => startNewGuidedSession()}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Start New Guided Simulation
                    </button>
                  ) : (
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 grid grid-cols-2 gap-1">
                      <span>Status: Active</span>
                      <span>Level: {sessionData.currentLevel} (Theory: L{sessionData.theoryProgressLevelCompleted})</span>
                      <span>Week: {sessionData.simulatedWeeksPassed}</span>
                      <span>Cash: ${sessionData.cash.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex space-x-2">
                      <button 
                      onClick={resetCurrentSession}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                      >
                      Reset Sim Session
                      </button>
                      <button
                      onClick={handleAdvanceWeek}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      disabled={!sessionData?.isActive}
                      >
                      Advance 1 Week
                      </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* NEW: Render the NextLevelGoals component */}
            <NextLevelGoals />
            <Portfolio 
              sessionData={sessionData}
              isLoadingSession={isLoadingSession}
              onSellStock={async (params) => {
                  if (recordSellInSession && sessionData?.isActive) {
                      await recordSellInSession({ ...params, showToastFunc: showToast as ShowToastFunction });
                  }
              }}
            />
          </div>

          {!sessionData?.isActive && !isLoadingSession && (
            <p className="lg:col-span-3 text-center mt-6 text-gray-600 dark:text-gray-400">
              Start a new guided simulation to begin your training.
            </p>
          )}
        </div>
      )}
    </AuthGate>
  );
}

export default App;