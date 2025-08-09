import React, { useState, useEffect } from 'react';
import { DataFile, FieldInfo } from '../App';
import { DataProcessor, DataStats, FilterCondition, SortCondition } from '../utils/dataProcessor';
import { BarChart3, Filter, SortAsc, Download, RefreshCw, TrendingUp } from 'lucide-react';

interface DataProcessingPanelProps {
  dataFile: DataFile | null;
  onDataUpdate: (processedData: any[]) => void;
}

const DataProcessingPanel: React.FC<DataProcessingPanelProps> = ({ dataFile, onDataUpdate }) => {
  const [processor, setProcessor] = useState<DataProcessor | null>(null);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sorts, setSorts] = useState<SortCondition[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'filter' | 'sort' | 'export'>('stats');
  const [selectedField, setSelectedField] = useState<string>('');

  useEffect(() => {
    if (dataFile && dataFile.data.length > 0) {
      const newProcessor = new DataProcessor(dataFile);
      setProcessor(newProcessor);
      setStats(newProcessor.getStats());
      setProcessedData(dataFile.data);
      setFilters([]);
      setSorts([]);
    } else {
      setProcessor(null);
      setStats(null);
      setProcessedData([]);
    }
  }, [dataFile]);

  const applyProcessing = () => {
    if (!processor) return;

    let result = processor.filter(filters);
    result = processor.sort(result, sorts);
    
    setProcessedData(result);
    onDataUpdate(result);
  };

  const addFilter = () => {
    if (!dataFile || !selectedField) return;
    
    const newFilter: FilterCondition = {
      field: selectedField,
      operator: 'equals',
      value: ''
    };
    
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const addSort = () => {
    if (!dataFile || !selectedField) return;
    
    const newSort: SortCondition = {
      field: selectedField,
      direction: 'asc'
    };
    
    setSorts([...sorts, newSort]);
  };

  const updateSort = (index: number, updates: Partial<SortCondition>) => {
    const newSorts = [...sorts];
    newSorts[index] = { ...newSorts[index], ...updates };
    setSorts(newSorts);
  };

  const removeSort = (index: number) => {
    setSorts(sorts.filter((_, i) => i !== index));
  };

  const resetProcessing = () => {
    if (!dataFile) return;
    
    setFilters([]);
    setSorts([]);
    setProcessedData(dataFile.data);
    onDataUpdate(dataFile.data);
  };

  const exportData = (format: 'csv' | 'json') => {
    if (!processor) return;
    
    const exportedData = processor.export(processedData, format);
    const blob = new Blob([exportedData], { 
      type: format === 'csv' ? 'text/csv' : 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed-data.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  if (!dataFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>请先上传数据文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* 标签页导航 */}
      <div className="flex border-b border-gray-700">
        {[
          { key: 'stats', label: '统计', icon: TrendingUp },
          { key: 'filter', label: '过滤', icon: Filter },
          { key: 'sort', label: '排序', icon: SortAsc },
          { key: 'export', label: '导出', icon: Download }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
              activeTab === key
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* 统计信息 */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">数据统计</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-2xl font-bold text-blue-400">{stats.totalRows}</div>
                <div className="text-sm text-gray-400">总行数</div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-2xl font-bold text-green-400">{stats.totalColumns}</div>
                <div className="text-sm text-gray-400">总列数</div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-2xl font-bold text-yellow-400">{stats.numericFields}</div>
                <div className="text-sm text-gray-400">数值字段</div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-2xl font-bold text-red-400">{stats.missingValues}</div>
                <div className="text-sm text-gray-400">缺失值</div>
              </div>
            </div>

            {/* 字段详细信息 */}
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-2">字段信息</h4>
              <div className="space-y-2">
                {dataFile.fields.map((field: FieldInfo) => {
                    const numericStats = processor?.getNumericStats(field.name);
                    const uniqueValues = processor?.getUniqueValues(field.name) || [];
                  
                  return (
                    <div key={field.name} className="bg-gray-800 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{field.name}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          field.type === 'number' ? 'bg-blue-600' :
                          field.type === 'date' ? 'bg-green-600' : 'bg-gray-600'
                        }`}>
                          {field.type}
                        </span>
                      </div>
                      
                      {field.type === 'number' && numericStats && (
                        <div className="text-sm text-gray-400">
                          最小值: {numericStats.min.toFixed(2)} | 
                          最大值: {numericStats.max.toFixed(2)} | 
                          平均值: {numericStats.avg.toFixed(2)}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-400">
                        唯一值: {uniqueValues.length} 个
                        {uniqueValues.length <= 5 && (
                          <span className="ml-2">({uniqueValues.join(', ')})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 过滤器 */}
        {activeTab === 'filter' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">数据过滤</h3>
              <div className="flex space-x-2">
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                >
                  <option value="">选择字段</option>
                  {dataFile.fields.map((field: FieldInfo) => (
                  <option key={field.name} value={field.name}>{field.name}</option>
                ))}
                </select>
                <button
                  onClick={addFilter}
                  disabled={!selectedField}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
                >
                  添加过滤器
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {filters.map((filter, index) => (
                <div key={index} className="bg-gray-800 p-3 rounded flex items-center space-x-2">
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, { field: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  >
                    {dataFile.fields.map((field: FieldInfo) => (
                      <option key={field.name} value={field.name}>{field.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  >
                    <option value="equals">等于</option>
                    <option value="contains">包含</option>
                    <option value="greater">大于</option>
                    <option value="less">小于</option>
                    <option value="between">介于</option>
                    <option value="not_empty">非空</option>
                  </select>
                  
                  {filter.operator !== 'not_empty' && (
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(index, { value: e.target.value })}
                      placeholder="值"
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm flex-1"
                    />
                  )}
                  
                  {filter.operator === 'between' && (
                    <input
                      type="text"
                      value={filter.value2 || ''}
                      onChange={(e) => updateFilter(index, { value2: e.target.value })}
                      placeholder="到"
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm flex-1"
                    />
                  )}
                  
                  <button
                    onClick={() => removeFilter(index)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={applyProcessing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                应用过滤
              </button>
              <button
                onClick={resetProcessing}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重置</span>
              </button>
            </div>
          </div>
        )}

        {/* 排序 */}
        {activeTab === 'sort' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">数据排序</h3>
              <div className="flex space-x-2">
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                >
                  <option value="">选择字段</option>
                  {dataFile.fields.map((field: FieldInfo) => (
                    <option key={field.name} value={field.name}>{field.name}</option>
                  ))}
                </select>
                <button
                  onClick={addSort}
                  disabled={!selectedField}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
                >
                  添加排序
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {sorts.map((sort, index) => (
                <div key={index} className="bg-gray-800 p-3 rounded flex items-center space-x-2">
                  <select
                    value={sort.field}
                    onChange={(e) => updateSort(index, { field: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm flex-1"
                  >
                    {dataFile.fields.map((field: FieldInfo) => (
                      <option key={field.name} value={field.name}>{field.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={sort.direction}
                    onChange={(e) => updateSort(index, { direction: e.target.value as 'asc' | 'desc' })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  >
                    <option value="asc">升序</option>
                    <option value="desc">降序</option>
                  </select>
                  
                  <button
                    onClick={() => removeSort(index)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={applyProcessing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                应用排序
              </button>
              <button
                onClick={resetProcessing}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重置</span>
              </button>
            </div>
          </div>
        )}

        {/* 导出 */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">数据导出</h3>
            
            <div className="bg-gray-800 p-4 rounded">
              <h4 className="font-medium mb-2">当前数据状态</h4>
              <div className="text-sm text-gray-400">
                <p>原始数据: {dataFile.data.length} 行</p>
                <p>处理后数据: {processedData.length} 行</p>
                <p>应用的过滤器: {filters.length} 个</p>
                <p>应用的排序: {sorts.length} 个</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => exportData('csv')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>导出 CSV</span>
              </button>
              <button
                onClick={() => exportData('json')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>导出 JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataProcessingPanel;