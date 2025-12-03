export type AggregatorType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median';

export interface PivotValue {
  id: string; // Unique identifier for the metric column
  field: string;
  aggregator: AggregatorType;
}

export interface FilterCondition {
  field: string;
  values: string[]; // "In" logic
}

export interface CustomBucket {
  id: string;
  label: string;
  filters: FilterCondition[];
}

export interface PivotConfig {
  customRows: CustomBucket[];
  customCols: CustomBucket[];
  values: PivotValue[];
  filters: Record<string, string[]>; // Global pre-filters
}

export interface DataRecord {
  [key: string]: string | number | boolean | null;
}

export interface PivotNode {
  key: string;
  label: string;
  children?: PivotNode[];
  // For rows, 'values' holds the computed metrics for each column intersection
  // Key = `${ColKey}||${ValueID}`
  values?: Record<string, number>; 
  isLeaf?: boolean;
}

export interface PivotResult {
  rowNodes: PivotNode[];
  colNodes: PivotNode[]; // The column headers tree
  // A list of flattened column keys to help the renderer know what columns to show in order
  flatColHeaders: { key: string; label: string; metric: PivotValue }[]; 
}