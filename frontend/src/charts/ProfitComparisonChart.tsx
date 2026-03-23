import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDatum } from './chartTypes';

interface ProfitComparisonChartProps {
  data: ChartDatum[];
}

const ProfitComparisonChart: React.FC<ProfitComparisonChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="margin" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProfitComparisonChart;
