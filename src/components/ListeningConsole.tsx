"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import type { MusicAlbum } from "@/config/site";
import type {
  InspectionKind,
  InspectionOrigin,
  InspectionPhase,
  PersistentInspectionState,
  RecordTransferCommand,
  RectSnapshot,
} from "./AlbumObjectViewer";
import { RecordFace } from "./RecordFace";
import {
  TurntableControls,
  type TurntableControlVariant,
} from "./TurntableControls";
import {
  useTurntableControlAudio,
  type TurntableControlSoundHandlers,
} from "./useTurntableControlAudio";

const AlbumObjectViewer = dynamic(
  () =>
    import("./AlbumObjectViewer").then((module) => module.AlbumObjectViewer),
  {
    loading: () => null,
    ssr: false,
  },
);

const PersistentAlbumObjects = dynamic(
  () =>
    import("./AlbumObjectViewer").then(
      (module) => module.PersistentAlbumObjects,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);

const preloadAlbumViewer = () => import("./AlbumObjectViewer");

const INSPECTION_OPEN_MS = 320;
const INSPECTION_CLOSE_MS = 280;
const RECORD_EXTRACT_MS = 360;
const RECORD_REINSERT_MS = 300;
const TONEARM_REST_ROTATION = -20;

const RECORD_TRANSITION = {
  type: "spring",
  stiffness: 360,
  damping: 30,
} as const;

interface ListeningConsoleProps {
  albums: MusicAlbum[];
}

interface ViewerState {
  engine: "fallback" | "persistent";
  index: number;
  kind: InspectionKind;
  origin: InspectionOrigin;
  phase: InspectionPhase;
}

interface SceneTargets {
  records: Array<HTMLElement | null>;
  recordVisuals: Array<HTMLElement | null>;
  sleeves: Array<HTMLButtonElement | null>;
}

interface TransferState {
  album: MusicAlbum;
  from: RectSnapshot;
  id: number;
  kind: InspectionKind;
  to: RectSnapshot;
}

function toSnapshot(element: HTMLElement | null): RectSnapshot | null {
  const rect = element?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

function visibleSnapshot(
  elements: Array<HTMLElement | null | undefined>,
): RectSnapshot | null {
  for (const element of elements) {
    const rect = toSnapshot(element ?? null);
    if (rect) return rect;
  }
  return null;
}

function centeredObjectRect(rect: RectSnapshot): RectSnapshot {
  const size = Math.min(rect.width, rect.height) * 0.82;
  return {
    height: size,
    left: rect.left + (rect.width - size) / 2,
    top: rect.top + (rect.height - size) / 2,
    width: size,
  };
}

function sameVisualRect(
  first: RectSnapshot | null,
  second: RectSnapshot | null,
) {
  if (!first || !second) return false;
  return (
    Math.abs(first.left + first.width / 2 - (second.left + second.width / 2)) <
      2 &&
    Math.abs(first.top + first.height / 2 - (second.top + second.height / 2)) <
      2 &&
    Math.abs(first.width - second.width) < 2
  );
}

interface TurntableForegroundPlacement {
  rect: RectSnapshot;
  variant: TurntableControlVariant;
}

function samePlacement(
  first: TurntableForegroundPlacement | null,
  second: TurntableForegroundPlacement,
) {
  if (!first || first.variant !== second.variant) return false;
  return (
    Math.abs(first.rect.left - second.rect.left) < 0.5 &&
    Math.abs(first.rect.top - second.rect.top) < 0.5 &&
    Math.abs(first.rect.width - second.rect.width) < 0.5 &&
    Math.abs(first.rect.height - second.rect.height) < 0.5
  );
}

function useTurntableForegroundPlacement(
  rootRef: RefObject<HTMLDivElement | null>,
  desktopRef: RefObject<HTMLDivElement | null>,
  mobileRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [placement, setPlacement] =
    useState<TurntableForegroundPlacement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const root = rootRef.current?.getBoundingClientRect();
      if (!root) {
        setPlacement(null);
        return;
      }

      const candidates: Array<{
        element: HTMLDivElement | null;
        variant: TurntableControlVariant;
      }> = [
        { element: desktopRef.current, variant: "desktop" },
        { element: mobileRef.current, variant: "mobile" },
      ];
      const visible = candidates.find(({ element }) => {
        const rect = element?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
      });
      const rect = visible?.element?.getBoundingClientRect();
      if (!visible || !rect) {
        setPlacement(null);
        return;
      }

      const next: TurntableForegroundPlacement = {
        rect: {
          height: rect.height,
          left: rect.left - root.left,
          top: rect.top - root.top,
          width: rect.width,
        },
        variant: visible.variant,
      };
      setPlacement((current) => (samePlacement(current, next) ? current : next));
    };
    const scheduleMeasure = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(measure);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const observed = [
      rootRef.current,
      desktopRef.current,
      mobileRef.current,
    ];
    for (const element of observed) {
      if (element) resizeObserver.observe(element);
    }
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, {
      capture: true,
      passive: true,
    });
    scheduleMeasure();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [desktopRef, enabled, mobileRef, rootRef]);

  return enabled ? placement : null;
}

