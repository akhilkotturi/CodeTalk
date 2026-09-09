import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Link, useParams } from "react-router-dom";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import * as Y from "yjs";
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { Toast } from "../components/shared/Toast";
import { getProject, type Project } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";
import { WS_BASE_URL } from "../lib/config";

const COLLABORATION_URL = `${WS_BASE_URL}/collaboration`;

type ElementMap = Y.Map<ExcalidrawElement>;
type ExcalidrawElement = Parameters<NonNullable<ComponentProps<typeof Excalidraw>["onChange"]>>[0][number];
type ExcalidrawApi = {
  updateScene: (scene: { elements: readonly ExcalidrawElement[] }) => void;
};

export function writeWhiteboardElements(elementMap: ElementMap, nextElements: readonly ExcalidrawElement[]) {
  elementMap.doc?.transact(() => {
    for (const element of nextElements) elementMap.set(element.id, element);
  });
}

export function Whiteboard() {
  const { id } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const mapRef = useRef<ElementMap | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
  const isApplyingRemoteSceneRef = useRef(false);

  const applyRemoteScene = useCallback((elementMap: ElementMap) => {
    const api = excalidrawApiRef.current;
    if (!api) return;

    isApplyingRemoteSceneRef.current = true;
    api.updateScene({ elements: Array.from(elementMap.values()) });
    queueMicrotask(() => {
      isApplyingRemoteSceneRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    let provider: HocuspocusProvider | null = null;
    let websocketProvider: HocuspocusProviderWebsocket | null = null;
    const doc = new Y.Doc();
    const elementMap = doc.getMap<ExcalidrawElement>("elements");
    docRef.current = doc;
    mapRef.current = elementMap;

    Promise.all([
      getProject(token, id),
      Promise.resolve().then(() => {
        websocketProvider = new HocuspocusProviderWebsocket({ url: COLLABORATION_URL });
        provider = new HocuspocusProvider({
          name: `project:${id}:whiteboard`,
          document: doc,
          websocketProvider,
          token,
          onAuthenticationFailed: ({ reason }) => {
            setError(`Whiteboard connection failed: ${reason}`);
          },
        });
        provider.attach();
      }),
    ]).then(([loadedProject]) => setProject(loadedProject)).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not open the whiteboard");
    });

    const syncElements = () => applyRemoteScene(elementMap);
    elementMap.observe(syncElements);
    syncElements();
    return () => {
      elementMap.unobserve(syncElements);
      provider?.destroy();
      websocketProvider?.destroy();
      doc.destroy();
      docRef.current = null;
      mapRef.current = null;
    };
  }, [applyRemoteScene, id, token]);

  function handleChange(nextElements: readonly ExcalidrawElement[]) {
    if (isApplyingRemoteSceneRef.current) return;
    const elementMap = mapRef.current;
    if (!elementMap) return;
    writeWhiteboardElements(elementMap, nextElements);
  }

  if (error) return <main className="center-state"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></main>;
  if (!project) return <main className="center-state"><div className="loading-line" /><p>Connecting to whiteboard…</p></main>;

  return (
    <main className="whiteboard-shell">
      <header className="room-header whiteboard-header">
        <Link className="wordmark wordmark-small" to={`/projects/${project.id}/overview`}>CT<span className="wordmark-dot" aria-hidden="true" /></Link>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Shared whiteboard</div>
          <h1>{project.name}</h1>
        </div>
        <div className="room-actions">
          <Link className="button button-secondary" to={`/projects/${project.id}/overview`}>Overview</Link>
          <Link className="button button-secondary" to={`/projects/${project.id}/plan`}>Plan</Link>
          <Link className="button button-secondary" to={`/projects/${project.id}/tasks`}>Tasks</Link>
        </div>
      </header>
      <div className="whiteboard-canvas">
        <Link className="whiteboard-exit" to={`/projects/${project.id}/overview`} aria-label="Exit whiteboard to project overview">
          <span>Auto-saving</span>
          Exit board
        </Link>
        <Excalidraw
          excalidrawAPI={(api) => {
            excalidrawApiRef.current = api as ExcalidrawApi;
            const elementMap = mapRef.current;
            if (elementMap) applyRemoteScene(elementMap);
          }}
          onChange={handleChange}
          UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
        />
      </div>
    </main>
  );
}
