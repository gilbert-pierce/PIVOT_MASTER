import React, { useState, useMemo } from 'react';
import { DataRecord, PivotConfig, PivotResult } from './types';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import PivotTableRender from './components/PivotTableRender';
import { performPivot, generateExportData } from './utils/pivotEngine';
import { Download, Table as TableIcon, Activity, Database, X, LayoutTemplate, Box } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

const App: React.FC = () => {
  // --- State ---
  const [rawData, setRawData] = useState<DataRecord[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [fields, setFields] = useState<string[]>([]);
  
  // View State
  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');
  const [density, setDensity] = useState<'compact' | 'normal'>('normal');

  // Initial Config
  const [config, setConfig] = useState<PivotConfig>({
    customRows: [],
    customCols: [],
    values: [],
    filters: {}
  });

  // --- Handlers ---
  const handleDataLoaded = (data: DataRecord[], name: string) => {
    setRawData(data);
    setFileName(name);
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      setFields(keys);
      // Smart default: guess first text field as row, first number as value
      const likelyRow = keys.find(k => typeof data[0][k] === 'string') || keys[0];
      const likelyVal = keys.find(k => typeof data[0][k] === 'number');
      
      setConfig({
        customRows: [{ id: 'default_row', label: likelyRow, filters: [] }], 
        customCols: [],
        values: likelyVal ? [{ id: 'val_1', field: likelyVal, aggregator: 'sum' }] : [],
        filters: {}
      });
    }
  };

  const handleExport = () => {
    if (!pivotResult || rawData.length === 0) return;
    try {
      const exportData = generateExportData(pivotResult);
      const ws = utils.aoa_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Pivot Data");
      const exportName = fileName ? fileName.replace(/\.[^/.]+$/, "") + "_pivot.xlsx" : "pivot_export.xlsx";
      writeFile(wb, exportName);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    }
  };

  const handleCloseFile = () => {
    if (window.confirm("Close current file? Unsaved views will be lost.")) {
      setRawData([]);
      setFileName('');
      setFields([]);
      setConfig({ customRows: [], customCols: [], values: [], filters: {} });
    }
  };

  // --- Computation ---
  const pivotResult: PivotResult = useMemo(() => {
    if (rawData.length === 0) return { rowNodes: [], colNodes: [], flatColHeaders: [] };
    return performPivot(rawData, config);
  }, [rawData, config]);

  // --- Empty State (Upload) ---
  if (rawData.length === 0) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-800 app-drag">
        <div className="max-w-md w-full flex flex-col items-center gap-6 app-no-drag">
           <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 ring-1 ring-slate-100">
              <Box className="w-8 h-8 text-indigo-600" />
           </div>
           
           <div className="text-center space-y-2">
             <h1 className="text-2xl font-bold tracking-tight text-slate-900">
               PivotMaster
             </h1>
             <p className="text-slate-500">
               Drop a file to begin analysis
             </p>
           </div>

           <div className="w-full">
              <FileUpload onDataLoaded={handleDataLoaded} />
           </div>
           
           <div className="flex gap-4 text-xs font-mono text-slate-400 uppercase tracking-widest">
              <span>.CSV</span>
              <span className="text-slate-300">•</span>
              <span>.JSON</span>
              <span className="text-slate-300">•</span>
              <span>.XLSX</span>
           </div>
        </div>
      </div>
    );
  }

  // --- Main Application Layout ---
  return (
    <div className="h-screen w-screen flex flex-row overflow-hidden bg-slate-900 text-sm">
      
      {/* Sidebar: Config Panel */}
      <ConfigPanel 
        fields={fields} 
        config={config} 
        onConfigChange={setConfig} 
        data={rawData}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 h-full relative border-l border-slate-800">
        
        {/* Title Bar / Toolbar */}
        <header className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-3 shrink-0 shadow-sm z-20 app-drag">
           
           {/* Left: File Context */}
           <div className="flex items-center gap-3 min-w-0 app-no-drag">
              <div className="flex items-center gap-2 text-slate-700">
                 <LayoutTemplate className="w-4 h-4 text-slate-400" />
                 <span className="font-semibold truncate max-w-[200px]" title={fileName}>{fileName}</span>
                 <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {rawData.length.toLocaleString()} ROWS
                 </span>
              </div>
           </div>

           {/* Right: Actions */}
           <div className="flex items-center gap-2 app-no-drag">
              
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`flex items-center justify-center w-8 h-6 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'table' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Grid View"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setViewMode('heatmap')}
                    className={`flex items-center justify-center w-8 h-6 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'heatmap' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Heatmap View"
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </button>
              </div>

              <div className="w-px h-3 bg-slate-200 mx-1" />
              
              <button 
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-sm transition-colors text-xs font-semibold"
              >
                <Download className="w-3 h-3" />
                Export
              </button>

              <button 
                onClick={handleCloseFile}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Close File"
              >
                 <X className="w-4 h-4" />
              </button>
           </div>
        </header>

        {/* Pivot Table Container */}
        <main className="flex-1 overflow-hidden relative w-full h-full bg-slate-100 p-2">
           <div className="absolute inset-2 bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden flex flex-col">
             <div className="flex-1 relative overflow-hidden">
               <PivotTableRender 
                  result={pivotResult} 
                  config={config} 
                  viewMode={viewMode}
                  density={density}
               />
             </div>
           </div>
        </main>

        {/* Status Bar */}
        <div className="h-6 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between px-3 text-[10px] text-slate-400">
           <div className="flex gap-4">
              <span>Ready</span>
           </div>
           <div className="flex gap-2 items-center app-no-drag">
              <button onClick={() => setDensity(d => d === 'normal' ? 'compact' : 'normal')} className="hover:text-indigo-600 uppercase font-medium">
                 {density} Density
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;