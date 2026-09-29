'use client';
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Matrix } from '../lib/matrix';
export type SceneHandle = { view: (name: string) => void };
export type Plot = {
  id: string;
  name: string;
  color: string;
  matrix: Matrix;
  visible: boolean;
};
export type SceneProps = {
  plots: Plot[];
  activeId: string;
  progress: number;
  grid: boolean;
  original: boolean;
  vectors: boolean;
  mode: 'transform' | 'vectors';
  highlight: number | null;
};
const colors = [0xfa9a80, 0xbafb73, 0x83b6fc];
export default forwardRef<SceneHandle, SceneProps>(function Scene(props, ref) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    api = useRef<{ update: () => void; view: (name: string) => void } | null>(
      null,
    );
  const [error, setError] = useState('');
  useLayoutEffect(() => {
    latest.current = props;
  });
  useImperativeHandle(
    ref,
    () => ({
      view(name) {
        api.current?.view(name);
      },
    }),
    [],
  );
  useEffect(() => {
    api.current?.update();
  }, [
    props.plots,
    props.activeId,
    props.progress,
    props.grid,
    props.original,
    props.vectors,
    props.mode,
    props.highlight,
  ]);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    let errorFrame: number;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      errorFrame = requestAnimationFrame(() =>
        setError(
          '3D rendering is unavailable. Enable graphics acceleration in your browser and reload. Matrix calculations remain available.',
        ),
      );
      return () => cancelAnimationFrame(errorFrame);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0.05;
    controls.maxDistance = 100000;
    controls.target.set(0.5, 0.5, 0.4);
    let frame = 0;
    const render = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderer.render(scene, camera);
      });
    };
    controls.addEventListener('change', render);
    const resources: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(resource: T) => {
      resources.push(resource);
      return resource;
    };
    function line(points: THREE.Vector3[], color: number, opacity = 1) {
      return new THREE.LineSegments(
        keep(new THREE.BufferGeometry().setFromPoints(points)),
        keep(
          new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
        ),
      );
    }
    const gridPoints: THREE.Vector3[] = [];
    for (let i = -10; i <= 10; i++) {
      gridPoints.push(
        new THREE.Vector3(i, -10, 0),
        new THREE.Vector3(i, 10, 0),
        new THREE.Vector3(-10, i, 0),
        new THREE.Vector3(10, i, 0),
      );
    }
    const grid = line(gridPoints, 0x647c82, 0.18);
    scene.add(grid);
    function label(text: string, color: string, owned = resources) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 64, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      owned.push(texture, material);
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.38, 0.19, 1);
      return sprite;
    }
    const axes = new THREE.Group();
    scene.add(axes);
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Vector3(),
        b = new THREE.Vector3();
      a.setComponent(i, -5);
      b.setComponent(i, 5);
      axes.add(line([a, b], colors[i], 0.45));
      const text = label(
        ['x', 'y', 'z'][i],
        ['#fa9a80', '#bafb73', '#83b6fc'][i],
      );
      text.position.copy(b).multiplyScalar(0.7);
      axes.add(text);
    }
    const cubeGeometry = keep(new THREE.BoxGeometry(1, 1, 1));
    cubeGeometry.translate(0.5, 0.5, 0.5);
    const edges = keep(new THREE.EdgesGeometry(cubeGeometry));
    const reference = new THREE.LineSegments(
      edges,
      keep(
        new THREE.LineDashedMaterial({
          color: 0x9bb0b3,
          dashSize: 0.055,
          gapSize: 0.045,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );
    reference.computeLineDistances();
    scene.add(reference);
    const origin = new THREE.Mesh(
      keep(new THREE.SphereGeometry(0.025, 12, 8)),
      keep(new THREE.MeshBasicMaterial({ color: 0xdde9e4 })),
    );
    scene.add(origin);
    function createPlot(plot: Plot) {
      const owned: { dispose: () => void }[] = [];
      const root = new THREE.Group();
      scene.add(root);
      const transformed = new THREE.Group();
      transformed.matrixAutoUpdate = false;
      root.add(transformed);
      const fill = new THREE.MeshBasicMaterial({
        color: plot.color,
        transparent: true,
        opacity: 0.075,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const stroke = new THREE.LineBasicMaterial({
        color: plot.color,
        transparent: true,
        opacity: 0.9,
      });
      owned.push(fill, stroke);
      transformed.add(
        new THREE.Mesh(cubeGeometry, fill),
        new THREE.LineSegments(edges, stroke),
      );
      const arrows = [0, 1, 2].map((i) => {
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3().setComponent(i, 1),
          new THREE.Vector3(),
          1,
          plot.color,
          0.12,
          0.07,
        );
        root.add(arrow);
        return arrow;
      });
      const labels = [0, 1, 2].map((i) => {
        const sprite = label(
          `${plot.name}${['₁', '₂', '₃'][i]}`,
          plot.color,
          owned,
        );
        root.add(sprite);
        return sprite;
      });
      return {
        root,
        transformed,
        fill,
        stroke,
        arrows,
        labels,
        key: plot.name + plot.color,
        dispose() {
          scene.remove(root);
          owned.forEach((r) => r.dispose());
          arrows.forEach((a) => a.dispose());
        },
      };
    }
    const objects = new Map<string, ReturnType<typeof createPlot>>();
    const update = () => {
      const p = latest.current;
      const ids = new Set(p.plots.map((plot) => plot.id));
      for (const [id, object] of objects)
        if (!ids.has(id)) {
          object.dispose();
          objects.delete(id);
        }
      for (const plot of p.plots) {
        let object = objects.get(plot.id);
        if (object && object.key !== plot.name + plot.color) {
          object.dispose();
          objects.delete(plot.id);
          object = undefined;
        }
        if (!object) {
          object = createPlot(plot);
          objects.set(plot.id, object);
        }
        object.root.visible = plot.visible;
        const m = plot.matrix.map((row, r) =>
          row.map((v, c) => (r === c ? 1 - p.progress : 0) + p.progress * v),
        );
        object.transformed.matrix.set(
          m[0][0],
          m[0][1],
          m[0][2],
          0,
          m[1][0],
          m[1][1],
          m[1][2],
          0,
          m[2][0],
          m[2][1],
          m[2][2],
          0,
          0,
          0,
          0,
          1,
        );
        object.transformed.matrixWorldNeedsUpdate = true;
        object.transformed.visible = p.mode === 'transform';
        object.stroke.opacity = plot.id === p.activeId ? 1 : 0.65;
        object.arrows.forEach((a, i) => {
          const v = new THREE.Vector3(m[0][i], m[1][i], m[2][i]),
            length = v.length();
          a.visible = (p.vectors || p.mode === 'vectors') && length > 1e-10;
          if (length > 1e-10) {
            a.setDirection(v.clone().normalize());
            a.setLength(
              length,
              Math.min(length * 0.2, 0.13),
              Math.min(length * 0.1, 0.075),
            );
          }
          a.setColor(
            plot.id === p.activeId && p.highlight !== null && p.highlight !== i
              ? 0x526368
              : plot.color,
          );
          object!.labels[i].visible = a.visible;
          object!.labels[i].position
            .copy(v)
            .add(v.clone().normalize().multiplyScalar(0.18));
        });
      }
      reference.visible = p.original && p.mode === 'transform';
      grid.visible = p.grid;
      render();
    };
    const resize = () => {
      const width = el.clientWidth,
        height = el.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.setViewOffset(width, height, 0, height * 0.12, width, height);
      camera.updateProjectionMatrix();
      render();
    };
    const view = (name: string) => {
      const p = latest.current;
      let center = new THREE.Vector3(0.5, 0.5, 0.5),
        distance = 6.8;
      if (name === 'fit') {
        const bounds = new THREE.Box3();
        bounds.expandByPoint(new THREE.Vector3());
        for (const plot of p.plots) {
          if (!plot.visible) continue;
          const object = objects.get(plot.id);
          if (!object) continue;
          for (let x = 0; x <= 1; x++)
            for (let y = 0; y <= 1; y++)
              for (let z = 0; z <= 1; z++)
                bounds.expandByPoint(
                  new THREE.Vector3(x, y, z).applyMatrix4(
                    object.transformed.matrix,
                  ),
                );
        }
        if (p.original && p.mode === 'transform') {
          bounds.expandByPoint(new THREE.Vector3(1, 1, 1));
        }
        center = bounds.getCenter(new THREE.Vector3());
        distance =
          (Math.max(1, bounds.getSize(new THREE.Vector3()).length()) /
            Math.sin(THREE.MathUtils.degToRad(18)) /
            Math.min(1, camera.aspect)) *
          1.1;
      }
      controls.target.copy(center);
      camera.up.set(0, 0, 1);
      const direction =
        name === 'xy'
          ? new THREE.Vector3(0, 0, 1)
          : name === 'xz'
            ? new THREE.Vector3(0, -1, 0)
            : name === 'yz'
              ? new THREE.Vector3(1, 0, 0)
              : new THREE.Vector3(1.6, -2.5, 1.65).normalize();
      if (name === 'xy') camera.up.set(0, 1, 0);
      camera.position.copy(center).addScaledVector(direction, distance);
      controls.update();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const lost = (event: Event) => {
      event.preventDefault();
      setError(
        'The graphics context was interrupted. Reload to restore the 3D view.',
      );
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    api.current = { update, view };
    resize();
    view('perspective');
    update();
    return () => {
      api.current = null;
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      cancelAnimationFrame(frame);
      resources.forEach((r) => r.dispose());
      objects.forEach((object) => object.dispose());
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div ref={host} className="canvas-host">
      {error && (
        <div className="scene-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
});
