import { useState } from 'react';
import { Upload, BarChart3, Settings } from 'lucide-react';
import FileUploadPanel from './components/FileUploadPanel';
import ChartDisplayPanel from './components/ChartDisplayPanel';
import ChartConfigPanel from './components/ChartConfigPanel';
import DataProcessingPanel from './components/DataProcessingPanel';
import CodeExporter from './components/CodeExporter';
import './App.css';

export interface DataFile {
  id: string;
  name: string;
  type: 'csv' | 'json';
  data: any[];
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  type: 'string' | 'number' | 'date';
  sample?: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'scatter' | 'pie' | 'area';
  xAxis: string;
  yAxis: string;
  colorBy: string;
  title: string;
  width: number;
  height: number;
  theme: 'light' | 'dark';
  animated: boolean;
  showLegend: boolean;
  showGrid: boolean;
}

function App() {
  const [currentFile, setCurrentFile] = useState<DataFile | null>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    xAxis: '',
    yAxis: '',
    colorBy: '',
    title: '数据图表',
    width: 800,
    height: 500,
    theme: 'dark',
    animated: true,
    showLegend: true,
    showGrid: true
  });
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [chartEngine] = useState<'d3' | 'plotly'>('d3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodeExporter, setShowCodeExporter] = useState(false);
  const [exportEngine, setExportEngine] = useState<'d3' | 'plotly'>('d3');

  const handleFileUpload = (file: DataFile) => {
    setCurrentFile(file);
    setProcessedData(file.data);
  };

  const handleDataUpdate = (data: any[]) => {
    setProcessedData(data);
  };

  const handleConfigChange = (config: ChartConfig) => {
    setChartConfig(config);
  };

  const handleGenerateChart = () => {
    setShouldGenerate(true);
    setIsGenerating(true);
  };

  const handleGenerateComplete = () => {
    setShouldGenerate(false);
    setIsGenerating(false);
  };

  const handleExportCode = (engine: 'd3' | 'plotly' = 'd3') => {
    setExportEngine(engine);
    setShowCodeExporter(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-primary-500" />
            <h1 className="text-2xl font-bold text-foreground">DynaChart Studio</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            实时数据动态图表生成器
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <main className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - File Upload & Data Processing */}
        <div className="w-1/4 border-r border-border bg-card">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Upload className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold">数据管理</h2>
            </div>
            <div className="space-y-4">
              <FileUploadPanel onFileUpload={handleFileUpload} currentFile={currentFile} />
              <DataProcessingPanel 
                dataFile={currentFile} 
                onDataUpdate={handleDataUpdate}
              />
            </div>
          </div>
        </div>

        {/* Center Panel - Chart Display */}
        <div className="flex-1 bg-dark-900">
          <div className="p-4 h-full">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-white">图表展示</h2>
            </div>
            <ChartDisplayPanel 
              data={currentFile ? { ...currentFile, data: processedData } : null} 
              config={chartConfig}
              shouldGenerate={shouldGenerate}
              onGenerateComplete={handleGenerateComplete}
              isGenerating={isGenerating}
              chartEngine={chartEngine}
              onExportCode={handleExportCode}
            />
          </div>
        </div>

        {/* Right Panel - Configuration */}
        <div className="w-1/4 border-l border-border bg-card">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold">配置面板</h2>
            </div>
            <ChartConfigPanel
              fields={currentFile?.fields || []}
              config={chartConfig}
              onConfigChange={handleConfigChange}
              onGenerateChart={handleGenerateChart}
              onExportCode={handleExportCode}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </main>
      
      {/* Code Exporter Modal */}
      {showCodeExporter && (
        <CodeExporter
          data={currentFile ? { ...currentFile, data: processedData } : null}
          config={chartConfig}
          engine={exportEngine}
          onClose={() => setShowCodeExporter(false)}
        />
      )}
    </div>
  );
}

export default App;