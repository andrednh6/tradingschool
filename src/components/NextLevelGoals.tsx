import { useSimulationSession } from "../hooks/useSimulationSession";
import { LEVEL_GOALS } from "../hooks/useSimulationSession"; // Import goals from the hook file
import { getTickerCurrentPrice } from "../lib/PriceUpdateEngine";

// Helper component for a single goal item
const GoalItem = ({ text, isCompleted }: { text: string; isCompleted: boolean }) => (
  <li className="flex items-center text-sm">
    <span className={`mr-2 ${isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
      {isCompleted ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
    </span>
    <span className={isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
      {text}
    </span>
  </li>
);


export function NextLevelGoals() {
  const { sessionData } = useSimulationSession();

  if (!sessionData || !sessionData.isActive || sessionData.currentLevel > 5) {
    return null; // Don't show if no session, or if all levels are complete
  }

  const { currentLevel, theoryProgressLevelCompleted, transactions, simulatedWeeksPassed, portfolio, cash, marketTickers } = sessionData;
  const goals = LEVEL_GOALS[currentLevel];

  if (!goals) {
    return (
      <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Next Level Objectives</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">You've completed all available training levels!</p>
      </div>
    );
  }

  // Calculate current progress
  const theoryMet = theoryProgressLevelCompleted >= currentLevel;
  const buyTransactions = transactions.filter(t => t.type === 'buy').length;
  const sellTransactions = transactions.filter(t => t.type === 'sell').length;
  const totalTransactions = transactions.length;
  const hasStocks = portfolio.some(s => s.quantity > 0);
  const uniqueSectors = new Set(portfolio.map(s => s.sector)).size;
  const stockValue = portfolio.reduce((acc, item) => acc + (item.quantity * getTickerCurrentPrice(marketTickers, item.symbol)), 0);
  const totalValue = cash + stockValue;
  
  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Objectives for Level {currentLevel}</h3>
      <ul className="mt-3 space-y-2">
        <GoalItem text="Complete Theory Lesson" isCompleted={theoryMet} />
        
        {goals.simulatedWeeksMin !== undefined && (
          <GoalItem text={`Simulate Weeks: ${simulatedWeeksPassed} / ${goals.simulatedWeeksMin}`} isCompleted={simulatedWeeksPassed >= goals.simulatedWeeksMin} />
        )}
        {goals.buyTransactionsMin !== undefined && (
          <GoalItem text={`Make Buys: ${buyTransactions} / ${goals.buyTransactionsMin}`} isCompleted={buyTransactions >= goals.buyTransactionsMin} />
        )}
        {goals.sellTransactionsMin !== undefined && (
          <GoalItem text={`Make Sells: ${sellTransactions} / ${goals.sellTransactionsMin}`} isCompleted={sellTransactions >= goals.sellTransactionsMin} />
        )}
        {goals.totalTransactionsMin !== undefined && (
          <GoalItem text={`Total Trades: ${totalTransactions} / ${goals.totalTransactionsMin}`} isCompleted={totalTransactions >= goals.totalTransactionsMin} />
        )}
        {goals.hasStocksInPortfolio && (
          <GoalItem text="Own at least one stock" isCompleted={hasStocks} />
        )}
        {goals.sectorsInPortfolioMin !== undefined && (
          <GoalItem text={`Own stocks in sectors: ${uniqueSectors} / ${goals.sectorsInPortfolioMin}`} isCompleted={uniqueSectors >= goals.sectorsInPortfolioMin} />
        )}
        {goals.portfolioValueMin !== undefined && (
          <GoalItem text={`Reach Portfolio Value: $${totalValue.toFixed(0)} / $${goals.portfolioValueMin}`} isCompleted={totalValue >= goals.portfolioValueMin} />
        )}
      </ul>
    </div>
  );
}
