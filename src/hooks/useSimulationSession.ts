import { useState, useEffect, useCallback, useReducer } from 'react';
import type { SimulationSessionData, LocalPortfolioItem, LocalTransaction, ShowToastFunction, SimulatedMarketTicker, MarketEvent } from '../types/simulation';
import { runWeeklyMarketUpdate, getTickerCurrentPrice } from '../lib/PriceUpdateEngine';

const LOCAL_STORAGE_KEY = 'tradingSchool_simulationSession';
const DEFAULT_INITIAL_CASH = 1000;
const MAX_LEVEL_MVP = 5;
const MAX_SIMULATION_WEEKS = 52;

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

// --- STATE MANAGEMENT WITH A REDUCER ---
// This prevents stale state issues by centralizing all state modifications.

type Action =
  | { type: 'SET_SESSION'; payload: SimulationSessionData | null }
  | { type: 'BUY_STOCK'; payload: { symbol: string; name: string; sector: string; quantity: number; showToastFunc: ShowToastFunction } }
  | { type: 'SELL_STOCK'; payload: { symbol: string; quantityToSell: number; showToastFunc: ShowToastFunction } }
  | { type: 'COMPLETE_THEORY'; payload: { showToastFunc: ShowToastFunction } }
  | { type: 'ADVANCE_WEEK'; payload: { showToastFunc: ShowToastFunction } }
  | { type: 'START_NEW_SESSION' }
  | { type: 'RESET_SESSION' };

function sessionReducer(state: SimulationSessionData | null, action: Action): SimulationSessionData | null {
  switch (action.type) {
    case 'SET_SESSION':
      return action.payload;
    
    case 'START_NEW_SESSION':
      return createDefaultSessionData(DEFAULT_INITIAL_CASH);
    
    case 'RESET_SESSION':
      return null;

    case 'BUY_STOCK': {
      if (!state || !state.isActive) { action.payload.showToastFunc("Error: No active session."); return state; }
      const transactionPrice = getTickerCurrentPrice(state.marketTickers, action.payload.symbol);
      if (transactionPrice <= 0) { action.payload.showToastFunc(`Error: Ticker ${action.payload.symbol} price invalid.`); return state; }
      if (state.cash < transactionPrice * action.payload.quantity) { action.payload.showToastFunc("Insufficient funds."); return state; }
      
      const newCash = state.cash - (transactionPrice * action.payload.quantity);
      let portfolioUpdated = false;
      const updatedPortfolio = state.portfolio.map(item => {
        if (item.symbol === action.payload.symbol) {
          portfolioUpdated = true;
          return { ...item, quantity: item.quantity + action.payload.quantity };
        }
        return item;
      });
      if (!portfolioUpdated) {
        updatedPortfolio.push({ symbol: action.payload.symbol, name: action.payload.name, sector: action.payload.sector, quantity: action.payload.quantity });
      }
      const newTransaction: LocalTransaction = {
        id: `${Date.now()}-${action.payload.symbol}`, type: 'buy', ...action.payload, price: transactionPrice,
        totalValue: transactionPrice * action.payload.quantity, timestamp: Date.now(),
      };
      let finalData = { ...state, cash: newCash, portfolio: updatedPortfolio, transactions: [...state.transactions, newTransaction] };
      action.payload.showToastFunc(`Sim: Bought ${action.payload.quantity} of ${action.payload.symbol}`);
      return checkAndAdvanceLevel(finalData, action.payload.showToastFunc);
    }
    
    case 'SELL_STOCK': {
      if (!state || !state.isActive) { action.payload.showToastFunc("Error: No active session."); return state; }
      const transactionPrice = getTickerCurrentPrice(state.marketTickers, action.payload.symbol);
      if (transactionPrice <= 0) { action.payload.showToastFunc(`Error: Ticker ${action.payload.symbol} price invalid.`); return state; }
      const stockIndex = state.portfolio.findIndex(s => s.symbol === action.payload.symbol);
      const stockToSell = stockIndex > -1 ? state.portfolio[stockIndex] : null;
      if (!stockToSell || stockToSell.quantity < action.payload.quantityToSell) { action.payload.showToastFunc("Not enough shares to sell."); return state; }
      
      const newCash = state.cash + (transactionPrice * action.payload.quantityToSell);
      const updatedPortfolio = state.portfolio
        .map(item => item.symbol === action.payload.symbol ? { ...item, quantity: item.quantity - action.payload.quantityToSell } : item)
        .filter(item => item.quantity > 0);
      const newTransaction: LocalTransaction = {
        id: `${Date.now()}-${action.payload.symbol}`, type: 'sell', symbol: action.payload.symbol, name: stockToSell.name, sector: stockToSell.sector,
        quantity: action.payload.quantityToSell, price: transactionPrice,
        totalValue: transactionPrice * action.payload.quantityToSell, timestamp: Date.now(),
      };
      let finalData = { ...state, cash: newCash, portfolio: updatedPortfolio, transactions: [...state.transactions, newTransaction] };
      action.payload.showToastFunc(`Sim: Sold ${action.payload.quantityToSell} of ${action.payload.symbol}`);
      return checkAndAdvanceLevel(finalData, action.payload.showToastFunc);
    }

    case 'COMPLETE_THEORY': {
      if (!state || !state.isActive) return state;
      if (state.theoryProgressLevelCompleted < state.currentLevel) {
        let updatedData = { ...state, theoryProgressLevelCompleted: state.currentLevel };
        action.payload.showToastFunc(`Theory for Level ${state.currentLevel} completed! Now check your goals.`);
        return checkAndAdvanceLevel(updatedData, action.payload.showToastFunc);
      }
      return state;
    }

    case 'ADVANCE_WEEK': {
      if (!state || !state.isActive) return state;
      const newSimulatedWeeksPassed = state.simulatedWeeksPassed + 1;
      const { updatedTickers, updatedActiveEvents } = runWeeklyMarketUpdate(
        state.marketTickers, newSimulatedWeeksPassed, state.activeMarketEvents
      );
      
      let finalSessionData: SimulationSessionData = {
        ...state, marketTickers: updatedTickers,
        activeMarketEvents: updatedActiveEvents, simulatedWeeksPassed: newSimulatedWeeksPassed,
      };

      if (newSimulatedWeeksPassed >= MAX_SIMULATION_WEEKS) {
        action.payload.showToastFunc(`Simulation complete: ${MAX_SIMULATION_WEEKS} weeks reached!`);
        finalSessionData.isActive = false;
        return finalSessionData;
      }
      
      const stockValue = finalSessionData.portfolio.reduce((acc, item) => acc + (item.quantity * getTickerCurrentPrice(finalSessionData.marketTickers, item.symbol)), 0);
      if (finalSessionData.cash <= 0 && stockValue <= 0) {
        action.payload.showToastFunc("Simulation ended: You've run out of funds!");
        finalSessionData.isActive = false;
        return finalSessionData;
      }
      
      action.payload.showToastFunc(`Simulated Week ${newSimulatedWeeksPassed}. The market has moved...`);
      return checkAndAdvanceLevel(finalSessionData, action.payload.showToastFunc);
    }
    
    default:
      return state;
  }
}

