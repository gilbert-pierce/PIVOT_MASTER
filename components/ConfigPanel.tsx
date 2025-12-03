import React from 'react';
import { PivotConfig, DataRecord, AggregatorType, CustomBucket } from '../types';
import { Plus, Trash2, ChevronDown, Layers, Columns, Database, Settings2 } from 'lucide-react';
import CustomBucketBuilder from './CustomBucketBuilder';

interface ConfigPanelProps {
  fields: string[];
  config: PivotConfig;
  onConfigChange: (newConfig: PivotConfig) => void;
  data: DataRecord[]; 
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ fields, config, onConfigChange, data }) => {
  
  const addBucketFromField = (type: 'row' | 'col', field: string) => {
    const newBucket: CustomBucket = {
      id: `bucket_${Date.now()}`,
      label: field,
      filters: []
    };
    if (type === 'row') {
      onConfigChange({ ...config, customRows: [...config.customRows, newBucket] });
    } else {
      onConfigChange({ ...config, customCols: [...config.customCols, newBucket] });
    }
  };

  const addValue = (field: string) => {
    const newValue = { 
      id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
      field, 
      aggregator: 'sum' as AggregatorType 
    };
    onConfigChange({ ...config, values: [...config.values, newValue] });
  };

  const removeValue = (id: string) => {
    onConfigChange({ ...config, values: config.values.filter(v => v.id !== id) });
  };

  const changeAggregator = (id: string, newAgg: AggregatorType) => {
    const newValues = config.values.map(v => 
      v.id === id ? { ...v, aggregator: newAgg } : v
    );
    onConfigChange({ ...config, values: newValues });
  };

  const AggregatorOptions = [
    { value: 'sum', label: 'SUM' },
    { value: 'count', label: 'COUNT' },
    { value: 'avg', label: 'AVG' },
    { value: 'min', label: 'MIN' },
    { value: 'max', label: 'MAX' },
  ];

  return (
    <div className="w-72 bg-slate-900 flex flex-col shrink-0 h-full border-r border-slate-900 text-slate-400 z-30 select-none shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      
      {/* Sidebar Header */}
      <div className="h-10 flex items-center px-4 border-b border-slate-800 bg-slate-900 shrink-0 app-drag">
        <Settings2 className="w-3.5 h-3.5 text-indigo-500 mr-2" />
        <span className="font-bold text-slate-200 tracking-wide text-xs uppercase">Config</span>
      </div>

      <div className="flex-1 overflow-y-auto dark-scroll p-3 space-y-6">
        
        {/* === ROWS === */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500 px-1">
             <Layers className="w-3 h-3" />
             <h3 className="text-[10px] font-bold uppercase tracking-wider">Rows</h3>
          </div>

          <div className="bg-slate-950/30 rounded border border-slate-800/60 p-2 min-h-[60px]">
             <CustomBucketBuilder 
                title="Rows"
                buckets={config.customRows}
                fields={fields}
                data={data}
                onChange={(newBuckets) => onConfigChange({...config, customRows: newBuckets})}
             />
             
             <div className="mt-3 pt-2 border-t border-slate-800/50">
               <span className="text-[9px] text-slate-600 font-bold uppercase block mb-1.5">Available Fields</span>
               <div className="flex flex-wrap gap-1">
                 {fields.map(field => (
                   <button 
                     key={`row-field-${field}`}
                     onClick={() => addBucketFromField('row', field)}
                     className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 hover:border-indigo-500 rounded text-[10px] font-medium transition-all truncate max-w-full flex items-center group text-slate-300"
                   >
                     <Plus className="w-2 h-2 mr-1 opacity-50 group-hover:opacity-100" /> 
                     {field}
                   </button>
                 ))}
               </div>
             </div>
          </div>
        </section>

        {/* === COLUMNS === */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500 px-1">
             <Columns className="w-3 h-3" />
             <h3 className="text-[10px] font-bold uppercase tracking-wider">Columns</h3>
          </div>

          <div className="bg-slate-950/30 rounded border border-slate-800/60 p-2 min-h-[60px]">
             <CustomBucketBuilder 
                title="Columns"
                buckets={config.customCols}
                fields={fields}
                data={data}
                onChange={(newBuckets) => onConfigChange({...config, customCols: newBuckets})}
             />

             <div className="mt-3 pt-2 border-t border-slate-800/50">
               <span className="text-[9px] text-slate-600 font-bold uppercase block mb-1.5">Available Fields</span>
               <div className="flex flex-wrap gap-1">
                 {fields.map(field => (
                   <button 
                     key={`col-field-${field}`}
                     onClick={() => addBucketFromField('col', field)}
                     className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 hover:border-indigo-500 rounded text-[10px] font-medium transition-all truncate max-w-full flex items-center group text-slate-300"
                   >
                     <Plus className="w-2 h-2 mr-1 opacity-50 group-hover:opacity-100" /> 
                     {field}
                   </button>
                 ))}
               </div>
             </div>
          </div>
        </section>

        {/* === METRICS === */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500 px-1">
             <Database className="w-3 h-3" />
             <h3 className="text-[10px] font-bold uppercase tracking-wider">Values</h3>
          </div>
          
          <div className="bg-slate-950/30 rounded border border-slate-800/60 p-2">
            <div className="space-y-1.5 mb-3">
               {config.values.length === 0 && (
                   <div className="text-[10px] text-slate-600 italic text-center py-2">
                     No metrics
                   </div>
               )}
               {config.values.map((val) => (
                  <div key={val.id} className="bg-slate-800 p-1.5 rounded border border-slate-700 shadow-sm group">
                     <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-slate-200 truncate pr-2" title={val.field}>{val.field}</span>
                        <button 
                          onClick={() => removeValue(val.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                        >
                           <Trash2 className="w-2.5 h-2.5" />
                        </button>
                     </div>
                     <div className="relative">
                        <select 
                          value={val.aggregator}
                          onChange={(e) => changeAggregator(val.id, e.target.value as AggregatorType)}
                          className="w-full text-[10px] font-bold text-indigo-300 bg-slate-900 border border-slate-700 rounded py-0.5 pl-1.5 pr-5 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none outline-none uppercase tracking-wide cursor-pointer hover:bg-slate-950 transition-colors"
                        >
                          {AggregatorOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-slate-500 absolute right-1.5 top-1.5 pointer-events-none" />
                     </div>
                  </div>
               ))}
            </div>

            <div className="pt-2 border-t border-slate-800/50">
               <span className="text-[9px] text-slate-600 font-bold uppercase block mb-1.5">Add Metric</span>
               <div className="flex flex-wrap gap-1">
                {fields.map(field => (
                  <button 
                    key={`val-add-${field}`}
                    onClick={() => addValue(field)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-emerald-600 hover:text-white border border-slate-700 hover:border-emerald-500 rounded text-[10px] font-medium transition-all truncate max-w-full flex items-center group text-slate-300"
                  >
                    <Plus className="w-2 h-2 mr-1 opacity-50 group-hover:opacity-100" /> 
                    {field}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ConfigPanel;