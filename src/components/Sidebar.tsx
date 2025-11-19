import React, { useState, useEffect } from 'react';
import { Layers, Settings, FileBox, Scissors, Maximize, Lock, Unlock, RotateCcw } from 'lucide-react';
import { Axis, MaterialSettings, SliceSettings, ModelStats } from '../types';

interface SidebarProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  material: MaterialSettings;
  setMaterial: React.Dispatch<React.SetStateAction<MaterialSettings>>;
  sliceSettings: SliceSettings;
  setSliceSettings: React.Dispatch<React.SetStateAction<SliceSettings>>;
  onSlice: () => void;
  isProcessing: boolean;
  canSlice: boolean;
  activeTab: string;
  modelStats: ModelStats | null;
  onResize: (dims: { x: number; y: number; z: number }) => void;
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onFileChange, material, setMaterial, sliceSettings, setSliceSettings, onSlice, isProcessing, canSlice, children, modelStats, onResize
}) => {
  const [localDims, setLocalDims] = useState({ x: '', y: '', z: '' });
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [modelUnit, setModelUnit] = useState<'mm' | 'in'>('mm');

  useEffect(() => {
    if (modelStats) {
      const factor = modelUnit === 'in' ? 1 / 25.4 : 1;
      setLocalDims({
        x: (modelStats.dimensions.x * factor).toFixed(2),
        y: (modelStats.dimensions.y * factor).toFixed(2),
        z: (modelStats.dimensions.z * factor).toFixed(2),
      });
    } else {
      setLocalDims({ x: '', y: '', z: '' });
    }
  }, [modelStats, modelUnit]);

  const handleDimChange = (axis: 'x' | 'y' | 'z', value: string) => {
    setLocalDims(prev => ({ ...prev, [axis]: value }));
  };

  const commitResize = (changedAxis?: 'x' | 'y' | 'z') => {
    if (!modelStats) return;
    const toRaw = (val: string) => { const num = parseFloat(val); return isNaN(num) ? undefined : (modelUnit === 'in' ? num * 25.4 : num); };
    const toDisplay = (val: number) => (modelUnit === 'in' ? (val / 25.4).toFixed(2) : val.toFixed(2));

    let newX = toRaw(localDims.x) ?? modelStats.dimensions.x;
    let newY = toRaw(localDims.y) ?? modelStats.dimensions.y;
    let newZ = toRaw(localDims.z) ?? modelStats.dimensions.z;

    if (lockAspectRatio && changedAxis) {
      const original = modelStats.dimensions;
      if (changedAxis === 'x') { const r = newX / original.x; newY = original.y * r; newZ = original.z * r; }
      else if (changedAxis === 'y') { const r = newY / original.y; newX = original.x * r; newZ = original.z * r; }
      else if (changedAxis === 'z') { const r = newZ / original.z; newX = original.x * r; newY = original.y * r; }
      setLocalDims({ x: toDisplay(newX), y: toDisplay(newY), z: toDisplay(newZ) });
    }
    onResize({ x: newX, y: newY, z: newZ });
  };

  const handleKeyDown = (e: React.KeyboardEvent, axis: 'x' | 'y' | 'z') => { if (e.key === 'Enter') { (e.currentTarget as HTMLInputElement).blur(); commitResize(axis); } };
  
  return (
    <div className="w-full md:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-slate-800 draggable-region">
        <h1 className="text-2xl font-bold text-white">SliceForge</h1>
      </div>
      <div className="p-6 space-y-8 flex-grow">
        <section>
          <label className="text-sm text-slate-300">Model Source</label>
          <input type="file" accept=".stl" onChange={(e) => { onFileChange(e); e.target.value = ''; }} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700" />
        </section>
        {children}
        <section>
            <div className="flex justify-between items-center mb-3">
                <label className="text-sm text-slate-300">Model Dimensions</label>
                <div className="flex space-x-2">
                    <div className="flex bg-slate-800 rounded p-0.5">
                        <button onClick={() => setModelUnit('mm')} className={`px-2 text-[10px] ${modelUnit === 'mm' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>mm</button>
                        <button onClick={() => setModelUnit('in')} className={`px-2 text-[10px] ${modelUnit === 'in' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>in</button>
                    </div>
                    <button onClick={() => setLockAspectRatio(!lockAspectRatio)} className="text-slate-500">{lockAspectRatio ? <Lock size={14} /> : <Unlock size={14} />}</button>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <input type="number" value={localDims.x} onChange={e => handleDimChange('x', e.target.value)} onBlur={() => commitResize('x')} onKeyDown={e => handleKeyDown(e, 'x')} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white" disabled={!modelStats} />
                <input type="number" value={localDims.y} onChange={e => handleDimChange('y', e.target.value)} onBlur={() => commitResize('y')} onKeyDown={e => handleKeyDown(e, 'y')} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white" disabled={!modelStats} />
                <input type="number" value={localDims.z} onChange={e => handleDimChange('z', e.target.value)} onBlur={() => commitResize('z')} onKeyDown={e => handleKeyDown(e, 'z')} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white" disabled={!modelStats} />
            </div>
        </section>
        <section>
          <div className="flex justify-between mb-3"><label className="text-sm text-slate-300">Material Sheet</label>
            <div className="flex bg-slate-800 rounded p-0.5">
              <button onClick={() => setMaterial({ ...material, unit: 'mm' })} className={`px-2 text-xs ${material.unit === 'mm' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>mm</button>
              <button onClick={() => setMaterial({ ...material, unit: 'in' })} className={`px-2 text-xs ${material.unit === 'in' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>in</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" value={material.width} onChange={(e) => setMaterial({ ...material, width: Number(e.target.value) })} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
            <input type="number" value={material.length} onChange={(e) => setMaterial({ ...material, length: Number(e.target.value) })} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          </div>
        </section>
        <section>
          <label className="text-sm text-slate-300 mb-3">Slicing Parameters</label>
          <div className="space-y-4">
            <div className="flex bg-slate-800 rounded-md p-1">{(['x', 'y', 'z'] as Axis[]).map((axis) => (<button key={axis} onClick={() => setSliceSettings({ ...sliceSettings, axis })} className={`flex-1 py-1 text-xs uppercase ${sliceSettings.axis === axis ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{axis}</button>))}</div>
            <div className="flex bg-slate-800 rounded-md p-1"><button onClick={() => setSliceSettings({ ...sliceSettings, mode: 'count' })} className={`flex-1 py-1 text-xs ${sliceSettings.mode === 'count' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>By Count</button><button onClick={() => setSliceSettings({ ...sliceSettings, mode: 'height' })} className={`flex-1 py-1 text-xs ${sliceSettings.mode === 'height' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>By Height</button></div>
            {sliceSettings.mode === 'count' ? <input type="range" min="2" max="100" value={sliceSettings.count} onChange={(e) => setSliceSettings({ ...sliceSettings, count: Number(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg" /> : <input type="number" step="0.1" value={sliceSettings.layerHeight} onChange={(e) => setSliceSettings({ ...sliceSettings, layerHeight: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />}
          </div>
        </section>
        <button onClick={onSlice} disabled={!canSlice || isProcessing} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50">{isProcessing ? 'Generating...' : 'Slice & Nest'}</button>
      </div>
    </div>
  );
};