import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDatum } from './chartTypes';

interface ForecastChartProps {
  data: ChartDatum[];
}

const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
        <Line type="monotone" dataKey="forecast" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ForecastChart;
