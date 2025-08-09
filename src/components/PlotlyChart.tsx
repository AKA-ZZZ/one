import React, { useEffect, useRef } from 'react';
import * as Plotly from 'plotly.js-dist';

import { DataFile, ChartConfig } from '../App';

interface PlotlyChartProps {
  data: DataFile | null;
  config: ChartConfig;
  onCodeGenerated?: (code: string) => void;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ data, config, onCodeGenerated }) => {
  const plotRef = useRef<HTMLDivElement>(null);

  const generatePlotlyChart = () => {
    if (!data || !plotRef.current || !config.xAxis || !config.yAxis) return;

    const chartData = data.data.filter(d => d[config.xAxis!] && d[config.yAxis!]);
    
    let plotData: any[] = [];
    let layout: any = {
      title: {
        text: config.title,
        font: { color: config.theme === 'dark' ? '#e5e7eb' : '#374151' }
      },
      paper_bgcolor: config.theme === 'dark' ? '#111827' : '#ffffff',
      plot_bgcolor: config.theme === 'dark' ? '#1f2937' : '#f9fafb',
      font: { color: config.theme === 'dark' ? '#e5e7eb' : '#374151' },
      width: config.width,
      height: config.height,
      xaxis: {
        title: config.xAxis,
        gridcolor: config.theme === 'dark' ? '#374151' : '#e5e7eb',
        color: config.theme === 'dark' ? '#e5e7eb' : '#374151'
      },
      yaxis: {
        title: config.yAxis,
        gridcolor: config.theme === 'dark' ? '#374151' : '#e5e7eb',
        color: config.theme === 'dark' ? '#e5e7eb' : '#374151'
      },
      margin: { t: 60, r: 30, b: 60, l: 60 }
    };

    switch (config.type) {
      case 'bar':
        if (config.colorBy) {
          // Group by colorBy field
          const groups = new Map();
          chartData.forEach(d => {
            const group = d[config.colorBy!];
            if (!groups.has(group)) {
              groups.set(group, { x: [], y: [] });
            }
            groups.get(group).x.push(d[config.xAxis!]);
            groups.get(group).y.push(+d[config.yAxis!]);
          });
          
          groups.forEach((values, group) => {
            plotData.push({
              x: values.x,
              y: values.y,
              type: 'bar',
              name: group,
              marker: {
                color: `hsl(${Array.from(groups.keys()).indexOf(group) * 360 / groups.size}, 70%, 50%)`
              }
            });
          });
        } else {
          // Simple aggregation
          const grouped = new Map();
          chartData.forEach(d => {
            const key = d[config.xAxis!];
            grouped.set(key, (grouped.get(key) || 0) + (+d[config.yAxis!]));
          });
          
          plotData.push({
            x: Array.from(grouped.keys()),
            y: Array.from(grouped.values()),
            type: 'bar',
            marker: { color: '#3b82f6' }
          });
        }
        break;

      case 'line':
        const sortedData = chartData.sort((a, b) => {
          if (data.fields.find(f => f.name === config.xAxis)?.type === 'date') {
            return new Date(a[config.xAxis!]).getTime() - new Date(b[config.xAxis!]).getTime();
          }
          return a[config.xAxis!] - b[config.xAxis!];
        });
        
        plotData.push({
          x: sortedData.map(d => d[config.xAxis!]),
          y: sortedData.map(d => +d[config.yAxis!]),
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: '#3b82f6', width: 2 },
          marker: { color: '#3b82f6', size: 6 }
        });
        break;

      case 'scatter':
        if (config.colorBy) {
          const groups = new Map();
          chartData.forEach(d => {
            const group = d[config.colorBy!];
            if (!groups.has(group)) {
              groups.set(group, { x: [], y: [] });
            }
            groups.get(group).x.push(d[config.xAxis!]);
            groups.get(group).y.push(+d[config.yAxis!]);
          });
          
          groups.forEach((values, group) => {
            plotData.push({
              x: values.x,
              y: values.y,
              type: 'scatter',
              mode: 'markers',
              name: group,
              marker: {
                color: `hsl(${Array.from(groups.keys()).indexOf(group) * 360 / groups.size}, 70%, 50%)`,
                size: 8
              }
            });
          });
        } else {
          plotData.push({
            x: chartData.map(d => d[config.xAxis!]),
            y: chartData.map(d => +d[config.yAxis!]),
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#3b82f6', size: 8 }
          });
        }
        break;

      case 'pie':
        if (config.colorBy) {
          const counts = new Map();
          chartData.forEach(d => {
            const key = d[config.colorBy!];
            counts.set(key, (counts.get(key) || 0) + 1);
          });
          
          plotData.push({
            labels: Array.from(counts.keys()),
            values: Array.from(counts.values()),
            type: 'pie',
            textinfo: 'label+percent',
            textposition: 'outside'
          });
        }
        break;

      case 'area':
        const areaSortedData = chartData.sort((a, b) => {
          if (data.fields.find(f => f.name === config.xAxis)?.type === 'date') {
            return new Date(a[config.xAxis!]).getTime() - new Date(b[config.xAxis!]).getTime();
          }
          return a[config.xAxis!] - b[config.xAxis!];
        });
        
        plotData.push({
          x: areaSortedData.map(d => d[config.xAxis!]),
          y: areaSortedData.map(d => +d[config.yAxis!]),
          type: 'scatter',
          mode: 'lines',
          fill: 'tonexty',
          line: { color: '#3b82f6', width: 2 },
          fillcolor: 'rgba(59, 130, 246, 0.3)'
        });
        break;
    }

    const plotConfig = {
      responsive: true,
      displayModeBar: false,
      displaylogo: false,
    } as any;

    Plotly.newPlot(plotRef.current, plotData, layout, plotConfig);

    // Generate code
    if (onCodeGenerated) {
      const code = generatePlotlyCode(plotData, layout, plotConfig);
      onCodeGenerated(code);
    }
  };

  const generatePlotlyCode = (plotData: any[], layout: any, plotConfig: any): string => {
    return `// Plotly.js Chart Code
// Generated by DynaChart Studio

const data = ${JSON.stringify(plotData, null, 2)};

const layout = ${JSON.stringify(layout, null, 2)};

const config = ${JSON.stringify(plotConfig, null, 2)};

// Create the plot
Plotly.newPlot('chart-container', data, layout, config);

// Data source: ${data?.name || 'Unknown'}
// Chart type: ${config.type}
// X-axis: ${config.xAxis}
// Y-axis: ${config.yAxis}
// Theme: ${config.theme}`;
  };

  useEffect(() => {
    generatePlotlyChart();
  }, [data, config]);

  return (
    <div 
      ref={plotRef} 
      className="w-full h-full min-h-[400px]" 
      style={{ 
        background: config.theme === 'dark' ? '#111827' : '#ffffff',
        borderRadius: '8px'
      }}
    />
  );
};

export default PlotlyChart;