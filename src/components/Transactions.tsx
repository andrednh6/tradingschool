import { useEffect } from 'react'; // <-- ADDED IMPORT FOR useEffect
import type { LocalTransaction } from '../types/simulation'; // Ensure path is correct

interface TransactionsProps {
  transactions: LocalTransaction[];
  isLoadingSession: boolean;
  isActiveSession: boolean;
}

export function Transactions({ transactions, isLoadingSession, isActiveSession }: TransactionsProps) {
  useEffect(() => {
    // This log helps confirm Transactions.tsx is getting the latest props
    console.log('[Transactions.tsx] Props received. isLoading:', isLoadingSession, 'isActive:', isActiveSession, 'transactions count:', transactions.length);
  }, [transactions, isLoadingSession, isActiveSession]);

  if (isLoadingSession) {
    return <div className="my-4 p-4 text-center text-gray-700 dark:text-gray-300">Loading transaction history...</div>;
  }

  if (!isActiveSession) {
    return (
      <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Transaction History (Simulation)</h2>
        <p className="text-center py-6 text-gray-500 dark:text-gray-400">No active simulation session to display transactions.</p>
      </div>
    );
  }
  
  if (!transactions || transactions.length === 0) {
    return (
      <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Transaction History (Simulation)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No transactions made in this simulation session yet.</p>
      </div>
    );
  }

  const sortedTransactions = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-xl">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Transaction History (Simulation)</h2>
      <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {sortedTransactions.map((tx) => (
          <div 
            key={tx.id} 
            className={`p-3 rounded-md shadow-sm text-xs
                        ${tx.type === 'buy' 
                          ? 'bg-green-50 dark:bg-green-900/40 border-l-4 border-green-500' 
                          : 'bg-red-50 dark:bg-red-900/40 border-l-4 border-red-500'}`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`font-semibold text-sm ${tx.type === 'buy' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {tx.type.toUpperCase()} {tx.symbol}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              {tx.quantity} shares @ ${tx.price.toFixed(2)}
            </div>
            <div className="text-gray-800 dark:text-gray-200 font-medium">
              Total: ${tx.totalValue.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}