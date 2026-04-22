import Plot from 'react-plotly.js'

export const SENTIMENT_COLOR_SCALE = [
  [0.0,  '#d73027'],
  [0.15, '#f46d43'],
  [0.25, '#fdae61'],
  [0.35, '#fee08b'],
  [0.45, '#ffffbf'],
  [0.55, '#d9ef8b'],
  [0.65, '#a6d96a'],
  [0.75, '#66bd63'],
  [0.85, '#1a9850'],
  [1.0,  '#006837'],
]

export const BASE_LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(8,15,30,0.4)',
  font: { color: '#94a3b8', family: 'Space Grotesk, sans-serif', size: 11 },
  margin: { l: 48, r: 16, t: 44, b: 40 },
  hovermode: 'x unified',
  hoverlabel: {
    bgcolor: '#0d1628',
    bordercolor: '#818cf8',
    font: { color: '#f1f5f9', family: 'Space Grotesk, sans-serif', size: 12 },
  },
  legend: {
    bgcolor: 'rgba(8,15,30,0.7)',
    bordercolor: 'rgba(255,255,255,0.08)',
    borderwidth: 1,
    font: { color: '#94a3b8', size: 11 },
  },
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    linecolor: 'rgba(255,255,255,0.08)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
    tickfont: { color: '#475569', size: 10 },
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    linecolor: 'rgba(255,255,255,0.08)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
    tickfont: { color: '#475569', size: 10 },
  },
}

export const DARK_GEO = {
  bgcolor: 'rgba(0,0,0,0)',
  landcolor: '#1a2744',
  showland: true,
  showocean: true,
  oceancolor: '#04080f',
  lakecolor: '#0a1220',
  countrycolor: '#2a3a5c',
  coastlinecolor: '#3a4e6c',
  showframe: false,
  showcoastlines: true,
  projection: { type: 'natural earth' },
}

export const DARK_GEO_USA = {
  scope: 'usa',
  bgcolor: 'rgba(0,0,0,0)',
  landcolor: '#1a2744',
  showland: true,
  lakecolor: '#0a1220',
  showlakes: true,
  subunitcolor: '#2a3a5c',
  showsubunits: true,
}

// Line chart colours that look good on dark bg
export const LINE_COLORS = [
  '#818cf8', '#a78bfa', '#34d399', '#fbbf24',
  '#fb7185', '#38bdf8', '#f97316', '#e879f9',
]

export default function ChartCard({ title, className = '', children, style = {} }) {
  return (
    <div className={`chart-card ${className}`} style={style}>
      {title && <div className="chart-title">{title}</div>}
      {children}
    </div>
  )
}

export function SpacePlot({ data, layout = {}, style = {}, config = {} }) {
  const merged = {
    ...BASE_LAYOUT,
    ...layout,
    xaxis: { ...BASE_LAYOUT.xaxis, ...(layout.xaxis || {}) },
    yaxis: { ...BASE_LAYOUT.yaxis, ...(layout.yaxis || {}) },
    legend: { ...BASE_LAYOUT.legend, ...(layout.legend || {}) },
  }
  return (
    <Plot
      data={data}
      layout={merged}
      config={{ displayModeBar: false, responsive: true, ...config }}
      useResizeHandler
      style={{ width: '100%', height: '100%', minHeight: 280, ...style }}
    />
  )
}
