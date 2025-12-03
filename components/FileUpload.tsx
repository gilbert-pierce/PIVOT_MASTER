import React, { useRef, useState } from 'react';
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { parseCSV } from '../utils/csvParser';
import { parseExcel } from '../utils/excelParser';
import { DataRecord } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: DataRecord[], filename: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setLoading(true);

    // Artificial delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const data = parseCSV(text);
        onDataLoaded(data, file.name);
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        try {
            const data = JSON.parse(text);
            if(Array.isArray(data)) {
                onDataLoaded(data, file.name);
            } else {
                alert("JSON must be an array of objects");
            }
        } catch(e) {
            alert("Invalid JSON file");
        }
      } else if (file.name.match(/\.xlsx?$/)) {
        try {
          const data = await parseExcel(file);
          if (data && data.length > 0) {
            onDataLoaded(data, file.name);
          } else {
            alert("Excel file appears to be empty or invalid.");
          }
        } catch (err) {
          alert("Error reading Excel file. Please ensure it is a valid format.");
        }
      } else {
          alert("Please upload a .csv, .json, or .xlsx file");
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div 
      className={`relative group flex flex-col items-center justify-center w-full h-56 transition-all duration-300 rounded-xl cursor-pointer overflow-hidden
        ${isDragging 
          ? 'border-2 border-dashed border-indigo-500 bg-indigo-50/50' 
          : 'border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50 hover:shadow-sm'
        }
        ${loading ? 'cursor-wait opacity-80 pointer-events-none' : ''}
      `}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !loading && inputRef.current?.click()}
    >
      <input 
        type="file" 
        accept=".csv,.json,.xlsx,.xls" 
        className="hidden" 
        ref={inputRef} 
        onChange={handleFileChange} 
      />
      
      {loading ? (
        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <h3 className="text-sm font-semibold text-slate-800">Analyzing Data...</h3>
          <p className="text-xs text-slate-500 mt-1">This won't take long.</p>
        </div>
      ) : (
        <>
          <div className={`p-4 rounded-full mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${isDragging ? 'bg-indigo-100 ring-4 ring-indigo-50' : 'bg-slate-100 group-hover:bg-indigo-50'}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`} />
          </div>
          
          <div className="text-center px-4">
            <h3 className={`text-base font-semibold transition-colors ${isDragging ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-900'}`}>
              {isDragging ? 'Drop it here!' : 'Click or Drag File'}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
              Supports large CSVs, Excel files, and JSON arrays.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default FileUpload;