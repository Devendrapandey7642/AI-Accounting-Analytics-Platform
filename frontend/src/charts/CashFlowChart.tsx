import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDatum } from './chartTypes';

interface CashFlowChartProps {
  data: ChartDatum[];
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="inflow" fill="#82ca9d" />
        <Bar dataKey="outflow" fill="#ff7300" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CashFlowChart;