export function ListeningConsole({ albums }: ListeningConsoleProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [platterIndex, setPlatterIndex] = useState<number | null>(null);
  const [powered, setPowered] = useState(false);
  const [ledIntensity, setLedIntensity] = useState(70);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [pendingViewer, setPendingViewer] = useState<Omit<
    ViewerState,
    "engine" | "phase"
  > | null>(null);
  const [shouldLoadPersistent, setShouldLoadPersistent] = useState(false);
  const [persistentReady, setPersistentReady] = useState(false);
  const [persistentFailed, setPersistentFailed] = useState(false);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [recordTransferActive, setRecordTransferActive] =
    useState(false);
  const [autoReturn, setAutoReturn] =
    useState<RecordTransferCommand | null>(null);
  const [queuedAlbumIndex, setQueuedAlbumIndex] =
    useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopPlatterRef = useRef<HTMLDivElement>(null);
  const mobilePlatterRef = useRef<HTMLDivElement>(null);
  const desktopTurntableRef = useRef<HTMLDivElement>(null);
  const mobileTurntableRef = useRef<HTMLDivElement>(null);
  const desktopTargetsRef = useRef<SceneTargets>({
    records: [],
    recordVisuals: [],
    sleeves: [],
  });
  const mobileTargetsRef = useRef<SceneTargets>({
    records: [],
    recordVisuals: [],
    sleeves: [],
  });
  const transferResolveRef = useRef<(() => void) | null>(null);
  const transferIdRef = useRef(0);
  const autoReturnIdRef = useRef(0);
  const inspectionTimerRef = useRef<number | null>(null);
  const controlSound = useTurntableControlAudio();
  const reduceMotion = Boolean(useReducedMotion());
  const highlightedAlbum = albums[highlightedIndex] ?? albums[0];
  const platterAlbum =
    platterIndex === null ? null : (albums[platterIndex] ?? null);
  const motorActive = Boolean(platterAlbum) && powered;
  const foregroundPlacement = useTurntableForegroundPlacement(
    rootRef,
    desktopTurntableRef,
    mobileTurntableRef,
    Boolean(
      persistentReady &&
        platterAlbum &&
        !persistentFailed &&
        !viewer &&
        !recordTransferActive &&
        !transitioning,
    ),
  );
  const handlePowerToggle = useCallback(() => {
    setPowered((current) => !current);
  }, []);
  const handleLedIntensityChange = useCallback((value: number) => {
    setLedIntensity(Math.min(100, Math.max(0, Math.round(value))));
  }, []);
  const rootRect = useCallback(
    () => rootRef.current?.getBoundingClientRect() ?? null,
    [],
  );

  const platterRect = useCallback(
    () =>
      visibleSnapshot([
        desktopPlatterRef.current,
        mobilePlatterRef.current,
      ]),
    [],
  );

  const recordRect = useCallback(
    (index: number) =>
      visibleSnapshot([
        desktopTargetsRef.current.records[index],
        mobileTargetsRef.current.records[index],
      ]),
    [],
  );

  const sleeveRect = useCallback(
    (index: number) =>
      visibleSnapshot([
        desktopTargetsRef.current.sleeves[index],
        mobileTargetsRef.current.sleeves[index],
      ]),
    [],
  );

  const persistentRecordRect = useCallback(
    (index: number) =>
      visibleSnapshot([
        desktopTargetsRef.current.recordVisuals[index],
        mobileTargetsRef.current.recordVisuals[index],
      ]),
    [],
  );

  const viewerAnchorRect = useCallback(() => {
    if (!viewer) return null;
    if (viewer.origin === "platter") return platterRect();
    return viewer.kind === "record"
      ? recordRect(viewer.index)
      : sleeveRect(viewer.index);
  }, [platterRect, recordRect, sleeveRect, viewer]);

  const viewerShelfRect = useCallback(
    () => (viewer ? sleeveRect(viewer.index) : null),
    [sleeveRect, viewer],
  );

  const objectRect = useCallback(
    (kind: InspectionKind, index: number) =>
      kind === "record" ? persistentRecordRect(index) : sleeveRect(index),
    [persistentRecordRect, sleeveRect],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldLoadPersistent || persistentFailed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldLoadPersistent(true);
        observer.disconnect();
      },
      { rootMargin: "400px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [persistentFailed, shouldLoadPersistent]);

  useEffect(() => {
    if (!viewer || viewer.engine !== "persistent") return;
    if (inspectionTimerRef.current !== null) {
      window.clearTimeout(inspectionTimerRef.current);
    }

    if (viewer.phase === "opening") {
      inspectionTimerRef.current = window.setTimeout(
        () => {
          setViewer((current) =>
            current?.engine === "persistent" &&
            current.phase === "opening"
              ? {
                  ...current,
                  phase:
                    current.kind === "sleeve" &&
                    current.origin === "shelf"
                      ? "sleeve-ready"
                      : "record-ready",
                }
              : current,
          );
          requestAnimationFrame(() => {
            rootRef.current
              ?.querySelector<HTMLCanvasElement>(
                `[data-persistent-object="${viewer.kind}-${viewer.index}"] canvas`,
              )
              ?.focus();
          });
        },
        reduceMotion ? 0 : INSPECTION_OPEN_MS,
      );
    } else if (viewer.phase === "extracting") {
      inspectionTimerRef.current = window.setTimeout(
        () => {
          setViewer((current) =>
            current?.engine === "persistent" &&
            current.phase === "extracting"
              ? { ...current, phase: "record-ready" }
              : current,
          );
          requestAnimationFrame(() => {
            rootRef.current
              ?.querySelector<HTMLCanvasElement>(
                `[data-persistent-object="record-${viewer.index}"] canvas`,
              )
              ?.focus();
          });
        },
        reduceMotion ? 0 : RECORD_EXTRACT_MS,
      );
    } else if (
      viewer.phase === "reinserting" ||
      viewer.phase === "reinserting-close"
    ) {
      const closeAfterReinsert = viewer.phase === "reinserting-close";
      inspectionTimerRef.current = window.setTimeout(
        () => {
          setViewer((current) => {
            if (
              current?.engine !== "persistent" ||
              (current.phase !== "reinserting" &&
                current.phase !== "reinserting-close")
            ) {
              return current;
            }
            return {
              ...current,
              phase: closeAfterReinsert ? "closing" : "sleeve-ready",
            };
          });
          if (!closeAfterReinsert) {
            requestAnimationFrame(() => {
              rootRef.current
                ?.querySelector<HTMLCanvasElement>(
                  `[data-persistent-object="sleeve-${viewer.index}"] canvas`,
                )
                ?.focus();
            });
          }
        },
        reduceMotion ? 0 : RECORD_REINSERT_MS,
      );
    } else if (viewer.phase === "closing") {
      inspectionTimerRef.current = window.setTimeout(
        () => {
          const closingViewer = viewer;
          setViewer(null);
          requestAnimationFrame(() => {
            const candidates =
              closingViewer.origin === "platter"
                ? [desktopPlatterRef.current, mobilePlatterRef.current]
                : [
                    desktopTargetsRef.current.sleeves[closingViewer.index],
                    mobileTargetsRef.current.sleeves[closingViewer.index],
                  ];
            candidates
              .find((element) => {
                const rect = element?.getBoundingClientRect();
                return rect && rect.width > 0 && rect.height > 0;
              })
              ?.querySelector<HTMLButtonElement>("button")
              ?.focus();
            const directTarget = candidates.find(
              (element): element is HTMLButtonElement =>
                element instanceof HTMLButtonElement,
            );
            directTarget?.focus();
          });
        },
        reduceMotion ? 0 : INSPECTION_CLOSE_MS,
      );
    }

    return () => {
      if (inspectionTimerRef.current !== null) {
        window.clearTimeout(inspectionTimerRef.current);
        inspectionTimerRef.current = null;
      }
    };
  }, [reduceMotion, viewer]);

  const beginTransfer = useCallback(
    (
      album: MusicAlbum,
      kind: InspectionKind,
      from: RectSnapshot | null,
      to: RectSnapshot | null,
    ) => {
      if (reduceMotion || !from || !to) return Promise.resolve();

      return new Promise<void>((resolve) => {
        transferResolveRef.current = resolve;
        transferIdRef.current += 1;
        setTransfer({
          album,
          from,
          id: transferIdRef.current,
          kind,
          to,
        });
      });
    },
    [reduceMotion],
  );

  const finishTransfer = useCallback((id: number) => {
    const resolve = transferResolveRef.current;
    transferResolveRef.current = null;
    resolve?.();
    queueMicrotask(() => {
      setTransfer((current) => (current?.id === id ? null : current));
    });
  }, []);

  const requestAutomaticReturn = useCallback((index: number) => {
    autoReturnIdRef.current += 1;
    setAutoReturn({
      id: autoReturnIdRef.current,
      index,
    });
  }, []);

  const openViewer = useCallback(
    (kind: InspectionKind, index: number, origin: InspectionOrigin) => {
      if (
        transitioning ||
        recordTransferActive ||
        viewer ||
        pendingViewer
      ) {
        return;
      }
      setHighlightedIndex(index);
      if (persistentReady) {
        if (
          kind === "sleeve" &&
          origin === "shelf" &&
          platterIndex !== null
        ) {
          setQueuedAlbumIndex(
            platterIndex === index ? null : index,
          );
          requestAutomaticReturn(platterIndex);
          return;
        }
        setViewer({
          engine: "persistent",
          index,
          kind,
          origin,
          phase: "opening",
        });
        return;
      }
      if (persistentFailed) {
        if (
          kind === "sleeve" &&
          origin === "shelf" &&
          platterIndex !== null
        ) {
          setQueuedAlbumIndex(
            platterIndex === index ? null : index,
          );
          requestAutomaticReturn(platterIndex);
          setViewer({
            engine: "fallback",
            index: platterIndex,
            kind: "record",
            origin: "platter",
            phase: "record-ready",
          });
          return;
        }
        setViewer({
          engine: "fallback",
          index,
          kind,
          origin,
          phase:
            kind === "sleeve" && origin === "shelf"
              ? "sleeve-ready"
              : "record-ready",
        });
        return;
      }
      setPendingViewer({ index, kind, origin });
      setShouldLoadPersistent(true);
    },
    [
      pendingViewer,
      platterIndex,
      persistentFailed,
      persistentReady,
      recordTransferActive,
      requestAutomaticReturn,
      transitioning,
      viewer,
    ],
  );

  const closePersistentViewer = useCallback(() => {
    if (recordTransferActive) return;
    setViewer((current) => {
      if (
        current?.engine !== "persistent" ||
        current.phase === "closing" ||
        current.phase === "reinserting-close"
      ) {
        return current;
      }
      if (
        current.kind === "sleeve" &&
        current.origin === "shelf" &&
        (current.phase === "extracting" ||
          current.phase === "record-ready" ||
          current.phase === "reinserting")
      ) {
        return { ...current, phase: "reinserting-close" };
      }
      return { ...current, phase: "closing" };
    });
  }, [recordTransferActive]);

  useEffect(() => {
    if (viewer?.engine !== "persistent") return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      closePersistentViewer();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closePersistentViewer, viewer?.engine]);

  const extractSleeveRecord = useCallback(() => {
    setViewer((current) =>
      current?.engine === "persistent" &&
      current.kind === "sleeve" &&
      current.origin === "shelf" &&
      current.phase === "sleeve-ready"
        ? { ...current, phase: "extracting" }
        : current,
    );
  }, []);

  const reinsertSleeveRecord = useCallback(() => {
    setViewer((current) =>
      current?.engine === "persistent" &&
      current.kind === "sleeve" &&
      current.origin === "shelf" &&
      current.phase === "record-ready"
        ? { ...current, phase: "reinserting" }
        : current,
    );
  }, []);

  const handleRecordPlaced = useCallback((index: number) => {
    setHighlightedIndex(index);
    setPlatterIndex(index);
    setViewer(null);
    setAutoReturn(null);
    requestAnimationFrame(() => {
      const platter = [
        desktopPlatterRef.current,
        mobilePlatterRef.current,
      ].find((element) => {
        const rect = element?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
      });
      platter?.querySelector<HTMLButtonElement>("button")?.focus();
    });
  }, []);

  const handleRecordReturned = useCallback((index: number) => {
    setPlatterIndex(null);
    setPowered(false);
    setAutoReturn(null);
    setViewer({
      engine: "persistent",
      index,
      kind: "sleeve",
      origin: "shelf",
      phase: "reinserting-close",
    });
  }, []);

  const handleRecordTransferActiveChange = useCallback(
    (active: boolean) => {
      setRecordTransferActive(active);
      if (active && platterIndex !== null) setPowered(false);
    },
    [platterIndex],
  );

  useEffect(() => {
    if (
      queuedAlbumIndex === null ||
      viewer ||
      platterIndex !== null ||
      recordTransferActive
    ) {
      return;
    }
    const index = queuedAlbumIndex;
    const frame = requestAnimationFrame(() => {
      setQueuedAlbumIndex(null);
      setHighlightedIndex(index);
      setViewer({
        engine: persistentFailed ? "fallback" : "persistent",
        index,
        kind: "sleeve",
        origin: "shelf",
        phase: persistentFailed ? "sleeve-ready" : "opening",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    platterIndex,
    queuedAlbumIndex,
    recordTransferActive,
    persistentFailed,
    viewer,
  ]);

  const handlePersistentReady = useCallback(() => {
    setPersistentReady(true);
    if (!pendingViewer || viewer) return;
    setViewer({
      ...pendingViewer,
      engine: "persistent",
      phase: "opening",
    });
    setPendingViewer(null);
  }, [pendingViewer, viewer]);

  const handlePersistentFailure = useCallback(() => {
    setPersistentFailed(true);
    setPersistentReady(false);
    if (viewer?.engine === "persistent") {
      setViewer({
        index: viewer.index,
        kind: viewer.kind,
        origin: viewer.origin,
        engine: "fallback",
        phase:
          viewer.kind === "sleeve" && viewer.origin === "shelf"
            ? "sleeve-ready"
            : "record-ready",
      });
    } else if (pendingViewer && !viewer) {
      setViewer({
        ...pendingViewer,
        engine: "fallback",
        phase:
          pendingViewer.kind === "sleeve" &&
          pendingViewer.origin === "shelf"
            ? "sleeve-ready"
            : "record-ready",
      });
      setPendingViewer(null);
    }
  }, [pendingViewer, viewer]);

  const keepSpinning = useCallback(() => {
    setViewer(null);
    requestAnimationFrame(() => {
      const platter = [
        desktopPlatterRef.current,
        mobilePlatterRef.current,
      ].find((element) => {
        const rect = element?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
      });
      platter?.querySelector<HTMLButtonElement>("button")?.focus();
    });
  }, []);

  const placeRecord = useCallback(
    async (source: RectSnapshot) => {
      if (!viewer || viewer.kind !== "record" || transitioning) return;
      const nextIndex = viewer.index;
      const nextAlbum = albums[nextIndex];
      if (!nextAlbum) return;

      setViewer(null);
      setTransitioning(true);

      if (platterIndex !== null && platterIndex !== nextIndex) {
        setPowered(false);
        const previousAlbum = albums[platterIndex];
        if (previousAlbum) {
          await beginTransfer(
            previousAlbum,
            "record",
            platterRect(),
            recordRect(platterIndex),
          );
        }
        setPlatterIndex(null);
        setPowered(false);
      }

      const platterTarget = platterRect();
      if (!sameVisualRect(source, platterTarget)) {
        await beginTransfer(
          nextAlbum,
          "record",
          centeredObjectRect(source),
          platterTarget,
        );
      }
      setHighlightedIndex(nextIndex);
      setPlatterIndex(nextIndex);
      setTransitioning(false);
      requestAnimationFrame(() => {
        const platter = [
          desktopPlatterRef.current,
          mobilePlatterRef.current,
        ].find((element) => {
          const rect = element?.getBoundingClientRect();
          return rect && rect.width > 0 && rect.height > 0;
        });
        platter?.querySelector<HTMLButtonElement>("button")?.focus();
      });
    },
    [
      albums,
      beginTransfer,
      platterIndex,
      platterRect,
      recordRect,
      transitioning,
      viewer,
    ],
  );

  const returnObject = useCallback(
    async (source: RectSnapshot) => {
      if (!viewer || transitioning) return;
      const returningViewer = viewer;
      const album = albums[returningViewer.index];
      if (!album) return;

      setViewer(null);
      setTransitioning(true);

      const destination =
        returningViewer.kind === "record"
          ? recordRect(returningViewer.index)
          : sleeveRect(returningViewer.index);
      const returningPlatterRecord =
        returningViewer.kind === "record" &&
        returningViewer.origin === "platter";

      if (returningPlatterRecord) setPowered(false);

      if (!sameVisualRect(source, destination)) {
        await beginTransfer(
          album,
          returningViewer.kind,
          returningViewer.kind === "sleeve"
            ? source
            : centeredObjectRect(source),
          destination,
        );
      }

      if (returningPlatterRecord) {
        setPlatterIndex(null);
        setAutoReturn(null);
      }
      setTransitioning(false);
      requestAnimationFrame(() => {
        const candidates = [
          desktopTargetsRef.current.sleeves[returningViewer.index],
          mobileTargetsRef.current.sleeves[returningViewer.index],
        ];
        const destination = candidates.find((element) => {
          const rect = element?.getBoundingClientRect();
          return rect && rect.width > 0 && rect.height > 0;
        });
        destination?.focus();
      });
    },
    [
      albums,
      beginTransfer,
      recordRect,
      sleeveRect,
      transitioning,
      viewer,
    ],
  );

  if (!highlightedAlbum || albums.length === 0) return null;

  const sharedSceneProps = {
    albums,
    controlsForegrounded: Boolean(foregroundPlacement),
    controlSound,
    highlightedAlbum,
    highlightedIndex,
    inspected: viewer,
    ledIntensity,
    motorActive,
    onLedIntensityChange: handleLedIntensityChange,
    onInspectPlatter: () => {
      if (persistentFailed && platterIndex !== null) {
        openViewer("record", platterIndex, "platter");
      }
    },
    onInspectSleeve: (index: number) => openViewer("sleeve", index, "shelf"),
    onPowerToggle: handlePowerToggle,
    platterAlbum,
    platterIndex,
    persistentReady,
    powered,
    recordTransferActive,
    reduceMotion,
    transfer,
    transitioning,
  };

  const inspectedAlbum = viewer ? albums[viewer.index] : null;
  const persistentInspection: PersistentInspectionState | null =
    viewer?.engine === "persistent"
      ? {
          index: viewer.index,
          kind: viewer.kind,
          origin: viewer.origin,
          phase: viewer.phase,
        }
      : null;
  const persistentTitleId = persistentInspection
    ? `persistent-album-title-${persistentInspection.kind}-${persistentInspection.index}`
    : undefined;
  const persistentDescriptionId = persistentInspection
    ? `persistent-album-description-${persistentInspection.kind}-${persistentInspection.index}`
    : undefined;

  const handlePersistentDialogKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (!persistentInspection) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePersistentViewer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = rootRef.current?.querySelectorAll<HTMLElement>(
      '[data-inspection-control]:not([disabled]), canvas[tabindex="0"]',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      role={persistentInspection ? "dialog" : undefined}
      aria-modal={persistentInspection ? true : undefined}
      aria-labelledby={persistentTitleId}
      aria-describedby={persistentDescriptionId}
      onKeyDown={handlePersistentDialogKeyDown}
      onPointerEnter={() => setShouldLoadPersistent(true)}
      className="relative pt-10 lg:pt-14"
    >
      <div
        aria-hidden={viewer || recordTransferActive ? true : undefined}
        inert={viewer || recordTransferActive ? true : undefined}
      >
        <div className="hidden lg:block">
          <DesktopConsole
            {...sharedSceneProps}
            platterRef={desktopPlatterRef}
            targets={desktopTargetsRef}
            turntableRef={desktopTurntableRef}
          />
        </div>

        <div className="lg:hidden">
          <MobileConsole
            {...sharedSceneProps}
            platterRef={mobilePlatterRef}
            targets={mobileTargetsRef}
            turntableRef={mobileTurntableRef}
          />
        </div>
      </div>

      {shouldLoadPersistent && !persistentFailed ? (
        <PersistentAlbumObjects
          albums={albums}
          autoReturn={autoReturn}
          getObjectRect={objectRect}
          getPlatterRect={platterRect}
          getRootRect={rootRect}
          inspection={persistentInspection}
          onAllReady={handlePersistentReady}
          onExtractRecord={extractSleeveRecord}
          onFailure={handlePersistentFailure}
          onRecordPlaced={handleRecordPlaced}
          onRecordReturned={handleRecordReturned}
          onReinsertRecord={reinsertSleeveRecord}
          onReturnSleeve={closePersistentViewer}
          onTransferActiveChange={handleRecordTransferActiveChange}
          platterIndex={platterIndex}
          powered={motorActive}
          reduceMotion={reduceMotion}
          transitioning={transitioning}
        />
      ) : null}

      {foregroundPlacement && platterAlbum ? (
        <TurntableForeground
          placement={foregroundPlacement}
          ledIntensity={ledIntensity}
          onIntensityChange={handleLedIntensityChange}
          onPowerToggle={handlePowerToggle}
          motorActive={motorActive}
          powered={powered}
          reduceMotion={reduceMotion}
          sound={controlSound}
        />
      ) : null}

      {persistentInspection && inspectedAlbum ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Close ${persistentInspection.kind} inspection`}
            onClick={closePersistentViewer}
            className="absolute inset-x-[-1rem] top-0 bottom-[-1.5rem] z-[70] cursor-default bg-transparent sm:inset-x-[-2rem] lg:inset-x-[-8rem] lg:bottom-0"
          />
          <h3 id={persistentTitleId} className="sr-only">
            {persistentInspection.kind === "record"
              ? "Vinyl"
              : "Sleeve and record"}{" "}
            inspection for {inspectedAlbum.title} by {inspectedAlbum.artist}
          </h3>
          <p id={persistentDescriptionId} className="sr-only">
            {persistentInspection.kind === "sleeve"
              ? "Rotate the sleeve, click it to return both objects to the shelf, or activate the exposed record edge to slide the record out. Once extracted, drag the record toward the turntable or activate the sleeve to put it back. Press Escape to return both objects."
              : "Drag the record back toward its sleeve. Press Escape to cancel."}
          </p>
        </>
      ) : null}

      {viewer?.engine === "fallback" && inspectedAlbum ? (
        <AlbumObjectViewer
          key={`${viewer.kind}-${viewer.origin}-${viewer.index}`}
          album={inspectedAlbum}
          automaticTransfer={
            autoReturn?.index === viewer.index &&
            viewer.kind === "record" &&
            viewer.origin === "platter"
          }
          kind={viewer.kind}
          origin={viewer.origin}
          reduceMotion={reduceMotion}
          getAnchorRect={viewerAnchorRect}
          getPlatterRect={platterRect}
          getShelfRect={viewerShelfRect}
          onKeepSpinning={keepSpinning}
          onPlace={placeRecord}
          onReturn={returnObject}
        />
      ) : null}

      <AnimatePresence>
        {transfer && !persistentReady ? (
          <TransferObject
            key={transfer.id}
            transfer={transfer}
            reduceMotion={reduceMotion}
            onComplete={() => finishTransfer(transfer.id)}
          />
        ) : null}
      </AnimatePresence>

      <p className="sr-only" role="status" aria-live="polite">
        {recordTransferActive
          ? "Moving the record between its sleeve and the turntable."
          : viewer && inspectedAlbum
          ? `Inspecting ${
              viewer.kind === "sleeve" &&
              (viewer.phase === "extracting" ||
                viewer.phase === "record-ready" ||
                viewer.phase === "reinserting" ||
                viewer.phase === "reinserting-close")
                ? "record"
                : viewer.kind
            } for ${inspectedAlbum.title} by ${inspectedAlbum.artist}.`
          : pendingViewer
            ? "Preparing persistent 3D objects."
          : transitioning
            ? "Moving record."
            : platterAlbum
              ? `${platterAlbum.title} by ${platterAlbum.artist} is ${
                  motorActive ? "spinning" : "stopped"
                }.`
              : "The turntable is empty. Choose a record to inspect it."}
      </p>
    </div>
  );
}

interface TurntableForegroundProps {
  ledIntensity: number;
  motorActive: boolean;
  onIntensityChange: (value: number) => void;
  onPowerToggle: () => void;
  placement: TurntableForegroundPlacement;
  powered: boolean;
  reduceMotion: boolean;
  sound: TurntableControlSoundHandlers;
}

function TurntableForeground({
  ledIntensity,
  motorActive,
  onIntensityChange,
  onPowerToggle,
  placement,
  powered,
  reduceMotion,
  sound,
}: TurntableForegroundProps) {
  return (
    <div
      data-turntable-foreground={placement.variant}
      className="pointer-events-none absolute"
      style={{
        height: placement.rect.height,
        left: placement.rect.left,
        top: placement.rect.top,
        width: placement.rect.width,
        zIndex: 26,
      }}
    >
      <Tonearm
        active={motorActive}
        desktop={placement.variant === "desktop"}
        reduceMotion={reduceMotion}
      />
      <TurntableControls
        variant={placement.variant}
        disabled={false}
        ledIntensity={ledIntensity}
        onIntensityChange={onIntensityChange}
        onPowerToggle={onPowerToggle}
        powered={powered}
        reduceMotion={reduceMotion}
        sound={sound}
      />
    </div>
  );
}

interface SharedSceneProps {
  albums: MusicAlbum[];
  controlsForegrounded: boolean;
  controlSound: TurntableControlSoundHandlers;
  highlightedAlbum: MusicAlbum;
  highlightedIndex: number;
  inspected: ViewerState | null;
  ledIntensity: number;
  motorActive: boolean;
  onLedIntensityChange: (value: number) => void;
  onInspectPlatter: () => void;
  onInspectSleeve: (index: number) => void;
  onPowerToggle: () => void;
  platterAlbum: MusicAlbum | null;
  platterIndex: number | null;
  persistentReady: boolean;
  powered: boolean;
  recordTransferActive: boolean;
  reduceMotion: boolean;
  transfer: TransferState | null;
  transitioning: boolean;
}

interface SceneProps extends SharedSceneProps {
  platterRef: RefObject<HTMLDivElement | null>;
  targets: RefObject<SceneTargets>;
  turntableRef: RefObject<HTMLDivElement | null>;
}

function DesktopConsole({
  albums,
  controlsForegrounded,
  controlSound,
  highlightedIndex,
  inspected,
  ledIntensity,
  motorActive,
  onLedIntensityChange,
  onInspectPlatter,
  onInspectSleeve,
  onPowerToggle,
  platterAlbum,
  platterIndex,
  platterRef,
  persistentReady,
  powered,
  recordTransferActive,
  reduceMotion,
  targets,
  transfer,
  transitioning,
  turntableRef,
}: SceneProps) {
  const platterRecordHidden =
    (inspected?.engine === "fallback" &&
      inspected.kind === "record" &&
      inspected.origin === "platter" &&
      inspected.index === platterIndex) ||
    (transfer?.kind === "record" &&
      transfer.album.spotifyUrl === platterAlbum?.spotifyUrl);

  return (
    <div className="relative left-1/2 aspect-[1939/811] w-[109.65%] -translate-x-1/2">
      <div className="absolute inset-x-0 top-0 aspect-[1939/811] [filter:drop-shadow(0_20px_18px_rgba(55,31,16,0.2))] dark:[filter:drop-shadow(0_24px_24px_rgba(0,0,0,0.7))]">
        <div
          ref={turntableRef}
          className="absolute inset-0 origin-top [transform:translateY(2.5%)_scaleY(1.07)]"
        >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-contain bg-center bg-no-repeat dark:brightness-[.82] dark:saturate-[.88] dark:contrast-[1.05]"
          style={{
            backgroundImage:
              "url('/on-rotation/listening-console-integrated-v2.png')",
          }}
        />

        <div className="absolute top-[12%] right-[27.5%] bottom-[44.5%] left-[4.4%] grid grid-cols-4 gap-[1%]">
          {albums.map((album, index) => (
            <AlbumSlot
              key={album.spotifyUrl}
              album={album}
              index={index}
              active={index === highlightedIndex}
              integrated
              recordHidden={
                platterIndex === index ||
                (inspected?.engine === "fallback" &&
                  inspected.kind === "record" &&
                  inspected.index === index) ||
                (transfer?.kind === "record" &&
                  transfer.album.spotifyUrl === album.spotifyUrl)
              }
              sleeveHidden={
                (inspected?.engine === "fallback" &&
                  inspected.index === index &&
                  (inspected.kind === "sleeve" ||
                    inspected.origin === "platter")) ||
                (transfer?.kind === "sleeve" &&
                  transfer.album.spotifyUrl === album.spotifyUrl)
              }
              transitioning={transitioning || recordTransferActive}
              persistentReady={persistentReady}
              recordRef={(element) => {
                targets.current.records[index] = element;
              }}
              recordVisualRef={(element) => {
                targets.current.recordVisuals[index] = element;
              }}
              sleeveRef={(element) => {
                targets.current.sleeves[index] = element;
              }}
              onInspectSleeve={onInspectSleeve}
            />
          ))}
        </div>

        <Image
          src="/on-rotation/listening-console-foreground-v2.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 1100px, 100vw"
          aria-hidden="true"
          className="pointer-events-none z-30 object-contain dark:brightness-[.82] dark:saturate-[.88] dark:contrast-[1.05]"
        />

        <div
          ref={platterRef}
          className="absolute top-[19%] left-[74.6%] z-10 aspect-square w-[17.18%] [transform:scaleY(0.62)]"
        >
          <PlatterRecord
            album={platterAlbum}
            hidden={platterRecordHidden}
            onInspect={onInspectPlatter}
            powered={motorActive}
            reduceMotion={reduceMotion}
            persistentReady={persistentReady}
          />
        </div>

        {!controlsForegrounded ? (
          <>
            <Tonearm
              active={
                Boolean(platterAlbum) &&
                !platterRecordHidden &&
                motorActive &&
                !recordTransferActive
              }
              reduceMotion={reduceMotion}
              desktop
            />

            <TurntableControls
              variant="desktop"
              disabled={transitioning || recordTransferActive}
              ledIntensity={ledIntensity}
              onIntensityChange={onLedIntensityChange}
              onPowerToggle={onPowerToggle}
              powered={powered}
              reduceMotion={reduceMotion}
              sound={controlSound}
            />
          </>
        ) : null}

          <div className="absolute top-[61%] right-[4.4%] left-[4.4%] z-40 h-[11%]">
            <ControlPanel
              activeAlbum={platterAlbum}
              embedded
              reduceMotion={reduceMotion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileConsole(props: SceneProps) {
  return (
    <div className="space-y-3">
      <div className="relative aspect-[2/1] w-full [filter:drop-shadow(0_14px_13px_rgba(55,31,16,0.2))] dark:[filter:drop-shadow(0_16px_18px_rgba(0,0,0,0.68))]">
        <RecordCabinet {...props} />
      </div>

      <div className="relative mx-auto aspect-square w-[82%] max-w-[20rem] [filter:drop-shadow(0_16px_16px_rgba(55,31,16,0.2))] dark:[filter:drop-shadow(0_18px_20px_rgba(0,0,0,0.68))]">
        <Turntable
          album={props.platterAlbum}
          controlsForegrounded={props.controlsForegrounded}
          controlsDisabled={
            props.transitioning || props.recordTransferActive
          }
          controlSound={props.controlSound}
          hidden={
            (props.inspected?.engine === "fallback" &&
              props.inspected.kind === "record" &&
              props.inspected.origin === "platter" &&
              props.inspected.index === props.platterIndex) ||
            (props.transfer?.kind === "record" &&
              props.transfer.album.spotifyUrl ===
                props.platterAlbum?.spotifyUrl)
          }
          ledIntensity={props.ledIntensity}
          motorActive={props.motorActive}
          onIntensityChange={props.onLedIntensityChange}
          onInspect={props.onInspectPlatter}
          onPowerToggle={props.onPowerToggle}
          platterRef={props.platterRef}
          persistentReady={props.persistentReady}
          powered={props.powered}
          recordTransferActive={props.recordTransferActive}
          reduceMotion={props.reduceMotion}
          turntableRef={props.turntableRef}
        />
      </div>

      <div
        className="rounded-[11px] p-2"
        style={{
          backgroundImage: "url('/on-rotation/walnut-texture.webp')",
          backgroundSize: "420px auto",
        }}
      >
        <ControlPanel
          activeAlbum={props.platterAlbum}
          reduceMotion={props.reduceMotion}
        />
      </div>
    </div>
  );
}

function RecordCabinet({
  albums,
  highlightedIndex,
  inspected,
  onInspectSleeve,
  platterIndex,
  persistentReady,
  recordTransferActive,
  targets,
  transfer,
  transitioning,
}: SceneProps) {
  return (
    <div className="relative size-full">
      <Image
        src="/on-rotation/record-cabinet-perspective.png"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none z-0 object-contain dark:brightness-[.76] dark:saturate-[.82] dark:contrast-[1.06]"
      />

      <div className="absolute top-[19%] right-[7%] bottom-[42%] left-[7.5%] grid grid-cols-4 gap-[2.5%]">
        {albums.map((album, index) => (
          <AlbumSlot
            key={album.spotifyUrl}
            album={album}
            index={index}
            active={index === highlightedIndex}
            recordHidden={
              platterIndex === index ||
              (inspected?.engine === "fallback" &&
                inspected.kind === "record" &&
                inspected.index === index) ||
              (transfer?.kind === "record" &&
                transfer.album.spotifyUrl === album.spotifyUrl)
            }
            sleeveHidden={
              (inspected?.engine === "fallback" &&
                inspected.index === index &&
                (inspected.kind === "sleeve" ||
                  inspected.origin === "platter")) ||
              (transfer?.kind === "sleeve" &&
                transfer.album.spotifyUrl === album.spotifyUrl)
            }
            transitioning={transitioning || recordTransferActive}
            persistentReady={persistentReady}
            recordRef={(element) => {
              targets.current.records[index] = element;
            }}
            recordVisualRef={(element) => {
              targets.current.recordVisuals[index] = element;
            }}
            sleeveRef={(element) => {
              targets.current.sleeves[index] = element;
            }}
            onInspectSleeve={onInspectSleeve}
          />
        ))}
      </div>

      <Image
        src="/on-rotation/record-cabinet-foreground.png"
        alt=""
        fill
        sizes="100vw"
        aria-hidden="true"
        className="pointer-events-none z-30 object-contain dark:brightness-[.76] dark:saturate-[.82] dark:contrast-[1.06]"
      />
    </div>
  );
}

interface TurntableProps {
  album: MusicAlbum | null;
  controlsForegrounded: boolean;
  controlsDisabled: boolean;
  controlSound: TurntableControlSoundHandlers;
  hidden: boolean;
  ledIntensity: number;
  motorActive: boolean;
  onIntensityChange: (value: number) => void;
  onInspect: () => void;
  onPowerToggle: () => void;
  platterRef: RefObject<HTMLDivElement | null>;
  persistentReady: boolean;
  powered: boolean;
  recordTransferActive: boolean;
  reduceMotion: boolean;
  turntableRef: RefObject<HTMLDivElement | null>;
}

function Turntable({
  album,
  controlsForegrounded,
  controlsDisabled,
  controlSound,
  hidden,
  ledIntensity,
  motorActive,
  onIntensityChange,
  onInspect,
  onPowerToggle,
  platterRef,
  persistentReady,
  powered,
  recordTransferActive,
  reduceMotion,
  turntableRef,
}: TurntableProps) {
  return (
    <div ref={turntableRef} className="relative size-full">
      <Image
        src="/on-rotation/turntable-perspective.png"
        alt=""
        fill
        sizes="82vw"
        unoptimized
        className="pointer-events-none z-0 object-contain dark:brightness-[.76] dark:saturate-[.82] dark:contrast-[1.06]"
      />

      <div
        ref={platterRef}
        className="absolute top-[17%] left-[17%] z-10 size-[49%] [transform:scaleY(0.6)]"
      >
        <PlatterRecord
          album={album}
          hidden={hidden}
          onInspect={onInspect}
          persistentReady={persistentReady}
          powered={motorActive}
          reduceMotion={reduceMotion}
        />
      </div>

      {!controlsForegrounded ? (
        <>
          <Tonearm
            active={
              Boolean(album) &&
              !hidden &&
              motorActive &&
              !recordTransferActive
            }
            reduceMotion={reduceMotion}
            desktop={false}
          />

          <TurntableControls
            variant="mobile"
            disabled={controlsDisabled}
            ledIntensity={ledIntensity}
            onIntensityChange={onIntensityChange}
            onPowerToggle={onPowerToggle}
            powered={powered}
            reduceMotion={reduceMotion}
            sound={controlSound}
          />
        </>
      ) : null}
    </div>
  );
}

interface TonearmProps {
  active: boolean;
  desktop: boolean;
  reduceMotion: boolean;
}

function Tonearm({ active, desktop, reduceMotion }: TonearmProps) {
  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{ rotate: active ? 0 : TONEARM_REST_ROTATION }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 180, damping: 22 }
      }
      className={
        desktop
          ? "pointer-events-none absolute top-[10%] left-[69.5%] z-35 aspect-square w-[27%] origin-[83%_31%]"
          : "pointer-events-none absolute inset-0 z-30 origin-[83%_31%]"
      }
    >
      <Image
        src="/on-rotation/turntable-tonearm-perspective.png"
        alt=""
        fill
        sizes={desktop ? "320px" : "82vw"}
        className="object-contain dark:brightness-[.84] dark:saturate-[.88]"
      />
    </motion.div>
  );
}

interface PlatterRecordProps {
  album: MusicAlbum | null;
  hidden: boolean;
  onInspect: () => void;
  persistentReady: boolean;
  powered: boolean;
  reduceMotion: boolean;
}

function PlatterRecord({
  album,
  hidden,
  onInspect,
  persistentReady,
  powered,
  reduceMotion,
}: PlatterRecordProps) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {album && !hidden ? (
        <motion.button
          key={album.spotifyUrl}
          type="button"
          onClick={onInspect}
          aria-label={`Inspect or eject ${album.title} by ${album.artist}`}
          initial={
            reduceMotion ? false : { opacity: 0, scale: 0.82, rotate: -14 }
          }
          animate={{ opacity: 1, scale: 1 }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.9, rotate: 10 }
          }
          transition={reduceMotion ? { duration: 0 } : RECORD_TRANSITION}
          className="absolute inset-[0.5%] z-20 cursor-zoom-in rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/70"
        >
          <span
            data-powered={powered}
            className={`relative block size-full transition-opacity duration-100 ${
              reduceMotion ? "" : "t-turntable-record-spin"
            } ${persistentReady ? "opacity-0" : "opacity-100"}`}
          >
            <RecordFace
              album={album}
              sizes="240px"
              className="size-full drop-shadow-[0_4px_7px_rgba(0,0,0,0.32)]"
            />
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

interface ControlPanelProps {
  activeAlbum: MusicAlbum | null;
  embedded?: boolean;
  reduceMotion: boolean;
}

function ControlPanel({
  activeAlbum,
  embedded = false,
  reduceMotion,
}: ControlPanelProps) {
  const panelClassName = embedded
    ? "border-transparent bg-transparent text-[#2d2924] shadow-none dark:text-[#2d2924]"
    : "border-[#4b392c]/35 bg-[#f0e8dc] text-[#2d2924] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] [background-blend-mode:multiply] dark:border-[#171310]/70 dark:bg-[#504b43] dark:text-[#f0e7d8]";

  return (
    <div
      className={`grid size-full items-center overflow-hidden rounded-[5px] border sm:grid-cols-[1.15fr_.85fr_.9fr] ${
        embedded ? "min-h-0" : "min-h-[64px]"
      } ${panelClassName}`}
      style={
        embedded
          ? undefined
          : {
              backgroundImage: "url('/on-rotation/brushed-metal.webp')",
              backgroundSize: "auto 100%",
            }
      }
    >
      <CrtMetadataDisplay
        activeAlbum={activeAlbum}
        embedded={embedded}
        reduceMotion={reduceMotion}
      />

      <div
        className={`flex min-h-11 h-full items-center justify-center border-y border-[#746656]/25 px-5 text-center font-medium tracking-wide text-[#766b5e] uppercase sm:border-x sm:border-y-0 dark:border-[#d6c8b6]/12 ${
          embedded
            ? "text-[9px] dark:text-[#6d645a]"
            : "text-[10px] dark:text-[#bdb2a2]"
        }`}
        aria-hidden="true"
      />

      {activeAlbum ? (
        <a
          href={activeAlbum.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${activeAlbum.title} in Spotify`}
          className={`inline-flex size-9 shrink-0 items-center justify-center justify-self-end rounded-sm transition-opacity hover:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d2924] dark:focus-visible:outline-[#f0e7d8] ${
            embedded ? "mr-1" : "mr-2 sm:mr-10"
          }`}
        >
          <SpotifyLogo className={embedded ? "size-4" : "size-5"} />
        </a>
      ) : (
        <span
          aria-hidden="true"
          className={`inline-flex size-9 shrink-0 items-center justify-center justify-self-end rounded-sm opacity-30 ${
            embedded ? "mr-1" : "mr-2 sm:mr-10"
          }`}
        >
          <SpotifyLogo className={embedded ? "size-4" : "size-5"} />
        </span>
      )}
    </div>
  );
}

interface CrtMetadataDisplayProps {
  activeAlbum: MusicAlbum | null;
  embedded: boolean;
  reduceMotion: boolean;
}

function CrtMetadataDisplay({
  activeAlbum,
  embedded,
  reduceMotion,
}: CrtMetadataDisplayProps) {
  const displayKey = activeAlbum?.spotifyUrl ?? "empty";

  return (
    <div
      data-crt-display
      className={`relative min-w-0 items-center ${
        embedded
          ? "flex h-full justify-start px-[1.2%] py-[3px]"
          : "flex min-h-[64px] justify-center px-2 py-2 sm:h-full sm:min-h-0 sm:px-2.5 sm:py-1.5"
      }`}
    >
      <div
        style={
          embedded
            ? {
                transform:
                  "perspective(900px) rotateY(3deg) skewX(1.1deg)",
                transformOrigin: "left center",
              }
            : undefined
        }
        className={`relative aspect-[1498/211] overflow-hidden bg-[#160e08] shadow-[0_1px_2px_rgba(0,0,0,0.28)] ${
          embedded
            ? "h-full max-h-full w-auto max-w-full rounded-[5px]"
            : "w-full max-w-full rounded-[7px]"
        }`}
      >
        <motion.div
          aria-hidden="true"
          animate={
            reduceMotion
              ? { opacity: 1 }
              : {
                  opacity: [1, 0.975, 1, 0.985, 1],
                  filter: [
                    "brightness(1)",
                    "brightness(0.94)",
                    "brightness(1.025)",
                    "brightness(0.98)",
                    "brightness(1)",
                  ],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: 4.8,
                  ease: "linear",
                  repeat: Infinity,
                  times: [0, 0.55, 0.57, 0.84, 1],
                }
          }
          className="absolute inset-0 z-0"
        >
          <Image
            src="/on-rotation/crt-amber-display.png"
            alt=""
            fill
            sizes={
              embedded
                ? "(min-width: 1024px) 420px, 100vw"
                : "(max-width: 639px) 100vw, 420px"
            }
            className="pointer-events-none select-none object-fill"
          />
        </motion.div>

        <motion.div
          aria-hidden="true"
          animate={
            reduceMotion
              ? { opacity: 0 }
              : {
                  opacity: [0.025, 0.08, 0.035, 0.065, 0.025],
                  x: [0, -1, 1, 0, 0],
                  y: [0, 0.5, -0.5, 1, 0],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: 2.9,
                  ease: "linear",
                  repeat: Infinity,
                }
          }
          className="absolute inset-x-[2%] inset-y-[11%] z-30 overflow-hidden rounded-[3px] mix-blend-screen"
        >
          <Image
            src="/on-rotation/crt-amber-display.png"
            alt=""
            fill
            sizes={
              embedded
                ? "(min-width: 1024px) 420px, 100vw"
                : "(max-width: 639px) 100vw, 420px"
            }
            className="pointer-events-none scale-[1.03] select-none object-fill brightness-125 contrast-125"
          />
        </motion.div>

        <AnimatePresence initial={false}>
          {!reduceMotion ? (
            <motion.div
              key={`crt-signal-${displayKey}`}
              aria-hidden="true"
              initial={{
                clipPath: "inset(0% 0% 0% 0%)",
                opacity: 0,
              }}
              animate={{
                clipPath: [
                  "inset(0% 0% 0% 0%)",
                  "inset(0% 0% 0% 0%)",
                  "inset(0% 0% 0% 0%)",
                  "inset(43% 0% 43% 0%)",
                  "inset(48.5% 0% 48.5% 0%)",
                  "inset(49.5% 0% 49.5% 0%)",
                ],
                opacity: [0, 0.94, 0.78, 0.9, 0.46, 0],
              }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{
                clipPath: {
                  duration: 0.52,
                  ease: [0.4, 0, 0.2, 1],
                  times: [0, 0.12, 0.52, 0.72, 0.9, 1],
                },
                opacity: {
                  duration: 0.52,
                  ease: "linear",
                  times: [0, 0.08, 0.48, 0.7, 0.9, 1],
                },
              }}
              className="pointer-events-none absolute inset-x-[2%] inset-y-[11%] z-20 overflow-hidden rounded-[3px] bg-[#3a1c08] mix-blend-screen"
            >
              <span className="t-crt-noise block size-full" />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className={`absolute inset-x-[6%] inset-y-[14%] z-10 flex min-w-0 items-center overflow-hidden font-mono text-[#ffc16a] ${
            embedded ? "lg:inset-x-[7%]" : ""
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={displayKey}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      filter: "blur(2px)",
                      x: -4,
                      scaleY: 0.76,
                    }
              }
              animate={{
                opacity: activeAlbum ? 1 : 0.55,
                filter: "blur(0px)",
                x: 0,
                scaleY: 1,
              }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      filter: "blur(2.5px)",
                      x: 4,
                      scaleY: 0.72,
                      transition: {
                        duration: 0.08,
                        ease: "easeOut",
                      },
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      delay: 0.3,
                      duration: 0.14,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className="min-w-0 origin-center"
            >
              {activeAlbum ? (
                <>
                  <span
                    className={`block truncate font-semibold leading-none tracking-[-0.02em] drop-shadow-[0_0_5px_rgba(255,157,55,0.82)] ${
                      embedded ? "text-[10px]" : "text-[13px]"
                    }`}
                  >
                    {activeAlbum.title}
                  </span>
                  <span
                    className={`mt-1 block truncate leading-none tracking-[0.03em] text-[#d99041] drop-shadow-[0_0_4px_rgba(255,145,45,0.56)] ${
                      embedded ? "text-[8px]" : "text-[10px]"
                    }`}
                  >
                    {activeAlbum.artist}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`block truncate font-semibold leading-none tracking-[0.08em] drop-shadow-[0_0_5px_rgba(255,157,55,0.55)] ${
                      embedded ? "text-[10px]" : "text-[13px]"
                    }`}
                  >
                    NO DISC
                  </span>
                  <span
                    className={`mt-1 block truncate leading-none tracking-[0.06em] text-[#d99041] drop-shadow-[0_0_4px_rgba(255,145,45,0.4)] ${
                      embedded ? "text-[8px]" : "text-[10px]"
                    }`}
                  >
                    SELECT A RECORD
                  </span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** Spotify glyph sourced from SVGL, rendered inline so it inherits the panel color. */
function SpotifyLogo({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 256 256"
      className={className}
      fill="currentColor"
    >
      <path d="M128 0C57.308 0 0 57.309 0 128c0 70.696 57.309 128 128 128 70.697 0 128-57.304 128-128C256 57.314 198.697.007 127.998.007l.001-.006Zm58.699 184.614c-2.293 3.76-7.215 4.952-10.975 2.644-30.053-18.357-67.885-22.515-112.44-12.335a7.981 7.981 0 0 1-9.552-6.007 7.968 7.968 0 0 1 6-9.553c48.76-11.14 90.583-6.344 124.323 14.276 3.76 2.308 4.952 7.215 2.644 10.975Zm15.667-34.853c-2.89 4.695-9.034 6.178-13.726 3.289-34.406-21.148-86.853-27.273-127.548-14.92-5.278 1.594-10.852-1.38-12.454-6.649-1.59-5.278 1.386-10.842 6.655-12.446 46.485-14.106 104.275-7.273 143.787 17.007 4.692 2.89 6.175 9.034 3.286 13.72v-.001Zm1.345-36.293C162.457 88.964 94.394 86.71 55.007 98.666c-6.325 1.918-13.014-1.653-14.93-7.978-1.917-6.328 1.65-13.012 7.98-14.935C93.27 62.027 168.434 64.68 215.929 92.876c5.702 3.376 7.566 10.724 4.188 16.405-3.362 5.69-10.73 7.565-16.4 4.187h-.006Z" />
    </svg>
  );
}

interface AlbumSlotProps {
  active: boolean;
  album: MusicAlbum;
  index: number;
  integrated?: boolean;
  onInspectSleeve: (index: number) => void;
  persistentReady: boolean;
  recordHidden: boolean;
  recordRef: (element: HTMLElement | null) => void;
  recordVisualRef: (element: HTMLElement | null) => void;
  sleeveHidden: boolean;
  sleeveRef: (element: HTMLButtonElement | null) => void;
  transitioning: boolean;
}

/** Subtle per-slot size offsets so shelf sleeve tops don't share one flat line. */
const SLEEVE_SHELF_SCALE = [0.97, 0.93, 1, 0.95] as const;

function AlbumSlot({
  active,
  album,
  index,
  integrated = false,
  onInspectSleeve,
  persistentReady,
  recordHidden,
  recordRef,
  recordVisualRef,
  sleeveHidden,
  sleeveRef,
  transitioning,
}: AlbumSlotProps) {
  const shelfScale =
    SLEEVE_SHELF_SCALE[index % SLEEVE_SHELF_SCALE.length] ?? 1;
  const baseWidth = integrated ? 96 : 88;

  return (
    <div
      className="group/album relative flex h-full translate-y-[7px] items-end justify-start overflow-visible"
      style={{ "--album-accent": album.accent } as CSSProperties}
      onPointerEnter={preloadAlbumViewer}
    >
      <button
        ref={sleeveRef}
        type="button"
        onClick={() => onInspectSleeve(index)}
        onFocus={preloadAlbumViewer}
        disabled={sleeveHidden || transitioning}
        aria-label={`Inspect the sleeve and record for ${album.title} by ${album.artist} in 3D`}
        style={{ width: `${baseWidth * shelfScale}%` }}
        className={`group relative z-20 aspect-square overflow-visible rounded-[2px] text-left outline-none transition-[transform,translate,opacity] duration-[520ms] ease-[cubic-bezier(0.16,1,0.3,1)] [transform:perspective(700px)_rotateX(-2deg)] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[var(--album-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3a2216] ${
          sleeveHidden
            ? "pointer-events-none opacity-0"
            : active
              ? "-translate-y-1"
              : "cursor-zoom-in hover:-translate-y-1 focus-visible:-translate-y-1"
        }`}
      >
        <span
          ref={recordRef}
          aria-hidden="true"
          className={`absolute top-[3%] right-[3%] z-0 block size-[94%] overflow-hidden rounded-full transition-opacity duration-100 ${
            recordHidden ? "opacity-0" : "opacity-100"
          }`}
        >
          <span ref={recordVisualRef} className="relative block size-full">
            <span
              className={`relative block size-full transition-opacity duration-100 ${
                persistentReady ? "opacity-0" : "opacity-100"
              }`}
            >
              <RecordFace
                album={album}
                className="size-full drop-shadow-[0_5px_8px_rgba(0,0,0,0.34)]"
              />
            </span>
          </span>
        </span>

        <span
          className={`absolute inset-0 z-10 overflow-hidden rounded-[2px] transition-[background-color,box-shadow] duration-100 ${
            persistentReady
              ? "bg-transparent shadow-none"
              : active
                ? "bg-[#201811] shadow-[0_13px_22px_-10px_rgba(0,0,0,0.82)]"
                : "bg-[#201811] shadow-[0_9px_15px_-8px_rgba(0,0,0,0.72)]"
          }`}
        >
          <span
            className={`absolute inset-0 transition-opacity duration-100 ${
              persistentReady ? "opacity-0" : "opacity-100"
            }`}
          >
            <Image
              src={album.cover}
              alt={`${album.title} album cover`}
              fill
              sizes="(min-width: 1024px) 180px, 90px"
              className="object-contain"
            />
          </span>
        </span>
        <span className="sr-only">
          {album.title} by {album.artist}, with its record inside
        </span>
      </button>
    </div>
  );
}

interface TransferObjectProps {
  onComplete: () => void;
  reduceMotion: boolean;
  transfer: TransferState;
}

function TransferObject({
  onComplete,
  reduceMotion,
  transfer,
}: TransferObjectProps) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{
        height: transfer.from.height,
        left: transfer.from.left,
        opacity: 1,
        rotate: transfer.kind === "record" ? -8 : -3,
        top: transfer.from.top,
        width: transfer.from.width,
      }}
      animate={{
        height: transfer.to.height,
        left: transfer.to.left,
        opacity: 1,
        rotate: transfer.kind === "record" ? 176 : 0,
        top: transfer.to.top,
        width: transfer.to.width,
      }}
      exit={{ opacity: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.52, ease: [0.22, 1, 0.36, 1] }
      }
      onAnimationComplete={onComplete}
      className="pointer-events-none fixed z-[100]"
    >
      {transfer.kind === "record" ? (
        <RecordFace
          album={transfer.album}
          sizes="360px"
          className="size-full drop-shadow-[0_16px_18px_rgba(0,0,0,0.34)]"
        />
      ) : (
        <span className="relative block size-full overflow-visible">
          <motion.span
            initial={{ right: "-12%" }}
            animate={{ right: "3%" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.52, ease: [0.22, 1, 0.36, 1] }
            }
            className="absolute top-[3%] z-0 block size-[94%] overflow-hidden rounded-full"
          >
            <RecordFace
              album={transfer.album}
              sizes="340px"
              className="size-full"
            />
          </motion.span>
          <span className="absolute inset-0 z-10 overflow-hidden rounded-[2px] bg-[#211a15] shadow-[0_16px_24px_rgba(0,0,0,0.38)]">
            <Image
              src={transfer.album.cover}
              alt=""
              fill
              sizes="360px"
              className="object-contain"
            />
          </span>
        </span>
      )}
    </motion.div>
  );
}
