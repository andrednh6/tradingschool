import { useState, useEffect, useCallback } from 'react';
import type { SimulationSessionData,  LocalTransaction, ShowToastFunction, SimulatedMarketTicker} from '../types/simulation';
import { runWeeklyMarketUpdate, getTickerCurrentPrice } from '../lib/PriceUpdateEngine';
//import type {LocalPortfolioItem, MarketEvent} from '../types/simulation'

const LOCAL_STORAGE_KEY = 'tradingSchool_simulationSession';
const DEFAULT_INITIAL_CASH = 1000;
const MAX_LEVEL_MVP = 5;
const MAX_SIMULATION_WEEKS = 52; // Define the end point for the simulation

const initialMarketTickers: SimulatedMarketTicker[] = [
  // Tech stock with a solid positive trend but higher volatility
  { symbol: "ALPHA", name: "Alpha Corp", sector: "Technology", currentPrice: 100.00, history: [100.00], baseVolatility: 0.035, baseTrend: 0.0025 },
  // Health stock, more stable with a steady, decent trend
  { symbol: "BETA", name: "Beta Health Inc.", sector: "Health", currentPrice: 75.00, history: [75.00], baseVolatility: 0.018, baseTrend: 0.0015 },
  // Energy stock, highly volatile and a slightly negative trend to represent risk
  { symbol: "GAMMA", name: "Gamma Energy Ltd.", sector: "Energy", currentPrice: 50.00, history: [50.00], baseVolatility: 0.045, baseTrend: -0.0010 },
  // Consumer goods stock, low volatility and a reliable but small positive trend
  { symbol: "DELTA", name: "Delta Consumer", sector: "Consumer Goods", currentPrice: 120.00, history: [120.00], baseVolatility: 0.012, baseTrend: 0.0010 },
  // Finance stock, medium volatility and a decent positive trend
  { symbol: "EPSI", name: "Epsilon Finance", sector: "Finance", currentPrice: 90.00, history: [90.00], baseVolatility: 0.025, baseTrend: 0.0020 },
];

export const LEVEL_GOALS: Record<number, {
  buyTransactionsMin?: number;
  sellTransactionsMin?: number;
  totalTransactionsMin?: number;
  hasStocksInPortfolio?: boolean;
  portfolioValueMin?: number;
  sectorsInPortfolioMin?: number;
  simulatedWeeksMin?: number;
}> = {
  1: { buyTransactionsMin: 1, hasStocksInPortfolio: true, simulatedWeeksMin: 1 },
  2: { sectorsInPortfolioMin: 2, portfolioValueMin: 1200, simulatedWeeksMin: 3, sellTransactionsMin: 1 },
  3: { totalTransactionsMin: 5, portfolioValueMin: 1500, simulatedWeeksMin: 6 },
  4: { totalTransactionsMin: 8, portfolioValueMin: 2000, simulatedWeeksMin: 10 },
  5: { totalTransactionsMin: 12, portfolioValueMin: 3000, simulatedWeeksMin: 14 },
};

const createDefaultSessionData = (initialCash: number): SimulationSessionData => {
  console.log('[SimSession] Creating default session data');
  return {
    isActive: true,
    currentLevel: 1,
    theoryProgressLevelCompleted: 0,
    cash: initialCash,
    portfolio: [],
    transactions: [],
    simulatedWeeksPassed: 0,
    marketTickers: initialMarketTickers.map(ticker => ({ ...ticker, history: [ticker.currentPrice] })),
    activeMarketEvents: [],
  };
};

