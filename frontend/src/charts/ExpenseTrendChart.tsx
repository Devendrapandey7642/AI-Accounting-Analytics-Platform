import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDatum } from './chartTypes';

interface ExpenseTrendChartProps {
  data: ChartDatum[];
}

const ExpenseTrendChart: React.FC<ExpenseTrendChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="expenses" stroke="#ff7300" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ExpenseTrendChart;
