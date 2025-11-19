import React, { useEffect, useRef, useState } from 'react';
import { Sheet, Axis } from '../types';
import { Download } from 'lucide-react';
import { generateSVG, generateDXF, downloadFile } from '../utils/exporter';

interface SheetViewerProps { sheets: Sheet[]; scale?: number; axis: Axis; }

export const SheetViewer: React.FC<SheetViewerProps> = ({ sheets, scale = 1, axis }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawSheet = (ctx: CanvasRenderingContext2D, sheet: Sheet) => {
    ctx.fillStyle = '#334155'; ctx.fillRect(0, 0, sheet.width * scale, sheet.height * scale);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
    sheet.items.forEach(item => {
        ctx.save();
        const drawX = item.x * scale; const drawY = item.y * scale;
        ctx.translate(drawX, drawY);
        if (item.rotation) {
            const destW = item.bounds.height * scale; const destH = item.bounds.width * scale;
            ctx.translate(destW / 2, destH / 2); ctx.rotate(item.rotation); ctx.translate(-(item.bounds.width * scale) / 2, -(item.bounds.height * scale) / 2);
        }
        const offsetX = -item.bounds.minX; const offsetY = -item.bounds.minY;
        const get2D = (x: number, y: number, z: number) => axis === Axis.Z ? { u: x, v: y } : axis === Axis.Y ? { u: x, v: z } : { u: y, v: z };
        ctx.beginPath();
        if (item.contours?.length) {
             item.contours.forEach(c => { if(c.length){ const s = get2D(c[0].x, c[0].y, c[0].z); ctx.moveTo((s.u+offsetX)*scale, (s.v+offsetY)*scale); for(let i=1;i<c.length;i++){ const p = get2D(c[i].x, c[i].y, c[i].z); ctx.lineTo((p.u+offsetX)*scale, (p.v+offsetY)*scale); } } });
        }
        ctx.stroke(); ctx.restore();
    });
  };
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !sheets.length) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const margin = 20; const totalH = sheets.reduce((acc, s) => acc + (s.height * scale) + margin, 0);
    const maxW = sheets.reduce((acc, s) => Math.max(acc, s.width * scale), 0);
    canvas.width = maxW + margin * 2; canvas.height = totalH + margin;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let curY = margin;
    sheets.forEach((s, i) => { ctx.save(); ctx.translate(margin, curY); ctx.fillStyle = '#94a3b8'; ctx.fillText(`Sheet ${s.id + 1}`, 0, -5); drawSheet(ctx, s); ctx.restore(); curY += (s.height * scale) + margin; });
  }, [sheets, scale, axis]);
  return (
    <div className="relative h-full w-full">
        <div className="absolute top-4 right-8 z-10 flex space-x-3">
            <button onClick={() => downloadFile(generateSVG(sheets, axis, 'mm'), 'layout.svg', 'image/svg+xml')} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded">SVG</button>
            <button onClick={() => downloadFile(generateDXF(sheets, axis), 'layout.dxf', 'application/dxf')} className="flex items-center px-4 py-2 bg-slate-700 text-white rounded">DXF</button>
        </div>
        <div className="overflow-auto h-full bg-slate-800 p-4"><canvas ref={canvasRef} /></div>
    </div>
  );
};