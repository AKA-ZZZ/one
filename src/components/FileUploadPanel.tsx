import React, { useCallback, useState } from 'react';
import { Upload, File, X, Database } from 'lucide-react';

import { DataFile, FieldInfo } from '../App';

interface FileUploadPanelProps {
  onFileUpload: (file: DataFile) => void;
  currentFile: DataFile | null;
}

const FileUploadPanel: React.FC<FileUploadPanelProps> = ({ onFileUpload, currentFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);



  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const analyzeFields = (data: any[]): FieldInfo[] => {
    if (data.length === 0) return [];

    const fields: FieldInfo[] = [];
    const keys = Object.keys(data[0]);

    keys.forEach(key => {
        const values = data.slice(0, 100).map(row => row[key]); // Sample first 100 rows
        
        // Check if numeric
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
        const numericCount = nonNullValues.filter(v => !isNaN(Number(v))).length;
        const isNumeric = numericCount / nonNullValues.length > 0.8;
        
        // Check if date
        const dateCount = nonNullValues.filter(v => {
          const date = new Date(v);
          return !isNaN(date.getTime()) && v.toString().match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/);
        }).length;
        const isDate = dateCount / nonNullValues.length > 0.8;
        
        const type = isNumeric ? 'number' : 
                     isDate ? 'date' : 'string';
        
        fields.push({
          name: key,
          type
        });
    });

    return fields;
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      let data: any[] = [];
      let fileType: 'csv' | 'json' = 'csv';

      if (file.name.toLowerCase().endsWith('.json')) {
        data = JSON.parse(text);
        fileType = 'json';
        if (!Array.isArray(data)) {
          throw new Error('JSON文件必须包含数组格式的数据');
        }
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        data = parseCSV(text);
        fileType = 'csv';
      } else {
        throw new Error('不支持的文件格式，请上传CSV或JSON文件');
      }

      const fields = analyzeFields(data);
      const dataFile: DataFile = {
        id: Date.now().toString(),
        name: file.name,
        type: fileType,
        data: data.slice(0, 1000), // Limit to 1000 rows for performance
        fields,
      };

      onFileUpload(dataFile);
    } catch (error) {
      console.error('文件处理错误:', error);
      alert(`文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const clearFile = () => {
    onFileUpload({
      id: '',
      name: '',
      type: 'csv',
      data: [],
      fields: [],
    });
  };

  const loadSampleData = async (type: 'csv' | 'json') => {
    setIsProcessing(true);
    try {
      const fileName = type === 'csv' ? 'sample-data.csv' : 'sample-data.json';
      const response = await fetch(`/${fileName}`);
      const text = await response.text();
      
      let data: any[] = [];
      if (type === 'json') {
        data = JSON.parse(text);
      } else {
        data = parseCSV(text);
      }
      
      const fields = analyzeFields(data);
      const dataFile: DataFile = {
        id: Date.now().toString(),
        name: `示例数据 (${fileName})`,
        type,
        data: data.slice(0, 1000),
        fields,
      };
      
      onFileUpload(dataFile);
    } catch (error) {
      console.error('加载示例数据失败:', error);
      alert('加载示例数据失败，请检查文件是否存在');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!currentFile?.data.length ? (
        <div
          className={`upload-area ${
            isDragOver ? 'dragover' : ''
          } ${isProcessing ? 'opacity-50' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
        >
          <Upload className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">
            {isProcessing ? '处理中...' : '拖拽文件或点击上传'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            支持 CSV 和 JSON 格式
          </p>
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => loadSampleData('csv')}
              disabled={isProcessing}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors"
            >
              加载CSV示例
            </button>
            <button
              onClick={() => loadSampleData('json')}
              disabled={isProcessing}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded transition-colors"
            >
              加载JSON示例
            </button>
          </div>
          <input
            id="file-input"
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* File Info */}
          <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <File className="h-5 w-5 text-primary-500" />
              <div>
                <p className="font-medium">{currentFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {currentFile.data.length} 行数据
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1 hover:bg-dark-700 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Fields Preview */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Database className="h-4 w-4 text-primary-500" />
              <h3 className="font-medium">字段信息</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentFile.fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-dark-800 rounded text-sm"
                >
                  <span className="font-medium">{field.name}</span>
                  <span className={`field-type-badge field-type-${field.type}`}>
                    {field.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          <div>
            <h3 className="font-medium mb-3">数据预览 (前5行)</h3>
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    {currentFile.fields.map((field, index) => (
                      <th key={index}>{field.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentFile.data.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {currentFile.fields.map((field, fieldIndex) => (
                        <td key={fieldIndex}>
                          {String(row[field.name] || '').substring(0, 20)}
                          {String(row[field.name] || '').length > 20 ? '...' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadPanel;