import type { TheoryCard } from '../types/simulation'; // Ajusta la ruta si es necesario

export const theoryContentByLevel: Record<number, TheoryCard[]> = {
  1: [
{
      title: "What is Investing in a Company?",
      text: "When you buy a stock (or 'ticker'), you're buying a small part of a company. You become one of its owners! If the company does well and grows, the value of your stock can increase."
    },
    {
      title: "Companies and Sectors",
      text: "Each company belongs to a 'sector' (like Technology, Health, Energy). Knowing the sector gives you clues about its business and what might affect its performance. You'll see this info when exploring tickers."
    },
    {
      title: "Two Ways to Analyze: Fundamental vs. Technical",
      text: "There are two main approaches to analyzing stocks:\n1) **Fundamental Analysis:** Focuses on the 'health' and value of the company (its earnings, debts, etc.).\n2) **Technical Analysis:** Focuses on studying price charts to predict future movements.\nWe'll start with the basics of both!"
    }
  ],
  2: [
    { title: "Companies Behind Stocks", text: "When you buy a stock (like 'ALPHA'), you're buying a share of a real company (e.g., 'Alpha Corp').\n\nThis means you own a tiny piece of that business! If the company does well, its stock value might go up." },
    {
      title: "Understanding Industry Sectors",
      text: "Companies are grouped into 'sectors' based on what they do (e.g., Technology, Health, Energy).\n\nKnowing a company's sector helps you understand its business and what might affect its performance. You'll see this info for each ticker."
    },
    {
      title: "Why Sectors Matter (Basics)",
      text: "Events can affect entire sectors. For example, new technology might boost all 'Tech' stocks, while new regulations could impact 'Energy' companies.\n\nTry to notice how different sectors behave!"
    }
  ],
  3: [    {
      title: "News & Events Impact Prices",
      text: "Stock prices don't move randomly! News about a company (like a new product), its sector, or the economy in general can cause prices to change.\n\nGood news often pushes prices up, bad news can push them down."
    },
    {
      title: "What is Market Sentiment?",
      text: "Market 'sentiment' is the overall attitude of investors. If most investors are optimistic, prices might rise (a 'bull market'). If they're pessimistic, prices might fall (a 'bear market').\n\nOur simple news feed will give you a hint of this!"
    },
    {
      title: "Connect News to Your Stocks",
      text: "Pay attention to the simple 'Market News' headlines in the simulation.\n\nThink: Could this news affect the sectors or companies you've invested in? This is the start of fundamental thinking!"
    }],
  4: [    {
      title: "What's a Price Chart?",
      text: "The price chart shows you a stock's price history. The horizontal axis (X) is time (weeks in our sim), and the vertical axis (Y) is the price.\n\nThe line shows how the price has moved."
    },
    {
      title: "Spotting Basic Trends",
      text: "Look at the overall direction of the price line:\n- **Uptrend ↗️:** Generally moving higher.\n- **Downtrend ↘️:** Generally moving lower.\n- **Sideways ➡️:** Moving in a range, no clear direction.\nIdentifying these helps make decisions."
    },
    {
      title: "Tool Unlocked: Simple Moving Average (SMA)",
      text: "You've unlocked the SMA! This line smooths out prices to help you see the underlying trend more clearly.\n\nIt's calculated by averaging the price over a set period (e.g., the last 10 weeks)."
    }],
  5: [    {
      title: "Using Your SMA for Signals",
      text: "Some traders use the SMA for simple signals:\n- If the price crosses *above* the SMA ↗️, it might be a buy signal.\n- If the price crosses *below* the SMA ↘️, it might be a sell signal.\nRemember, these are just indicators, not guarantees!"
    },
    {
      title: "Visual Support & Resistance",
      text: "Look for price 'floors' (Support) where the price often stops falling and bounces up. Or 'ceilings' (Resistance) where it stops rising and might turn down.\n\nThese are levels where buying or selling pressure has historically been strong."
    },
    {
      title: "Training Complete - Ready for More!",
      text: "Congratulations! You've learned the basics of fundamental and technical analysis in our simulation.\n\nYou're now better prepared to understand market movements. Great job!"
    }],
  // ... Futuros niveles y su contenido
};