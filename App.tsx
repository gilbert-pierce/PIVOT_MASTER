import React, { useState, useMemo, useRef } from 'react';
import { DataRecord, PivotConfig, PivotResult } from './types';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import PivotTableRender from './components/PivotTableRender';
import { performPivot, generateExportData } from './utils/pivotEngine';
import { Download, Table as TableIcon, Activity, Database, X, LayoutTemplate, Box, ArrowRightLeft, FileUp, FileDown } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

const App: React.FC = () => {
  // --- State ---
  const [rawData, setRawData] = useState<DataRecord[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fieldsByFile, setFieldsByFile] = useState<Record<string, string[]>>({});
  const [allFields, setAllFields] = useState<string[]>([]);
  
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

  const configInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---
  const handleDataLoaded = (data: DataRecord[], names: string[]) => {
    setRawData(data);
    setFileNames(names);
    if (data.length > 0) {
      const byFile: Record<string, string[]> = {};
      const all = new Set<string>();
      
      names.forEach(name => {
        const fileData = data.find(d => d.__source_file === name);
        if (fileData) {
          const keys = Object.keys(fileData).filter(k => k !== '__source_file');
          byFile[name] = keys;
          keys.forEach(k => all.add(k));
        }
      });
      
      setFieldsByFile(byFile);
      const allArr = Array.from(all);
      setAllFields(allArr);

      // Smart default: guess first text field as row, first number as value
      const likelyRow = allArr.find(k => typeof data[0][k] === 'string') || allArr[0];
      const likelyVal = allArr.find(k => typeof data[0][k] === 'number');
      
      setConfig({
        customRows: [{ id: 'default_row', label: likelyRow, filters: [] }], 
        customCols: [],
        values: likelyVal ? [{ id: 'val_1', field: likelyVal, aggregator: 'sum' }] : [],
        filters: {}
      });
    }
  };

  const handleTranspose = () => {
    setConfig(prev => ({
      ...prev,
      customRows: prev.customCols,
      customCols: prev.customRows,
    }));
  };

  const handleExportConfig = () => {
    try {
      const configStr = JSON.stringify(config, null, 2);
      const blob = new Blob([configStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pivot_rules.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export config failed:", error);
      alert("Failed to export configuration.");
    }
  };

  const handleImportConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const importedConfig = JSON.parse(text);
      if (importedConfig && Array.isArray(importedConfig.customRows) && Array.isArray(importedConfig.customCols) && Array.isArray(importedConfig.values)) {
        setConfig(importedConfig);
      } else {
        alert("Invalid configuration file format.");
      }
    } catch (err) {
      console.error("Failed to import config:", err);
      alert("Failed to read configuration file.");
    } finally {
      if (configInputRef.current) configInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (!pivotResult || rawData.length === 0) return;
    try {
      const exportData = generateExportData(pivotResult, config);
      const ws = utils.aoa_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Pivot Data");
      const exportName = fileNames.length > 0 ? fileNames[0].replace(/\.[^/.]+$/, "") + "_pivot.xlsx" : "pivot_export.xlsx";
      writeFile(wb, exportName);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    }
  };

  const handleCloseFile = (e: React.MouseEvent) => {
    // 阻止冒泡并显式执行
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("确定要关闭当前文件并返回上传页面吗？")) {
      setRawData([]);
      setFileNames([]);
      setFieldsByFile({});
      setAllFields([]);
      setConfig({ customRows: [], customCols: [], values: [], filters: {} });
    }
  };

  // --- Computation ---
  const pivotResult: PivotResult = useMemo(() => {
    if (rawData.length === 0) return { rowNodes: [], colNodes: [], flatColHeaders: [] };
    return performPivot(rawData, config);
  }, [rawData, config]);

  // --- Empty State (Upload) ---
  // Removed full-screen empty state to unify the interface

  // --- Main Application Layout ---
  return (
    <div className="h-screen w-screen flex flex-row overflow-hidden bg-slate-900 text-sm">
      
      {/* Sidebar: Config Panel */}
      <ConfigPanel 
        fileNames={fileNames}
        fieldsByFile={fieldsByFile}
        allFields={allFields}
        config={config} 
        onConfigChange={setConfig} 
        data={rawData}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
        
        {/* Title Bar / Toolbar */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-30 app-drag">
           
           {/* Left: File Context */}
           <div className="flex items-center gap-3 min-w-0 no-drag">
              <div className="flex items-center gap-2 text-slate-700">
                 <LayoutTemplate className="w-4 h-4 text-slate-400" />
                 <span className="font-semibold truncate max-w-[300px]" title={fileNames.join(', ')}>
                   {fileNames.length === 0 ? 'No file loaded' : fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files loaded`}
                 </span>
                 {rawData.length > 0 && (
                   <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold whitespace-nowrap">
                      {rawData.length.toLocaleString()} ROWS
                   </span>
                 )}
              </div>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <FileUpload onDataLoaded={handleDataLoaded} />
           </div>

           {/* Right: Actions */}
           <div className="flex items-center gap-2 no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
              
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setViewMode('table')}
                    disabled={rawData.length === 0}
                    className={`flex items-center justify-center w-9 h-7 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'table' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'
                    }`}
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('heatmap')}
                    disabled={rawData.length === 0}
                    className={`flex items-center justify-center w-9 h-7 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'heatmap' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                  </button>
              </div>

              <div className="w-px h-4 bg-slate-200 mx-1" />
              
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={configInputRef} 
                onChange={handleImportConfig} 
              />
              <button 
                onClick={() => configInputRef.current?.click()}
                disabled={rawData.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md shadow-sm transition-all text-xs font-bold active:scale-95 whitespace-nowrap disabled:opacity-50"
                title="导入规则配置 (Import Rules)"
              >
                <FileUp className="w-3.5 h-3.5" />
                Import Rules
              </button>

              <button 
                onClick={handleExportConfig}
                disabled={rawData.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md shadow-sm transition-all text-xs font-bold active:scale-95 whitespace-nowrap disabled:opacity-50"
                title="导出规则配置 (Export Rules)"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export Rules
              </button>

              <div className="w-px h-4 bg-slate-200 mx-1" />

              <button 
                onClick={handleTranspose}
                disabled={rawData.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md shadow-sm transition-all text-xs font-bold active:scale-95 whitespace-nowrap disabled:opacity-50"
                title="转置 (Swap Rows and Columns)"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transpose
              </button>

              <button 
                onClick={handleExport}
                disabled={rawData.length === 0}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-sm transition-all text-xs font-bold active:scale-95 whitespace-nowrap disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>

              {rawData.length > 0 && (
                <button 
                  onClick={handleCloseFile}
                  className="no-drag p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer relative z-50 ml-1 flex items-center justify-center"
                  style={{ WebkitAppRegion: 'no-drag' } as any}
                  title="关闭文件"
                >
                   <X className="w-5 h-5" />
                </button>
              )}
           </div>
        </header>

        {/* Pivot Table Container */}
        <main className="flex-1 overflow-hidden relative w-full h-full bg-slate-100">
           {rawData.length === 0 ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
               <Database className="w-12 h-12 mb-4 opacity-20" />
               <p>Please upload a file to start analyzing data.</p>
             </div>
           ) : (
             <div className="absolute inset-0 bg-white overflow-hidden flex flex-col">
               <div className="flex-1 relative overflow-hidden">
                 <PivotTableRender 
                    result={pivotResult} 
                    config={config} 
                    viewMode={viewMode}
                    density={density}
                 />
               </div>
             </div>
           )}
        </main>

        {/* Status Bar */}
        <div className="h-7 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between px-4 text-[10px] text-slate-400 uppercase tracking-widest font-medium">
           <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]"></div>
                 Ready
              </span>
           </div>
           <div className="flex gap-3 items-center no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button 
                onClick={() => setDensity(d => d === 'normal' ? 'compact' : 'normal')} 
                className="hover:text-indigo-600 transition-colors uppercase"
              >
                 {density} Density
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;