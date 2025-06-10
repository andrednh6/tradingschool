import { useState, useEffect, useCallback, useRef } from 'react';
// Ensure your type import paths are correct
import type { SimulationSessionData, LocalTransaction, ShowToastFunction, SimulatedMarketTicker } from '../types/simulation';
import { runWeeklyMarketUpdate, getTickerCurrentPrice } from '../lib/PriceUpdateEngine';
// import type {LocalPortfolioItem, MarketEvent}
const LOCAL_STORAGE_KEY = 'tradingSchool_simulationSession';
const DEFAULT_INITIAL_CASH = 1000;
const MAX_LEVEL_MVP = 5;
const MAX_SIMULATION_WEEKS = 52;

// Initial set of tickers for the simulation
const initialMarketTickers: SimulatedMarketTicker[] = [
  { symbol: "ALPHA", name: "Alpha Corp", sector: "Technology", currentPrice: 100.00, history: [100.00], baseVolatility: 0.035, baseTrend: 0.0025 },
  { symbol: "BETA", name: "Beta Health Inc.", sector: "Health", currentPrice: 75.00, history: [75.00], baseVolatility: 0.018, baseTrend: 0.0015 },
  { symbol: "GAMMA", name: "Gamma Energy Ltd.", sector: "Energy", currentPrice: 50.00, history: [50.00], baseVolatility: 0.045, baseTrend: -0.0010 },
  { symbol: "DELTA", name: "Delta Consumer", sector: "Consumer Goods", currentPrice: 120.00, history: [120.00], baseVolatility: 0.012, baseTrend: 0.0010 },
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

const createDefaultSessionData = (initialCash: number): SimulationSessionData => ({
  isActive: true, currentLevel: 1, theoryProgressLevelCompleted: 0,
  cash: initialCash, portfolio: [], transactions: [], simulatedWeeksPassed: 0,
  marketTickers: initialMarketTickers.map(ticker => ({ ...ticker, history: [ticker.currentPrice] })),
  activeMarketEvents: [],
});

export function useSimulationSession() {
  const [sessionData, setSessionData] = useState<SimulationSessionData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Use a ref to hold the latest checkAndAdvanceLevel function to avoid stale closures
  const checkAndAdvanceLevelRef = useRef<(currentData: SimulationSessionData, showToastFunc: ShowToastFunction) => SimulationSessionData>(() => sessionData!);

  const saveSessionToLocalStorage = useCallback((data: SimulationSessionData | null) => {
    try {
      if (data) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error saving session to localStorage:", error);
    }
  }, []);

  // Update sessionData and save to localStorage
  const updateSessionData = useCallback((newData: SimulationSessionData | null) => {
      setSessionData(newData);
      saveSessionToLocalStorage(newData);
  }, [saveSessionToLocalStorage]);

  // Initial load from localStorage
  useEffect(() => {
    setIsLoadingSession(true);
    try {
      const savedSessionJson = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedSessionJson) {
        let parsedSession = JSON.parse(savedSessionJson) as SimulationSessionData;
        if (typeof parsedSession.currentLevel === 'number' && Array.isArray(parsedSession.portfolio)) {
          if (parsedSession.activeMarketEvents === undefined) parsedSession.activeMarketEvents = [];
          if (!parsedSession.marketTickers || parsedSession.marketTickers.length === 0) parsedSession.marketTickers = initialMarketTickers.map(t => ({ ...t, history: [t.currentPrice]}));
          if (parsedSession.simulatedWeeksPassed === undefined) parsedSession.simulatedWeeksPassed = 0;
          if (parsedSession.theoryProgressLevelCompleted === undefined) parsedSession.theoryProgressLevelCompleted = 0;
          if (parsedSession.isActive === false) {
            updateSessionData(null);
          } else {
            setSessionData(parsedSession);
          }
        } else {
          updateSessionData(createDefaultSessionData(DEFAULT_INITIAL_CASH));
        }
      } else {
        setSessionData(null);
      }
    } catch (error) {
      console.error("Error loading session:", error);
      updateSessionData(null);
    }
    setIsLoadingSession(false);
  }, [updateSessionData]);


  useEffect(() => {
    // This function checks goals. It needs access to the LATEST sessionData.
    // By putting it in a useEffect that runs whenever sessionData changes,
    // we ensure the function in the ref is always fresh.
    checkAndAdvanceLevelRef.current = (currentData, showToastFunc) => {
      if (!currentData.isActive || currentData.currentLevel >= MAX_LEVEL_MVP) return currentData;
      
      const theoryMet = currentData.theoryProgressLevelCompleted >= currentData.currentLevel;
      if (!theoryMet) return currentData;
      
      const goals = LEVEL_GOALS[currentData.currentLevel];
      let goalsMet = true;
      if (!goals) return currentData;

      // Check all goals
      if (goals.simulatedWeeksMin !== undefined && currentData.simulatedWeeksPassed < goals.simulatedWeeksMin) goalsMet = false;
      if (goalsMet && goals.buyTransactionsMin !== undefined && currentData.transactions.filter(t => t.type === 'buy').length < goals.buyTransactionsMin) goalsMet = false;
      if (goalsMet && goals.sellTransactionsMin !== undefined && currentData.transactions.filter(t => t.type === 'sell').length < goals.sellTransactionsMin) goalsMet = false;
      if (goalsMet && goals.totalTransactionsMin !== undefined && currentData.transactions.length < goals.totalTransactionsMin) goalsMet = false;
      if (goalsMet && goals.hasStocksInPortfolio && !currentData.portfolio.some(s => s.quantity > 0)) goalsMet = false;
      if (goalsMet && goals.sectorsInPortfolioMin !== undefined && new Set(currentData.portfolio.map(s => s.sector)).size < goals.sectorsInPortfolioMin) goalsMet = false;
      if (goalsMet && goals.portfolioValueMin !== undefined) {
        const stockValue = currentData.portfolio.reduce((acc, item) => acc + (item.quantity * getTickerCurrentPrice(currentData.marketTickers, item.symbol)), 0);
        if (currentData.cash + stockValue < goals.portfolioValueMin) goalsMet = false;
      }

      if (goalsMet) {
        const newLevel = currentData.currentLevel + 1;
        const message = newLevel > MAX_LEVEL_MVP ? "You've completed all simulation training objectives!" : `Congratulations! You've advanced to Level ${newLevel}!`;
        showToastFunc(message);
        return { ...currentData, currentLevel: newLevel };
      }
      return currentData;
    };
  }, []); // Ref function definition only needs to be set once. Its logic accesses latest state via params.

  const startNewGuidedSession = useCallback(() => {
    updateSessionData(createDefaultSessionData(DEFAULT_INITIAL_CASH));
  }, [updateSessionData]);

  const resetCurrentSession = useCallback(() => {
    updateSessionData(null);
  }, [updateSessionData]);

  const recordBuyInSession = useCallback((params: {
    symbol: string; name: string; sector: string; quantity: number; showToastFunc: ShowToastFunction;
  }) => {
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) { params.showToastFunc("Error: No active session."); return prevData; }
      const transactionPrice = getTickerCurrentPrice(prevData.marketTickers, params.symbol);
      if (transactionPrice <= 0) { params.showToastFunc(`Error: Ticker ${params.symbol} price invalid.`); return prevData; }
      if (prevData.cash < transactionPrice * params.quantity) { params.showToastFunc("Insufficient funds."); return prevData; }
      
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
        updatedPortfolio.push({ symbol: params.symbol, name: params.name, sector: params.sector, quantity: params.quantity });
      }
      const newTransaction: LocalTransaction = {
        id: `${Date.now()}-${params.symbol}`, type: 'buy', ...params, price: transactionPrice,
        totalValue: transactionPrice * params.quantity, timestamp: Date.now(),
      };
      let finalData = { ...prevData, cash: newCash, portfolio: updatedPortfolio, transactions: [...prevData.transactions, newTransaction] };
      finalData = checkAndAdvanceLevelRef.current(finalData, params.showToastFunc);
      saveSessionToLocalStorage(finalData);
      params.showToastFunc(`Sim: Bought ${params.quantity} of ${params.symbol}`);
      return finalData;
    });
    return { success: true };
  }, [saveSessionToLocalStorage]);

  const recordSellInSession = useCallback((params: {
    symbol: string; quantityToSell: number; showToastFunc: ShowToastFunction;
  }) => {
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) { params.showToastFunc("Error: No active session."); return prevData; }
      const transactionPrice = getTickerCurrentPrice(prevData.marketTickers, params.symbol);
      if (transactionPrice <= 0) { params.showToastFunc(`Error: Ticker ${params.symbol} price invalid.`); return prevData; }
      const stockIndex = prevData.portfolio.findIndex(s => s.symbol === params.symbol);
      const stockToSell = stockIndex > -1 ? prevData.portfolio[stockIndex] : null;
      if (!stockToSell || stockToSell.quantity < params.quantityToSell) { params.showToastFunc("Not enough shares to sell."); return prevData; }
      
      const newCash = prevData.cash + (transactionPrice * params.quantityToSell);
      const updatedPortfolio = prevData.portfolio
        .map(item => item.symbol === params.symbol ? { ...item, quantity: item.quantity - params.quantityToSell } : item)
        .filter(item => item.quantity > 0);
      const newTransaction: LocalTransaction = {
        id: `${Date.now()}-${params.symbol}`, type: 'sell', symbol: params.symbol, name: stockToSell.name, sector: stockToSell.sector,
        quantity: params.quantityToSell, price: transactionPrice,
        totalValue: transactionPrice * params.quantityToSell, timestamp: Date.now(),
      };
      let finalData = { ...prevData, cash: newCash, portfolio: updatedPortfolio, transactions: [...prevData.transactions, newTransaction] };
      finalData = checkAndAdvanceLevelRef.current(finalData, params.showToastFunc);
      saveSessionToLocalStorage(finalData);
      params.showToastFunc(`Sim: Sold ${params.quantityToSell} of ${params.symbol}`);
      return finalData;
    });
    return { success: true };
  }, [saveSessionToLocalStorage]);

  const completeTheoryForCurrentLevel = useCallback((showToastFunc: ShowToastFunction) => {
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) return prevData;
      if (prevData.theoryProgressLevelCompleted < prevData.currentLevel) {
        let updatedData = { ...prevData, theoryProgressLevelCompleted: prevData.currentLevel };
        showToastFunc(`Theory for Level ${prevData.currentLevel} completed! Now check your goals.`);
        updatedData = checkAndAdvanceLevelRef.current(updatedData, showToastFunc);
        saveSessionToLocalStorage(updatedData);
        return updatedData;
      }
      return prevData;
    });
  }, [saveSessionToLocalStorage]);

  const advanceSimulatedWeek = useCallback((showToastFunc: ShowToastFunction) => {
    setSessionData(prevData => {
      if (!prevData || !prevData.isActive) return prevData;
      const newSimulatedWeeksPassed = prevData.simulatedWeeksPassed + 1;
      const { updatedTickers, updatedActiveEvents } = runWeeklyMarketUpdate(
        prevData.marketTickers, newSimulatedWeeksPassed, prevData.activeMarketEvents
      );
      
      let finalSessionData: SimulationSessionData = {
        ...prevData, marketTickers: updatedTickers,
        activeMarketEvents: updatedActiveEvents, simulatedWeeksPassed: newSimulatedWeeksPassed,
      };

      if (newSimulatedWeeksPassed >= MAX_SIMULATION_WEEKS) {
        showToastFunc(`Simulation complete: ${MAX_SIMULATION_WEEKS} weeks reached!`);
        finalSessionData.isActive = false;
        saveSessionToLocalStorage(finalSessionData);
        return finalSessionData;
      }
      
      const stockValue = finalSessionData.portfolio.reduce((acc, item) => acc + (item.quantity * getTickerCurrentPrice(finalSessionData.marketTickers, item.symbol)), 0);
      if (finalSessionData.cash <= 0 && stockValue <= 0) {
        showToastFunc("Simulation ended: You've run out of funds!");
        finalSessionData.isActive = false;
        saveSessionToLocalStorage(finalSessionData);
        return finalSessionData;
      }
      
      showToastFunc(`Simulated Week ${newSimulatedWeeksPassed}. The market has moved...`);
      finalSessionData = checkAndAdvanceLevelRef.current(finalSessionData, showToastFunc);
      saveSessionToLocalStorage(finalSessionData);
      return finalSessionData;
    });
  }, [saveSessionToLocalStorage]);

  return {
    sessionData, isLoadingSession, startNewGuidedSession, resetCurrentSession,
    recordBuyInSession, recordSellInSession, completeTheoryForCurrentLevel, advanceSimulatedWeek,
  };
}