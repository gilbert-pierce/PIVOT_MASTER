import React, { useState } from 'react';
import { CustomBucket, FilterCondition, DataRecord } from '../types';
import { Plus, X, Trash2, Edit2, Save, ArrowUp, ArrowDown, Copy, Filter, Check } from 'lucide-react';
import { getUniqueValues } from '../utils/pivotEngine';

interface CustomBucketBuilderProps {
  buckets: CustomBucket[];
  onChange: (buckets: CustomBucket[]) => void;
  data: DataRecord[];
  fields: string[];
  title: string;
}

const CustomBucketBuilder: React.FC<CustomBucketBuilderProps> = ({ buckets, onChange, data, fields, title }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [tempLabel, setTempLabel] = useState('');
  const [tempFilters, setTempFilters] = useState<FilterCondition[]>([]);

  const handleEdit = (bucket: CustomBucket) => {
    setEditingId(bucket.id);
    setTempLabel(bucket.label);
    setTempFilters(JSON.parse(JSON.stringify(bucket.filters))); 
  };

  const handleDuplicate = (bucket: CustomBucket, index: number) => {
    const newBucket: CustomBucket = {
      ...bucket,
      id: `bucket_${Date.now()}_copy`,
      label: `${bucket.label} (Copy)`
    };
    const newBuckets = [...buckets];
    newBuckets.splice(index + 1, 0, newBucket);
    onChange(newBuckets);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const newBuckets = [...buckets];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newBuckets.length) return;
    [newBuckets[index], newBuckets[targetIndex]] = [newBuckets[targetIndex], newBuckets[index]];
    onChange(newBuckets);
  };

  const handleSave = () => {
    if (!editingId) return;
    const newBucket: CustomBucket = {
      id: editingId,
      label: tempLabel || 'Untitled',
      filters: tempFilters
    };
    const existingIndex = buckets.findIndex(b => b.id === editingId);
    let newBuckets;
    if (existingIndex >= 0) {
      newBuckets = [...buckets];
      newBuckets[existingIndex] = newBucket;
    } else {
      newBuckets = [...buckets, newBucket];
    }
    onChange(newBuckets);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange(buckets.filter(b => b.id !== id));
  };

  const addFilter = () => {
    if (fields.length === 0) return;
    setTempFilters([...tempFilters, { field: fields[0], values: [] }]);
  };

  const removeFilter = (idx: number) => {
    setTempFilters(tempFilters.filter((_, i) => i !== idx));
  };

  const updateFilterField = (idx: number, field: string) => {
    const newFilters = [...tempFilters];
    newFilters[idx].field = field;
    newFilters[idx].values = []; 
    setTempFilters(newFilters);
  };

  const toggleFilterValue = (idx: number, val: string) => {
    const newFilters = [...tempFilters];
    const currentVals = newFilters[idx].values;
    if (currentVals.includes(val)) {
      newFilters[idx].values = currentVals.filter(v => v !== val);
    } else {
      newFilters[idx].values = [...currentVals, val];
    }
    setTempFilters(newFilters);
  };

  if (editingId) {
    return (
      <div className="bg-slate-800 rounded-md shadow-xl border border-slate-600 mb-2 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 p-2 border-b border-slate-700 flex justify-between items-center">
            <span className="font-bold text-slate-100 text-[10px] uppercase flex items-center tracking-wider">
                <Edit2 className="w-3 h-3 mr-2 text-indigo-400" />
                Edit {title}
            </span>
            <button onClick={handleCancel} className="text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
        
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Label</label>
            <input 
              className="w-full text-xs bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
              value={tempLabel}
              onChange={e => setTempLabel(e.target.value)}
              placeholder="Display Name"
              autoFocus
            />
          </div>
          
          <div>
             <div className="flex justify-between items-end mb-2">
               <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Filters (AND)</label>
               <button onClick={addFilter} className="text-[10px] flex items-center text-indigo-300 hover:text-white px-2 py-0.5 rounded border border-indigo-500/30 hover:bg-indigo-500/20">
                  <Plus className="w-3 h-3 mr-1" /> Add
               </button>
             </div>
             
             <div className="space-y-2">
               {tempFilters.length === 0 && (
                   <div className="text-[10px] text-slate-600 italic p-2 border border-dashed border-slate-700 rounded text-center">
                     No filters (Show All)
                   </div>
               )}
               
               {tempFilters.map((filter, idx) => {
                  const uniqueVals = getUniqueValues(data, filter.field);
                  return (
                   <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-700 relative">
                     <button onClick={() => removeFilter(idx)} className="absolute top-1.5 right-1.5 text-slate-600 hover:text-red-400">
                        <X className="w-3 h-3" />
                     </button>
                     
                     <div className="mb-2 pr-6">
                        <select 
                          className="w-full text-[10px] font-medium text-slate-300 bg-slate-800 border-none rounded py-1 px-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                          value={filter.field}
                          onChange={e => updateFilterField(idx, e.target.value)}
                        >
                          {fields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                     </div>

                     <div className="max-h-24 overflow-y-auto dark-scroll bg-slate-950 rounded border border-slate-800 p-1">
                        {uniqueVals.map(val => (
                          <label key={val} className="flex items-center px-1.5 py-1 hover:bg-slate-800 cursor-pointer rounded group">
                             <div className={`w-3 h-3 rounded-[2px] border border-slate-600 mr-2 flex items-center justify-center ${filter.values.includes(val) ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900'}`}>
                                {filter.values.includes(val) && <Check className="w-2.5 h-2.5 text-white" />}
                             </div>
                             <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate">{val}</span>
                             <input 
                               type="checkbox" 
                               className="hidden"
                               checked={filter.values.includes(val)}
                               onChange={() => toggleFilterValue(idx, val)}
                             />
                          </label>
                        ))}
                     </div>
                   </div>
                  );
               })}
             </div>
          </div>

          <button 
              onClick={handleSave} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center justify-center transition-colors shadow-lg shadow-indigo-900/20"
          >
             <Save className="w-3 h-3 mr-1.5" /> Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {buckets.length === 0 && (
         <div className="text-[10px] text-slate-600 italic text-center py-2">
           None configured
         </div>
      )}
      
      {buckets.map((bucket, index) => (
        <div key={bucket.id} className="group relative flex items-center justify-between p-2 bg-slate-800 hover:bg-slate-750 border border-transparent hover:border-slate-600 rounded text-sm transition-all text-slate-200">
          <div className="flex flex-col min-w-0 pr-2">
              <span className="font-medium text-xs truncate">{bucket.label}</span>
              {bucket.filters.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 opacity-60">
                      <Filter className="w-2.5 h-2.5" />
                      <span className="text-[10px] truncate max-w-[120px]">
                          {bucket.filters.length} filter(s)
                      </span>
                  </div>
              )}
          </div>
          
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 bg-slate-800 rounded shadow-sm border border-slate-700">
             <button onClick={() => handleMove(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-20">
               <ArrowUp className="w-3 h-3" />
             </button>
             <button onClick={() => handleMove(index, 1)} disabled={index === buckets.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-20">
               <ArrowDown className="w-3 h-3" />
             </button>
             <div className="w-px h-3 bg-slate-700 mx-0.5"></div>
             <button onClick={() => handleDuplicate(bucket, index)} className="p-1 text-slate-400 hover:text-indigo-400">
               <Copy className="w-3 h-3" />
             </button>
             <button onClick={() => handleEdit(bucket)} className="p-1 text-slate-400 hover:text-white">
               <Edit2 className="w-3 h-3" />
             </button>
             <button onClick={() => handleDelete(bucket.id)} className="p-1 text-slate-400 hover:text-red-400">
               <Trash2 className="w-3 h-3" />
             </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomBucketBuilder;