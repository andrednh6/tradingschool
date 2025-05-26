import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
// Corregido: Importar CSSProperties como un tipo usando el modificador 'type' inline.
import { useEffect, useState, type CSSProperties } from "react"; 

type PriceChartProps = {
  history: number[];
  symbol: string;
  currentPrice: number;
};

// Helper para determinar si el modo oscuro está activo
const isDarkMode = () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

export function PriceChart({ history, symbol, currentPrice }: PriceChartProps) {
  const [themeColors, setThemeColors] = useState({
    axis: isDarkMode() ? "#9ca3af" : "#6b7280", // gray-400 dark, gray-500 light
    tooltipBg: isDarkMode() ? "rgb(55 65 81 / 0.9)" : "rgb(255 255 255 / 0.9)", // gray-700 dark, white light
    tooltipBorder: isDarkMode() ? "rgb(75 85 99)" : "rgb(229 231 235)", // gray-600 dark, gray-200 light
    line: "#2563eb" // blue-600
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeColors({
        axis: isDarkMode() ? "#9ca3af" : "#6b7280",
        tooltipBg: isDarkMode() ? "rgb(55 65 81 / 0.9)" : "rgb(255 255 255 / 0.9)",
        tooltipBorder: isDarkMode() ? "rgb(75 85 99)" : "rgb(229 231 235)",
        line: "#2563eb"
      });
    });

    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, []);
  
  const chartHistory = history && history.length > 0 ? [...history, currentPrice] : [currentPrice, currentPrice];

  const data = chartHistory.map((price, idx) => ({
    name: `T-${chartHistory.length - 1 - idx}`,
    price
  }));

  const prices = chartHistory.filter(p => typeof p === 'number');
  let yMin = prices.length > 0 ? Math.min(...prices) : 0;
  let yMax = prices.length > 0 ? Math.max(...prices) : 1;
  const padding = (yMax - yMin) * 0.1 || 0.1;
  yMin = Math.max(0, yMin - padding);
  yMax = yMax + padding;
  if (yMin === yMax) {
    yMin = Math.max(0, yMin - (yMin * 0.1 || 0.1));
    yMax = yMax + (yMax * 0.1 || 0.1);
  }

  const tooltipContentStyle: CSSProperties = { 
    backgroundColor: themeColors.tooltipBg,
    borderColor: themeColors.tooltipBorder,
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
    padding: '8px 12px' 
  };

  const tooltipLabelStyle: CSSProperties = {
    color: themeColors.axis, 
    fontWeight: 'bold',
    marginBottom: '4px', 
    fontSize: '0.8rem' 
  };

  const tooltipItemStyle: CSSProperties = {
    color: themeColors.line 
  };

  return (
    <div className="my-4"> 
      <h3 className="font-semibold text-md mb-2 text-gray-700 dark:text-gray-200">Price History: {symbol}</h3>
      <ResponsiveContainer width="100%" height={200}> 
        <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}> 
          <XAxis 
            dataKey="name" 
            hide={data.length <=2 } 
            stroke={themeColors.axis} 
            tick={{ fontSize: 10 }} 
            axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.5 }} 
            tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.5 }}  
          />
          <YAxis 
            stroke={themeColors.axis} 
            tickFormatter={(tick) => `$${Number(tick).toFixed(2)}`} 
            tick={{ fontSize: 10 }}
            domain={[yMin, yMax]}
            width={prices.length > 0 ? undefined : 0} 
            axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.5 }}
            tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.5 }}
          />
          <Tooltip
            contentStyle={tooltipContentStyle} 
            formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Price"]}
            labelStyle={tooltipLabelStyle} 
            itemStyle={tooltipItemStyle}
            cursor={{ stroke: themeColors.axis, strokeDasharray: '3 3', strokeOpacity: 0.5 }} 
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={themeColors.line} 
            strokeWidth={2} 
            dot={data.length < 10 ? { r: 3, fill: themeColors.line, strokeWidth: 0 } : false} 
            activeDot={{ r: 5, stroke: themeColors.tooltipBg, strokeWidth: 2, fill: themeColors.line }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}