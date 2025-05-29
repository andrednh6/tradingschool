export type LocalPortfolioItem = {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  // Para cálculos de P&L más precisos por acción en el futuro, podríamos añadir:
  // averagePurchasePrice?: number;
  // firstPurchaseDate?: number;
};

export type LocalTransaction = {
  id: string; // ID único para la transacción (ej. `Date.now().toString() + symbol`)
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  price: number; // Precio por acción
  totalValue: number; // quantity * price
  timestamp: number; // Momento de la transacción (ej. Date.now())
};

// Contenido para las Info Cards de la Teoría
export type TheoryCard = {
  title: string;
  text: string;
};

// Para la función showToast que se pasa como parámetro
export type ShowToastFunction = (message: string) => void;

export interface SimulatedMarketTicker {
  readonly symbol: string; // Readonly for identifier
  readonly name: string;
  readonly sector: string;
  currentPrice: number;
  history: number[]; // History of prices in this simulation run
  readonly baseVolatility: number; // e.g., 0.02 (2% typical weekly change)
  readonly baseTrend: number;     // e.g., 0.001 (0.1% general weekly drift)
}

export interface MarketEvent {
  id: string;
  eventName: string;        // e.g., "Positive Market Outlook", "Tech Sector Surge", "Unexpected Issue at [Company]"
  targetType: 'market' | 'sector' | 'company';
  targetSector?: string;   // Used if targetType is 'sector'
  targetSymbol?: string;   // Used if targetType is 'company'
  impactFactor: number;   // e.g., 1.05 for +5%, 0.95 for -5%
  startWeek: number;
  durationWeeks: number;
}

export interface SimulationSessionData {
  isActive: boolean;
  currentLevel: number;
  theoryProgressLevelCompleted: number;
  cash: number;
  portfolio: LocalPortfolioItem[];
  transactions: LocalTransaction[];
  simulatedWeeksPassed: number;
  marketTickers: SimulatedMarketTicker[];
  activeMarketEvents: MarketEvent[]; 
}