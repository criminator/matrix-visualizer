'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Matrix } from '../lib/matrix';
export type SceneHandle={view:(name:string)=>void};
export type SceneProps={matrix:Matrix;progress:number;grid:boolean;original:boolean;vectors:boolean;mode:'transform'|'vectors';highlight:number|null};
const colors=[0xfa9a80,0xbafb73,0x83b6fc];
export default forwardRef<SceneHandle,SceneProps>(function Scene(props,ref){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props),api=useRef<{update:()=>void;view:(name:string)=>void}|null>(null);
 const [error,setError]=useState(''); latest.current=props;
 useImperativeHandle(ref,()=>({view(name){api.current?.view(name);}}),[]);
 useEffect(()=>{api.current?.update();},[props.matrix,props.progress,props.grid,props.original,props.vectors,props.mode,props.highlight]);
 useEffect(()=>{
  const el=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setError('3D rendering is unavailable. Enable graphics acceleration in your browser and reload. Matrix calculations remain available.');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));el.appendChild(renderer.domElement);
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(36,1,.01,200000);camera.up.set(0,0,1);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.05;controls.maxDistance=100000;controls.target.set(.5,.5,.4);
  let frame=0;const render=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;renderer.render(scene,camera);});};controls.addEventListener('change',render);
  const resources: {dispose:()=>void}[]=[];
  const keep=<T extends {dispose:()=>void}>(resource:T)=>{resources.push(resource);return resource;};
  function line(points:THREE.Vector3[],color:number,opacity=1){return new THREE.LineSegments(keep(new THREE.BufferGeometry().setFromPoints(points)),keep(new THREE.LineBasicMaterial({color,transparent:true,opacity})));}
  const gridPoints:THREE.Vector3[]=[];for(let i=-10;i<=10;i++){gridPoints.push(new THREE.Vector3(i,-10,0),new THREE.Vector3(i,10,0),new THREE.Vector3(-10,i,0),new THREE.Vector3(10,i,0));}
  const grid=line(gridPoints,0x647c82,.18);scene.add(grid);
  function label(text:string,color:string){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.font='32px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,64,32);const texture=keep(new THREE.CanvasTexture(canvas));const material=keep(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));const sprite=new THREE.Sprite(material);sprite.scale.set(.38,.19,1);return sprite;}
  const axes=new THREE.Group();scene.add(axes);for(let i=0;i<3;i++){const a=new THREE.Vector3(),b=new THREE.Vector3();a.setComponent(i,-5);b.setComponent(i,5);axes.add(line([a,b],colors[i],.45));const text=label(['x','y','z'][i],['#fa9a80','#bafb73','#83b6fc'][i]);text.position.copy(b).multiplyScalar(.7);axes.add(text);}
  const cubeGeometry=keep(new THREE.BoxGeometry(1,1,1));cubeGeometry.translate(.5,.5,.5);
  const edges=keep(new THREE.EdgesGeometry(cubeGeometry));const reference=new THREE.LineSegments(edges,keep(new THREE.LineDashedMaterial({color:0x9bb0b3,dashSize:.055,gapSize:.045,transparent:true,opacity:.5})));reference.computeLineDistances();scene.add(reference);
  const transformed=new THREE.Group();transformed.matrixAutoUpdate=false;scene.add(transformed);
  const surface=new THREE.Mesh(cubeGeometry,keep(new THREE.MeshBasicMaterial({color:0xbafb73,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false})));transformed.add(surface);transformed.add(new THREE.LineSegments(edges,keep(new THREE.LineBasicMaterial({color:0xbafb73,transparent:true,opacity:.85}))));
  const latticePoints:THREE.Vector3[]=[];for(let n=0;n<=4;n++){const t=n/4;latticePoints.push(new THREE.Vector3(t,0,0),new THREE.Vector3(t,1,0),new THREE.Vector3(0,t,0),new THREE.Vector3(1,t,0),new THREE.Vector3(t,0,1),new THREE.Vector3(t,1,1),new THREE.Vector3(0,t,1),new THREE.Vector3(1,t,1),new THREE.Vector3(0,0,t),new THREE.Vector3(0,1,t),new THREE.Vector3(1,0,t),new THREE.Vector3(1,1,t));}transformed.add(line(latticePoints,0xbafb73,.15));
  const arrows=colors.map((color,i)=>{const arrow=new THREE.ArrowHelper(new THREE.Vector3().setComponent(i,1),new THREE.Vector3(),1,color,.12,.07);scene.add(arrow);return arrow;});
  const labels=colors.map((_,i)=>{const s=label(['a₁','a₂','a₃'][i],['#fa9a80','#bafb73','#83b6fc'][i]);scene.add(s);return s;});
  const origin=new THREE.Mesh(keep(new THREE.SphereGeometry(.025,12,8)),keep(new THREE.MeshBasicMaterial({color:0xdde9e4})));scene.add(origin);
  const matrix4=new THREE.Matrix4();
  const update=()=>{const p=latest.current;const m=p.matrix.map((row,r)=>row.map((v,c)=>(r===c?1-p.progress:0)+p.progress*v));matrix4.set(m[0][0],m[0][1],m[0][2],0,m[1][0],m[1][1],m[1][2],0,m[2][0],m[2][1],m[2][2],0,0,0,0,1);transformed.matrix.copy(matrix4);transformed.matrixWorldNeedsUpdate=true;transformed.visible=p.mode==='transform';reference.visible=p.original&&p.mode==='transform';grid.visible=p.grid;arrows.forEach((a,i)=>{const v=new THREE.Vector3(m[0][i],m[1][i],m[2][i]);const length=v.length();a.visible=(p.vectors||p.mode==='vectors')&&length>1e-10;if(length>1e-10){a.setDirection(v.clone().normalize());a.setLength(length,Math.min(length*.2,.13),Math.min(length*.1,.075));}a.setColor(p.highlight===null||p.highlight===i?colors[i]:0x526368);labels[i].visible=a.visible;labels[i].position.copy(v).add(v.clone().normalize().multiplyScalar(.14));});render();};
  const resize=()=>{const width=el.clientWidth,height=el.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.setViewOffset(width,height,0,height*.12,width,height);camera.updateProjectionMatrix();render();};
  const view=(name:string)=>{const p=latest.current;let center=new THREE.Vector3(.5,.5,.5),distance=6.8;if(name==='fit'){const bounds=new THREE.Box3();for(let x=0;x<=1;x++)for(let y=0;y<=1;y++)for(let z=0;z<=1;z++){bounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(matrix4));if(p.original)bounds.expandByPoint(new THREE.Vector3(x,y,z));}center=bounds.getCenter(new THREE.Vector3());distance=Math.max(1,bounds.getSize(new THREE.Vector3()).length())/Math.sin(THREE.MathUtils.degToRad(18))/Math.min(1,camera.aspect)*1.1;}controls.target.copy(center);camera.up.set(0,0,1);const direction=name==='xy'?new THREE.Vector3(0,0,1):name==='xz'?new THREE.Vector3(0,-1,0):name==='yz'?new THREE.Vector3(1,0,0):new THREE.Vector3(1.6,-2.5,1.65).normalize();if(name==='xy')camera.up.set(0,1,0);camera.position.copy(center).addScaledVector(direction,distance);controls.update();render();};
  const observer=new ResizeObserver(resize);observer.observe(el);const lost=(event:Event)=>{event.preventDefault();setError('The graphics context was interrupted. Reload to restore the 3D view.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  api.current={update,view};resize();view('perspective');update();
  return()=>{api.current=null;observer.disconnect();controls.removeEventListener('change',render);controls.dispose();cancelAnimationFrame(frame);resources.forEach(r=>r.dispose());arrows.forEach(a=>a.dispose());renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="canvas-host">{error&&<div className="scene-error" role="alert">{error}</div>}</div>;
});
