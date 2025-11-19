import { Sheet, Axis } from '../types';
export const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
};
export const generateSVG = (sheets: Sheet[], axis: Axis, unit: string) => `<svg>...</svg>`; 
export const generateDXF = (sheets: Sheet[], axis: Axis) => `0\nSECTION...`;