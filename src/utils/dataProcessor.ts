import { DataFile, FieldInfo } from '../App';

export interface DataStats {
  totalRows: number;
  totalColumns: number;
  numericFields: number;
  textFields: number;
  dateFields: number;
  missingValues: number;
}

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'not_empty';
  value: any;
  value2?: any; // for 'between' operator
}

export interface SortCondition {
  field: string;
  direction: 'asc' | 'desc';
}

export class DataProcessor {
  private data: any[];
  private fields: FieldInfo[];

  constructor(dataFile: DataFile) {
    this.data = dataFile.data;
    this.fields = dataFile.fields;
  }

  // 获取数据统计信息
  getStats(): DataStats {
    const totalRows = this.data.length;
    const totalColumns = this.fields.length;
    const numericFields = this.fields.filter(f => f.type === 'number').length;
    const textFields = this.fields.filter(f => f.type === 'string').length;
    const dateFields = this.fields.filter(f => f.type === 'date').length;
    
    let missingValues = 0;
    this.data.forEach(row => {
      this.fields.forEach(field => {
        const value = row[field.name];
        if (value === null || value === undefined || value === '') {
          missingValues++;
        }
      });
    });

    return {
      totalRows,
      totalColumns,
      numericFields,
      textFields,
      dateFields,
      missingValues
    };
  }

  // 获取字段的唯一值
  getUniqueValues(fieldName: string): any[] {
    const values = this.data.map(row => row[fieldName]);
    return [...new Set(values)].filter(v => v !== null && v !== undefined && v !== '');
  }

  // 获取数值字段的统计信息
  getNumericStats(fieldName: string): { min: number; max: number; avg: number; median: number } | null {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field || field.type !== 'number') return null;

    const values = this.data
      .map(row => parseFloat(row[fieldName]))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const min = values[0];
    const max = values[values.length - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

    return { min, max, avg, median };
  }

  // 过滤数据
  filter(conditions: FilterCondition[]): any[] {
    return this.data.filter(row => {
      return conditions.every(condition => {
        const value = row[condition.field];
        
        switch (condition.operator) {
          case 'equals':
            return value == condition.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
          case 'greater':
            return parseFloat(value) > parseFloat(condition.value);
          case 'less':
            return parseFloat(value) < parseFloat(condition.value);
          case 'between':
            const numValue = parseFloat(value);
            return numValue >= parseFloat(condition.value) && numValue <= parseFloat(condition.value2);
          case 'not_empty':
            return value !== null && value !== undefined && value !== '';
          default:
            return true;
        }
      });
    });
  }

  // 排序数据
  sort(data: any[], conditions: SortCondition[]): any[] {
    return [...data].sort((a, b) => {
      for (const condition of conditions) {
        const aValue = a[condition.field];
        const bValue = b[condition.field];
        
        let comparison = 0;
        
        // 处理不同类型的比较
        const field = this.fields.find(f => f.name === condition.field);
        if (field?.type === 'number') {
          comparison = parseFloat(aValue) - parseFloat(bValue);
        } else if (field?.type === 'date') {
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        if (comparison !== 0) {
          return condition.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  // 分组数据
  groupBy(fieldName: string): { [key: string]: any[] } {
    const groups: { [key: string]: any[] } = {};
    
    this.data.forEach(row => {
      const key = String(row[fieldName] || 'Unknown');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });
    
    return groups;
  }

  // 聚合数据
  aggregate(groupField: string, valueField: string, operation: 'sum' | 'avg' | 'count' | 'min' | 'max'): { [key: string]: number } {
    const groups = this.groupBy(groupField);
    const result: { [key: string]: number } = {};
    
    Object.keys(groups).forEach(key => {
      const groupData = groups[key];
      
      switch (operation) {
        case 'count':
          result[key] = groupData.length;
          break;
        case 'sum':
          result[key] = groupData.reduce((sum, row) => sum + (parseFloat(row[valueField]) || 0), 0);
          break;
        case 'avg':
          const values = groupData.map(row => parseFloat(row[valueField])).filter(v => !isNaN(v));
          result[key] = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
          break;
        case 'min':
          const minValues = groupData.map(row => parseFloat(row[valueField])).filter(v => !isNaN(v));
          result[key] = minValues.length > 0 ? Math.min(...minValues) : 0;
          break;
        case 'max':
          const maxValues = groupData.map(row => parseFloat(row[valueField])).filter(v => !isNaN(v));
          result[key] = maxValues.length > 0 ? Math.max(...maxValues) : 0;
          break;
      }
    });
    
    return result;
  }

  // 数据采样
  sample(size: number, method: 'random' | 'first' | 'last' = 'random'): any[] {
    if (size >= this.data.length) return this.data;
    
    switch (method) {
      case 'first':
        return this.data.slice(0, size);
      case 'last':
        return this.data.slice(-size);
      case 'random':
      default:
        const shuffled = [...this.data].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, size);
    }
  }

  // 数据清洗
  clean(): any[] {
    return this.data.map(row => {
      const cleanedRow: any = {};
      
      this.fields.forEach(field => {
        let value = row[field.name];
        
        // 处理空值
        if (value === null || value === undefined || value === '') {
          switch (field.type) {
            case 'number':
              value = 0;
              break;
            case 'string':
              value = '';
              break;
            case 'date':
              value = null;
              break;
          }
        } else {
          // 类型转换和清洗
          switch (field.type) {
            case 'number':
              value = parseFloat(value);
              if (isNaN(value)) value = 0;
              break;
            case 'string':
              value = String(value).trim();
              break;
            case 'date':
              const date = new Date(value);
              value = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
              break;
          }
        }
        
        cleanedRow[field.name] = value;
      });
      
      return cleanedRow;
    });
  }

  // 导出处理后的数据
  export(data: any[], format: 'csv' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // 处理包含逗号或引号的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      });
      
      return csvRows.join('\n');
    }
  }
}