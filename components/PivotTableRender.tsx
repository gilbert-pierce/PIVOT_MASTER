import React, { useMemo } from 'react';
import { PivotNode, PivotConfig, PivotResult } from '../types';

interface PivotTableRenderProps {
  result: PivotResult;
  config: PivotConfig;
  viewMode: 'table' | 'heatmap';
  density: 'compact' | 'normal';
}

interface FlattenedRow {
  key: string;
  dims: { label: string; rowSpan: number }[]; 
  values: Record<string, number>;
}

const PivotTableRender: React.FC<PivotTableRenderProps> = ({ result, config, viewMode, density }) => {
  const { rowNodes, colNodes, flatColHeaders } = result;

  // -- 1. Flatten Rows Recursively --
  const tableRows = useMemo(() => {
    const traverse = (nodes: PivotNode[]): FlattenedRow[] => {
      let rows: FlattenedRow[] = [];
      nodes.forEach(node => {
        if (node.isLeaf) {
          rows.push({
            key: node.key, 
            dims: [{ label: node.label, rowSpan: 1 }],
            values: node.values || {}
          });
        } else {
          const childRows = traverse(node.children || []);
          if (childRows.length > 0) {
            childRows[0].dims.unshift({ label: node.label, rowSpan: childRows.length });
          }
          rows = [...rows, ...childRows];
        }
      });
      return rows;
    };
    return traverse(rowNodes);
  }, [rowNodes]);

  // -- 2. Heatmap Stats --
  const colStats = useMemo(() => {
    const stats: Record<string, { max: number, min: number }> = {};
    if (viewMode === 'heatmap') {
        flatColHeaders.forEach(col => {
            let max = -Infinity;
            let min = Infinity;
            tableRows.forEach(row => {
                const val = row.values[col.key];
                if (val !== undefined && val !== null) {
                    if (val > max) max = val;
                    if (val < min) min = val;
                }
            });
            if (max === -Infinity) max = 1;
            if (min === Infinity) min = 0;
            stats[col.key] = { max, min };
        });
    }
    return stats;
  }, [tableRows, flatColHeaders, viewMode]);

  // -- 3. Build Header Rows --
  const getDepth = (node: PivotNode): number => node.children && node.children.length > 0 ? 1 + Math.max(...node.children.map(getDepth)) : 1;
  const colTreeDepth = colNodes.length > 0 ? Math.max(...colNodes.map(getDepth)) : 0;
  
  const showMetricHeader = config.values.length > 1; 
  const totalHeaderRows = colTreeDepth + (showMetricHeader ? 1 : 0);

  const buildHeaderRows = () => {
     const rows: { label: string; colSpan: number; key: string }[][] = Array.from({ length: totalHeaderRows }, () => []);
     
     const walk = (nodes: PivotNode[], depth: number) => {
        nodes.forEach(node => {
           const getLeafCount = (n: PivotNode): number => {
              if (n.isLeaf) return config.values.length || 1; 
              return n.children!.reduce((sum, child) => sum + getLeafCount(child), 0);
           };
           const colSpan = getLeafCount(node);
           
           rows[depth].push({ label: node.label, colSpan, key: node.key });
           
           if (!node.isLeaf && node.children) {
              walk(node.children, depth + 1);
           } else if (node.isLeaf && showMetricHeader) {
               config.values.forEach(v => {
                   const label = `${v.aggregator.toUpperCase()} ${v.field}`;
                   rows[depth + 1].push({ label, colSpan: 1, key: `${node.key}_${v.id}` });
               });
           }
        });
     };
     
     if (colNodes.length > 0) {
        walk(colNodes, 0);
     } else {
        if (showMetricHeader) {
             config.values.forEach(v => {
                 rows[0].push({ label: `${v.aggregator} ${v.field}`, colSpan: 1, key: `total_${v.id}` });
             });
        } else if (config.values.length === 1) {
            rows[0].push({ label: `${config.values[0].aggregator} ${config.values[0].field}`, colSpan: 1, key: `total` });
        } else {
            rows[0].push({ label: 'Count', colSpan: 1, key: 'total' });
        }
     }
     
     return rows;
  };

  const headerRows = buildHeaderRows();
  const validHeaderRows = headerRows.filter(r => r.length > 0);

  const formatVal = (val: number | undefined) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: Number.isInteger(val) ? 0 : 1, 
        maximumFractionDigits: 2 
    }).format(val);
  };

  // Styles
  const densityPadding = density === 'compact' ? 'py-1 px-2' : 'py-2 px-3';
  const cellText = density === 'compact' ? 'text-[11px]' : 'text-xs';
  
  return (
    <div className="absolute inset-0 overflow-auto bg-white" id="pivot-container">
        <table className="min-w-full text-left border-collapse border-spacing-0 selectable">
          <thead className="sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-slate-700 bg-slate-50 font-bold">
             {validHeaderRows.map((hRow, rIdx) => (
               <tr key={rIdx}>
                 {/* Corner (Top-Left) */}
                 {rIdx === 0 && (
                   <th 
                      rowSpan={validHeaderRows.length} 
                      className={`sticky left-0 z-40 bg-slate-50 border-b border-r border-slate-300 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 p-2 align-bottom min-w-[150px] shadow-[1px_0_0_rgba(0,0,0,0.05)]`}
                   >
                      Dimensions
                   </th>
                 )}

                 {hRow.map((cell, cIdx) => (
                   <th 
                     key={`${rIdx}-${cIdx}-${cell.key}`} 
                     colSpan={cell.colSpan}
                     className={`border-b border-r border-slate-300 bg-slate-50 text-center font-bold text-[10px] text-slate-600 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${densityPadding}`}
                   >
                     {cell.label}
                   </th>
                 ))}
               </tr>
             ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tableRows.length === 0 ? (
               <tr>
                   <td className="p-20 text-center text-slate-400" colSpan={100}>
                       <div className="flex flex-col items-center gap-3">
                           <span className="font-semibold text-lg">No Data</span>
                           <span className="text-sm">Drag fields to Rows and Columns to build your view.</span>
                       </div>
                   </td>
               </tr>
            ) : (
              tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors group">
                  {row.dims.map((dim, dIdx) => (
                    <td 
                      key={`dim-${dIdx}`} 
                      rowSpan={dim.rowSpan}
                      className={`
                        border-r border-b border-slate-200 
                        bg-white group-hover:bg-blue-50/10
                        font-medium text-slate-700 
                        align-top 
                        sticky left-0 z-20 
                        whitespace-nowrap 
                        ${densityPadding}
                        ${cellText}
                        ${dIdx > 0 ? 'pl-4 font-normal text-slate-500' : ''}
                      `}
                      style={{ 
                        boxShadow: dIdx === row.dims.length - 1 ? 'inset -1px 0 0 #cbd5e1' : 'none' 
                      }}
                    >
                      {dim.label}
                    </td>
                  ))}

                  {flatColHeaders.map((colHeader) => {
                     const val = row.values[colHeader.key];
                     let bgStyle = {};
                     let textClass = 'text-slate-600';

                     // Heatmap Logic
                     if (viewMode === 'heatmap' && val !== undefined && val !== null) {
                         const { max, min } = colStats[colHeader.key] || { max: 1, min: 0 };
                         const range = max - min;
                         let ratio = 0;
                         if (range > 0) {
                             ratio = (val - min) / range;
                         } else {
                             ratio = val > 0 ? 0.5 : 0;
                         }

                         // Blue heatmap (HSL 220)
                         const lightness = 98 - (ratio * 45); 
                         bgStyle = { backgroundColor: `hsl(220, 90%, ${lightness}%)` };
                         
                         if (ratio > 0.6) {
                             textClass = 'text-blue-900 font-bold';
                         } else {
                             textClass = 'text-slate-700';
                         }
                     }

                     return (
                        <td 
                            key={colHeader.key} 
                            className={`border-r border-b border-slate-200 text-right whitespace-nowrap tabular-nums select-all ${textClass} ${densityPadding} ${cellText}`}
                            style={bgStyle}
                        >
                           {formatVal(val)}
                        </td>
                     );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
    </div>
  );
};

export default PivotTableRender;