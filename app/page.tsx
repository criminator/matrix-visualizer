'use client';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditorPanel } from '@/components/matrix/editor-panel';
import { IconButton } from '@/components/matrix/icon-button';
import { ShortcutsPopover } from '@/components/matrix/shortcuts-popover';
import { StatsDock } from '@/components/matrix/stats-dock';
import {
  CameraToolbar,
  ModeToggle,
  VIEWS,
  floatingPanel,
} from '@/components/matrix/view-toolbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMatrixWorkspace, type Plot } from '@/hooks/use-matrix-workspace';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { usePoints } from '@/hooks/use-points';
import { determinant, eigen, rank, sameSpan } from '@/lib/matrix';
import { registerMatrixTool } from '@/lib/webmcp';
import { cn } from '@/lib/utils';
import Scene, {
  type CameraView,
  type DisplayMode,
  type SceneHandle,
  type ScenePoint,
} from './scene';

// Mobile bottom-sheet snap points: peek (stats), half (grid), full.
const SNAPS = ['150px', '430px', 1] as const;
type Snap = (typeof SNAPS)[number];
const snapPx = (snap: Snap) =>
  typeof snap === 'number' ? snap * window.innerHeight : parseFloat(snap);

const SPAN_NAMES = ['Origin only', 'Line', 'Plane', 'All of ℝ³'];

