
import React from 'react';
import { ToolType } from '../types';

interface SidebarProps {
  activeTool: ToolType;
  setTool: (tool: ToolType) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMerge: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTool, setTool, onUpload, onMerge }) => {
  // Fix: Updated SELECT to MOVE and BG_REMOVE to MAGIC_WAND as they don't exist in ToolType enum
  const tools = [
    { id: ToolType.MOVE, icon: 'fa-mouse-pointer', label: 'Move (V)', color: 'blue' },
    { id: ToolType.MAGIC_WAND, icon: 'fa-magic', label: 'Magic BG (M)', color: 'purple' },
    { id: ToolType.CROP, icon: 'fa-crop-simple', label: 'Crop (C)', color: 'amber' },
    { id: ToolType.ADJUST, icon: 'fa-sliders', label: 'Adjust (A)', color: 'slate' },
  ];

  return (
    <div className="w-20 md:w-24 bg-[#0d1117] border-r border-white/5 flex flex-col z-20 overflow-y-auto items-center py-6">
      <div className="mb-8 px-2 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 mb-2 mx-auto">
            <span className="text-white font-black text-xl">IT</span>
        </div>
        <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest hidden md:block">STUDIO</p>
      </div>

      <div className="flex flex-col gap-4 px-2 w-full">
        <label className="cursor-pointer group relative flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all border border-white/5">
            <i className="fas fa-plus"></i>
          </div>
          <span className="text-[9px] mt-1 font-bold text-slate-500 uppercase">Open</span>
          <input type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </label>
        
        <div className="h-px w-full bg-white/5 my-2"></div>

        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            className={`flex flex-col items-center group transition-all`}
            title={tool.label}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border ${
              activeTool === tool.id 
                ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-600/30 scale-105' 
                : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10 hover:text-slate-300'
            }`}>
              <i className={`fas ${tool.icon} text-lg`}></i>
            </div>
            <span className={`text-[9px] mt-1 font-bold uppercase ${activeTool === tool.id ? 'text-blue-400' : 'text-slate-600'}`}>
                {/* Fix: Updated SELECT to MOVE and BG_REMOVE to MAGIC_WAND */}
                {tool.id === ToolType.MOVE ? 'Move' : 
                 tool.id === ToolType.MAGIC_WAND ? 'Magic' :
                 tool.id === ToolType.CROP ? 'Crop' : 'Adjust'}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-white/5 w-full flex flex-col items-center gap-6">
        <button className="text-slate-600 hover:text-white transition-colors">
            <i className="fas fa-cog"></i>
        </button>
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
      </div>
    </div>
  );
};

export default Sidebar;
