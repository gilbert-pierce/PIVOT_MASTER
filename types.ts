export type AggregatorType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median' | 'distinctCount';

export type FilterOperator = 'in' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  values: string[]; // 用于 'in' 模式
  val1?: string | number; // 用于比较或区间的起始值
  val2?: string | number; // 用于区间的结束值
}

export interface CustomBucket {
  id: string;
  label: string;
  filters: FilterCondition[];
}

export interface PivotValue {
  id: string; 
  field: string;
  aggregator: AggregatorType;
}

export interface PivotConfig {
  customRows: CustomBucket[];
  customCols: CustomBucket[];
  values: PivotValue[];
  filters: Record<string, string[]>; 
}

export interface DataRecord {
  [key: string]: string | number | boolean | null;
}

export interface PivotNode {
  key: string;
  label: string;
  children?: PivotNode[];
  values?: Record<string, number>; 
  isLeaf?: boolean;
}

export interface PivotResult {
  rowNodes: PivotNode[];
  colNodes: PivotNode[]; 
  flatColHeaders: { key: string; label: string; metric: PivotValue }[]; 
}