# Chart building utilities
import plotly.graph_objects as go

def build_line_chart(x, y, title):
    fig = go.Figure(data=go.Scatter(x=x, y=y, mode='lines'))
    fig.update_layout(title=title)
    return fig
