
import React from 'react';

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  onExport: (format: 'png' | 'jpg' | 'pdf') => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onUndo, onRedo, onExport, canUndo, canRedo }) => {
  return (
    <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button 
          disabled={!canUndo}
          onClick={onUndo}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
        >
          <i className="fas fa-undo"></i>
        </button>
        <button 
          disabled={!canRedo}
          onClick={onRedo}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
        >
          <i className="fas fa-redo"></i>
        </button>
        <div className="h-6 w-px bg-slate-700 mx-2"></div>
        <span className="text-slate-400 text-sm font-medium">300 DPI - High Quality Mode</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="group relative">
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-600 transition-all text-sm">
            <i className="fas fa-download"></i>
            Export
            <i className="fas fa-chevron-down text-[10px] opacity-50"></i>
          </button>
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
            <button onClick={() => onExport('png')} className="w-full text-left px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-slate-300">PNG (Lossless)</button>
            <button onClick={() => onExport('jpg')} className="w-full text-left px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-slate-300">JPG (Studio Quality)</button>
            <button onClick={() => onExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-slate-300">PDF (Print Ready)</button>
          </div>
        </div>
        <button 
          onClick={() => onExport('jpg')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all text-sm"
        >
          Quick Print
        </button>
      </div>
    </div>
  );
};

export default TopBar;
