import React, { useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, GizmoHelper, GizmoViewCube, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three-stdlib';
import { Slice, Axis, MaterialSettings } from '../types';

declare module 'react' { namespace JSX { interface IntrinsicElements { mesh: any; group: any; extrudeGeometry: any; meshStandardMaterial: any; line: any; bufferGeometry: any; float32BufferAttribute: any; lineBasicMaterial: any; meshBasicMaterial: any; ambientLight: any; pointLight: any; } } }
declare global { namespace JSX { interface IntrinsicElements { mesh: any; group: any; extrudeGeometry: any; meshStandardMaterial: any; line: any; bufferGeometry: any; float32BufferAttribute: any; lineBasicMaterial: any; meshBasicMaterial: any; ambientLight: any; pointLight: any; } } }

interface Viewer3DProps {
  file: File | null;
  geometry?: THREE.BufferGeometry | null;
  onModelLoaded: (geo: THREE.BufferGeometry) => void;
  onError?: (error: string) => void;
  slices: Slice[];
  sliceAxis: Axis;
  showSlicesOnly: boolean;
  assemblyIndex?: number;
  material?: MaterialSettings;
  processingHeight?: number;
}

const Model = ({ file, geometry, onLoaded, onError, clippingPlanes, transparent = false, opacity = 1, color = "#6366f1" }: any) => {
  const [localGeo, setLocalGeo] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    if (geometry) return; 
    if (!file) return;
    const loader = new STLLoader();
    const url = URL.createObjectURL(file);
    loader.load(url, (geo) => { try { geo.center(); geo.computeVertexNormals(); setLocalGeo(geo); onLoaded(geo); } catch (e) { onError && onError("Failed to process."); } }, undefined, (err) => { onError && onError("Failed to load."); });
    return () => { URL.revokeObjectURL(url); if (!geometry) setLocalGeo(null); };
  }, [file, geometry, onLoaded, onError]);
  const geo = geometry || localGeo;
  if (!geo) return null;
  return <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.5} metalness={0.2} clippingPlanes={clippingPlanes} clipShadows transparent={transparent} opacity={opacity} side={THREE.DoubleSide} /></mesh>;
};

const SliceRenderer = ({ slices, axis, visibleCount, useExtrusion, material }: any) => {
    const limit = visibleCount !== undefined ? visibleCount : slices.length;
    const visibleSlices = slices.slice(0, limit);
    return (
        <group>
            {visibleSlices.map((slice: any, idx: number) => {
                 const isTop = idx === visibleSlices.length - 1;
                 if (useExtrusion && material && slice.contours?.length) {
                     let rotation: [number, number, number] = [0,0,0];
                     let position: [number, number, number] = [0,0,0];
                     if (axis === Axis.Z) position = [0, 0, slice.zHeight];
                     else if (axis === Axis.Y) { rotation = [Math.PI/2, 0, 0]; position = [0, slice.zHeight, 0]; }
                     else { rotation = [0, Math.PI/2, 0]; position = [slice.zHeight, 0, 0]; }
                     return (
                         <group key={slice.id} position={position} rotation={rotation}>
                             {slice.contours.map((contour: any, ci: number) => {
                                 const shape = new THREE.Shape();
                                 const get2D = (v: THREE.Vector3) => {
                                     if (axis === Axis.Z) return {x: v.x, y: v.y};
                                     if (axis === Axis.Y) return {x: v.x, y: -v.z};
                                     return {x: -v.z, y: v.y};
                                 };
                                 if(contour.length > 0) {
                                    const pts = contour.map((p: any) => get2D(p));
                                    shape.moveTo(pts[0].x, pts[0].y);
                                    pts.slice(1).forEach((p: any) => shape.lineTo(p.x, p.y));
                                    shape.closePath();
                                 }
                                 return <mesh key={ci}><extrudeGeometry args={[shape, { depth: material.thickness, bevelEnabled: false }]} /><meshStandardMaterial color={isTop ? "#ffffff" : "#fbbf24"} /></mesh>
                             })}
                         </group>
                     )
                 }
                 return <group key={slice.id}>{slice.segments.map((seg: any, i: number) => (<line key={i}><bufferGeometry attach="geometry"><float32BufferAttribute attach="attributes-position" args={[[seg.start.x, seg.start.y, seg.start.z, seg.end.x, seg.end.y, seg.end.z].flat(), 3]} /></bufferGeometry><lineBasicMaterial attach="material" color={visibleCount && isTop ? "#ffffff" : "#fbbf24"} linewidth={1} /></line>))}</group>;
            })}
        </group>
    );
};

const ScanPlane = ({ height, axis, size }: any) => {
    const geo = useMemo(() => new THREE.PlaneGeometry(size, size), [size]);
    let rot: [number, number, number] = [0, 0, 0];
    let pos: [number, number, number] = [0, 0, 0];
    if (axis === Axis.X) { rot = [0, Math.PI / 2, 0]; pos = [height, 0, 0]; }
    else if (axis === Axis.Y) { rot = [-Math.PI / 2, 0, 0]; pos = [0, height, 0]; }
    else { pos = [0, 0, height]; }
    return <mesh rotation={rot} position={pos} geometry={geo}><meshBasicMaterial color="#10b981" transparent opacity={0.2} side={THREE.DoubleSide} /></mesh>;
};

const SceneContent = (props: Viewer3DProps) => {
  const { file, geometry, slices, sliceAxis, showSlicesOnly, assemblyIndex, processingHeight } = props;
  const clipPlane = useMemo(() => {
      if (assemblyIndex === undefined || slices.length === 0 || assemblyIndex === 0) return null;
      const currentSlice = slices[Math.min(assemblyIndex, slices.length) - 1];
      const h = currentSlice.zHeight;
      let normal = new THREE.Vector3(0, 0, 1);
      if (sliceAxis === Axis.X) normal.set(1, 0, 0); else if (sliceAxis === Axis.Y) normal.set(0, 1, 0);
      return new THREE.Plane(normal.negate(), h); // Clip logic
  }, [assemblyIndex, slices, sliceAxis]);

  return (
    <>
       <Stage intensity={0.5} environment="city" adjustCamera={!showSlicesOnly}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
              {!props.assemblyIndex && !showSlicesOnly && <Model {...props} />}
              {props.assemblyIndex !== undefined && <><Model {...props} clippingPlanes={clipPlane ? [clipPlane] : []} /><Model {...props} transparent opacity={0.1} color="#818cf8" /></>}
              <SliceRenderer {...props} visibleCount={assemblyIndex} useExtrusion={!!props.assemblyIndex} />
              {processingHeight !== undefined && geometry && <ScanPlane height={processingHeight} axis={sliceAxis} size={500} />}
          </group>
       </Stage>
       <Grid infiniteGrid fadeDistance={50} sectionColor="#4b5563" cellColor="#374151"/>
       <GizmoHelper alignment="bottom-right" margin={[80, 80]}><GizmoViewCube strokeColor="#475569" color="#1e293b" textColor="#f1f5f9" hoverColor="#6366f1" /></GizmoHelper>
    </>
  );
};

export const Viewer3D: React.FC<Viewer3DProps> = (props) => (
    <div className="w-full h-full bg-slate-900 relative"><Canvas shadows camera={{ position: [0, 0, 150], fov: 50 }} gl={{ localClippingEnabled: true }}><SceneContent {...props} /><OrbitControls makeDefault /></Canvas></div>
);