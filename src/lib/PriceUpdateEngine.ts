import type { SimulatedMarketTicker, MarketEvent } from '../types/simulation';

// Helper function to get a random number in a range
function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const SIMULATION_SECTORS = ["Technology", "Health", "Energy", "Finance", "Consumer Goods"];

/**
 * Updates market prices for all tickers and manages simple market events for the current week.
 */
export function runWeeklyMarketUpdate(
  currentTickers: SimulatedMarketTicker[],
  currentWeek: number,
  currentActiveEvents: MarketEvent[]
): { updatedTickers: SimulatedMarketTicker[]; updatedActiveEvents: MarketEvent[] } {
  
  let newActiveEvents = [...currentActiveEvents];

  // 1. Filter out expired events
  newActiveEvents = newActiveEvents.filter(event => (currentWeek < event.startWeek + event.durationWeeks));

  // 2. Potentially generate a new simple event
  if (currentWeek > 0 && currentWeek % 2 === 0) { // Chance for a new event every 2 weeks for testing
    if (newActiveEvents.length < 2 && Math.random() < 0.75) { // 75% chance
      let newEvent: MarketEvent | null = null;
      const eventRng = Math.random();
      const eventDuration = Math.floor(getRandomInRange(1, 3));

      if (eventRng < 0.3 && currentTickers.length > 0) {
        const randomTickerIndex = Math.floor(Math.random() * currentTickers.length);
        const targetCompany = currentTickers[randomTickerIndex];
        const isPositiveEvent = Math.random() < 0.6; // Slightly more positive events for testing visibility
        
        newEvent = {
          id: `evt-${Date.now()}-${targetCompany.symbol}`,
          eventName: isPositiveEvent 
            ? `Good news for ${targetCompany.name}!` 
            : `Setback at ${targetCompany.name}.`,
          targetType: 'company',
          targetSymbol: targetCompany.symbol,
          impactFactor: isPositiveEvent ? getRandomInRange(1.05, 1.15) : getRandomInRange(0.85, 0.95), // +/- 5-15%
          startWeek: currentWeek,
          durationWeeks: eventDuration,
        };
      } else if (eventRng < 0.7) {
        const randomSector = SIMULATION_SECTORS[Math.floor(Math.random() * SIMULATION_SECTORS.length)];
        const isPositiveEvent = Math.random() < 0.6;
        newEvent = {
          id: `evt-${Date.now()}-${randomSector}`,
          eventName: isPositiveEvent 
            ? `Positive outlook for the ${randomSector} sector.` 
            : `Challenges ahead for the ${randomSector} sector.`,
          targetType: 'sector',
          targetSector: randomSector,
          impactFactor: isPositiveEvent ? getRandomInRange(1.03, 1.08) : getRandomInRange(0.92, 0.97), // +/- 3-8%
          startWeek: currentWeek,
          durationWeeks: eventDuration,
        };
      } else {
        const isPositiveEvent = Math.random() < 0.6;
        newEvent = {
          id: `evt-${Date.now()}-market`,
          eventName: isPositiveEvent ? "Market sentiment is bullish." : "Market sentiment turns bearish.",
          targetType: 'market',
          impactFactor: isPositiveEvent ? getRandomInRange(1.02, 1.04) : getRandomInRange(0.96, 0.98), // +/- 2-4%
          startWeek: currentWeek,
          durationWeeks: eventDuration,
        };
      }

      if (newEvent) {
        newActiveEvents.push(newEvent);
        console.log(`SIM_EVENT (Week ${currentWeek}): ${newEvent.eventName} (Target: ${newEvent.targetType}, ${newEvent.targetSymbol || newEvent.targetSector || 'Market'}), Impact: ${newEvent.impactFactor.toFixed(3)}, Duration: ${newEvent.durationWeeks}w`);
      }
    }
  }

  // 3. Update prices for each ticker
  const updatedTickers = currentTickers.map(ticker => {
    let priceChangeFactor = 1.0;

    // Apply base trend (more noticeable for testing)
    priceChangeFactor *= (1 + ticker.baseTrend * 2); // Amplified trend

    // Apply base volatility (more noticeable for testing)
    const volatilityEffect = (Math.random() - 0.5) * 2 * (ticker.baseVolatility * 2.5); // Amplified volatility
    priceChangeFactor *= (1 + volatilityEffect);

    // Apply impact of any active market events
    newActiveEvents.forEach(event => {
      if (currentWeek >= event.startWeek && currentWeek < event.startWeek + event.durationWeeks) {
        if (event.targetType === 'market') {
          priceChangeFactor *= event.impactFactor;
        } else if (event.targetType === 'sector' && event.targetSector === ticker.sector) {
          priceChangeFactor *= event.impactFactor;
        } else if (event.targetType === 'company' && event.targetSymbol === ticker.symbol) {
          priceChangeFactor *= event.impactFactor;
        }
      }
    });
    
    let newPrice = ticker.currentPrice * priceChangeFactor;
    newPrice = Math.max(0.01, newPrice); 

    // Log individual price changes for debugging
    // if (ticker.currentPrice !== parseFloat(newPrice.toFixed(2))) {
    //   console.log(`SIM_PRICE_UPDATE: ${ticker.symbol} from ${ticker.currentPrice.toFixed(2)} to ${newPrice.toFixed(2)} (Factor: ${priceChangeFactor.toFixed(4)})`);
    // }

    return {
      ...ticker,
      currentPrice: parseFloat(newPrice.toFixed(2)),
      history: [...ticker.history.slice(-51), parseFloat(newPrice.toFixed(2))],
    };
  });

  return { updatedTickers, updatedActiveEvents: newActiveEvents };
}

export function getTickerCurrentPrice(marketTickers: SimulatedMarketTicker[], symbol: string): number {
  const ticker = marketTickers.find(t => t.symbol === symbol);
  return ticker ? ticker.currentPrice : 0;
}