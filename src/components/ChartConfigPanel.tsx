import React, { useState } from 'react';
import { Settings, BarChart3, LineChart, PieChart, ScatterChart, Download, Code, Play } from 'lucide-react';

import { FieldInfo, ChartConfig } from '../App';

interface ChartConfigPanelProps {
  fields: FieldInfo[];
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  onGenerateChart: () => void;
  onExportCode: (engine?: 'd3' | 'plotly') => void;
  isGenerating: boolean;
}

const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  fields,
  config,
  onConfigChange,
  onGenerateChart,
  onExportCode,
  isGenerating,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'style' | 'export'>('basic');

  const chartTypes = [
    { type: 'bar' as const, icon: BarChart3, label: '柱状图' },
    { type: 'line' as const, icon: LineChart, label: '折线图' },
    { type: 'pie' as const, icon: PieChart, label: '饼图' },
    { type: 'scatter' as const, icon: ScatterChart, label: '散点图' },
    { type: 'area' as const, icon: LineChart, label: '面积图' },
  ];

  const numericFields = fields.filter(f => f.type === 'number');
  const categoricalFields = fields.filter(f => f.type === 'string');
  const allFields = fields;

  const updateConfig = (updates: Partial<ChartConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const renderBasicConfig = () => (
    <div className="space-y-4">
      {/* Chart Type */}
      <div>
        <label className="block text-sm font-medium mb-2">图表类型</label>
        <div className="grid grid-cols-2 gap-2">
          {chartTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => updateConfig({ type })}
              className={`p-3 rounded-lg border-2 transition-all ${
                config.type === type
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-600 hover:border-dark-500'
              }`}
            >
              <Icon className="h-5 w-5 mx-auto mb-1" />
              <div className="text-xs">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* X Axis */}
      {(config.type === 'bar' || config.type === 'line' || config.type === 'scatter' || config.type === 'area') && (
        <div>
          <label className="block text-sm font-medium mb-2">X轴字段</label>
          <select
            value={config.xAxis || ''}
            onChange={(e) => updateConfig({ xAxis: e.target.value })}
            className="w-full p-2 bg-dark-800 border border-dark-600 rounded-lg"
          >
            <option value="">选择字段</option>
            {allFields.map((field) => (
              <option key={field.name} value={field.name}>
                {field.name} ({field.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Y Axis */}
      {(config.type === 'bar' || config.type === 'line' || config.type === 'scatter' || config.type === 'area') && (
        <div>
          <label className="block text-sm font-medium mb-2">Y轴字段</label>
          <select
            value={config.yAxis || ''}
            onChange={(e) => updateConfig({ yAxis: e.target.value })}
            className="w-full p-2 bg-dark-800 border border-dark-600 rounded-lg"
          >
            <option value="">选择字段</option>
            {numericFields.map((field) => (
              <option key={field.name} value={field.name}>
                {field.name} ({field.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Color By */}
      <div>
        <label className="block text-sm font-medium mb-2">颜色分组</label>
        <select
          value={config.colorBy || ''}
          onChange={(e) => updateConfig({ colorBy: e.target.value })}
          className="w-full p-2 bg-dark-800 border border-dark-600 rounded-lg"
        >
          <option value="">无分组</option>
          {categoricalFields.map((field) => (
            <option key={field.name} value={field.name}>
              {field.name} ({field.type})
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">图表标题</label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => updateConfig({ title: e.target.value })}
          className="w-full p-2 bg-dark-800 border border-dark-600 rounded-lg"
          placeholder="输入图表标题"
        />
      </div>
    </div>
  );

  const renderStyleConfig = () => (
    <div className="space-y-4">
      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">宽度</label>
          <input
            type="number"
            value={config.width}
            onChange={(e) => updateConfig({ width: parseInt(e.target.value) })}
            className="w-full p-2 bg-dark-800 border border-dark-600 rounded-lg"
            min="200"
            max="2000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">高度</label>
          <input
            type="number"
            value={config.height}
            onChange={(e) => updateConfig({ height: parseInt(e.target.value) })}
            className="w-full p-2 bg-dark-800 border border-dark-600 rounded-lg"
            min="200"
            max="1000"
          />
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium mb-2">主题</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateConfig({ theme: 'dark' })}
            className={`p-3 rounded-lg border-2 transition-all ${
              config.theme === 'dark'
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-dark-600 hover:border-dark-500'
            }`}
          >
            深色主题
          </button>
          <button
            onClick={() => updateConfig({ theme: 'light' })}
            className={`p-3 rounded-lg border-2 transition-all ${
              config.theme === 'light'
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-dark-600 hover:border-dark-500'
            }`}
          >
            浅色主题
          </button>
        </div>
      </div>

      {/* Animation */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.animated}
            onChange={(e) => updateConfig({ animated: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm font-medium">启用动画效果</span>
        </label>
      </div>
    </div>
  );

  const renderExportConfig = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        生成图表后，您可以导出可视化代码用于其他项目。
      </div>
      
      <div className="space-y-3">
        <button
          onClick={() => onExportCode('d3')}
          disabled={!config.xAxis || !config.yAxis}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Code className="h-4 w-4" />
          <span>导出 D3.js 代码</span>
        </button>
        
        <button
          onClick={() => onExportCode('plotly')}
          disabled={!config.xAxis || !config.yAxis}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Code className="h-4 w-4" />
          <span>导出 Plotly.js 代码</span>
        </button>
        
        <button
          onClick={() => {
            // Export as image functionality
            const canvas = document.querySelector('canvas');
            if (canvas) {
              const link = document.createElement('a');
              link.download = `${config.title || 'chart'}.png`;
              link.href = canvas.toDataURL();
              link.click();
            }
          }}
          disabled={!config.xAxis || !config.yAxis}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>导出为图片</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5 text-primary-500" />
        <h2 className="text-lg font-semibold">图表配置</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-dark-800 p-1 rounded-lg">
        {[
          { id: 'basic', label: '基础' },
          { id: 'style', label: '样式' },
          { id: 'export', label: '导出' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'basic' && renderBasicConfig()}
        {activeTab === 'style' && renderStyleConfig()}
        {activeTab === 'export' && renderExportConfig()}
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerateChart}
        disabled={isGenerating || !config.xAxis || !config.yAxis}
        className="w-full flex items-center justify-center space-x-2 p-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        <Play className="h-4 w-4" />
        <span>{isGenerating ? '生成中...' : '生成图表'}</span>
      </button>
    </div>
  );
};

export default ChartConfigPanel;