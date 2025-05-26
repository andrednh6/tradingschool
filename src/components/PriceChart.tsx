import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type PriceChartProps = {
  history: number[];
  symbol: string;
};

export function PriceChart({ history, symbol }: PriceChartProps) {
  // Genera los datos para la gráfica (X: punto temporal, Y: precio)
  const data = history.map((price, idx) => ({
    name: `T-${history.length - idx}`,
    price
  }));

  return (
    <div className="my-4 bg-white rounded shadow p-4">
      <h3 className="font-bold mb-2">Price History: {symbol}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <XAxis dataKey="name" hide />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
