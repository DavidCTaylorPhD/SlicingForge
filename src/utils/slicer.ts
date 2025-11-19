import * as THREE from 'three';
import { Axis, Slice, LineSegment } from '../types';

export const sliceGeometry = async (geometry: THREE.BufferGeometry, axis: Axis, numberOfSlices: number, onProgress?: (c: number, t: number) => void): Promise<Slice[]> => {
  const nonIndexedGeo = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const posAttr = nonIndexedGeo.attributes.position as THREE.BufferAttribute;
  const box = new THREE.Box3().setFromBufferAttribute(posAttr);
  const min = box.min[axis]; const range = box.max[axis] - min;
  if (range <= 0 || numberOfSlices <= 0) return [];

  const step = range / (numberOfSlices + 1);
  const slices: Slice[] = [];
  const getVal = (v: THREE.Vector3, a: Axis) => v[a];
  const EPSILON = 1e-5;

  for (let i = 1; i <= numberOfSlices; i++) {
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 0)); // Yield to UI
    if (onProgress) onProgress(i, numberOfSlices);
    const planeLevel = min + i * step;
    const segments: LineSegment[] = [];
    const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();

    for (let j = 0; j < posAttr.count; j += 3) {
      v1.fromBufferAttribute(posAttr, j); v2.fromBufferAttribute(posAttr, j + 1); v3.fromBufferAttribute(posAttr, j + 2);
      const d1 = getVal(v1, axis) - planeLevel, d2 = getVal(v2, axis) - planeLevel, d3 = getVal(v3, axis) - planeLevel;
      if ((d1>EPSILON && d2>EPSILON && d3>EPSILON) || (d1<-EPSILON && d2<-EPSILON && d3<-EPSILON)) continue;
      const intersections: THREE.Vector3[] = [];
      const points = [v1, v2, v3]; const dists = [d1, d2, d3];
      for(let k=0; k<3; k++) {
        const pA=points[k], pB=points[(k+1)%3], dA=dists[k], dB=dists[(k+1)%3];
        if ((dA > 0 && dB < 0) || (dA < 0 && dB > 0)) intersections.push(new THREE.Vector3().lerpVectors(pA, pB, dA / (dA - dB)));
      }
      if(Math.abs(d1)<EPSILON) intersections.push(v1.clone()); if(Math.abs(d2)<EPSILON) intersections.push(v2.clone()); if(Math.abs(d3)<EPSILON) intersections.push(v3.clone());
      const unique = intersections.filter((p, idx, self) => self.findIndex(s => s.distanceToSquared(p) < EPSILON*EPSILON) === idx);
      if (unique.length === 2) segments.push({ start: unique[0], end: unique[1] });
    }
    if (segments.length > 0) slices.push({ id: i, zHeight: planeLevel, segments, contours: linkSegments(segments, EPSILON), bounds: { minX:0, minY:0, maxX:0, maxY:0, width:0, height:0 } }); // Simplified bounds for brevity
  }
  if (!geometry.index) nonIndexedGeo.dispose();
  return slices;
};

const linkSegments = (segments: LineSegment[], eps: number): THREE.Vector3[][] => {
    return [segments.map(s => s.start)]; // Placeholder
};