export default function Home() {
  const ws = useMatrixWorkspace();
  const { active } = ws;
  const points = usePoints();
  const isMobile = useIsMobile();
  const scene = useRef<SceneHandle>(null);

  const [mode, setMode] = useState<DisplayMode>('transform');
  const [view, setView] = useState<CameraView | null>('3d');
  const [highlight, setHighlight] = useState<number | null>(null);
  const [grid, setGrid] = usePersistedState('matrix-space:grid', true);
  const [original, setOriginal] = usePersistedState('matrix-space:original', true);
  const [vectors, setVectors] = usePersistedState('matrix-space:vectors', true);
  const [eigenvectors, setEigenvectors] = usePersistedState('matrix-space:eigen', false);
  const [sidebarOpen, setSidebarOpen] = usePersistedState('matrix-space:sidebar', true);
  const [focus, setFocus] = usePersistedState('matrix-space:focus', false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dockHeight, setDockHeight] = useState(0);
  const [snap, setSnap] = useState<Snap>(SNAPS[0]);
  const [sheetHeight, setSheetHeight] = useState(150);

  // Statistics for the selected matrix; null when nothing is selected.
  const stats = active && {
    det: determinant(active.matrix),
    rank: rank(active.matrix),
    eigen: eigen(active.matrix),
  };
  const visiblePlots = ws.plots.filter((p) => p.visible);
  const layers = [
    { label: 'Reference grid', checked: grid, onChange: setGrid },
    { label: 'Original cube', checked: original, onChange: setOriginal },
    { label: 'Basis vectors', checked: vectors, onChange: setVectors },
    { label: 'Eigenvectors', checked: eigenvectors, onChange: setEigenvectors },
  ];

  const bottomInset = focus ? 0 : isMobile ? sheetHeight : dockHeight + 16;

  // Measure the stats dock so the scene can frame around it.
  const dockRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() => setDockHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const changeMode = (next: DisplayMode) => {
    setMode(next);
    if (next === 'span') ws.setPlaying(false);
  };
  const showView = (next: CameraView) => {
    setView(next);
    scene.current?.view(next);
  };
  const fit = () => scene.current?.view('fit');
  const toggleFocus = () => setFocus((f) => !f);
  const moveSheet = (next: Snap) => {
    setSnap(next);
    setSheetHeight(snapPx(next));
  };

  // Global shortcuts; kept in a ref so the listener is registered once.
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    onKey.current = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]'))
        return;
      const view = VIEWS.find((v) => v.key === e.key);
      if (view) showView(view.value);
      else if (e.key === '0') fit();
      else if (e.key === ' ') {
        // Let focused buttons and sliders handle Space themselves.
        if (target.closest('button, [role="slider"], a') || mode === 'span')
          return;
        ws.togglePlay();
      } else if (e.key === 'f' || e.key === 'F') toggleFocus();
      else if (e.key === 'e' || e.key === 'E') setEigenvectors((on) => !on);
      else if (e.key === 'Escape' && focus) setFocus(false);
      else if ((e.key === 's' || e.key === 'S') && !isMobile)
        setSidebarOpen((open) => !open);
      else if (e.key === '?') setShortcutsOpen(true);
      else return;
      e.preventDefault();
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const applyRef = useRef(ws.apply);
  useLayoutEffect(() => {
    applyRef.current = ws.apply;
  });
  useEffect(() => registerMatrixTool((m) => applyRef.current(m)), []);

  const editor = (
    <EditorPanel
      ws={ws}
      points={points}
      highlight={highlight}
      onHighlight={setHighlight}
      layers={layers}
      editorFirst={isMobile}
    />
  );
  const showSidebar = !isMobile && !focus && sidebarOpen;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {!focus && (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-2 sm:px-3">
          {!isMobile && (
            <IconButton
              label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              shortcut="S"
              side="bottom"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
              aria-controls="editor-sidebar"
            >
              {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </IconButton>
          )}
          <span className="flex items-center gap-2 pl-1 text-sm font-semibold tracking-tight">
            <span className="grid size-6 place-items-center rounded-md bg-primary/15 text-primary">
              <Box className="size-3.5" />
            </span>
            matrixspace
          </span>
          <div className="ml-auto flex items-center gap-0.5 text-muted-foreground">
            {!isMobile && (
              <ShortcutsPopover open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
            )}
            <IconButton label="Focus mode" shortcut="F" side="bottom" onClick={toggleFocus}>
              <Maximize2 />
            </IconButton>
          </div>
        </header>
      )}

      <div
        className={cn(
          'grid min-h-0 flex-1',
          showSidebar ? 'grid-cols-[340px_minmax(0,1fr)]' : 'grid-cols-1',
        )}
      >
        {showSidebar && (
          <aside
            id="editor-sidebar"
            aria-label="Matrix editor"
            className="min-h-0 border-r bg-sidebar"
          >
            <ScrollArea className="h-full">{editor}</ScrollArea>
          </aside>
        )}

        <section
          aria-label="Interactive 3D plot"
          className="relative min-h-0 overflow-hidden bg-(image:--scene)"
        >
          <Scene
            ref={scene}
            plots={ws.plots}
            points={points.plotted}
            activeId={active?.id ?? null}
            progress={ws.progress}
            grid={grid}
            original={original}
            vectors={vectors}
            eigen={eigenvectors}
            mode={mode}
            highlight={highlight}
            bottomInset={bottomInset}
            onViewChange={setView}
          />
          <p aria-live="polite" className="sr-only">
            {active && stats
              ? `${active.name}: determinant ${Number(stats.det.toFixed(3))}, rank ${stats.rank}, ${
                  mode === 'span' ? `spans ${SPAN_NAMES[stats.rank]}` : `${visiblePlots.length} visible`
                }.`
              : `No matrix selected, ${visiblePlots.length} visible.`}
          </p>

          {focus ? (
            <FocusOverlay
              plots={visiblePlots}
              points={points.plotted}
              onExit={() => setFocus(false)} />
          ) : (
            <div className="pointer-events-none absolute inset-0 flex flex-col gap-4 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <ModeToggle mode={mode} onModeChange={changeMode} />
                {!isMobile && <CameraToolbar view={view} onView={showView} onFit={fit} />}
              </div>
              {(!isMobile || snap === SNAPS[0]) && (
                <SceneTitle mode={mode} ws={ws} visible={visiblePlots} />
              )}
              {isMobile && (
                <div className="absolute top-16 right-3">
                  <CameraToolbar view={view} onView={showView} onFit={fit} vertical />
                </div>
              )}
              {!isMobile && (
                <StatsDock
                  ref={dockRef}
                  ws={ws}
                  stats={stats}
                  mode={mode}
                  className="mx-auto mt-auto w-full max-w-4xl"
                />
              )}
            </div>
          )}
        </section>
      </div>

      {isMobile && !focus && (
        <Drawer
          open
          modal={false}
          disablePointerDismissal
          showSwipeHandle
          snapPoints={[...SNAPS]}
          snapToSequentialPoints
          snapPoint={snap}
          onSnapPointChange={(next) => moveSheet((next ?? SNAPS[0]) as Snap)}
          // The sheet can't be dismissed; swiping down returns to the peek.
          onOpenChange={(open) => !open && moveSheet(SNAPS[0])}
        >
          <DrawerContent>
            <DrawerTitle className="sr-only">Matrix editor</DrawerTitle>
            <IconButton
              label={snap === 1 ? 'Collapse editor' : 'Expand editor'}
              onClick={() =>
                moveSheet(SNAPS[(SNAPS.indexOf(snap) + 1) % SNAPS.length])
              }
              className="absolute top-2 right-3 z-10 text-muted-foreground"
            >
              {snap === 1 ? <ChevronDown /> : <ChevronUp />}
            </IconButton>
            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: Math.max(sheetHeight - 12, 0) }}
            >
              <StatsDock
                ws={ws}
                stats={stats}
                mode={mode}
                className="rounded-none border-0 bg-transparent px-4 pt-1 pb-3 shadow-none backdrop-blur-none"
              />
              {editor}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function SceneTitle({
  mode,
  ws,
  visible,
}: {
  mode: DisplayMode;
  ws: ReturnType<typeof useMatrixWorkspace>;
  visible: Plot[];
}) {
  const { active } = ws;
  const count = visible.length;
  if (mode === 'span' && !active)
    return (
      <div className="pointer-events-none">
        <h2 className="text-sm font-medium">Column spaces</h2>
        <p className="text-label font-normal text-muted-foreground">
          {count} visible {count === 1 ? 'span' : 'spans'} · select a matrix to fill its span
        </p>
      </div>
    );
  if (mode !== 'span' || !active) {
    return (
      <div className="pointer-events-none">
        <h2 className="text-sm font-medium">
          {mode === 'transform' ? 'Transformation' : 'Column vectors'}
        </h2>
        <p className="text-label font-normal text-muted-foreground">
          {count} visible {count === 1 ? 'matrix' : 'matrices'}
        </p>
      </div>
    );
  }
  const dimension = rank(active.matrix);
  // Group the active matrix with any visible matrices spanning the same space.
  const shared = visible.filter(
    (p) => p.id !== active.id && sameSpan(p.matrix, active.matrix),
  );
  return (
    <div className="pointer-events-none max-w-[70%]">
      <h2 className="text-sm font-medium">
        <span className="font-math text-base italic">
          {[active, ...shared].map((p) => `Span(${p.name})`).join(' = ')}
        </span>
        <span className="font-normal text-muted-foreground"> · {SPAN_NAMES[dimension]}</span>
      </h2>
      <p className="text-label font-normal text-muted-foreground">
        Dimension {dimension}
        {!active.visible && ` · ${active.name} is hidden`}
        {visible.length > 1 && ' · other spans shown as outlines'}
      </p>
    </div>
  );
}

// Points beyond this are summarized so the legend stays one line or two.
const LEGEND_POINTS = 8;

function FocusOverlay({
  plots,
  points,
  onExit,
}: {
  plots: Plot[];
  points: ScenePoint[];
  onExit: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onExit}
        className={cn(floatingPanel, 'self-end')}
      >
        <Minimize2 /> Exit focus
      </Button>
      <ul
        aria-label="Plotted matrices and points"
        className={cn(
          floatingPanel,
          'pointer-events-none flex flex-wrap gap-x-4 gap-y-1 self-start px-3 py-2 text-label font-normal text-muted-foreground',
        )}
      >
        {plots.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
            {p.id === 'composition' ? `${p.name} (composition)` : p.name}
          </li>
        ))}
        {points.slice(0, LEGEND_POINTS).map((p) => (
          <li key={`point-${p.name}`} className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </li>
        ))}
        {points.length > LEGEND_POINTS && (
          <li>+{points.length - LEGEND_POINTS} more points</li>
        )}
      </ul>
    </div>
  );
}
