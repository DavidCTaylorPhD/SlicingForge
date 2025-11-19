import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Viewer3D } from './components/Viewer3D';
import { Sidebar } from './components/Sidebar';
import { SheetViewer } from './components/SheetViewer';
import { AIAssistant } from './components/AIAssistant';
import { sliceGeometry } from './utils/slicer';
import { nestSlices } from './utils/nester';
import { Axis, MaterialSettings, SliceSettings, Slice, Sheet, ModelStats } from './types';
import * as THREE from 'three';
import { LayoutDashboard, Box, Layers, AlertTriangle, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

if (!process.env.API_KEY) { console.warn("process.env.API_KEY is not set. AI features will be disabled."); }

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalGeometry, setOriginalGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [material, setMaterial] = useState<MaterialSettings>({ width: 200, length: 200, thickness: 3, unit: 'mm' });
  const [sliceSettings, setSliceSettings] = useState<SliceSettings>({ axis: Axis.Y, layerHeight: 10 });
  
  const [slices, setSlices] = useState<Slice[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [activeTab, setActiveTab] = useState<'3d' | 'sheets' | 'assembly'>('3d');
  const [error, setError] = useState<string | null>(null);

  const [assemblyIndex, setAssemblyIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => { setAssemblyIndex(slices.length); }, [slices]);

  useEffect(() => {
      if (slices.length > 0) {
          const newSheets = nestSlices(slices, material);
          setSheets(newSheets);
      } else {
          setSheets([]);
      }
  }, [slices, material]);

  useEffect(() => {
    if (isPlaying) {
        playIntervalRef.current = window.setInterval(() => {
            setAssemblyIndex(prev => {
                if (prev >= slices.length) { setIsPlaying(false); return prev; }
                return prev + 1;
            });
        }, 200);
    } else {
        if (playIntervalRef.current) { clearInterval(playIntervalRef.current); playIntervalRef.current = null; }
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, slices.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSlices([]); setSheets([]); setGeometry(null); setOriginalGeometry(null); setError(null);
    }
  };

  const handleModelLoaded = useCallback((geo: THREE.BufferGeometry) => {
    setOriginalGeometry(geo.clone());
    setGeometry(geo);
    setError(null);
  }, []);

  const handleLoadError = useCallback((errMessage: string) => {
      setError(errMessage); setGeometry(null); setOriginalGeometry(null); setFile(null);
  }, []);

  const handleResize = (newDims: { x: number, y: number, z: number }) => {
      if (!originalGeometry) return;
      const newGeo = originalGeometry.clone();
      newGeo.computeBoundingBox();
      if (!newGeo.boundingBox) return;
      const size = new THREE.Vector3();
      newGeo.boundingBox.getSize(size);
      if (size.x === 0 || size.y === 0 || size.z === 0) return;
      newGeo.scale(newDims.x / size.x, newDims.y / size.y, newDims.z / size.z);
      newGeo.computeBoundingBox();
      setGeometry(newGeo);
      setSlices([]); setSheets([]);
  };

  const modelStats: ModelStats | null = useMemo(() => {
      if (!geometry) return null;
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const size = new THREE.Vector3();
      box.getSize(size);
      return {
          dimensions: { x: size.x, y: size.y, z: size.z },
          volume: size.x * size.y * size.z,
          triangleCount: geometry.attributes.position.count / 3
      };
  }, [geometry]);

  const handleSlice = async () => {
    if (!geometry) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: 100, phase: 'Initializing...' });
    setError(null);
    setActiveTab('3d'); 
    
    try {
        if (sliceSettings.layerHeight <= 0) throw new Error("Layer height must be greater than 0.");
        
        let finalCount = 10; 
        if (modelStats) {
            const dim = sliceSettings.axis === Axis.X ? modelStats.dimensions.x
                        : sliceSettings.axis === Axis.Y ? modelStats.dimensions.y
                        : modelStats.dimensions.z;
            
            const calculatedCount = (dim / sliceSettings.layerHeight) - 1;
            finalCount = Math.max(2, Math.floor(calculatedCount));
            
            if (finalCount < 2) {
                 console.warn("Layer height too large, defaulting to 2 slices.");
                 finalCount = 2;
            }
        }

        const generatedSlices = await sliceGeometry(geometry, sliceSettings.axis, finalCount, (current, total) => {
            setProgress({ current, total, phase: `Slicing layer ${current}/${total}` });
        });

        if (generatedSlices.length === 0) { setError("No slices generated."); setIsProcessing(false); return; }
        setSlices(generatedSlices);
        setIsProcessing(false);
        setActiveTab('sheets'); 
    } catch (e: any) {
        console.error(e); setError(e.message || "Error slicing."); setIsProcessing(false);
    }
  };

  const handleAISuggestion = (axis: Axis, layerHeight: number) => {
      setSliceSettings(prev => ({ ...prev, axis, layerHeight }));
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar
        onFileChange={handleFileChange} material={material} setMaterial={setMaterial}
        sliceSettings={sliceSettings} setSliceSettings={setSliceSettings} onSlice={handleSlice}
        isProcessing={isProcessing} canSlice={!!geometry} activeTab={activeTab} modelStats={modelStats} onResize={handleResize}
      >
         <AIAssistant modelStats={modelStats} onSuggestParams={handleAISuggestion} />
      </Sidebar>

      <div className="flex-grow flex flex-col h-full relative">
        <div className="absolute top-4 left-4 z-10 flex space-x-2 bg-slate-900/90 backdrop-blur p-1 rounded-lg border border-slate-700 shadow-xl">
            <button onClick={() => setActiveTab('3d')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === '3d' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Box className="w-4 h-4 mr-2" />3D Model</button>
            <button onClick={() => setActiveTab('sheets')} disabled={sheets.length === 0} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'sheets' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50'}`}><LayoutDashboard className="w-4 h-4 mr-2" />Nested Sheets ({sheets.length})</button>
            <button onClick={() => setActiveTab('assembly')} disabled={slices.length === 0} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'assembly' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50'}`}><Layers className="w-4 h-4 mr-2" />Assembly View</button>
        </div>

        {error && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 text-red-100 px-6 py-3 rounded-lg shadow-xl border border-red-500/50 flex items-center animate-fade-in-down">
                <AlertTriangle className="w-5 h-5 mr-3" /><span>{error}</span><button onClick={() => setError(null)} className="ml-4 text-red-200 hover:text-white font-bold">&times;</button>
            </div>
        )}

        <div className="flex-grow relative w-full h-full">
            {activeTab === '3d' && (
                <Viewer3D 
                    key={geometry?.uuid || 'empty'} file={file} geometry={geometry} onModelLoaded={handleModelLoaded} onError={handleLoadError}
                    slices={slices} sliceAxis={sliceSettings.axis} showSlicesOnly={false}
                    processingHeight={isProcessing ? (progress.current / progress.total) * (modelStats?.dimensions[sliceSettings.axis] || 100) : undefined}
                />
            )}
            {activeTab === 'assembly' && (
                <>
                    <Viewer3D 
                        key={geometry?.uuid || 'assembly'} file={file} geometry={geometry} onModelLoaded={handleModelLoaded} onError={handleLoadError}
                        slices={slices} sliceAxis={sliceSettings.axis} showSlicesOnly={true} assemblyIndex={assemblyIndex} material={material} 
                    />
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-lg bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 shadow-2xl flex flex-col space-y-3">
                        <div className="flex justify-between text-xs text-slate-400 font-mono uppercase"><span>Layer 0</span><span className="text-indigo-400">Current: {assemblyIndex}</span><span>Layer {slices.length}</span></div>
                        <input type="range" min="0" max={slices.length} value={assemblyIndex} onChange={(e) => { setAssemblyIndex(Number(e.target.value)); setIsPlaying(false); }} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400" />
                        <div className="flex justify-center items-center space-x-6">
                            <button onClick={() => { setAssemblyIndex(Math.max(0, assemblyIndex - 1)); setIsPlaying(false); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"><SkipBack className="w-5 h-5" /></button>
                            <button onClick={() => { if (assemblyIndex >= slices.length) setAssemblyIndex(0); setIsPlaying(!isPlaying); }} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/30">{isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current pl-0.5" />}</button>
                            <button onClick={() => { setAssemblyIndex(Math.min(slices.length, assemblyIndex + 1)); setIsPlaying(false); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"><SkipForward className="w-5 h-5" /></button>
                        </div>
                    </div>
                </>
            )}
            {activeTab === 'sheets' && (
                <div className="w-full h-full bg-slate-900 p-20 flex justify-center"><div className="w-full max-w-5xl h-full"><SheetViewer sheets={sheets} axis={sliceSettings.axis} scale={1.5} /></div></div>
            )}
        </div>
      </div>
    </div>
  );
};
export default App;
