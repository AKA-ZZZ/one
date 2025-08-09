import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Download, Code, RotateCcw } from 'lucide-react';
import PlotlyChart from './PlotlyChart';
import CodeExporter from './CodeExporter';

// 懒加载D3.js以提高性能
let d3: any = null;
const loadD3 = async () => {
  if (!d3) {
    d3 = await import('d3');
  }
  return d3;
};

import { DataFile, ChartConfig } from '../App';



interface ChartDisplayPanelProps {
  data: DataFile | null;
  config: ChartConfig;
  shouldGenerate: boolean;
  onGenerateComplete: () => void;
  isGenerating: boolean;
  chartEngine: 'd3' | 'plotly';
  onExportCode: () => void;
}

const ChartDisplayPanel: React.FC<ChartDisplayPanelProps> = ({
  data: dataFile,
  config,
  shouldGenerate,
  onGenerateComplete,
  isGenerating: propIsGenerating,
  chartEngine,
  onExportCode: _onExportCode
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const combinedIsGenerating = propIsGenerating || localIsGenerating;
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [showCode, setShowCode] = useState(false);
  const [localChartEngine, setLocalChartEngine] = useState<'d3' | 'plotly'>(chartEngine);
  const [showExporter, setShowExporter] = useState(false);

  const generateBarChart = (container: any, d3: any) => {
    if (!dataFile || !config.xAxis || !config.yAxis) return;

    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const width = config.width - margin.left - margin.right;
    const height = config.height - margin.top - margin.bottom;

    // Clear previous chart
    container.selectAll('*').remove();

    const svg = container
      .attr('width', config.width)
      .attr('height', config.height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process data
    const chartData = dataFile.data.filter((d: any) => d[config.xAxis!] && d[config.yAxis!]);
    
    // Group data if needed
    let processedData;
    if (config.colorBy) {
      const grouped = d3.group(chartData, (d: any) => d[config.xAxis!]);
      processedData = Array.from(grouped, ([key, values]) => ({
        [config.xAxis!]: key,
        [config.yAxis!]: d3.sum(values, (d: any) => +d[config.yAxis!]),
        count: values.length
      }));
    } else {
      const grouped = d3.rollup(
        chartData,
        (v: any) => d3.sum(v, (d: any) => +d[config.yAxis!]),
        (d: any) => d[config.xAxis!]
      );
      processedData = Array.from(grouped, ([key, value]) => ({
        [config.xAxis!]: key,
        [config.yAxis!]: value
      }));
    }

    // Scales
    const xScale = d3.scaleBand()
      .domain(processedData.map((d: any) => d[config.xAxis!]))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, (d: any) => d[config.yAxis!]) || 0])
      .range([height, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', config.theme === 'dark' ? '#e5e7eb' : '#374151')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', config.theme === 'dark' ? '#e5e7eb' : '#374151')
      .style('font-size', '12px');

    // Bars
    const bars = g.selectAll('.bar')
      .data(processedData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', (d: any) => xScale(d[config.xAxis!]) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', (_: any, i: number) => colorScale(i.toString()))
      .style('opacity', 0.8);

    // Animation
    if (config.animated) {
      bars.transition()
        .duration(1000)
        .attr('y', (d: any) => yScale(d[config.yAxis!]))
        .attr('height', (d: any) => height - yScale(d[config.yAxis!]));
    } else {
      bars
        .attr('y', (d: any) => yScale(d[config.yAxis!]))
        .attr('height', (d: any) => height - yScale(d[config.yAxis!]));
    }

    // Title
    if (config.title) {
      svg.append('text')
        .attr('x', config.width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', config.theme === 'dark' ? '#e5e7eb' : '#374151')
        .text(config.title);
    }

    // Tooltips
    bars.on('mouseover', (event: any, d: any) => {
      d3.select(event.currentTarget).style('opacity', 1);
      
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', config.theme === 'dark' ? '#1f2937' : '#ffffff')
        .style('color', config.theme === 'dark' ? '#e5e7eb' : '#374151')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('border', `1px solid ${config.theme === 'dark' ? '#374151' : '#d1d5db'}`)
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

      tooltip.transition().duration(200).style('opacity', 1);
      tooltip.html(`${config.xAxis}: ${d[config.xAxis!]}<br/>${config.yAxis}: ${d[config.yAxis!]}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', (event: any) => {
      d3.select(event.currentTarget).style('opacity', 0.8);
      d3.selectAll('.tooltip').remove();
    });
  };

  const generateLineChart = (container: any, d3: any) => {
    if (!dataFile || !config.xAxis || !config.yAxis) return;

    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const width = config.width - margin.left - margin.right;
    const height = config.height - margin.top - margin.bottom;

    container.selectAll('*').remove();

    const svg = container
      .attr('width', config.width)
      .attr('height', config.height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const chartData = dataFile.data
      .filter((d: any) => d[config.xAxis!] && d[config.yAxis!])
      .sort((a: any, b: any) => {
        if (dataFile.fields.find((f: any) => f.name === config.xAxis)?.type === 'date') {
          return new Date(a[config.xAxis!]).getTime() - new Date(b[config.xAxis!]).getTime();
        }
        return +a[config.xAxis!] - +b[config.xAxis!];
      });

    // Scales
    const xScale = d3.scalePoint()
      .domain(chartData.map((d: any) => d[config.xAxis!]))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(chartData, (d: any) => +d[config.yAxis!]) as [number, number])
      .range([height, 0]);

    // Line generator
    const line = (d3 as any).line()
      .x((d: any) => xScale(d[config.xAxis!]) || 0)
      .y((d: any) => yScale(+d[config.yAxis!]))
      .curve(d3.curveMonotoneX);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', config.theme === 'dark' ? '#e5e7eb' : '#374151')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', config.theme === 'dark' ? '#e5e7eb' : '#374151')
      .style('font-size', '12px');

    // Line path
    const path = g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Animation
    if (config.animated) {
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .attr('stroke-dashoffset', 0);
    }

    // Points
    g.selectAll('.dot')
      .data(chartData)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', (d: any) => xScale(d[config.xAxis!]) || 0)
      .attr('cy', (d: any) => yScale(+d[config.yAxis!]))
      .attr('r', 4)
      .attr('fill', '#3b82f6');

    // Title
    if (config.title) {
      svg.append('text')
        .attr('x', config.width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', config.theme === 'dark' ? '#e5e7eb' : '#374151')
        .text(config.title);
    }
  };

  const generateChart = async () => {
    if (!dataFile || !svgRef.current || !config.xAxis || !config.yAxis) return;

    setLocalIsGenerating(true);
    
    try {
      // 懒加载D3.js
      const d3Module = await loadD3();
      const d3 = d3Module.default || d3Module;
      const svg = d3.select(svgRef.current);
      
      switch (config.type) {
        case 'bar':
          generateBarChart(svg, d3);
          break;
        case 'line':
        case 'area':
          generateLineChart(svg, d3);
          break;
        default:
          console.warn(`Chart type ${config.type} not implemented yet`);
      }

      // Generate code
      const code = generateD3Code();
      setGeneratedCode(code);
      
    } catch (error) {
      console.error('Chart generation error:', error);
    } finally {
      setLocalIsGenerating(false);
      onGenerateComplete();
    }
  };

  const generateD3Code = (): string => {
    return `// D3.js Chart Code
// Generated by DynaChart Studio

const data = ${JSON.stringify(dataFile?.data.slice(0, 10), null, 2)};

const margin = { top: 60, right: 30, bottom: 60, left: 60 };
const width = ${config.width} - margin.left - margin.right;
const height = ${config.height} - margin.top - margin.bottom;

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', ${config.width})
  .attr('height', ${config.height});

const g = svg.append('g')
  .attr('transform', \`translate(\${margin.left},\${margin.top})\`);

// Add your chart implementation here
// Chart type: ${config.type}
// X-axis: ${config.xAxis}
// Y-axis: ${config.yAxis}
// Theme: ${config.theme}`;
  };

  useEffect(() => {
    if (shouldGenerate && localChartEngine === 'd3') {
      generateChart();
    } else if (shouldGenerate) {
      // For Plotly, the chart is generated automatically
      onGenerateComplete();
    }
  }, [shouldGenerate, dataFile, config, localChartEngine]);

  const exportCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title || 'chart'}.js`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSVG = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title || 'chart'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-600">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold">图表展示</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-dark-800 rounded-lg p-1">
            <button
              onClick={() => setLocalChartEngine('d3')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                localChartEngine === 'd3'
                  ? 'bg-primary-600 text-white'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              D3.js
            </button>
            <button
              onClick={() => setLocalChartEngine('plotly')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                localChartEngine === 'plotly'
                  ? 'bg-primary-600 text-white'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Plotly.js
            </button>
          </div>
          <button
            onClick={() => setShowCode(!showCode)}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            title="查看代码"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowExporter(true)}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            title="导出代码"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={exportSVG}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            title="导出SVG"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={generateChart}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            title="重新生成"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-4">
        {!dataFile?.data.length ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">暂无数据</p>
              <p className="text-sm">请先上传数据文件</p>
            </div>
          </div>
        ) : !config.xAxis || !config.yAxis ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">请配置图表</p>
              <p className="text-sm">选择X轴和Y轴字段后生成图表</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex">
            {/* Chart */}
            <div className={`${showCode ? 'w-2/3' : 'w-full'} flex items-center justify-center`}>
              {combinedIsGenerating ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p>生成图表中...</p>
                </div>
              ) : (
                <div className="chart-container w-full h-full flex items-center justify-center">
                  {localChartEngine === 'd3' ? (
                    <svg ref={svgRef} className="max-w-full max-h-full"></svg>
                  ) : (
                    <PlotlyChart 
                      data={dataFile} 
                      config={config} 
                      onCodeGenerated={setGeneratedCode}
                    />
                  )}
                </div>
              )}
            </div>
            
            {/* Code Panel */}
            {showCode && (
              <div className="w-1/3 border-l border-dark-600 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">生成的代码</h3>
                  <button
                    onClick={exportCode}
                    className="text-sm px-3 py-1 bg-primary-600 hover:bg-primary-700 rounded transition-colors"
                  >
                    导出
                  </button>
                </div>
                <pre className="text-xs bg-dark-800 p-3 rounded-lg overflow-auto h-96">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Code Exporter Modal */}
      {showExporter && (
        <CodeExporter
          data={dataFile}
          config={config}
          engine={localChartEngine}
          onClose={() => setShowExporter(false)}
        />
      )}
    </div>
  );
};

export default ChartDisplayPanel;