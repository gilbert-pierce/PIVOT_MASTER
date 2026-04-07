import React, { useState } from 'react';
import { CustomBucket, FilterCondition, DataRecord, FilterOperator } from '../types';
import { Plus, X, Trash2, Edit2, Save, ArrowUp, ArrowDown, Copy, Filter, Check, ListFilter, Hash, CornerDownRight } from 'lucide-react';
import { getUniqueValues } from '../utils/pivotEngine';

interface CustomBucketBuilderProps {
  buckets: CustomBucket[];
  onChange: (buckets: CustomBucket[]) => void;
  data: DataRecord[];
  fields: string[];
  title: string;
}

// Helper functions for tree manipulation
const updateTree = (nodes: CustomBucket[], path: number[], updater: (node: CustomBucket) => CustomBucket): CustomBucket[] => {
  if (path.length === 0) return nodes;
  const newNodes = [...nodes];
  const [head, ...tail] = path;
  if (tail.length === 0) {
    newNodes[head] = updater(newNodes[head]);
  } else {
    newNodes[head] = {
      ...newNodes[head],
      children: updateTree(newNodes[head].children || [], tail, updater)
    };
  }
  return newNodes;
};

const insertIntoTree = (nodes: CustomBucket[], path: number[], newNode: CustomBucket): CustomBucket[] => {
  if (path.length === 0) return [...nodes, newNode];
  const newNodes = [...nodes];
  const [head, ...tail] = path;
  if (tail.length === 0) {
    newNodes.splice(head + 1, 0, newNode);
  } else {
    newNodes[head] = {
      ...newNodes[head],
      children: insertIntoTree(newNodes[head].children || [], tail, newNode)
    };
  }
  return newNodes;
};

const removeNode = (nodes: CustomBucket[], path: number[]): CustomBucket[] => {
  const newNodes = [...nodes];
  const [head, ...tail] = path;
  if (tail.length === 0) {
    newNodes.splice(head, 1);
  } else {
    newNodes[head] = {
      ...newNodes[head],
      children: removeNode(newNodes[head].children || [], tail)
    };
  }
  return newNodes;
};

const moveNode = (nodes: CustomBucket[], path: number[], direction: -1 | 1): CustomBucket[] => {
  const newNodes = [...nodes];
  const [head, ...tail] = path;
  if (tail.length === 0) {
    const targetIdx = head + direction;
    if (targetIdx >= 0 && targetIdx < newNodes.length) {
      [newNodes[head], newNodes[targetIdx]] = [newNodes[targetIdx], newNodes[head]];
    }
  } else {
    newNodes[head] = {
      ...newNodes[head],
      children: moveNode(newNodes[head].children || [], tail, direction)
    };
  }
  return newNodes;
};