export function useSimulationSession() {
  const [sessionData, setSessionData] = useState<SimulationSessionData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Log sessionData whenever it changes
  useEffect(() => {
    console.log('[SimSession] sessionData changed:', sessionData);
  }, [sessionData]);

  const saveSessionToLocalStorage = useCallback((data: SimulationSessionData | null) => {
    try {
      if (data) {
        console.log('[SimSession] Saving to localStorage:', data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } else {
        console.log('[SimSession] Removing from localStorage');
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error saving simulation session to localStorage:", error);
    }
  }, []);

  useEffect(() => {
    console.log('[SimSession] Attempting to load session from localStorage...');
    setIsLoadingSession(true);
    try {
      const savedSessionJson = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedSessionJson) {
        let parsedSession = JSON.parse(savedSessionJson) as SimulationSessionData;
        console.log('[SimSession] Found saved session:', parsedSession);
        if (
          typeof parsedSession.currentLevel === 'number' &&
          Array.isArray(parsedSession.portfolio) &&
          Array.isArray(parsedSession.marketTickers)
        ) {
          if (parsedSession.activeMarketEvents === undefined) parsedSession.activeMarketEvents = [];
          if (!parsedSession.marketTickers || parsedSession.marketTickers.length === 0) {
            console.log('[SimSession] Re-initializing marketTickers for loaded session.');
            parsedSession.marketTickers = initialMarketTickers.map(t => ({ ...t, history: [t.currentPrice]}));
          }
          if (parsedSession.simulatedWeeksPassed === undefined) parsedSession.simulatedWeeksPassed = 0;
          if (parsedSession.theoryProgressLevelCompleted === undefined) parsedSession.theoryProgressLevelCompleted = 0;
          // If a previous session was marked inactive (e.g. completed 52 weeks), don't just resume it as active.
          // User should explicitly start a new one or we might have a "continue sandbox" option later.
          // For now, if it was inactive, treat as no session to force "Start New".
          if (parsedSession.isActive === false) {
            console.log("[SimSession] Loaded inactive session, prompting for new start.");
            setSessionData(null); // Force user to start a new guided session
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear the inactive session
          } else {
            setSessionData(parsedSession);
        } 
      } else {
          console.warn("[SimSession] Invalid session data in localStorage, creating new default.");
          const newSession = createDefaultSessionData(DEFAULT_INITIAL_CASH);
          setSessionData(newSession);
          saveSessionToLocalStorage(newSession);
        }
      } else {
        console.log('[SimSession] No session found in localStorage.');
        setSessionData(null);
      }
    } catch (error) {
      console.error("[SimSession] Error loading/parsing session from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSessionData(null);
    }
    setIsLoadingSession(false);
  }, [saveSessionToLocalStorage]);

  const internalCheckAndAdvanceLevel = useCallback((currentData: SimulationSessionData, showToastFunc: ShowToastFunction): SimulationSessionData => {
    console.log('[SimSession] Checking for level up. Current Level:', currentData.currentLevel, 'Theory Progress:', currentData.theoryProgressLevelCompleted);
    if (!currentData.isActive || currentData.currentLevel >= MAX_LEVEL_MVP) {
      return currentData;
    }
    if (currentData.currentLevel === MAX_LEVEL_MVP && currentData.theoryProgressLevelCompleted >= MAX_LEVEL_MVP) {
      // If already at max level and theory is done, check transactional goals for "final completion"
      // but don't advance further. The 'isActive' might be set to false by other conditions.
    }
    const theoryRequirementMet = currentData.theoryProgressLevelCompleted >= currentData.currentLevel;
    if (!theoryRequirementMet) {
      console.log(`[SimSession] Theory not yet completed for Level ${currentData.currentLevel}`);
      return currentData;
    }

    const levelToCheck = currentData.currentLevel;
    const goals = LEVEL_GOALS[levelToCheck];
    let transactionalGoalsMet = true;

    if (goals) {
      console.log(`[SimSession] Checking transactional goals for Level ${levelToCheck}:`, goals);
      if (goals.simulatedWeeksMin !== undefined && currentData.simulatedWeeksPassed < goals.simulatedWeeksMin)
        transactionalGoalsMet = false; console.log('[SimSession] Weeks goal NOT met');    
      if (transactionalGoalsMet && goals.buyTransactionsMin !== undefined) {
        if (currentData.transactions.filter(t => t.type === 'buy').length < goals.buyTransactionsMin) {
          transactionalGoalsMet = false; console.log('[SimSession] Buy transactions goal NOT met');
        }
      }
      if (transactionalGoalsMet && goals.portfolioValueMin !== undefined) {
        const currentPortfolioStockValue = currentData.portfolio.reduce((acc, item) => {
            const price = getTickerCurrentPrice(currentData.marketTickers, item.symbol);
            return acc + (item.quantity * price);
        }, 0);
        const totalPortfolioValue = currentData.cash + currentPortfolioStockValue;
        console.log('[SimSession] Current Total Portfolio Value for check:', totalPortfolioValue);
        if (totalPortfolioValue < goals.portfolioValueMin) {
          transactionalGoalsMet = false; console.log('[SimSession] Portfolio value goal NOT met');
        }
      }
       // Add other checks similarly
       if (transactionalGoalsMet && goals.sellTransactionsMin !== undefined) {
        if (currentData.transactions.filter(t => t.type === 'sell').length < goals.sellTransactionsMin) {
          transactionalGoalsMet = false; console.log('[SimSession] Sell transactions goal NOT met');
        }
      }
      if (transactionalGoalsMet && goals.totalTransactionsMin !== undefined) {
        if (currentData.transactions.length < goals.totalTransactionsMin) {
          transactionalGoalsMet = false; console.log('[SimSession] Total transactions goal NOT met');
        }
      }
      if (transactionalGoalsMet && goals.hasStocksInPortfolio !== undefined) {
        if (goals.hasStocksInPortfolio && !currentData.portfolio.some(s => s.quantity > 0)) {
          transactionalGoalsMet = false; console.log('[SimSession] Has stocks goal NOT met');
        }
      }
      if (transactionalGoalsMet && goals.sectorsInPortfolioMin !== undefined) {
        if (new Set(currentData.portfolio.map(s => s.sector)).size < goals.sectorsInPortfolioMin) {
          transactionalGoalsMet = false; console.log('[SimSession] Sectors goal NOT met');
        }
      }
    } else {
      console.warn(`[SimSession] No LEVEL_GOALS defined for level ${levelToCheck}`);
      return currentData;
    }
    if (transactionalGoalsMet) {
      if (currentData.currentLevel < MAX_LEVEL_MVP) {
        const newLevel = currentData.currentLevel + 1;
        showToastFunc(`Congratulations! You've advanced to Level ${newLevel}!`);
        return { ...currentData, currentLevel: newLevel };
      } else if (currentData.currentLevel === MAX_LEVEL_MVP) {
        // Reached and completed transactional goals for the final MVP level
        showToastFunc("You've completed all objectives for the final training level!");
        // The session might end here due to 52 weeks or going broke,
        // or we could explicitly mark it as "guided_training_complete"
        // For now, isActive will be handled by end conditions.
        // TODO: Call syncSimulationCompletionToFirestore(userIdGlobal, currentData);
        console.log("[SimSession] All MVP level goals completed. Consider syncing or next steps.");
        // We don't set isActive: false here directly, let end conditions handle it or add specific logic
      }
    }
    return currentData;
  }, []);

  const startNewGuidedSession = useCallback((initialCash: number = DEFAULT_INITIAL_CASH) => {
    console.log('[SimSession] Starting new guided session...');
    const newSession = createDefaultSessionData(initialCash);
    setSessionData(newSession);
    saveSessionToLocalStorage(newSession);
  }, [saveSessionToLocalStorage]);

  const resetCurrentSession = useCallback(() => {
    console.log('[SimSession] Resetting current session...');
    setSessionData(null);
    saveSessionToLocalStorage(null);
  }, [saveSessionToLocalStorage]);

  const recordBuyInSession = useCallback(async (params: {
    symbol: string; name: string; sector: string; quantity: number; showToastFunc: ShowToastFunction;
  }) => {
    console.log('[SimSession] recordBuyInSession called with:', params);
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) {
        params.showToastFunc("Error: No active simulation session for buy.");
        return prevData;
      }
      const transactionPrice = getTickerCurrentPrice(prevData.marketTickers, params.symbol);
      if (transactionPrice <= 0) { 
        params.showToastFunc(`Error: Ticker ${params.symbol} not available or price is invalid for buy.`);
        return prevData;
      }
      if (prevData.cash < transactionPrice * params.quantity) {
        params.showToastFunc("Insufficient funds in simulation.");
        return prevData;
      }
      const newCash = prevData.cash - (transactionPrice * params.quantity);
      let portfolioUpdated = false;
      const updatedPortfolio = prevData.portfolio.map(item => {
        if (item.symbol === params.symbol) {
          portfolioUpdated = true;
          return { ...item, quantity: item.quantity + params.quantity };
        }
        return item;
      });
      if (!portfolioUpdated) {
        updatedPortfolio.push({
          symbol: params.symbol, name: params.name, sector: params.sector, quantity: params.quantity,
        });
      }
      const newTransaction: LocalTransaction = {
        id: `${Date.now()}-${params.symbol}`, type: 'buy',
        symbol: params.symbol, name: params.name, sector: params.sector,
        quantity: params.quantity, price: transactionPrice,
        totalValue: transactionPrice * params.quantity, timestamp: Date.now(),
      };
      const newTransactions = [...prevData.transactions, newTransaction];
      let finalData = { ...prevData, cash: newCash, portfolio: updatedPortfolio, transactions: newTransactions };
      console.log('[SimSession] Data before buy level check:', finalData);
      finalData = internalCheckAndAdvanceLevel(finalData, params.showToastFunc);
          // Check for gone broke after buy
        const currentPortfolioStockValue = finalData.portfolio.reduce((acc, item) => {
        const price = getTickerCurrentPrice(finalData.marketTickers, item.symbol);
        return acc + (item.quantity * price);
      }, 0);
      if (finalData.cash <= 0 && currentPortfolioStockValue <= 0 && finalData.isActive) {
        params.showToastFunc("Simulation ended: You've run out of funds!");
        finalData.isActive = false;
        console.log("[SimSession] Gone broke after buy. TODO: Sync to Firestore & show report.");
      }
      saveSessionToLocalStorage(finalData);
      params.showToastFunc(`Sim: Bought ${params.quantity} of ${params.symbol} @ $${transactionPrice.toFixed(2)}`);
      return finalData;
    });
    return { success: true };
  }, [saveSessionToLocalStorage, internalCheckAndAdvanceLevel]);

  const recordSellInSession = useCallback(async (params: {
    symbol: string; quantityToSell: number; showToastFunc: ShowToastFunction;
  }) => {
    let success = true; 
    console.log('[SimSession] recordSellInSession called with:', params);
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) {
        params.showToastFunc("Error: No active simulation session for sell.");
        success = false; return prevData;
      }
      const transactionPrice = getTickerCurrentPrice(prevData.marketTickers, params.symbol);
      if (transactionPrice <= 0) {
        params.showToastFunc(`Error: Ticker ${params.symbol} not available or price is invalid for sell.`);
        success = false; return prevData;
      }
      const stockIndex = prevData.portfolio.findIndex(s => s.symbol === params.symbol);
      const stockToSell = stockIndex > -1 ? prevData.portfolio[stockIndex] : null;
      if (!stockToSell || stockToSell.quantity < params.quantityToSell) {
        params.showToastFunc("Not enough shares to sell in simulation.");
        success = false; return prevData;
      }
      const newCash = prevData.cash + (transactionPrice * params.quantityToSell);
      const updatedPortfolio = prevData.portfolio.map(item => {
        if (item.symbol === params.symbol) {
          return { ...item, quantity: item.quantity - params.quantityToSell };
        }
        return item;
      }).filter(item => item.quantity > 0);
      const newTransaction: LocalTransaction = {
        id: `${Date.now()}-${params.symbol}`, type: 'sell',
        symbol: params.symbol, name: stockToSell.name, sector: stockToSell.sector,
        quantity: params.quantityToSell, price: transactionPrice,
        totalValue: transactionPrice * params.quantityToSell, timestamp: Date.now(),
      };
      const newTransactions = [...prevData.transactions, newTransaction];
      let finalData = { ...prevData, cash: newCash, portfolio: updatedPortfolio, transactions: newTransactions };
      console.log('[SimSession] Data before sell level check:', finalData);
      finalData = internalCheckAndAdvanceLevel(finalData, params.showToastFunc);
      saveSessionToLocalStorage(finalData);
      params.showToastFunc(`Sim: Sold ${params.quantityToSell} of ${params.symbol} @ $${transactionPrice.toFixed(2)}`);
      return finalData;
    });
    return { success };
  }, [saveSessionToLocalStorage, internalCheckAndAdvanceLevel]);

  const completeTheoryForCurrentLevel = useCallback(async (showToastFunc: ShowToastFunction) => {
    console.log('[SimSession] completeTheoryForCurrentLevel called');
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) return prevData;
      if (prevData.theoryProgressLevelCompleted < prevData.currentLevel) {
        let updatedData = { ...prevData, theoryProgressLevelCompleted: prevData.currentLevel };
        showToastFunc(`Theory for Level ${prevData.currentLevel} completed! Now complete the practical goals.`);
        console.log('[SimSession] Data before theory level check:', updatedData);
        updatedData = internalCheckAndAdvanceLevel(updatedData, showToastFunc);
        saveSessionToLocalStorage(updatedData);
        return updatedData;
      }
      return prevData;
    });
  }, [saveSessionToLocalStorage, internalCheckAndAdvanceLevel]);

  const advanceSimulatedWeek = useCallback(async (showToastFunc: ShowToastFunction) => {
    console.log('[SimSession] advanceSimulatedWeek called');
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) return prevData;
      let newSimulatedWeeksPassed = prevData.simulatedWeeksPassed + 1;
      const { updatedTickers, updatedActiveEvents } = runWeeklyMarketUpdate(
        prevData.marketTickers,
        newSimulatedWeeksPassed,
        prevData.activeMarketEvents
      );
       let finalSessionData: SimulationSessionData = {

        ...prevData,

        marketTickers: updatedTickers,

        activeMarketEvents: updatedActiveEvents,

        simulatedWeeksPassed: newSimulatedWeeksPassed,

      };

      if (newSimulatedWeeksPassed >= MAX_SIMULATION_WEEKS) {

        showToastFunc(`Simulation complete: ${MAX_SIMULATION_WEEKS} weeks reached! Check your final report (feature coming soon).`);

        finalSessionData.isActive = false;

        saveSessionToLocalStorage(finalSessionData);

        return finalSessionData;

      }

      // Check for "gone broke" condition after prices are updated

      const currentPortfolioStockValue = finalSessionData.portfolio.reduce((acc, item) => {

        const price = getTickerCurrentPrice(finalSessionData.marketTickers, item.symbol);

        return acc + (item.quantity * price);

      }, 0);

      if (finalSessionData.cash <= 0 && currentPortfolioStockValue <= 0) {

        showToastFunc("Simulation ended: You've run out of funds!");

        console.log("[SimSession] Gone broke. TODO: Sync to Firestore & show report.");

        finalSessionData.isActive = false;

        // No further level check needed if broke

        saveSessionToLocalStorage(finalSessionData);

        return finalSessionData;

      }

      

      // Check for simulation end condition (MAX_SIMULATION_WEEKS)

      if (newSimulatedWeeksPassed >= MAX_SIMULATION_WEEKS) {

        showToastFunc(`Simulation complete: ${MAX_SIMULATION_WEEKS} weeks reached! Check your final report (feature coming soon).`);

        console.log(`[SimSession] ${MAX_SIMULATION_WEEKS} weeks reached. TODO: Sync to Firestore & show report.`);

        finalSessionData.isActive = false;

        // No further level check needed if max weeks reached

        saveSessionToLocalStorage(finalSessionData);

        return finalSessionData;

      }

      

      showToastFunc(`Simulated Week ${newSimulatedWeeksPassed}. The market has moved...`);

      finalSessionData = internalCheckAndAdvanceLevel(finalSessionData, showToastFunc);

      saveSessionToLocalStorage(finalSessionData);

      return finalSessionData;

    });

  }, [saveSessionToLocalStorage, internalCheckAndAdvanceLevel]);



  return {

    sessionData,

    isLoadingSession,

    startNewGuidedSession,

    resetCurrentSession,

    recordBuyInSession,

    recordSellInSession,

    completeTheoryForCurrentLevel,

    advanceSimulatedWeek,

  };

}