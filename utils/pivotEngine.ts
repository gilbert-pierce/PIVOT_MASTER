import { DataRecord, PivotConfig, PivotNode, PivotResult, AggregatorType, CustomBucket, PivotValue, FilterCondition } from '../types';

// Helper to calculate aggregate
const calculateAggregate = (data: DataRecord[], field: string, type: AggregatorType): number => {
  if (data.length === 0) return 0;

  if (type === 'count') return data.length;

  if (type === 'distinctCount') {
    const unique = new Set();
    data.forEach(d => {
      const val = d[field];
      if (val !== undefined && val !== null) unique.add(val);
    });
    return unique.size;
  }

  const values = data
    .map(d => Number(d[field]))
    .filter(n => !isNaN(n));

  if (values.length === 0) return 0;

  switch (type) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    case 'median': {
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      return values.length % 2 !== 0 
        ? values[mid] 
        : (values[mid - 1] + values[mid]) / 2;
    }
    default: return 0;
  }
};

export const getUniqueValues = (data: DataRecord[], field: string): string[] => {
  const values = new Set<string>();
  data.forEach(row => {
    const val = row[field];
    if (val !== undefined && val !== null) values.add(String(val));
  });
  return Array.from(values).sort();
};

// Check if a row matches a set of filters (Advanced logic)
const matchFilters = (row: DataRecord, bucket: CustomBucket): boolean => {
  for (const cond of bucket.filters) {
    const rawVal = row[cond.field];
    const val = rawVal === null || rawVal === undefined ? '' : rawVal;
    
    // Mode 1: List selection (IN)
    if (cond.operator === 'in') {
      if (cond.values.length > 0 && !cond.values.includes(String(val))) {
        return false;
      }
      continue;
    }

    // Mode 2: Condition selection
    const numericVal = Number(val);
    const target1 = Number(cond.val1);
    const target2 = Number(cond.val2);
    const isNum = !isNaN(numericVal) && cond.val1 !== undefined && !isNaN(Number(cond.val1));

    switch (cond.operator) {
      case 'eq':
        if (isNum) { if (numericVal !== target1) return false; }
        else { if (String(val) !== String(cond.val1)) return false; }
        break;
      case 'neq':
        if (isNum) { if (numericVal === target1) return false; }
        else { if (String(val) === String(cond.val1)) return false; }
        break;
      case 'gt':
        if (numericVal <= target1) return false;
        break;
      case 'gte':
        if (numericVal < target1) return false;
        break;
      case 'lt':
        if (numericVal >= target1) return false;
        break;
      case 'lte':
        if (numericVal > target1) return false;
        break;
      case 'between':
        if (numericVal < target1 || numericVal > target2) return false;
        break;
    }
  }
  return true;
};

// ... Rest of the engine remains same ...

interface AxisNode {
  key: string;
  label: string;
  data: DataRecord[];
  children: AxisNode[];
}

const buildCustomAxis = (data: DataRecord[], buckets: CustomBucket[]): AxisNode[] => {
  return buckets.map(bucket => {
    const filteredData = data.filter(row => matchFilters(row, bucket));
    return {
      key: bucket.id,
      label: bucket.label,
      data: filteredData,
      children: []
    };
  });
};

const flattenAxis = (nodes: AxisNode[], parentKey = ''): { key: string, label: string, data: DataRecord[] }[] => {
  let result: { key: string, label: string, data: DataRecord[] }[] = [];
  nodes.forEach(node => {
    const currentKey = parentKey ? `${parentKey}||${node.key}` : node.key;
    const currentLabel = node.label; 
    if (node.children.length === 0) {
      result.push({ key: currentKey, label: currentLabel, data: node.data });
    } else {
      result = [...result, ...flattenAxis(node.children, currentKey)];
    }
  });
  return result;
};

export const performPivot = (data: DataRecord[], config: PivotConfig): PivotResult => {
  let filteredData = data;
  Object.keys(config.filters).forEach(field => {
    const allowed = new Set(config.filters[field]);
    if (allowed.size > 0) {
      filteredData = filteredData.filter(row => allowed.has(String(row[field])));
    }
  });

  let rowNodesRaw: AxisNode[] = config.customRows.length > 0 
    ? buildCustomAxis(filteredData, config.customRows)
    : [{ key: 'total_row', label: 'Total', data: filteredData, children: [] }];

  let colNodesRaw: AxisNode[] = config.customCols.length > 0
    ? buildCustomAxis(filteredData, config.customCols)
    : [{ key: 'total_col', label: 'Total', data: filteredData, children: [] }];

  const flatCols = flattenAxis(colNodesRaw);
  const flatColHeaders: { key: string; label: string; metric: PivotValue }[] = [];
  
  flatCols.forEach(col => {
    const metrics = config.values.length > 0 ? config.values : [{ id: 'default', field: 'Record', aggregator: 'count' } as PivotValue];
    metrics.forEach(val => {
      flatColHeaders.push({ key: `${col.key}||${val.id}`, label: col.label, metric: val });
    });
  });

  const processRowNode = (rNode: AxisNode): PivotNode => {
    const pNode: PivotNode = { key: rNode.key, label: rNode.label, values: {} };
    if (rNode.children.length > 0) {
      pNode.children = rNode.children.map(child => processRowNode(child));
    } else {
      pNode.isLeaf = true;
      flatCols.forEach(cLeaf => {
        const rowSet = new Set(rNode.data);
        const cellData = cLeaf.data.filter(d => rowSet.has(d));
        const values = config.values.length > 0 ? config.values : [{ id: 'default', field: 'Record', aggregator: 'count' } as PivotValue];
        values.forEach(val => {
           pNode.values![`${cLeaf.key}||${val.id}`] = calculateAggregate(cellData, val.field, val.aggregator);
        });
      });
    }
    return pNode;
  };

  const colNodesConvert = (nodes: AxisNode[]): PivotNode[] => {
     return nodes.map(n => ({ key: n.key, label: n.label, children: colNodesConvert(n.children), isLeaf: n.children.length === 0 }));
  };

  return { rowNodes: rowNodesRaw.map(r => processRowNode(r)), colNodes: colNodesConvert(colNodesRaw), flatColHeaders };
};

export const generateExportData = (result: PivotResult): (string | number | null)[][] => {
  const output: (string | number | null)[][] = [];
  const headerRow: string[] = ['Row Label'];
  result.flatColHeaders.forEach(col => headerRow.push(`${col.label} (${col.metric.aggregator} ${col.metric.field})`));
  output.push(headerRow);

  const traverse = (nodes: PivotNode[], parentLabels: string[] = []) => {
    nodes.forEach(node => {
      const currentLabels = [...parentLabels, node.label];
      if (node.isLeaf) {
        const rowData: (string | number | null)[] = [currentLabels.join(' > ')];
        result.flatColHeaders.forEach(colHeader => rowData.push(node.values?.[colHeader.key] ?? null));
        output.push(rowData);
      } else if (node.children) { traverse(node.children, currentLabels); }
    });
  };
  traverse(result.rowNodes);
  return output;
};