import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDatum } from './chartTypes';

interface ProductPerformanceChartProps {
  data: ChartDatum[];
}

const ProductPerformanceChart: React.FC<ProductPerformanceChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="budget" fill="#82ca9d" />
        <Bar dataKey="actual" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProductPerformanceChart;
