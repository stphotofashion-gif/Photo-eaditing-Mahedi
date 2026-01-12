
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Group } from 'react-konva';
import { ToolType, DocumentState, LayerData } from './types';
import { PAGE_PRESETS, DRESS_PRESETS, STUDIO_COLORS } from './constants';
import { processImageAI, mergeTwoPhotos } from './services/geminiService';
import useImage from 'use-image';
import Konva from 'konva';

const App: React.FC = () => {
  const [docs, setDocs] = useState<DocumentState[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>(ToolType.MOVE);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeImg1, setMergeImg1] = useState<string | null>(null);
  const [mergeImg2, setMergeImg2] = useState<string | null>(null);
  
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  const activeDoc = docs.find(d => d.id === activeDocId) || null;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete Layer Shortcut
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeDoc && activeDoc.selectedLayerId) {
          e.preventDefault();
          deleteLayer(activeDoc.selectedLayerId);
        }
      }

      // Save Shortcut (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExport('jpeg');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDoc, activeDocId]);

  useEffect(() => {
    if (docs.length === 0) {
      createNewDoc(PAGE_PRESETS[0]);
    }
  }, []);

  // Helper to calculate dimensions while preserving aspect ratio
  const calculateFitDimensions = (imgWidth: number, imgHeight: number, maxWidth: number, maxHeight: number) => {
    const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
    return {
      width: imgWidth * ratio,
      height: imgHeight * ratio
    };
  };

  const createNewDoc = (preset: any) => {
    const newDoc: DocumentState = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Untitled-${docs.length + 1}`,
      width: preset.width,
      height: preset.height,
      layers: [],
      selectedLayerId: null
    };
    setDocs(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
    setShowNewDocModal(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDoc) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const dims = calculateFitDimensions(img.width, img.height, activeDoc.width * 0.8, activeDoc.height * 0.8);
        
        const newLayer: LayerData = {
          id,
          name: file.name,
          dataUrl: reader.result as string,
          visible: true,
          locked: false,
          x: (activeDoc.width - dims.width) / 2,
          y: (activeDoc.height - dims.height) / 2,
          width: dims.width,
          height: dims.height,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          bgColor: 'transparent',
          opacity: 1,
          adjustments: { brightness: 0, contrast: 0, saturation: 0 }
        };
        updateActiveDoc({ 
          layers: [...activeDoc.layers, newLayer],
          selectedLayerId: id
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updateActiveDoc = (updates: Partial<DocumentState>) => {
    setDocs(prev => prev.map(d => d.id === activeDocId ? { ...d, ...updates } : d));
  };

  const updateLayer = (layerId: string, updates: Partial<LayerData>) => {
    if (!activeDoc) return;
    const newLayers = activeDoc.layers.map(l => l.id === layerId ? { ...l, ...updates } : l);
    updateActiveDoc({ layers: newLayers });
  };

  const handleExport = (format: 'png' | 'jpeg') => {
    if (!stageRef.current || !activeDoc) return;
    
    // Find the node to export
    let exportNode = stageRef.current;
    if (activeDoc.selectedLayerId) {
      const selectedNode = stageRef.current.findOne(`#${activeDoc.selectedLayerId}`);
      if (selectedNode) {
        exportNode = selectedNode;
      }
    }

    // Temporarily hide transformer
    const currentSelectedId = activeDoc.selectedLayerId;
    updateActiveDoc({ selectedLayerId: null });

    requestAnimationFrame(() => {
      // Use high pixelRatio for professional resolution
      const uri = exportNode.toDataURL({
        mimeType: `image/${format}`,
        quality: 1,
        pixelRatio: 4, 
      });
      
      const link = document.createElement('a');
      link.download = `${activeDoc.name || 'studio_photo'}_export.${format}`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Restore selection
      updateActiveDoc({ selectedLayerId: currentSelectedId });
    });
  };

  const runAIFeature = async (mode: string, customPrompt?: string) => {
    if (!activeDoc?.selectedLayerId) {
      alert("Please select a layer first!");
      return;
    }
    const layer = activeDoc.layers.find(l => l.id === activeDoc.selectedLayerId);
    if (!layer) return;

    setIsLoading(true);
    setLoadingMsg(`AI processing ${mode.replace('_', ' ')}...`);
    try {
      let prompt = customPrompt || "";
      if (mode === 'bg_remove') prompt = "REMOVE BACKGROUND. Return the subject perfectly cut out on a pure TRANSPARENT background. Do not add any color. High quality PNG.";
      if (mode === 'upscale') prompt = "UPSCALE THIS IMAGE TO 4K HD. Enhance details, remove noise, and sharpen edges for professional printing.";
      if (mode === 'face_retouch') prompt = "RETOUCH FACE. Naturally smooth skin, remove blemishes, enhance eyes and features. Keep texture realistic. Studio quality.";
      
      const result = await processImageAI(layer.dataUrl, prompt, mode as any);
      if (result) {
        updateLayer(layer.id, { dataUrl: result });
      }
    } catch (e) {
      console.error(e);
      alert("AI Process Failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeSubmit = async () => {
    if (!mergeImg1 || !mergeImg2) {
      alert("Please upload both photos first!");
      return;
    }
    if (!activeDoc) return;

    setIsLoading(true);
    setLoadingMsg("AI merging photos side-by-side...");
    try {
      const result = await mergeTwoPhotos(mergeImg1, mergeImg2);
      if (result) {
        const img = new Image();
        img.onload = () => {
          const id = Math.random().toString(36).substr(2, 9);
          const dims = calculateFitDimensions(img.width, img.height, activeDoc.width * 0.9, activeDoc.height * 0.9);

          const newLayer: LayerData = {
            id,
            name: "AI Merged Photo",
            dataUrl: result,
            visible: true,
            locked: false,
            x: (activeDoc.width - dims.width) / 2,
            y: (activeDoc.height - dims.height) / 2,
            width: dims.width,
            height: dims.height,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            bgColor: 'transparent',
            opacity: 1,
            adjustments: { brightness: 0, contrast: 0, saturation: 0 }
          };
          updateActiveDoc({ 
            layers: [...activeDoc.layers, newLayer],
            selectedLayerId: id
          });
          setShowMergeModal(false);
          setMergeImg1(null);
          setMergeImg2(null);
        };
        img.src = result;
      }
    } catch (e) {
      console.error(e);
      alert("Merge Process Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (slot === 1) setMergeImg1(reader.result as string);
      else setMergeImg2(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const deleteLayer = (id: string) => {
    if (!activeDoc) return;
    updateActiveDoc({
      layers: activeDoc.layers.filter(l => l.id !== id),
      selectedLayerId: null
    });
  };

  return (
    <div className="flex h-screen w-screen bg-[#1e1e1e] overflow-hidden text-[#cccccc] font-sans">
      
      {/* Tools Sidebar */}
      <div className="w-12 bg-[#252526] border-r border-[#333] flex flex-col items-center py-4 gap-4 z-50 shadow-xl">
        <button onClick={() => setShowNewDocModal(true)} className="p-2 hover:text-white transition-colors" title="New Document (Ctrl+N)">
          <i className="fas fa-file-circle-plus text-lg text-blue-400"></i>
        </button>
        <div className="h-px w-8 bg-[#333]"></div>
        <ToolBtn active={tool === ToolType.MOVE} onClick={() => setTool(ToolType.MOVE)} icon="fa-mouse-pointer" label="Move (V)" />
        <ToolBtn active={tool === ToolType.SELECT_RECT} onClick={() => setTool(ToolType.SELECT_RECT)} icon="fa-square-check" label="Select (M)" />
        <ToolBtn active={tool === ToolType.MAGIC_WAND} onClick={() => setTool(ToolType.MAGIC_WAND)} icon="fa-wand-magic-sparkles" label="AI Wand (W)" />
        <ToolBtn active={tool === ToolType.CROP} onClick={() => setTool(ToolType.CROP)} icon="fa-crop" label="Crop (C)" />
        <ToolBtn active={tool === ToolType.TEXT} onClick={() => setTool(ToolType.TEXT)} icon="fa-font" label="Text (T)" />
        <ToolBtn active={tool === ToolType.ERASER} onClick={() => setTool(ToolType.ERASER)} icon="fa-eraser" label="Eraser (E)" />
        
        <div className="mt-auto flex flex-col items-center gap-4">
          <label className="cursor-pointer p-2 hover:text-white transition-transform hover:scale-110">
            <i className="fas fa-cloud-arrow-up text-lg"></i>
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
          </label>
          <div className="w-6 h-6 bg-blue-600 rounded shadow-inner mb-2 border border-white/20"></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header / Tabs Bar */}
        <div className="h-10 bg-[#2d2d2d] flex items-center justify-between px-2 border-b border-[#1a1a1a]">
          <div className="flex h-full items-center gap-1">
            {docs.map(doc => (
              <div 
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                className={`h-full flex items-center px-4 text-[11px] font-medium cursor-pointer group border-r border-[#1a1a1a] min-w-[140px] transition-colors ${activeDocId === doc.id ? 'bg-[#1e1e1e] text-white' : 'text-[#888] hover:bg-[#333]'}`}
              >
                <span className="truncate flex-1 uppercase tracking-wider">{doc.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setDocs(docs.filter(d => d.id !== doc.id)); }} className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 p-1">
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>
            ))}
            <button onClick={() => setShowNewDocModal(true)} className="px-3 hover:bg-[#333] h-full transition-colors text-blue-400">
              <i className="fas fa-plus text-[10px]"></i>
            </button>
          </div>

          {/* Export / Download Buttons */}
          {activeDoc && (
            <div className="flex items-center gap-2 pr-2">
              <button 
                onClick={() => handleExport('png')}
                className="bg-[#3e3e42] hover:bg-[#4a4a4f] text-white text-[10px] px-3 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 border border-white/5"
                title={activeDoc.selectedLayerId ? "Download Selected Layer" : "Download Canvas"}
              >
                <i className="fas fa-download text-blue-400"></i> {activeDoc.selectedLayerId ? 'Layer PNG' : 'PNG (HD)'}
              </button>
              <button 
                onClick={() => handleExport('jpeg')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-3 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                title="Save selection as JPG (Ctrl+S)"
              >
                <i className="fas fa-file-export"></i> {activeDoc.selectedLayerId ? 'Save Selection' : 'Save JPG'}
              </button>
            </div>
          )}
        </div>

        {/* Workspace */}
        <div className="flex-1 relative bg-[#121212] overflow-auto flex items-center justify-center p-20 pattern-checkered scrollbar-hide">
          {activeDoc ? (
            <div 
              className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative transition-all"
              style={{ width: activeDoc.width, height: activeDoc.height }}
            >
               <Stage 
                width={activeDoc.width} 
                height={activeDoc.height} 
                ref={stageRef}
                onMouseDown={(e) => {
                  if (e.target === e.target.getStage()) updateActiveDoc({ selectedLayerId: null });
                }}
              >
                <Layer>
                  {activeDoc.layers.map((l) => (
                    <CanvasLayer 
                      key={l.id}
                      data={l}
                      isSelected={activeDoc.selectedLayerId === l.id}
                      onClick={() => updateActiveDoc({ selectedLayerId: l.id })}
                      onTransform={(updates) => updateLayer(l.id, updates)}
                      tool={tool}
                    />
                  ))}
                  {activeDoc.selectedLayerId && tool === ToolType.MOVE && (
                    <Transformer 
                      ref={trRef}
                      anchorSize={8}
                      anchorCornerRadius={2}
                      borderStroke="#007acc"
                      anchorStroke="#007acc"
                      keepRatio={true}
                      enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          ) : (
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
              <i className="fas fa-images text-8xl text-white/5"></i>
              <p className="text-white/20 font-bold uppercase tracking-[0.2em] text-sm">Create a document to start</p>
              <button onClick={() => setShowNewDocModal(true)} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-full font-bold text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95">New Document</button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-64 bg-[#252526] border-l border-[#333] flex flex-col z-50 overflow-y-auto shadow-2xl">
        
        {/* Background Color Panel */}
        <div className="p-4 border-b border-[#333]">
          <h3 className="text-[10px] font-black uppercase mb-4 text-[#888] tracking-[0.15em] flex items-center gap-2">
            <i className="fas fa-palette text-blue-400"></i> Studio Color
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {STUDIO_COLORS.map(c => (
              <button 
                key={c.name}
                onClick={() => activeDoc?.selectedLayerId && updateLayer(activeDoc.selectedLayerId, { bgColor: c.value })}
                className="w-full aspect-square rounded border border-white/5 shadow-sm transition-all hover:scale-110 active:scale-90"
                style={{ 
                  background: c.value === 'transparent' ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIElEQVQYV2NkYGD4D8S4wDwGBgYmBgYGJpABIGFhYGD4DwBzBQUG/8D9AAAAAElFTkSuQmCC") repeat' : c.value,
                  boxShadow: activeDoc?.layers.find(l => l.id === activeDoc.selectedLayerId)?.bgColor === c.value ? '0 0 0 2px #3b82f6' : 'none'
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* AI Studio Panel */}
        <div className="p-4 border-b border-[#333]">
          <h3 className="text-[10px] font-black uppercase mb-4 text-[#888] tracking-[0.15em] flex items-center gap-2">
            <i className="fas fa-star text-amber-400"></i> AI Enhancements
          </h3>
          <div className="space-y-2">
            <button onClick={() => runAIFeature('bg_remove')} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-2 rounded flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
              <i className="fas fa-scissors"></i> Remove Background
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => runAIFeature('face_retouch')} className="bg-[#3e3e42] hover:bg-[#4a4a4f] text-[10px] py-2 rounded font-medium flex flex-col items-center gap-1 transition-colors">
                <i className="fas fa-face-smile text-amber-400"></i> Skin Retouch
              </button>
              <button onClick={() => runAIFeature('upscale')} className="bg-[#3e3e42] hover:bg-[#4a4a4f] text-[10px] py-2 rounded font-medium flex flex-col items-center gap-1 transition-colors">
                <i className="fas fa-arrows-up-to-line text-blue-400"></i> HD Upscale
              </button>
            </div>

            <button onClick={() => setShowMergeModal(true)} className="w-full bg-[#3e3e42] hover:bg-[#4a4a4f] text-blue-400 text-[11px] font-bold py-2 rounded flex items-center justify-center gap-2 transition-all mt-2 border border-blue-400/20">
              <i className="fas fa-people-arrows"></i> Merge 2 Photos (Couple)
            </button>
            
            <p className="text-[9px] text-[#555] uppercase font-bold mt-4 mb-2 tracking-widest">Outfit Change</p>
            <div className="grid grid-cols-2 gap-2">
              {DRESS_PRESETS.map(d => (
                <button key={d.id} onClick={() => runAIFeature('dress_change', d.prompt)} className="bg-[#3e3e42] hover:bg-[#4a4a4f] text-[10px] py-2 rounded border border-white/5 transition-all active:scale-95">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layers Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-[#333] flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase text-[#888] tracking-[0.15em]">Layers</h3>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#1e1e1e]">
            {activeDoc?.layers.slice().reverse().map(l => (
              <div 
                key={l.id}
                onClick={() => updateActiveDoc({ selectedLayerId: l.id })}
                className={`flex items-center gap-3 p-3 text-[11px] border-b border-[#252526] transition-all cursor-default ${activeDoc.selectedLayerId === l.id ? 'bg-[#37373d] text-white' : 'text-[#888] hover:bg-[#2a2d2e]'}`}
              >
                <button onClick={(e) => { e.stopPropagation(); updateLayer(l.id, { visible: !l.visible }); }} className="w-4 text-center">
                  <i className={`fas ${l.visible ? 'fa-eye' : 'fa-eye-slash text-[#555]'}`}></i>
                </button>
                <div className="w-10 h-10 bg-[#121212] border border-white/5 rounded shadow-inner overflow-hidden flex items-center justify-center">
                   <img src={l.dataUrl} className="max-w-full max-h-full object-contain" />
                </div>
                <span className="flex-1 truncate font-medium">{l.name}</span>
                {activeDoc.selectedLayerId === l.id && (
                  <button onClick={(e) => { e.stopPropagation(); deleteLayer(l.id); }} className="text-[#555] hover:text-red-500 p-1">
                    <i className="fas fa-trash-can"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all">
          <div className="bg-[#2d2d2d] w-[600px] rounded-3xl shadow-2xl border border-white/10 p-10 transform scale-100 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Merge 2 Photos</h2>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">AI Studio Composite</p>
              </div>
              <button onClick={() => setShowMergeModal(false)} className="text-[#555] hover:text-white transition-colors p-2"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Photo 1 */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] text-[#888] uppercase font-black tracking-widest">Photo 1 (Left)</label>
                <div className="aspect-[3/4] bg-[#1e1e1e] rounded-2xl border-2 border-dashed border-[#444] hover:border-blue-500/50 transition-all overflow-hidden flex items-center justify-center relative group">
                  {mergeImg1 ? (
                    <img src={mergeImg1} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user-plus text-3xl text-[#333] group-hover:text-blue-500 transition-colors"></i>
                  )}
                  <input type="file" onChange={(e) => handleMergeFileUpload(e, 1)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              {/* Photo 2 */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] text-[#888] uppercase font-black tracking-widest">Photo 2 (Right)</label>
                <div className="aspect-[3/4] bg-[#1e1e1e] rounded-2xl border-2 border-dashed border-[#444] hover:border-blue-500/50 transition-all overflow-hidden flex items-center justify-center relative group">
                  {mergeImg2 ? (
                    <img src={mergeImg2} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user-plus text-3xl text-[#333] group-hover:text-blue-500 transition-colors"></i>
                  )}
                  <input type="file" onChange={(e) => handleMergeFileUpload(e, 2)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="bg-[#3e3e42] p-4 rounded-xl mb-8 flex items-start gap-4">
              <i className="fas fa-circle-info text-blue-400 mt-1"></i>
              <p className="text-[11px] text-[#aaa] leading-relaxed">
                <span className="text-white font-bold block mb-1 uppercase tracking-widest text-[10px]">AI Instructions</span>
                Our AI will merge these two people side-by-side on a <span className="text-white font-bold">Pure White</span> background. Faces will be preserved with 100% original features.
              </p>
            </div>

            <div className="flex gap-4">
               <button onClick={() => setShowMergeModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-[#888] hover:text-white hover:bg-[#333] transition-all">Cancel</button>
               <button 
                disabled={!mergeImg1 || !mergeImg2}
                onClick={handleMergeSubmit} 
                className={`flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all ${!mergeImg1 || !mergeImg2 ? 'bg-[#333] text-[#555] cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 active:scale-95'}`}
               >
                 Merge & Create
               </button>
            </div>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all">
          <div className="bg-[#2d2d2d] w-[450px] rounded-2xl shadow-2xl border border-white/10 p-8 transform scale-105 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white tracking-tight">New Project</h2>
              <button onClick={() => setShowNewDocModal(false)} className="text-[#555] hover:text-white transition-colors p-2"><i className="fas fa-times"></i></button>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] text-[#888] uppercase font-black tracking-[0.2em]">Select Preset</p>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                {PAGE_PRESETS.map(p => (
                  <button 
                    key={p.name}
                    onClick={() => createNewDoc(p)}
                    className="w-full flex items-center justify-between p-5 bg-[#3e3e42] hover:bg-[#4a4a4f] rounded-xl transition-all group text-left border border-transparent hover:border-blue-500/50"
                  >
                    <div>
                      <div className="text-sm font-bold text-white mb-1">{p.name}</div>
                      <div className="text-[11px] text-[#888]">{p.description}</div>
                    </div>
                    <div className="text-[11px] text-blue-400 font-mono bg-[#1e1e1e] px-3 py-1 rounded-full">{p.width} x {p.height}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <i className="fas fa-brain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse"></i>
          </div>
          <p className="text-white font-black tracking-[0.3em] uppercase text-xs">{loadingMsg}</p>
          <p className="text-[#555] text-[10px] mt-4 font-medium italic">Gemini 2.5 Flash Engine Running...</p>
        </div>
      )}

      <style>{`
        .pattern-checkered {
          background-image: linear-gradient(45deg, #181818 25%, transparent 25%),
            linear-gradient(-45deg, #181818 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #181818 75%),
            linear-gradient(-45deg, transparent 75%, #181818 75%);
          background-size: 24px 24px;
          background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const ToolBtn: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    title={label}
    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'hover:bg-[#333] text-[#666] hover:text-white'}`}
  >
    <i className={`fas ${icon} text-sm`}></i>
  </button>
);

const CanvasLayer: React.FC<{ data: LayerData, isSelected: boolean, onClick: () => void, onTransform: (data: any) => void, tool: ToolType }> = ({ data, isSelected, onClick, onTransform, tool }) => {
  const [img] = useImage(data.dataUrl);
  const groupRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && groupRef.current) {
      const tr = groupRef.current.getLayer()?.findOne('Transformer');
      if (tr) {
        tr.nodes([groupRef.current]);
        tr.getLayer().batchDraw();
      }
    }
  }, [isSelected, img, data.width, data.height, data.dataUrl]);

  if (!data.visible) return null;

  return (
    <Group
      id={data.id}
      ref={groupRef}
      x={data.x}
      y={data.y}
      scaleX={data.scaleX}
      scaleY={data.scaleY}
      rotation={data.rotation}
      draggable={isSelected && tool === ToolType.MOVE}
      onClick={onClick}
      onDragEnd={(e) => onTransform({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={() => {
        const node = groupRef.current;
        onTransform({
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation()
        });
      }}
    >
      <Rect 
        width={data.width}
        height={data.height}
        fill={data.bgColor}
      />
      <KonvaImage 
        image={img}
        width={data.width}
        height={data.height}
        opacity={data.opacity}
        filters={[Konva.Filters.Brighten, Konva.Filters.Contrast]}
        brightness={data.adjustments.brightness}
        contrast={data.adjustments.contrast}
      />
    </Group>
  );
};

export default App;
