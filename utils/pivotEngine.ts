import { DataRecord, PivotConfig, PivotNode, PivotResult, AggregatorType, CustomBucket, PivotValue } from '../types';

// Helper to calculate aggregate
const calculateAggregate = (data: DataRecord[], field: string, type: AggregatorType): number => {
  if (data.length === 0) return 0;

  // For count, we don't need to parse numbers, just count rows
  if (type === 'count') {
    return data.length;
  }

  const values = data
    .map(d => Number(d[field]))
    .filter(n => !isNaN(n));

  if (values.length === 0) return 0;

  switch (type) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'median': {
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      return values.length % 2 !== 0 
        ? values[mid] 
        : (values[mid - 1] + values[mid]) / 2;
    }
    default:
      return 0;
  }
};

export const getUniqueValues = (data: DataRecord[], field: string): string[] => {
  const values = new Set<string>();
  data.forEach(row => {
    const val = row[field];
    if (val !== undefined && val !== null) {
      values.add(String(val));
    }
  });
  return Array.from(values).sort();
};

// Check if a row matches a set of filters (Custom Bucket logic)
const matchFilters = (row: DataRecord, bucket: CustomBucket): boolean => {
  for (const cond of bucket.filters) {
    if (!cond.values || cond.values.length === 0) continue;
    const val = String(row[cond.field]);
    if (!cond.values.includes(val)) {
      return false;
    }
  }
  return true;
};

// Generic Axis Builder
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
      children: [] // Custom buckets currently support 1 level flat
    };
  });
};

// Helper to flatten axis for headers/iteration
const flattenAxis = (nodes: AxisNode[], parentKey = ''): { key: string, label: string, data: DataRecord[] }[] => {
  let result: { key: string, label: string, data: DataRecord[] }[] = [];
  
  nodes.forEach(node => {
    const currentKey = parentKey ? `${parentKey}||${node.key}` : node.key;
    const currentLabel = parentKey ? `${node.label}` : node.label; // Simple label for now, renderer handles hierarchy

    if (node.children.length === 0) {
      result.push({ key: currentKey, label: currentLabel, data: node.data });
    } else {
      result = [...result, ...flattenAxis(node.children, currentKey)];
    }
  });
  return result;
};


export const performPivot = (data: DataRecord[], config: PivotConfig): PivotResult => {
  // 1. Global Filter
  let filteredData = data;
  Object.keys(config.filters).forEach(field => {
    const allowed = new Set(config.filters[field]);
    if (allowed.size > 0) {
      filteredData = filteredData.filter(row => allowed.has(String(row[field])));
    }
  });

  // 2. Build Row Axis (Custom Only)
  let rowNodesRaw: AxisNode[] = [];
  if (config.customRows.length > 0) {
    rowNodesRaw = buildCustomAxis(filteredData, config.customRows);
  } else {
    // Default Total Row if no custom rows defined
    rowNodesRaw = [{ key: 'total_row', label: 'Total', data: filteredData, children: [] }];
  }

  // 3. Build Column Axis (Custom Only)
  let colNodesRaw: AxisNode[] = [];
  if (config.customCols.length > 0) {
     colNodesRaw = buildCustomAxis(filteredData, config.customCols);
  } else {
     // Default Total Col if no custom cols defined
     colNodesRaw = [{ key: 'total_col', label: 'Total', data: filteredData, children: [] }];
  }

  // 4. Compute Intersections
  
  // Flatten Columns to generate the Header structure
  const flatCols = flattenAxis(colNodesRaw);
  
  // Define the flat column headers for the table
  const flatColHeaders: { key: string; label: string; metric: PivotValue }[] = [];
  
  flatCols.forEach(col => {
    if (config.values.length > 0) {
      config.values.forEach(val => {
        // USE val.id as part of the key to ensure uniqueness for duplicate fields
        flatColHeaders.push({
          key: `${col.key}||${val.id}`,
          label: col.label,
          metric: val
        });
      });
    } else {
       // Placeholder if no values selected
       flatColHeaders.push({
          key: `${col.key}||count_all`,
          label: col.label,
          metric: { id: 'default', field: 'Record', aggregator: 'count' }
        });
    }
  });

  // Process Row Nodes and Compute Values
  const processRowNode = (rNode: AxisNode): PivotNode => {
    const pNode: PivotNode = {
      key: rNode.key,
      label: rNode.label,
      values: {} 
    };

    if (rNode.children.length > 0) {
      pNode.children = rNode.children.map(child => processRowNode(child));
    } else {
      pNode.isLeaf = true;
      
      flatCols.forEach(cLeaf => {
        const rowSet = new Set(rNode.data);
        const cellData = cLeaf.data.filter(d => rowSet.has(d));

        const values = config.values.length > 0 ? config.values : [{ id: 'default', field: 'Record', aggregator: 'count' } as PivotValue];
        
        values.forEach(val => {
           // Use ID for uniqueness
           const valKey = val.id;
           const colKey = `${cLeaf.key}||${valKey}`;
           pNode.values![colKey] = calculateAggregate(cellData, val.field, val.aggregator);
        });
      });
    }
    return pNode;
  };

  const rowNodes = rowNodesRaw.map(r => processRowNode(r));

  // Convert colNodesRaw to PivotNode for consistency
  const colNodesConvert = (nodes: AxisNode[]): PivotNode[] => {
     return nodes.map(n => ({
        key: n.key,
        label: n.label,
        children: colNodesConvert(n.children),
        isLeaf: n.children.length === 0
     }));
  };

  return {
    rowNodes,
    colNodes: colNodesConvert(colNodesRaw),
    flatColHeaders
  };
};

/**
 * Generates a 2D array suitable for Excel export from the PivotResult.
 */
export const generateExportData = (result: PivotResult): (string | number | null)[][] => {
  const output: (string | number | null)[][] = [];
  
  // 1. Construct Header Row
  // "Row Label" followed by all column metric headers
  const headerRow: string[] = ['Row Label'];
  
  result.flatColHeaders.forEach(col => {
    // Label format: "Column Label (Agg Field)"
    headerRow.push(`${col.label} (${col.metric.aggregator} ${col.metric.field})`);
  });
  
  output.push(headerRow);

  // 2. Flatten Rows recursively
  // Traverse rowNodes to create data rows
  const traverse = (nodes: PivotNode[], parentLabels: string[] = []) => {
    nodes.forEach(node => {
      const currentLabels = [...parentLabels, node.label];
      
      if (node.isLeaf) {
        // Create a row
        const rowData: (string | number | null)[] = [currentLabels.join(' > ')]; // Join hierarchy for single "Row Label" column in export
        
        // Match values to headers
        result.flatColHeaders.forEach(colHeader => {
           const val = node.values ? node.values[colHeader.key] : null;
           rowData.push(val !== undefined ? val : null);
        });
        
        output.push(rowData);
      } else if (node.children) {
        traverse(node.children, currentLabels);
      }
    });
  };

  traverse(result.rowNodes);

  return output;
};