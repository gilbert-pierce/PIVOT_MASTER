import React, { useState } from 'react';
import { PivotConfig, DataRecord, AggregatorType, CustomBucket } from '../types';
import { Plus, Trash2, ChevronDown, Layers, Columns, Database, Settings2 } from 'lucide-react';
import CustomBucketBuilder from './CustomBucketBuilder';

interface ConfigPanelProps {
  fileNames: string[];
  fieldsByFile: Record<string, string[]>;
  allFields: string[];
  config: PivotConfig;
  onConfigChange: (newConfig: PivotConfig) => void;
  data: DataRecord[]; 
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ fileNames, fieldsByFile, allFields, config, onConfigChange, data }) => {
  
  const [rowSource, setRowSource] = useState<string>('All Files');
  const [colSource, setColSource] = useState<string>('All Files');
  const [valSource, setValSource] = useState<string>('All Files');

  const getFieldsForSource = (source: string) => {
    if (source === 'All Files') return allFields;
    return fieldsByFile[source] || [];
  };

  const addBucketFromField = (type: 'row' | 'col', field: string, source: string) => {
    const newBucket: CustomBucket = {
      id: `bucket_${Date.now()}`,
      label: field,
      filters: [],
      sourceFile: source === 'All Files' ? undefined : source
    };
    if (type === 'row') {
      onConfigChange({ ...config, customRows: [...config.customRows, newBucket] });
    } else {
      onConfigChange({ ...config, customCols: [...config.customCols, newBucket] });
    }
  };

  const addValue = (field: string, source: string) => {
    const newValue = { 
      id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
      field, 
      aggregator: 'sum' as AggregatorType,
      sourceFile: source === 'All Files' ? undefined : source
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

  const changeValueName = (id: string, newName: string) => {
    const newValues = config.values.map(v => 
      v.id === id ? { ...v, customName: newName } : v
    );
    onConfigChange({ ...config, values: newValues });
  };

  const AggregatorOptions: { value: AggregatorType; label: string }[] = [
    { value: 'sum', label: 'SUM' },
    { value: 'count', label: 'COUNT' },
    { value: 'distinctCount', label: 'DISTINCT' },
    { value: 'avg', label: 'AVG' },
    { value: 'min', label: 'MIN' },
    { value: 'max', label: 'MAX' },
    { value: 'median', label: 'MEDIAN' },
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
                fields={allFields}
                data={data}
                onChange={(newBuckets) => onConfigChange({...config, customRows: newBuckets})}
             />
             
             <div className="mt-3 pt-2 border-t border-slate-800/50">
               {fileNames.length > 1 && (
                 <div className="mb-2">
                   <select 
                     value={rowSource}
                     onChange={(e) => setRowSource(e.target.value)}
                     className="w-full text-[9px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-300 outline-none focus:border-indigo-500"
                   >
                     <option value="All Files">All Files (Merge)</option>
                     {fileNames.map(f => <option key={f} value={f}>{f}</option>)}
                   </select>
                 </div>
               )}
               <div className="relative">
                 <select 
                   onChange={(e) => {
                     if (e.target.value) {
                       addBucketFromField('row', e.target.value, rowSource);
                       e.target.value = '';
                     }
                   }}
                   className="w-full text-[10px] font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded py-1.5 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none outline-none cursor-pointer hover:bg-slate-700 transition-colors"
                   defaultValue=""
                 >
                   <option value="" disabled>+ Add Row</option>
                   {getFieldsForSource(rowSource).map(field => (
                     <option key={`row-field-${field}`} value={field}>{field}</option>
                   ))}
                 </select>
                 <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-2 pointer-events-none" />
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
                fields={allFields}
                data={data}
                onChange={(newBuckets) => onConfigChange({...config, customCols: newBuckets})}
             />

             <div className="mt-3 pt-2 border-t border-slate-800/50">
               {fileNames.length > 1 && (
                 <div className="mb-2">
                   <select 
                     value={colSource}
                     onChange={(e) => setColSource(e.target.value)}
                     className="w-full text-[9px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-300 outline-none focus:border-indigo-500"
                   >
                     <option value="All Files">All Files (Merge)</option>
                     {fileNames.map(f => <option key={f} value={f}>{f}</option>)}
                   </select>
                 </div>
               )}
               <div className="relative">
                 <select 
                   onChange={(e) => {
                     if (e.target.value) {
                       addBucketFromField('col', e.target.value, colSource);
                       e.target.value = '';
                     }
                   }}
                   className="w-full text-[10px] font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded py-1.5 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none outline-none cursor-pointer hover:bg-slate-700 transition-colors"
                   defaultValue=""
                 >
                   <option value="" disabled>+ Add Column</option>
                   {getFieldsForSource(colSource).map(field => (
                     <option key={`col-field-${field}`} value={field}>{field}</option>
                   ))}
                 </select>
                 <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-2 pointer-events-none" />
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
                     {val.sourceFile && (
                       <div className="text-[8px] text-indigo-300 bg-indigo-500/20 px-1 py-0.5 rounded mb-1 truncate" title={val.sourceFile}>
                         {val.sourceFile}
                       </div>
                     )}
                     <div className="flex items-center justify-between mb-1 gap-2">
                        <input 
                          type="text"
                          value={val.customName ?? ''}
                          placeholder={val.field}
                          onChange={(e) => changeValueName(val.id, e.target.value)}
                          className="flex-1 text-[11px] font-medium text-slate-200 bg-slate-900/50 border border-slate-700/50 rounded px-1.5 py-0.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none truncate placeholder:text-slate-500"
                          title="Rename metric"
                        />
                        <button 
                          onClick={() => removeValue(val.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors shrink-0"
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
               {fileNames.length > 1 && (
                 <div className="mb-2">
                   <select 
                     value={valSource}
                     onChange={(e) => setValSource(e.target.value)}
                     className="w-full text-[9px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-300 outline-none focus:border-emerald-500"
                   >
                     <option value="All Files">All Files (Merge)</option>
                     {fileNames.map(f => <option key={f} value={f}>{f}</option>)}
                   </select>
                 </div>
               )}
               <div className="relative">
                 <select 
                   onChange={(e) => {
                     if (e.target.value) {
                       addValue(e.target.value, valSource);
                       e.target.value = '';
                     }
                   }}
                   className="w-full text-[10px] font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded py-1.5 pl-2 pr-6 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 appearance-none outline-none cursor-pointer hover:bg-slate-700 transition-colors"
                   defaultValue=""
                 >
                   <option value="" disabled>+ Add Metric</option>
                   {getFieldsForSource(valSource).map(field => (
                     <option key={`val-add-${field}`} value={field}>{field}</option>
                   ))}
                 </select>
                 <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-2 pointer-events-none" />
               </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ConfigPanel;