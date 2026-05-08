/* Enterprise chart theme for Recharts */

export const CHART_COLORS = {
  gain:    '#10b981',
  loss:    '#ef4444',
  warning: '#f59e0b',
  neutral: '#6b7280',
  brand:   '#059669',
  palette: [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#a855f7', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
  ],
}

export const CHART_AXIS = {
  tick:  { fontSize: 11, fontWeight: 500, fill: '#9ca3af' },
  line:  { stroke: '#e5e7eb' },
  grid:  { stroke: '#f3f4f6', strokeDasharray: '3 3' },
}

export const CHART_TOOLTIP = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
    padding: '8px 12px',
    fontSize: 12,
  },
  labelStyle: { fontWeight: 600, color: '#374151', marginBottom: 4 },
  itemStyle:  { color: '#4b5563' },
}

export const CHART_MARGINS = {
  default: { top: 8, right: 8, left: 0, bottom: 0 },
  compact: { top: 4, right: 4, left: 0, bottom: 0 },
}
