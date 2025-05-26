import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useEffect, useState, type CSSProperties } from "react"; 

type PriceChartProps = {
  history: number[];
  symbol: string;
  currentPrice: number;
};

export function PriceChart({ history, symbol, currentPrice }: PriceChartProps) {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setCurrentTheme(mediaQuery.matches ? 'dark' : 'light');
    handleChange(); 
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const themeColors = {
    axis: currentTheme === 'dark' ? "#9ca3af" : "#6b7280",
    tooltipBg: currentTheme === 'dark' ? "rgb(55 65 81 / 0.95)" : "rgb(255 255 255 / 0.95)",
    tooltipBorder: currentTheme === 'dark' ? "rgb(75 85 99)" : "rgb(229 231 235)",
    line: "#3b82f6", // Azul para el gráfico de precios
    activeDotStroke: currentTheme === 'dark' ? '#374151' : '#ffffff',
    grid: currentTheme === 'dark' ? "rgba(100, 116, 139, 0.2)" : "rgba(203, 213, 225, 0.5)"
  };
  
  // Asegurar que el historial no esté vacío y añadir el precio actual como último punto.
  // Filtrar cualquier valor no numérico del historial.
  const validHistory = Array.isArray(history) ? history.filter(price => typeof price === 'number' && !isNaN(price)) : [];
  const currentPriceNum = typeof currentPrice === 'number' && !isNaN(currentPrice) ? currentPrice : (validHistory.length > 0 ? validHistory[validHistory.length -1] : 0);

  let chartHistory: number[];
  if (validHistory.length > 0) {
    chartHistory = [...validHistory, currentPriceNum];
  } else if (currentPriceNum !== undefined) { // Si solo hay precio actual (o el historial estaba vacío/inválido)
    chartHistory = [currentPriceNum, currentPriceNum]; // Duplicar para dibujar una línea si solo hay un punto
  } else {
    chartHistory = [0, 0]; // Fallback si no hay datos
  }


  const data = chartHistory.map((price, idx) => ({
    name: `P${idx}`, // Puntos de datos simples
    price: price 
  }));

  // console.log(`PriceChart (${symbol}) data:`, JSON.stringify(data)); // Descomentar para depurar datos

  const prices = data.map(d => d.price); // Ya son números aquí
  let yMin = prices.length > 0 ? Math.min(...prices) : 0;
  let yMax = prices.length > 0 ? Math.max(...prices) : 1;
  
  if (isNaN(yMin)) yMin = 0;
  if (isNaN(yMax)) yMax = 1;

  const paddingPercentage = 0.1; 
  const range = yMax - yMin;

  if (range === 0) { 
    yMin = Math.max(0, yMin - Math.abs(yMin * paddingPercentage || 0.1)); // Evitar NaN si yMin es 0
    yMax = yMax + Math.abs(yMax * paddingPercentage || 0.1);
    if (yMin === yMax) { 
        yMax = yMin + 1; 
    }
  } else {
    const paddingValue = range * paddingPercentage;
    yMin = Math.max(0, yMin - paddingValue);
    yMax = yMax + paddingValue;
  }

  // console.log(`PriceChart (${symbol}) Y-Axis Domain: [${yMin}, ${yMax}]`); // Descomentar para depurar dominio

  const tooltipContentStyle: CSSProperties = { 
    backgroundColor: themeColors.tooltipBg,
    borderColor: themeColors.tooltipBorder,
    borderStyle: 'solid',
    borderWidth: '1px',   
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
  
  const showChartPlaceholder = data.length <= 1 && data.every(d => d.price === (data[0]?.price || 0));


  if (showChartPlaceholder && (currentPrice === 0 || currentPrice === undefined) && validHistory.length === 0) {
    return (
      <div className="my-4">
        <h3 className="font-semibold text-md mb-2 text-gray-700 dark:text-gray-300">Price History: {symbol}</h3>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm h-[200px] flex items-center justify-center">
          Not enough price data to display chart.
        </div>
      </div>
    );
  }

  return (
    <div className="my-4"> 
      <h3 className="font-semibold text-md mb-2 text-gray-700 dark:text-gray-300">Price History: {symbol}</h3>
      <ResponsiveContainer width="100%" height={200}> 
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}> 
          <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
          <XAxis 
            dataKey="name" 
            hide={true} // Mantenemos oculto el eje X ya que P0, P1... no son significativos para el usuario
            stroke={themeColors.axis} 
            tick={{ fontSize: 10, fill: themeColors.axis }} 
            axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
            tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
          />
          <YAxis 
            stroke={themeColors.axis} 
            tickFormatter={(tick) => `$${Number(tick).toFixed(2)}`} 
            tick={{ fontSize: 10, fill: themeColors.axis }}
            domain={[yMin, yMax]}
            // width={prices.length > 0 ? undefined : 0} // Permitir que Recharts calcule el ancho
            allowDataOverflow={true}
            axisLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
            tickLine={{ stroke: themeColors.axis, strokeOpacity: 0.6 }}
          />
          <Tooltip
            contentStyle={tooltipContentStyle} 
            formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Price"]}
            // labelFormatter={(label) => `Data Point: ${label}`} // Opcional si quieres ver P0, P1...
            labelStyle={tooltipLabelStyle} 
            itemStyle={tooltipItemStyle}
            cursor={{ stroke: themeColors.axis, strokeDasharray: '3 3', strokeOpacity: 0.5 }} 
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={themeColors.line} 
            strokeWidth={2.5} 
            dot={data.length < 15 ? { r: 3, fill: themeColors.line, strokeWidth: 0 } : false} 
            activeDot={{ r: 6, stroke: themeColors.activeDotStroke, strokeWidth: 2, fill: themeColors.line }} 
            isAnimationActive={false} // Mantener desactivada para depurar
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}