const CustomBucketBuilder: React.FC<CustomBucketBuilderProps> = ({ buckets, onChange, data, fields, title }) => {
  const [editingPath, setEditingPath] = useState<number[] | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [tempFilters, setTempFilters] = useState<(FilterCondition & { _id: string })[]>([]);

  const handleEdit = (bucket: CustomBucket, path: number[]) => {
    setEditingPath(path);
    setTempLabel(bucket.label);
    setTempFilters(JSON.parse(JSON.stringify(bucket.filters)).map((f: any) => ({ ...f, _id: Math.random().toString(36).substr(2, 9) }))); 
  };

  const handleDuplicate = (bucket: CustomBucket, path: number[]) => {
    const newBucket: CustomBucket = { ...bucket, id: `bucket_${Date.now()}_copy`, label: `${bucket.label} (Copy)` };
    onChange(insertIntoTree(buckets, path, newBucket));
  };

  const handleMove = (path: number[], direction: -1 | 1) => {
    onChange(moveNode(buckets, path, direction));
  };

  const handleAddChild = (path: number[]) => {
    const newBucket: CustomBucket = {
      id: `bucket_${Date.now()}`,
      label: 'New Sub-bucket',
      filters: []
    };
    onChange(updateTree(buckets, path, node => ({
      ...node,
      children: [...(node.children || []), newBucket]
    })));
  };

  const handleSave = () => {
    if (!editingPath) return;
    onChange(updateTree(buckets, editingPath, node => ({
      ...node,
      label: tempLabel || 'Untitled',
      filters: tempFilters.map(({ _id, ...rest }) => rest)
    })));
    setEditingPath(null);
  };

  const addFilter = () => {
    if (fields.length === 0) return;
    setTempFilters([...tempFilters, { field: fields[0], operator: 'in', values: [], _id: Math.random().toString(36).substr(2, 9) }]);
  };

  const updateFilter = (idx: number, patch: Partial<FilterCondition>) => {
    const newFilters = [...tempFilters];
    newFilters[idx] = { ...newFilters[idx], ...patch };
    setTempFilters(newFilters);
  };

  const Operators: { value: FilterOperator, label: string }[] = [
    { value: 'in', label: 'In List' },
    { value: 'eq', label: 'Equals (=)' },
    { value: 'neq', label: 'Not Equals (≠)' },
    { value: 'gt', label: 'Greater Than (>)' },
    { value: 'gte', label: 'Greater or Equal (≥)' },
    { value: 'lt', label: 'Less Than (<)' },
    { value: 'lte', label: 'Less or Equal (≤)' },
    { value: 'between', label: 'Between [x, y]' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
  ];

  if (editingPath) {
    return (
      <div className="bg-slate-800 rounded-md shadow-xl border border-slate-600 mb-2 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 p-2 border-b border-slate-700 flex justify-between items-center">
            <span className="font-bold text-slate-100 text-[10px] uppercase flex items-center tracking-wider">
                <Edit2 className="w-3 h-3 mr-2 text-indigo-400" /> Edit {title}
            </span>
            <button onClick={() => setEditingPath(null)} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
        
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Bucket Label</label>
            <input 
              className="w-full text-xs bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
              value={tempLabel} onChange={e => setTempLabel(e.target.value)} placeholder="e.g. Q1 Sales" autoFocus
            />
          </div>
          
          <div className="space-y-2">
             <div className="flex justify-between items-center">
               <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Filters (AND)</label>
               <button onClick={addFilter} className="text-[9px] flex items-center text-indigo-300 hover:text-white px-2 py-0.5 rounded border border-indigo-500/30">
                  <Plus className="w-3 h-3 mr-1" /> Add Filter
               </button>
             </div>
             
             {tempFilters.map((filter, idx) => {
                const uniqueVals = filter.operator === 'in' ? getUniqueValues(data, filter.field) : [];
                return (
                 <div key={filter._id} className="bg-slate-900/50 p-2.5 rounded border border-slate-700 space-y-2 relative group">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Condition {idx + 1}</span>
                      <button 
                        type="button" 
                        onClick={() => setTempFilters(tempFilters.filter(f => f._id !== filter._id))} 
                        className="text-[10px] text-slate-400 hover:text-red-400 flex items-center transition-colors bg-slate-800 hover:bg-red-500/10 px-1.5 py-0.5 rounded border border-slate-700 hover:border-red-500/30"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </button>
                   </div>
                   <div className="flex gap-2">
                      <select 
                        className="flex-1 text-[10px] font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded py-1.5 px-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                        value={filter.field} onChange={e => updateFilter(idx, { field: e.target.value, values: [] })}
                      >
                        {fields.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                   </div>

                   <div className="flex gap-2">
                      <select 
                        className="flex-1 text-[10px] text-indigo-300 bg-slate-950 border border-slate-700 rounded py-1 px-1 outline-none"
                        value={filter.operator} onChange={e => updateFilter(idx, { operator: e.target.value as FilterOperator })}
                      >
                        {Operators.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                   </div>

                   {filter.operator === 'in' ? (
                     <div className="space-y-1">
                       <div className="flex gap-1">
                         <button type="button" onClick={() => updateFilter(idx, { values: [...uniqueVals] })} className="flex-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-0.5 rounded border border-slate-700 transition-colors">Select All</button>
                         <button type="button" onClick={() => updateFilter(idx, { values: [] })} className="flex-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-0.5 rounded border border-slate-700 transition-colors">None</button>
                         <button type="button" onClick={() => updateFilter(idx, { values: uniqueVals.filter(v => !filter.values.includes(v)) })} className="flex-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-0.5 rounded border border-slate-700 transition-colors">Invert</button>
                       </div>
                       <div className="max-h-24 overflow-y-auto dark-scroll bg-slate-950 rounded border border-slate-800 p-1">
                          {uniqueVals.map(val => (
                            <label key={val} className="flex items-center px-1.5 py-1 hover:bg-slate-800 cursor-pointer rounded group">
                               <div className={`w-3 h-3 rounded-[2px] border border-slate-600 mr-2 flex items-center justify-center ${filter.values.includes(val) ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900'}`}>
                                  {filter.values.includes(val) && <Check className="w-2.5 h-2.5 text-white" />}
                               </div>
                               <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate">{val}</span>
                               <input type="checkbox" className="hidden" checked={filter.values.includes(val)} onChange={() => {
                                 const next = filter.values.includes(val) ? filter.values.filter(v => v !== val) : [...filter.values, val];
                                 updateFilter(idx, { values: next });
                               }} />
                            </label>
                          ))}
                       </div>
                     </div>
                   ) : (
                     <div className="flex gap-2 items-center">
                        <input 
                           type="text" placeholder="Value..."
                           className="flex-1 text-[10px] bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 outline-none focus:border-indigo-500"
                           value={filter.val1 ?? ''} onChange={e => updateFilter(idx, { val1: e.target.value })}
                        />
                        {filter.operator === 'between' && (
                          <>
                            <span className="text-slate-500 text-[10px]">to</span>
                            <input 
                               type="text" placeholder="Value..."
                               className="flex-1 text-[10px] bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 outline-none focus:border-indigo-500"
                               value={filter.val2 ?? ''} onChange={e => updateFilter(idx, { val2: e.target.value })}
                            />
                          </>
                        )}
                     </div>
                   )}
                 </div>
                );
             })}
          </div>

          <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center justify-center transition-colors">
             <Save className="w-3 h-3 mr-1.5" /> Save Bucket
          </button>
        </div>
      </div>
    );
  }

  const renderBucket = (bucket: CustomBucket, path: number[], isLast: boolean) => {
    return (
      <div key={bucket.id} className="space-y-1">
        <div className="group relative flex items-center justify-between p-2 bg-slate-800 hover:bg-slate-750 border border-transparent hover:border-slate-600 rounded text-sm transition-all text-slate-200">
          <div className="flex flex-col min-w-0 pr-2">
              <span className="font-medium text-xs truncate flex items-center gap-1.5">
                {path.length > 1 && <CornerDownRight className="w-3 h-3 text-slate-500" />}
                {bucket.sourceFile && <span className="text-[8px] text-indigo-300 bg-indigo-500/20 px-1 py-0.5 rounded truncate max-w-[60px]" title={bucket.sourceFile}>{bucket.sourceFile}</span>}
                {bucket.label}
              </span>
              {bucket.filters.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 opacity-60">
                      <Filter className="w-2.5 h-2.5" />
                      <span className="text-[9px] truncate max-w-[120px]">
                          {bucket.filters.length} conditions
                      </span>
                  </div>
              )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 bg-slate-800 rounded border border-slate-700">
             <button onClick={() => handleAddChild(path)} className="p-1 text-slate-400 hover:text-emerald-400" title="Add Sub-bucket"><Plus className="w-3 h-3" /></button>
             <button onClick={() => handleMove(path, -1)} disabled={path[path.length - 1] === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
             <button onClick={() => handleMove(path, 1)} disabled={isLast} className="p-1 text-slate-400 hover:text-white disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
             <button onClick={() => handleDuplicate(bucket, path)} className="p-1 text-slate-400 hover:text-indigo-400"><Copy className="w-3 h-3" /></button>
             <button onClick={() => handleEdit(bucket, path)} className="p-1 text-slate-400 hover:text-white"><Edit2 className="w-3 h-3" /></button>
             <button onClick={() => onChange(removeNode(buckets, path))} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        {bucket.children && bucket.children.length > 0 && (
          <div className="pl-3 border-l border-slate-700/50 ml-2 space-y-1 mt-1">
            {bucket.children.map((child, childIndex) => 
              renderBucket(child, [...path, childIndex], childIndex === bucket.children!.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {buckets.length === 0 && <div className="text-[10px] text-slate-600 italic text-center py-2">None configured</div>}
      {buckets.map((bucket, index) => renderBucket(bucket, [index], index === buckets.length - 1))}
    </div>
  );
};

export default CustomBucketBuilder;