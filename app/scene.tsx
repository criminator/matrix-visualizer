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
import {
  columnSpace,
  eigen,
  formatEigenvalue,
  type Matrix,
  type Vector,
} from '../lib/matrix';
export type DisplayMode = 'transform' | 'vectors' | 'span';
export type CameraView = '3d' | 'xy' | 'xz' | 'yz';
// 'fit' reframes everything while keeping the current viewing direction.
export type SceneHandle = { view: (name: CameraView | 'fit') => void };
export type Plot = {
  id: string;
  name: string;
  color: string;
  matrix: Matrix;
  visible: boolean;
};
export type ScenePoint = { point: Vector; name: string; color: string };
export type SceneProps = {
  plots: Plot[];
  // Static markers; matrices don't transform them.
  points: ScenePoint[];
  activeId: string;
  progress: number;
  grid: boolean;
  original: boolean;
  vectors: boolean;
  // Eigenvectors of the active matrix, outside span mode.
  eigen: boolean;
  mode: DisplayMode;
  highlight: number | null;
  // Pixels of the canvas covered by overlays at the bottom; the view is
  // shifted up so shapes are centered in the uncovered area.
  bottomInset: number;
  // Called with null when the user orbits away from a named view.
  onViewChange?: (view: CameraView | null) => void;
};
const colors = [0xfa9a80, 0xbafb73, 0x83b6fc];
export default forwardRef<SceneHandle, SceneProps>(function Scene(props, ref) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    api = useRef<{
      update: () => void;
      view: (name: CameraView | 'fit') => void;
      resize: () => void;
    } | null>(null);
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
    props.points,
    props.activeId,
    props.progress,
    props.grid,
    props.original,
    props.vectors,
    props.eigen,
    props.mode,
    props.highlight,
  ]);
  useEffect(() => {
    api.current?.resize();
  }, [props.bottomInset]);
  useEffect(() => {
    api.current?.view('fit');
  }, [props.mode]);
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
    // Until the user orbits, layout changes (panels, sheet, window) re-apply
    // the last programmatic view so shapes stay framed.
    let autoView: CameraView | 'fit' | null = '3d';
    const userMoved = () => {
      autoView = null;
      latest.current.onViewChange?.(null);
    };
    controls.addEventListener('start', userMoved);
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
    const labelFont = getComputedStyle(document.body).fontFamily;
    // Screen-space labels: fixed on-screen size at any zoom level. The canvas
    // widens for long names; 'left' labels start at the sprite's left edge.
    function label(
      text: string,
      color: string,
      owned = resources,
      align: 'center' | 'left' = 'center',
    ) {
      const font = `600 64px ${labelFont}`;
      const canvas = document.createElement('canvas');
      const measure = canvas.getContext('2d')!;
      measure.font = font;
      // Padding leaves room for the outline stroke.
      const width = Math.ceil(measure.measureText(text).width) + 24;
      canvas.width = align === 'center' ? Math.max(256, width) : width;
      canvas.height = 128;
      // Resizing the canvas resets the context, so style it afterwards.
      const ctx = canvas.getContext('2d')!;
      const x = align === 'center' ? canvas.width / 2 : 12;
      ctx.font = font;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#101719';
      ctx.strokeText(text, x, 64);
      ctx.fillStyle = color;
      ctx.fillText(text, x, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        sizeAttenuation: false,
      });
      owned.push(texture, material);
      const sprite = new THREE.Sprite(material);
      sprite.scale.set((0.056 * canvas.width) / 256, 0.028, 1);
      sprite.renderOrder = 10;
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
    const spanRadius = 5;
    const spanPointGeometry = keep(new THREE.SphereGeometry(0.08, 16, 12));
    const spanLineGeometry = keep(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-spanRadius, 0, 0),
        new THREE.Vector3(spanRadius, 0, 0),
      ]),
    );
    const spanPlaneGeometry = keep(
      new THREE.PlaneGeometry(spanRadius * 2, spanRadius * 2),
    );
    const spanBoxGeometry = keep(
      new THREE.BoxGeometry(spanRadius * 2, spanRadius * 2, spanRadius * 2),
    );
    const spanBoxEdges = keep(new THREE.EdgesGeometry(spanBoxGeometry));
    const spanGridPoints: THREE.Vector3[] = [];
    for (let i = -spanRadius; i <= spanRadius; i++)
      spanGridPoints.push(
        new THREE.Vector3(i, -spanRadius, 0),
        new THREE.Vector3(i, spanRadius, 0),
        new THREE.Vector3(-spanRadius, i, 0),
        new THREE.Vector3(spanRadius, i, 0),
      );
    const spanGridGeometry = keep(
      new THREE.BufferGeometry().setFromPoints(spanGridPoints),
    );
    // Screen-space dots like the labels, so points stay visible at any zoom.
    // The fill is white so each point's material color tints it; the dark
    // outline stays dark.
    const dot = document.createElement('canvas');
    dot.width = dot.height = 64;
    const dotCtx = dot.getContext('2d')!;
    dotCtx.arc(32, 32, 26, 0, Math.PI * 2);
    dotCtx.fillStyle = '#ffffff';
    dotCtx.fill();
    dotCtx.lineWidth = 6;
    dotCtx.strokeStyle = '#101719';
    dotCtx.stroke();
    const dotTexture = keep(new THREE.CanvasTexture(dot));
    const markers = new THREE.Group();
    scene.add(markers);
    let markerKey = '';
    let markerResources: { dispose: () => void }[] = [];
    // Rebuilt only when the points change; each owns its material and label.
    const syncPoints = (points: ScenePoint[]) => {
      const key = points
        .map((p) => `${p.name} ${p.color} ${p.point.join(',')}`)
        .join('|');
      if (key === markerKey) return;
      markerKey = key;
      markers.clear();
      markerResources.forEach((r) => r.dispose());
      markerResources = [];
      for (const { point, name, color } of points) {
        const material = new THREE.SpriteMaterial({
          map: dotTexture,
          color,
          depthTest: false,
          sizeAttenuation: false,
        });
        markerResources.push(material);
        const marker = new THREE.Sprite(material);
        marker.scale.set(0.016, 0.016, 1);
        marker.renderOrder = 9;
        marker.position.set(...point);
        const text = label(name, color, markerResources, 'left');
        // Up and right of the dot at any zoom: start just past its radius.
        text.center.set(-0.0075 / text.scale.x, -0.15);
        text.position.set(...point);
        markers.add(marker, text);
      }
    };
    // Eigenvectors of the active matrix: dashed lines and discs that stay put
    // while the animation's (1 − t)I + tA scales everything on them by
    // (1 − t) + tλ. Probe arrows show that factor on each eigenline.
    const EIGEN_LINE = 40;
    const EIGEN_DISC = 1.5;
    const ROTATION_DISC = 1.5;
    const eigenGroup = new THREE.Group();
    scene.add(eigenGroup);
    let eigenKey = '';
    let eigenResources: { dispose: () => void }[] = [];
    let eigenProbes: {
      arrow: THREE.ArrowHelper;
      direction: THREE.Vector3;
      value: number;
    }[] = [];
    function dashed(points: THREE.Vector3[], color: string, loop = false) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.14,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.75,
      });
      eigenResources.push(geometry, material);
      const line = loop
        ? new THREE.LineLoop(geometry, material)
        : new THREE.LineSegments(geometry, material);
      line.computeLineDistances();
      return line;
    }
    // A dashed circle (optionally filled) in the plane of orthonormal u, v.
    function disc(
      u: Vector,
      v: Vector,
      radius: number,
      color: string,
      fill: number,
    ) {
      const group = new THREE.Group();
      const circle = Array.from({ length: 96 }, (_, i) => {
        const angle = (i / 96) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0,
        );
      });
      group.add(dashed(circle, color, true));
      if (fill) {
        const geometry = new THREE.CircleGeometry(radius, 96);
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: fill,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        eigenResources.push(geometry, material);
        group.add(new THREE.Mesh(geometry, material));
      }
      const a = new THREE.Vector3(...u),
        b = new THREE.Vector3(...v);
      group.matrixAutoUpdate = false;
      group.matrix.makeBasis(a, b, a.clone().cross(b));
      return group;
    }
    function buildEigen(plot: Plot) {
      eigenGroup.clear();
      eigenResources.forEach((r) => r.dispose());
      eigenProbes.forEach((probe) => probe.arrow.dispose());
      eigenResources = [];
      eigenProbes = [];
      const { spaces, complex } = eigen(plot.matrix);
      for (const { value, basis } of spaces) {
        const text = `λ = ${formatEigenvalue(value)}`;
        if (basis.length === 1) {
          const direction = new THREE.Vector3(...basis[0]);
          eigenGroup.add(
            dashed(
              [
                direction.clone().multiplyScalar(-EIGEN_LINE),
                direction.clone().multiplyScalar(EIGEN_LINE),
              ],
              plot.color,
            ),
          );
          const arrow = new THREE.ArrowHelper(
            direction,
            new THREE.Vector3(),
            1,
            plot.color,
            0.12,
            0.07,
          );
          eigenGroup.add(arrow);
          eigenProbes.push({ arrow, direction, value });
          // Beyond where the probe ends at full progress, and clear of a
          // column vector's label there (a column is λv when e_j is an
          // eigenvector).
          const tag = label(text, plot.color, eigenResources);
          tag.position
            .copy(direction)
            .multiplyScalar(
              Math.sign(value || 1) * (Math.max(Math.abs(value), 1) + 0.8),
            );
          eigenGroup.add(tag);
        } else if (basis.length === 2) {
          eigenGroup.add(
            disc(basis[0], basis[1], EIGEN_DISC, plot.color, 0.05),
          );
          // On the rim, between the two (positive-leaning) basis vectors.
          const tag = label(text, plot.color, eigenResources);
          tag.position
            .set(...basis[0])
            .add(new THREE.Vector3(...basis[1]))
            .setLength(EIGEN_DISC + 0.3);
          eigenGroup.add(tag);
        }
        // A 3D eigenspace (λI) is all of space; the stats dock says so.
      }
      if (complex?.plane.length === 2) {
        const [u, v] = complex.plane;
        eigenGroup.add(disc(u, v, ROTATION_DISC, plot.color, 0));
        const tag = label(
          `λ = ${formatEigenvalue(complex.re)} ± ${formatEigenvalue(complex.im)}i`,
          plot.color,
          eigenResources,
        );
        tag.position
          .set(...u)
          .add(new THREE.Vector3(...v))
          .setLength(ROTATION_DISC + 0.3);
        eigenGroup.add(tag);
      }
    }
    const syncEigen = (p: SceneProps) => {
      const plot = p.plots.find((x) => x.id === p.activeId);
      eigenGroup.visible = !!plot?.visible && p.eigen && p.mode !== 'span';
      if (!plot || !eigenGroup.visible) return;
      const key = plot.color + plot.matrix.flat().join(',');
      if (key !== eigenKey) {
        eigenKey = key;
        buildEigen(plot);
      }
      for (const { arrow, direction, value } of eigenProbes) {
        const factor = 1 - p.progress + p.progress * value;
        const length = Math.abs(factor);
        arrow.visible = length > 1e-3;
        if (!arrow.visible) continue;
        arrow.setDirection(direction.clone().multiplyScalar(Math.sign(factor)));
        arrow.setLength(
          length,
          Math.min(length * 0.2, 0.12),
          Math.min(length * 0.1, 0.07),
        );
      }
    };
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
      const span = new THREE.Group();
      span.matrixAutoUpdate = false;
      root.add(span);
      const spanFill = new THREE.MeshBasicMaterial({
        color: plot.color,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const spaceFill = spanFill.clone();
      spaceFill.opacity = 0.025;
      const spanGridMaterial = new THREE.LineBasicMaterial({
        color: plot.color,
        transparent: true,
        opacity: 0.35,
      });
      const pointMaterial = new THREE.MeshBasicMaterial({
        color: plot.color,
        depthTest: false,
      });
      owned.push(spanFill, spaceFill, spanGridMaterial, pointMaterial);
      const plane = new THREE.Group();
      plane.add(
        new THREE.Mesh(spanPlaneGeometry, spanFill),
        new THREE.LineSegments(spanGridGeometry, spanGridMaterial),
      );
      const space = new THREE.Group();
      space.add(
        new THREE.Mesh(spanBoxGeometry, spaceFill),
        new THREE.LineSegments(spanBoxEdges, spanGridMaterial),
      );
      const spanShapes = [
        new THREE.Mesh(spanPointGeometry, pointMaterial),
        new THREE.LineSegments(spanLineGeometry, stroke),
        plane,
        space,
      ];
      span.add(...spanShapes);
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
        span,
        spanShapes,
        spanKey: '',
        spanDimension: 0,
        fill,
        stroke,
        spanFill,
        spaceFill,
        spanGridMaterial,
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
        const m =
          p.mode === 'span'
            ? plot.matrix
            : plot.matrix.map((row, r) =>
                row.map(
                  (v, c) => (r === c ? 1 - p.progress : 0) + p.progress * v,
                ),
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
        object.span.visible = p.mode === 'span';
        if (p.mode === 'span') {
          const key = plot.matrix.flat().join(',');
          if (object.spanKey !== key) {
            const basis = columnSpace(plot.matrix).map(
              (vector) => new THREE.Vector3(...vector),
            );
            object.spanDimension = basis.length;
            object.spanKey = key;
            object.span.matrix.identity();
            if (basis.length === 1)
              object.span.matrix.makeRotationFromQuaternion(
                new THREE.Quaternion().setFromUnitVectors(
                  new THREE.Vector3(1, 0, 0),
                  basis[0],
                ),
              );
            if (basis.length === 2)
              object.span.matrix.makeBasis(
                basis[0],
                basis[1],
                new THREE.Vector3()
                  .crossVectors(basis[0], basis[1])
                  .normalize(),
              );
            object.span.matrixWorldNeedsUpdate = true;
            object.spanShapes.forEach((shape, i) => {
              shape.visible = i === basis.length;
            });
          }
        }
        const isActive = plot.id === p.activeId;
        object.stroke.opacity = isActive ? 1 : 0.65;
        // Overlapping spans blend into grey, so only the active one is filled;
        // the rest are drawn as faint outlines.
        object.spanFill.opacity = isActive ? 0.1 : 0;
        object.spaceFill.opacity = isActive ? 0.025 : 0;
        object.spanGridMaterial.opacity = isActive ? 0.35 : 0.12;
        object.arrows.forEach((a, i) => {
          const v = new THREE.Vector3(m[0][i], m[1][i], m[2][i]),
            length = v.length();
          // In span mode only the active matrix's columns are drawn; the
          // rest would pile up near the origin at span scale.
          a.visible =
            (p.vectors || p.mode === 'vectors') &&
            (p.mode !== 'span' || isActive) &&
            length > 1e-10;
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
      syncPoints(p.points);
      syncEigen(p);
      reference.visible = p.original && p.mode === 'transform';
      grid.visible = p.grid;
      render();
    };
    const resize = () => {
      const width = el.clientWidth,
        height = el.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.setViewOffset(
        width,
        height,
        0,
        Math.min(latest.current.bottomInset, height * 0.6) / 2,
        width,
        height,
      );
      camera.updateProjectionMatrix();
      if (autoView) view(autoView);
      else render();
    };
    const directions: Record<CameraView, THREE.Vector3> = {
      '3d': new THREE.Vector3(1.6, -2.5, 1.65).normalize(),
      xy: new THREE.Vector3(0, 0, 1),
      xz: new THREE.Vector3(0, -1, 0),
      yz: new THREE.Vector3(1, 0, 0),
    };
    // Every view frames the visible shapes; named views also set direction.
    const view = (name: CameraView | 'fit') => {
      const p = latest.current;
      autoView = name;
      const bounds = new THREE.Box3();
      bounds.expandByPoint(new THREE.Vector3());
      for (const plot of p.plots) {
        if (!plot.visible) continue;
        const object = objects.get(plot.id);
        if (!object) continue;
        if (p.mode === 'span') {
          object.root.updateMatrixWorld(true);
          bounds.union(
            new THREE.Box3().setFromObject(
              object.spanShapes[object.spanDimension],
            ),
          );
          continue;
        }
        for (let x = 0; x <= 1; x++)
          for (let y = 0; y <= 1; y++)
            for (let z = 0; z <= 1; z++)
              bounds.expandByPoint(
                new THREE.Vector3(x, y, z).applyMatrix4(
                  object.transformed.matrix,
                ),
              );
      }
      if (p.original && p.mode === 'transform')
        bounds.expandByPoint(new THREE.Vector3(1, 1, 1));
      for (const { point } of p.points)
        bounds.expandByPoint(new THREE.Vector3(...point));
      const center = bounds.getCenter(new THREE.Vector3());
      // Frame within the part of the canvas not covered by overlays.
      const height = el.clientHeight || 1;
      const visible = 1 - Math.min(p.bottomInset, height * 0.6) / height;
      // Fit whichever of height (minus overlays) or width is tighter.
      const extent =
        Math.max(1, bounds.getSize(new THREE.Vector3()).length()) /
        (2 * Math.tan(THREE.MathUtils.degToRad(18)));
      const distance =
        extent * Math.max(1 / visible, 1 / Math.min(1, camera.aspect)) * 1.8;
      let direction: THREE.Vector3;
      if (name === 'fit') {
        direction = camera.position.clone().sub(controls.target).normalize();
      } else {
        direction = directions[name];
        camera.up.set(0, name === 'xy' ? 1 : 0, name === 'xy' ? 0 : 1);
      }
      controls.target.copy(center);
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
    api.current = { update, view, resize };
    resize();
    update();
    view('3d');
    return () => {
      api.current = null;
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.removeEventListener('start', userMoved);
      controls.dispose();
      cancelAnimationFrame(frame);
      resources.forEach((r) => r.dispose());
      objects.forEach((object) => object.dispose());
      markerResources.forEach((r) => r.dispose());
      eigenResources.forEach((r) => r.dispose());
      eigenProbes.forEach((probe) => probe.arrow.dispose());
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={host}
      className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full [&>canvas]:touch-none"
    >
      {error && (
        <div
          role="alert"
          className="absolute inset-x-[15%] top-[40%] rounded-lg border bg-card p-5 text-center text-sm"
        >
          {error}
        </div>
      )}
    </div>
  );
});
