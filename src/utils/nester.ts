import { Slice, Sheet } from '../types';
// Simplified Packer
export const nestSlices = (slices: Slice[], material: any): Sheet[] => {
  return [{ id: 0, width: material.width, height: material.length, items: slices.map(s => ({...s, x: 10, y: 10, rotation: 0, sheetId: 0})) }];
};