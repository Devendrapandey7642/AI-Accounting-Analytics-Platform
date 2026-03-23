import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
from backend.utils.logger import logger

class VisualizationAgent:
    def __init__(self, df, column_types):
        self.df = df.copy()
        self.column_types = column_types
        # Convert date columns
        for col, typ in self.column_types.items():
            if typ == 'date':
                self.df[col] = pd.to_datetime(self.df[col], errors='coerce')
        self.charts = []

    def generate_line_charts(self):
        date_cols = [col for col, typ in self.column_types.items() if typ == 'date']
        numeric_cols = [col for col, typ in self.column_types.items() if typ == 'numeric']
        if date_cols and numeric_cols:
            for date_col in date_cols:
                for num_col in numeric_cols:
                    fig = px.line(self.df, x=date_col, y=num_col, title=f'{num_col} Trend')
                    self.charts.append({'type': 'line', 'title': f'{num_col} Trend', 'data': self.df[[date_col, num_col]].to_dict('records'), 'x_key': date_col, 'y_key': num_col})

    def generate_bar_charts(self):
        cat_cols = [col for col, typ in self.column_types.items() if typ == 'categorical']
        numeric_cols = [col for col, typ in self.column_types.items() if typ == 'numeric']
        if cat_cols and numeric_cols:
            for cat_col in cat_cols:
                for num_col in numeric_cols:
                    grouped = self.df.groupby(cat_col)[num_col].sum().reset_index()
                    fig = px.bar(grouped, x=cat_col, y=num_col, title=f'{num_col} by {cat_col}')
                    self.charts.append({'type': 'bar', 'title': f'{num_col} by {cat_col}', 'data': grouped.to_dict('records'), 'x_key': cat_col, 'y_key': num_col})

    def generate_pie_charts(self):
        cat_cols = [col for col, typ in self.column_types.items() if typ == 'categorical']
        numeric_cols = [col for col, typ in self.column_types.items() if typ == 'numeric']
        if cat_cols and numeric_cols:
            for cat_col in cat_cols:
                for num_col in numeric_cols:
                    grouped = self.df.groupby(cat_col)[num_col].sum().reset_index()
                    fig = px.pie(grouped, values=num_col, names=cat_col, title=f'{num_col} Distribution by {cat_col}')
                    self.charts.append({'type': 'pie', 'title': f'{num_col} Distribution by {cat_col}', 'data': grouped.to_dict('records'), 'value_key': num_col, 'name_key': cat_col})

    def generate_scatter_plots(self):
        numeric_cols = [col for col, typ in self.column_types.items() if typ == 'numeric']
        if len(numeric_cols) >= 2:
            for i in range(len(numeric_cols)):
                for j in range(i+1, len(numeric_cols)):
                    fig = px.scatter(self.df, x=numeric_cols[i], y=numeric_cols[j], title=f'{numeric_cols[j]} vs {numeric_cols[i]}')
                    self.charts.append({'type': 'scatter', 'title': f'{numeric_cols[j]} vs {numeric_cols[i]}', 'data': self.df[[numeric_cols[i], numeric_cols[j]]].to_dict('records'), 'x_key': numeric_cols[i], 'y_key': numeric_cols[j]})

    def generate_correlation_heatmap(self):
        numeric_cols = [col for col, typ in self.column_types.items() if typ == 'numeric']
        if len(numeric_cols) > 1:
            corr = self.df[numeric_cols].corr()
            fig = px.imshow(corr, title='Correlation Heatmap')
            # For heatmap, data is the matrix
            corr_data = []
            for i, row in enumerate(corr.values):
                for j, val in enumerate(row):
                    corr_data.append({'x': numeric_cols[i], 'y': numeric_cols[j], 'value': val})
            self.charts.append({'type': 'heatmap', 'title': 'Correlation Heatmap', 'data': corr_data, 'x_labels': numeric_cols, 'y_labels': numeric_cols})

    def generate_charts(self):
        self.generate_line_charts()
        self.generate_bar_charts()
        self.generate_pie_charts()
        self.generate_scatter_plots()
        self.generate_correlation_heatmap()
        # Ensure at least 12 charts, duplicate if necessary
        while len(self.charts) < 12:
            self.charts.extend(self.charts[:12 - len(self.charts)])
        self.charts = self.charts[:12]
        logger.info(f"Generated {len(self.charts)} charts")
        return self.charts