// Pure function to check for level advancement
function checkAndAdvanceLevel(currentData: SimulationSessionData, showToastFunc: ShowToastFunction): SimulationSessionData {
    if (!currentData.isActive || currentData.currentLevel >= MAX_LEVEL_MVP) return currentData;
    const theoryMet = currentData.theoryProgressLevelCompleted >= currentData.currentLevel;
    if (!theoryMet) return currentData;
    
    const goals = LEVEL_GOALS[currentData.currentLevel];
    let goalsMet = true;
    if (!goals) { console.warn(`No goals for level ${currentData.currentLevel}`); return currentData; }

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
      if (newLevel > MAX_LEVEL_MVP) {
        return { ...currentData, currentLevel: MAX_LEVEL_MVP, isActive: false };
      }
      return { ...currentData, currentLevel: newLevel };
    }
    return currentData;
}


// --- THE HOOK ---
export function useSimulationSession() {
  const [sessionData, dispatch] = useReducer(sessionReducer, null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Initial load from localStorage
  useEffect(() => {
    setIsLoadingSession(true);
    try {
      const savedSessionJson = localStorage.getItem(LOCAL_STORAGE_KEY);
      const initialSession = savedSessionJson ? JSON.parse(savedSessionJson) as SimulationSessionData : null;
      if (initialSession && initialSession.isActive === false) {
        // If loaded session was completed, don't resume it.
        dispatch({ type: 'SET_SESSION', payload: null });
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } else {
        dispatch({ type: 'SET_SESSION', payload: initialSession });
      }
    } catch (error) {
      console.error("Error loading session:", error);
      dispatch({ type: 'SET_SESSION', payload: null });
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    setIsLoadingSession(false);
  }, []);

  // Save to localStorage whenever sessionData changes
  useEffect(() => {
    if (!isLoadingSession) { // Don't save during initial load
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionData));
    }
  }, [sessionData, isLoadingSession]);

  // Memoized action dispatchers
  const startNewGuidedSession = useCallback(() => dispatch({ type: 'START_NEW_SESSION' }), []);
  const resetCurrentSession = useCallback(() => dispatch({ type: 'RESET_SESSION' }), []);
  const recordBuyInSession = useCallback((payload: { symbol: string; name: string; sector: string; quantity: number; showToastFunc: ShowToastFunction }) => dispatch({ type: 'BUY_STOCK', payload }), []);
  const recordSellInSession = useCallback((payload: { symbol: string; quantityToSell: number; showToastFunc: ShowToastFunction }) => dispatch({ type: 'SELL_STOCK', payload }), []);
  const completeTheoryForCurrentLevel = useCallback((payload: { showToastFunc: ShowToastFunction }) => dispatch({ type: 'COMPLETE_THEORY', payload }), []);
  const advanceSimulatedWeek = useCallback((payload: { showToastFunc: ShowToastFunction }) => dispatch({ type: 'ADVANCE_WEEK', payload }), []);

  return {
    sessionData, isLoadingSession, startNewGuidedSession, resetCurrentSession,
    recordBuyInSession, recordSellInSession, completeTheoryForCurrentLevel, advanceSimulatedWeek,
  };
}