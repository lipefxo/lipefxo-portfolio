"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { MusicAlbum } from "@/config/site";
import { RecordFace } from "./RecordFace";

export type InspectionKind = "record" | "sleeve";
export type InspectionOrigin = "shelf" | "platter";
export type InspectionPhase =
  | "closing"
  | "extracting"
  | "opening"
  | "record-ready"
  | "reinserting"
  | "reinserting-close"
  | "sleeve-ready";

export interface RectSnapshot {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface PersistentInspectionState {
  index: number;
  kind: InspectionKind;
  origin: InspectionOrigin;
  phase: InspectionPhase;
}

type PersistentObjectMode =
  | "docked"
  | "inspection"
  | "platter"
  | "transfer";

export interface RecordTransferCommand {
  id: number;
  index: number;
}

type RecordTransferDirection = "to-platter" | "to-sleeve";
type RecordTransferPhase = "dragging" | "settling";

interface PersistentAlbumObjectsProps {
  albums: MusicAlbum[];
  autoReturn: RecordTransferCommand | null;
  getObjectRect: (
    kind: InspectionKind,
    index: number,
  ) => RectSnapshot | null;
  getPlatterRect: () => RectSnapshot | null;
  getRootRect: () => RectSnapshot | null;
  inspection: PersistentInspectionState | null;
  onAllReady: () => void;
  onExtractRecord: () => void;
  onFailure: () => void;
  onRecordPlaced: (index: number) => void;
  onRecordReturned: (index: number) => void;
  onReinsertRecord: () => void;
  onReturnSleeve: () => void;
  onTransferActiveChange: (active: boolean) => void;
  platterIndex: number | null;
  powered: boolean;
  reduceMotion: boolean;
  transitioning: boolean;
}

interface AlbumObjectViewerProps {
  album: MusicAlbum;
  automaticTransfer?: boolean;
  getAnchorRect: () => RectSnapshot | null;
  getPlatterRect: () => RectSnapshot | null;
  getShelfRect: () => RectSnapshot | null;
  kind: InspectionKind;
  origin: InspectionOrigin;
  reduceMotion: boolean;
  onKeepSpinning: () => void;
  onPlace: (source: RectSnapshot) => void;
  onReturn: (source: RectSnapshot) => void;
}

type CloseAction = "keep" | "return";

const CLOSE_DURATION_MS = 150;
const INSPECTION_CLOSE_MS = 280;
const RECORD_EXTRACT_MS = 360;
const INSPECTION_OPEN_MS = 320;
const RECORD_REINSERT_MS = 300;
const MAX_STAGE_SIZE = 420;
const MIN_STAGE_SIZE = 180;
const RECORD_DIAMETER_RATIO = 0.94;
const RECORD_EXTRACT_GAP_RATIO = 0.06;
const RECORD_PROTRUSION_RATIO = 0.12;
const RECORD_CENTER_OFFSET_RATIO =
  0.5 + RECORD_PROTRUSION_RATIO - RECORD_DIAMETER_RATIO / 2;
const SOURCE_OVERLAP_RATIO = 0.12;
const SLEEVE_MODEL_WIDTH = 3.4;
const STAGE_SCALE = 1.5;
const VIEWPORT_MARGIN = 16;

interface ViewerGeometry {
  left: number;
  stageSize: number;
  targetSize: number;
  top: number;
  visualRect: RectSnapshot;
}

interface PersistentPlacement extends ViewerGeometry {
  mode: PersistentObjectMode;
  transitionMs: number;
}

interface LinkedPose {
  offsetX: number;
  offsetY: number;
  scale: number;
  x: number;
  y: number;
}

interface RecordTransferState {
  direction: RecordTransferDirection;
  index: number;
  phase: RecordTransferPhase;
}

interface RecordTransferGeometry {
  controlX: number;
  controlY: number;
  endRecord: RectSnapshot;
  endSleeve: RectSnapshot;
  root: RectSnapshot;
  startRecord: RectSnapshot;
  startSleeve: RectSnapshot;
}

interface RecordTransferRuntime {
  active: boolean;
  index: number;
  inspectionX: number;
  inspectionY: number;
  progress: number;
  recordSize: number;
}

interface TransferPointerCandidate {
  active: boolean;
  currentX: number;
  currentY: number;
  direction: RecordTransferDirection;
  geometry: RecordTransferGeometry;
  index: number;
  pointerId: number;
  startProgress: number;
  startX: number;
  startY: number;
}

function inspectionEase(progress: number) {
  if (progress <= 0 || progress >= 1) return progress;
  let parameter = progress;
  for (let index = 0; index < 5; index += 1) {
    const inverse = 1 - parameter;
    const x =
      3 * inverse * inverse * parameter * 0.22 +
      3 * inverse * parameter * parameter * 0.36 +
      parameter * parameter * parameter;
    const slope =
      3 * inverse * inverse * 0.22 +
      6 * inverse * parameter * (0.36 - 0.22) +
      3 * parameter * parameter * (1 - 0.36);
    if (Math.abs(slope) < 0.0001) break;
    parameter = clamp(parameter - (x - progress) / slope, 0, 1);
  }
  const inverse = 1 - parameter;
  return (
    3 * inverse * inverse * parameter +
    3 * inverse * parameter * parameter +
    parameter * parameter * parameter
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sameGeometry(
  current: ViewerGeometry | null,
  next: ViewerGeometry,
) {
  if (!current) return false;
  return (
    Math.abs(current.left - next.left) < 0.5 &&
    Math.abs(current.top - next.top) < 0.5 &&
    Math.abs(current.stageSize - next.stageSize) < 0.5 &&
    Math.abs(current.targetSize - next.targetSize) < 0.5
  );
}

function viewerGeometry(
  anchor: RectSnapshot,
  dialog: DOMRect,
): ViewerGeometry {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const targetSize = Math.max(anchor.width, 1);
  const availableWidth = Math.max(viewportWidth - VIEWPORT_MARGIN * 2, 1);
  const availableHeight = Math.max(viewportHeight - VIEWPORT_MARGIN * 2, 1);
  const stageSize = Math.min(
    Math.max(targetSize * STAGE_SCALE, MIN_STAGE_SIZE),
    MAX_STAGE_SIZE,
    availableWidth,
    availableHeight,
  );

  const maxVisualLeft = Math.max(
    VIEWPORT_MARGIN,
    viewportWidth - VIEWPORT_MARGIN - targetSize,
  );
  const maxVisualTop = Math.max(
    VIEWPORT_MARGIN,
    viewportHeight - VIEWPORT_MARGIN - targetSize,
  );
  const visualLeft = clamp(
    anchor.left + anchor.width / 2 - targetSize / 2,
    VIEWPORT_MARGIN,
    maxVisualLeft,
  );
  const visualTop = clamp(
    anchor.top - targetSize * (1 - SOURCE_OVERLAP_RATIO),
    VIEWPORT_MARGIN,
    maxVisualTop,
  );
  const visualCenterX = visualLeft + targetSize / 2;
  const visualCenterY = visualTop + targetSize / 2;

  return {
    left: visualCenterX - dialog.left - stageSize / 2,
    stageSize,
    targetSize,
    top: visualCenterY - dialog.top - stageSize / 2,
    visualRect: {
      height: targetSize,
      left: visualLeft,
      top: visualTop,
      width: targetSize,
    },
  };
}

function sleeveViewerGeometry(
  anchor: RectSnapshot,
  dialog: DOMRect,
  extracted: boolean,
): ViewerGeometry {
  const pair = coupledInspectionRects(anchor, null, extracted);
  const sleeve = pair.sleeve;
  const targetSize = sleeve.width;
  const stageSize = stageSizeFor(targetSize);
  const centerX = sleeve.left + targetSize / 2;
  const centerY = sleeve.top + targetSize / 2;
  return {
    left: centerX - dialog.left - stageSize / 2,
    stageSize,
    targetSize,
    top: centerY - dialog.top - stageSize / 2,
    visualRect: sleeve,
  };
}

function stageSizeFor(targetSize: number) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  return Math.min(
    Math.max(targetSize * STAGE_SCALE, MIN_STAGE_SIZE),
    MAX_STAGE_SIZE,
    Math.max(viewportWidth - VIEWPORT_MARGIN * 2, 1),
    Math.max(viewportHeight - VIEWPORT_MARGIN * 2, 1),
  );
}

function persistentPlacement(
  visualRect: RectSnapshot,
  rootRect: RectSnapshot,
  mode: PersistentObjectMode,
  transitionMs: number,
): PersistentPlacement {
  const targetSize = Math.max(visualRect.width, 1);
  const stageSize = stageSizeFor(targetSize);
  const centerX = visualRect.left + visualRect.width / 2;
  const centerY = visualRect.top + visualRect.height / 2;
  return {
    left: centerX - rootRect.left - stageSize / 2,
    mode,
    stageSize,
    targetSize,
    top: centerY - rootRect.top - stageSize / 2,
    transitionMs,
    visualRect: {
      height: targetSize,
      left: centerX - targetSize / 2,
      top: centerY - targetSize / 2,
      width: targetSize,
    },
  };
}

function inspectionVisualRect(anchor: RectSnapshot): RectSnapshot {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const targetSize = Math.max(anchor.width, 1);
  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    viewportWidth - VIEWPORT_MARGIN - targetSize,
  );
  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    viewportHeight - VIEWPORT_MARGIN - targetSize,
  );
  return {
    height: targetSize,
    left: clamp(
      anchor.left + anchor.width / 2 - targetSize / 2,
      VIEWPORT_MARGIN,
      maxLeft,
    ),
    top: clamp(
      anchor.top - targetSize * (1 - SOURCE_OVERLAP_RATIO),
      VIEWPORT_MARGIN,
      maxTop,
    ),
    width: targetSize,
  };
}

function coupledInspectionRects(
  sleeveAnchor: RectSnapshot,
  recordAnchor: RectSnapshot | null,
  extracted: boolean,
) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const sleeveSize = Math.max(sleeveAnchor.width, 1);
  const recordSize = Math.min(
    Math.max(recordAnchor?.width ?? sleeveSize * RECORD_DIAMETER_RATIO, 1),
    sleeveSize * RECORD_DIAMETER_RATIO,
  );
  const proposedSleeveLeft =
    sleeveAnchor.left + sleeveAnchor.width / 2 - sleeveSize / 2;
  const proposedTop =
    sleeveAnchor.top - sleeveSize * (1 - SOURCE_OVERLAP_RATIO);
  const recordOffset = extracted
    ? sleeveSize * (1 + RECORD_EXTRACT_GAP_RATIO)
    : sleeveSize * (1 + RECORD_PROTRUSION_RATIO) - recordSize;
  const groupWidth = Math.max(sleeveSize, recordOffset + recordSize);
  const sleeveLeft = clamp(
    proposedSleeveLeft,
    VIEWPORT_MARGIN,
    Math.max(
      VIEWPORT_MARGIN,
      viewportWidth - VIEWPORT_MARGIN - groupWidth,
    ),
  );
  const sleeveTop = clamp(
    proposedTop,
    VIEWPORT_MARGIN,
    Math.max(
      VIEWPORT_MARGIN,
      viewportHeight - VIEWPORT_MARGIN - sleeveSize,
    ),
  );
  const recordTop = sleeveTop + (sleeveSize - recordSize) / 2;

  return {
    record: {
      height: recordSize,
      left: sleeveLeft + recordOffset,
      top: recordTop,
      width: recordSize,
    },
    sleeve: {
      height: sleeveSize,
      left: sleeveLeft,
      top: sleeveTop,
      width: sleeveSize,
    },
  };
}

function smoothstep(min: number, max: number, value: number) {
  const progress = clamp((value - min) / (max - min), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function lerpRect(
  from: RectSnapshot,
  to: RectSnapshot,
  progress: number,
): RectSnapshot {
  return {
    height: THREE.MathUtils.lerp(from.height, to.height, progress),
    left: THREE.MathUtils.lerp(from.left, to.left, progress),
    top: THREE.MathUtils.lerp(from.top, to.top, progress),
    width: THREE.MathUtils.lerp(from.width, to.width, progress),
  };
}

function platterVisualRect(rect: RectSnapshot): RectSnapshot {
  const size = Math.max(rect.width, 1);
  return {
    height: size,
    left: rect.left + (rect.width - size) / 2,
    top: rect.top + (rect.height - size) / 2,
    width: size,
  };
}

function transferRectsAt(
  geometry: RecordTransferGeometry,
  progress: number,
) {
  const inverse = 1 - progress;
  const poseProgress = smoothstep(0.12, 0.9, progress);
  const startCenterX =
    geometry.startRecord.left + geometry.startRecord.width / 2;
  const startCenterY =
    geometry.startRecord.top + geometry.startRecord.height / 2;
  const endCenterX =
    geometry.endRecord.left + geometry.endRecord.width / 2;
  const endCenterY =
    geometry.endRecord.top + geometry.endRecord.height / 2;
  const centerX =
    inverse * inverse * startCenterX +
    2 * inverse * progress * geometry.controlX +
    progress * progress * endCenterX;
  const centerY =
    inverse * inverse * startCenterY +
    2 * inverse * progress * geometry.controlY +
    progress * progress * endCenterY;
  const recordSize = THREE.MathUtils.lerp(
    geometry.startRecord.width,
    geometry.endRecord.width,
    poseProgress,
  );
  const sleeveProgress = inspectionEase(progress);
  const sleeve = lerpRect(
    geometry.startSleeve,
    geometry.endSleeve,
    sleeveProgress,
  );

  return {
    record: {
      height: recordSize,
      left: centerX - recordSize / 2,
      top: centerY - recordSize / 2,
      width: recordSize,
    },
    sleeve,
  };
}

function samePlacement(
  current: PersistentPlacement | undefined,
  next: PersistentPlacement,
) {
  return (
    Boolean(current) &&
    current?.mode === next.mode &&
    current.transitionMs === next.transitionMs &&
    sameGeometry(current, next)
  );
}

function placementVisualRect(placement: PersistentPlacement) {
  const inset = (placement.stageSize - placement.targetSize) / 2;
  return {
    height: placement.targetSize,
    left: placement.left + inset,
    top: placement.top + inset,
    width: placement.targetSize,
  };
}

export function PersistentAlbumObjects({
  albums,
  autoReturn,
  getObjectRect,
  getPlatterRect,
  getRootRect,
  inspection,
  onAllReady,
  onExtractRecord,
  onFailure,
  onRecordPlaced,
  onRecordReturned,
  onReinsertRecord,
  onReturnSleeve,
  onTransferActiveChange,
  platterIndex,
  powered,
  reduceMotion,
  transitioning,
}: PersistentAlbumObjectsProps) {
  const descriptors = useMemo(
    () =>
      albums.flatMap((album, index) =>
        (["sleeve", "record"] as const).map((kind) => ({
          album,
          id: `${kind}-${index}`,
          index,
          kind,
        })),
      ),
    [albums],
  );
  const [mountedCount, setMountedCount] = useState(0);
  const [placements, setPlacements] = useState<
    Record<string, PersistentPlacement>
  >({});
  const [revealed, setRevealed] = useState(false);
  const [recordTransfer, setRecordTransfer] =
    useState<RecordTransferState | null>(null);
  const readyKeysRef = useRef(new Set<string>());
  const failedRef = useRef(false);
  const extractControlRef = useRef<HTMLButtonElement>(null);
  const linkedPosesRef = useRef<Array<LinkedPose | null>>([]);
  const transferInspectionPosesRef = useRef<
    Array<{ x: number; y: number } | null>
  >([]);
  const lastAutoReturnIdRef = useRef(0);
  const stageNodesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const transferAnimationRef = useRef<number | null>(null);
  const transferCandidateRef =
    useRef<TransferPointerCandidate | null>(null);
  const transferGeometryRef = useRef<RecordTransferGeometry | null>(null);
  const transferRuntimeRef = useRef<RecordTransferRuntime>({
    active: false,
    index: -1,
    inspectionX: -0.18,
    inspectionY: -0.38,
    progress: 0,
    recordSize: 1,
  });
  const onAllReadyRef = useRef(onAllReady);
  const onFailureRef = useRef(onFailure);

  useEffect(() => {
    onAllReadyRef.current = onAllReady;
    onFailureRef.current = onFailure;
  }, [onAllReady, onFailure]);

  useEffect(() => {
    if (mountedCount >= descriptors.length) return;
    const frame = requestAnimationFrame(() => {
      setMountedCount((current) =>
        Math.min(current + 2, descriptors.length),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [descriptors.length, mountedCount]);

  const markReady = useCallback(
    (id: string) => {
      if (failedRef.current || readyKeysRef.current.has(id)) return;
      readyKeysRef.current.add(id);
      if (readyKeysRef.current.size !== descriptors.length) return;
      setRevealed(true);
      onAllReadyRef.current();
    },
    [descriptors.length],
  );

  const markFailure = useCallback(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    setRevealed(false);
    onFailureRef.current();
  }, []);

  const buildTransferGeometry = useCallback(
    (index: number): RecordTransferGeometry | null => {
      const root = getRootRect();
      const sleeve = getObjectRect("sleeve", index);
      const record = getObjectRect("record", index);
      const platter = getPlatterRect();
      if (!root || !sleeve || !platter) return null;

      const openPair = coupledInspectionRects(sleeve, record, true);
      const endRecord = platterVisualRect(platter);
      const startCenterX =
        openPair.record.left + openPair.record.width / 2;
      const startCenterY =
        openPair.record.top + openPair.record.height / 2;
      const endCenterX = endRecord.left + endRecord.width / 2;
      const endCenterY = endRecord.top + endRecord.height / 2;
      const distance = Math.hypot(
        endCenterX - startCenterX,
        endCenterY - startCenterY,
      );
      const radius =
        Math.max(openPair.record.width, endRecord.width) / 2;
      const controlLift = clamp(distance * 0.22, 48, 140);
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;

      return {
        controlX: clamp(
          (startCenterX + endCenterX) / 2,
          VIEWPORT_MARGIN + radius,
          Math.max(
            VIEWPORT_MARGIN + radius,
            viewportWidth - VIEWPORT_MARGIN - radius,
          ),
        ),
        controlY: clamp(
          Math.min(startCenterY, endCenterY) - controlLift,
          VIEWPORT_MARGIN + radius,
          Math.max(
            VIEWPORT_MARGIN + radius,
            viewportHeight - VIEWPORT_MARGIN - radius,
          ),
        ),
        endRecord,
        endSleeve: sleeve,
        root,
        startRecord: openPair.record,
        startSleeve: openPair.sleeve,
      };
    },
    [getObjectRect, getPlatterRect, getRootRect],
  );

  const applyTransferProgress = useCallback(
    (progress: number, geometry = transferGeometryRef.current) => {
      if (!geometry) return;
      const clampedProgress = clamp(progress, 0, 1);
      const rects = transferRectsAt(geometry, clampedProgress);
      const runtime = transferRuntimeRef.current;
      runtime.progress = clampedProgress;
      runtime.recordSize = rects.record.width;

      (["record", "sleeve"] as const).forEach((kind) => {
        const node =
          stageNodesRef.current[`${kind}-${runtime.index}`];
        if (!node) return;
        const placement = persistentPlacement(
          rects[kind],
          geometry.root,
          "transfer",
          0,
        );
        node.style.height = `${placement.stageSize}px`;
        node.style.left = `${placement.left}px`;
        node.style.top = `${placement.top}px`;
        node.style.width = `${placement.stageSize}px`;
        node.dataset.objectLocation = "transfer";
      });
    },
    [],
  );

  const finishTransfer = useCallback(
    (
      direction: RecordTransferDirection,
      index: number,
      target: 0 | 1,
    ) => {
      transferRuntimeRef.current.active = false;
      transferCandidateRef.current = null;
      transferGeometryRef.current = null;
      setRecordTransfer(null);
      onTransferActiveChange(false);

      if (direction === "to-platter" && target === 1) {
        onRecordPlaced(index);
      } else if (direction === "to-sleeve" && target === 0) {
        onRecordReturned(index);
      }
    },
    [
      onRecordPlaced,
      onRecordReturned,
      onTransferActiveChange,
    ],
  );

  const settleTransfer = useCallback(
    (
      direction: RecordTransferDirection,
      index: number,
      target: 0 | 1,
    ) => {
      if (transferAnimationRef.current !== null) {
        cancelAnimationFrame(transferAnimationRef.current);
      }
      const from = transferRuntimeRef.current.progress;
      const distance = Math.abs(target - from);
      const duration = reduceMotion
        ? 0
        : clamp(distance * 520, 120, 420);
      setRecordTransfer({ direction, index, phase: "settling" });

      if (duration === 0 || distance < 0.0001) {
        applyTransferProgress(target);
        finishTransfer(direction, index, target);
        return;
      }

      const startedAt = performance.now();
      const frame = (time: number) => {
        const progress = clamp((time - startedAt) / duration, 0, 1);
        applyTransferProgress(
          THREE.MathUtils.lerp(
            from,
            target,
            inspectionEase(progress),
          ),
        );
        if (progress < 1) {
          transferAnimationRef.current = requestAnimationFrame(frame);
        } else {
          transferAnimationRef.current = null;
          finishTransfer(direction, index, target);
        }
      };
      transferAnimationRef.current = requestAnimationFrame(frame);
    },
    [
      applyTransferProgress,
      finishTransfer,
      reduceMotion,
    ],
  );

  const beginPointerTransfer = useCallback(
    (
      direction: RecordTransferDirection,
      index: number,
      pointerId: number,
      clientX: number,
      clientY: number,
    ) => {
      if (
        recordTransfer ||
        transferAnimationRef.current !== null
      ) {
        return;
      }
      const geometry = buildTransferGeometry(index);
      if (!geometry) return;
      transferCandidateRef.current = {
        active: false,
        currentX: clientX,
        currentY: clientY,
        direction,
        geometry,
        index,
        pointerId,
        startProgress: direction === "to-platter" ? 0 : 1,
        startX: clientX,
        startY: clientY,
      };
    },
    [buildTransferGeometry, recordTransfer],
  );

  const movePointerTransfer = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const candidate = transferCandidateRef.current;
      if (!candidate || candidate.pointerId !== pointerId) return;
      candidate.currentX = clientX;
      candidate.currentY = clientY;
      const pointerDistance = Math.hypot(
        clientX - candidate.startX,
        clientY - candidate.startY,
      );
      if (!candidate.active) {
        if (pointerDistance < 6) return;
        candidate.active = true;
        transferGeometryRef.current = candidate.geometry;
        const linkedPose = linkedPosesRef.current[candidate.index];
        if (candidate.direction === "to-platter" && linkedPose) {
          transferInspectionPosesRef.current[candidate.index] = {
            x: linkedPose.x,
            y: linkedPose.y,
          };
        }
        const inspectionPose =
          transferInspectionPosesRef.current[candidate.index] ??
          linkedPose;
        transferRuntimeRef.current = {
          active: true,
          index: candidate.index,
          inspectionX: inspectionPose?.x ?? -0.18,
          inspectionY: inspectionPose?.y ?? -0.38,
          progress: candidate.startProgress,
          recordSize: candidate.geometry.startRecord.width,
        };
        setRecordTransfer({
          direction: candidate.direction,
          index: candidate.index,
          phase: "dragging",
        });
        onTransferActiveChange(true);
      }

      const startCenterX =
        candidate.geometry.startRecord.left +
        candidate.geometry.startRecord.width / 2;
      const startCenterY =
        candidate.geometry.startRecord.top +
        candidate.geometry.startRecord.height / 2;
      const endCenterX =
        candidate.geometry.endRecord.left +
        candidate.geometry.endRecord.width / 2;
      const endCenterY =
        candidate.geometry.endRecord.top +
        candidate.geometry.endRecord.height / 2;
      const pathX = endCenterX - startCenterX;
      const pathY = endCenterY - startCenterY;
      const pathLengthSquared = Math.max(
        pathX * pathX + pathY * pathY,
        1,
      );
      const deltaProgress =
        ((clientX - candidate.startX) * pathX +
          (clientY - candidate.startY) * pathY) /
        pathLengthSquared;
      applyTransferProgress(
        candidate.startProgress + deltaProgress,
        candidate.geometry,
      );
    },
    [applyTransferProgress, onTransferActiveChange],
  );

  const endPointerTransfer = useCallback(
    (pointerId: number) => {
      const candidate = transferCandidateRef.current;
      if (!candidate || candidate.pointerId !== pointerId) return;
      transferCandidateRef.current = null;
      if (!candidate.active) return;
      settleTransfer(
        candidate.direction,
        candidate.index,
        transferRuntimeRef.current.progress >= 0.5 ? 1 : 0,
      );
    },
    [settleTransfer],
  );

  const cancelActiveTransfer = useCallback(() => {
    const transfer = recordTransfer;
    const candidate = transferCandidateRef.current;
    if (!transfer && !candidate?.active) {
      transferCandidateRef.current = null;
      return;
    }
    const direction =
      transfer?.direction ?? candidate?.direction ?? "to-platter";
    const index =
      transfer?.index ?? candidate?.index ?? transferRuntimeRef.current.index;
    settleTransfer(
      direction,
      index,
      direction === "to-platter" ? 0 : 1,
    );
  }, [recordTransfer, settleTransfer]);

  useEffect(() => {
    if (
      !autoReturn ||
      autoReturn.id === lastAutoReturnIdRef.current ||
      recordTransfer
    ) {
      return;
    }
    const geometry = buildTransferGeometry(autoReturn.index);
    if (!geometry) return;
    lastAutoReturnIdRef.current = autoReturn.id;
    const frame = requestAnimationFrame(() => {
      const linkedPose = linkedPosesRef.current[autoReturn.index];
      const inspectionPose =
        transferInspectionPosesRef.current[autoReturn.index] ??
        linkedPose;
      transferGeometryRef.current = geometry;
      transferRuntimeRef.current = {
        active: true,
        index: autoReturn.index,
        inspectionX: inspectionPose?.x ?? -0.18,
        inspectionY: inspectionPose?.y ?? -0.38,
        progress: 1,
        recordSize: geometry.endRecord.width,
      };
      setRecordTransfer({
        direction: "to-sleeve",
        index: autoReturn.index,
        phase: "settling",
      });
      onTransferActiveChange(true);
      applyTransferProgress(1, geometry);
      settleTransfer("to-sleeve", autoReturn.index, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [
    applyTransferProgress,
    autoReturn,
    buildTransferGeometry,
    onTransferActiveChange,
    recordTransfer,
    settleTransfer,
  ]);

  useLayoutEffect(() => {
    if (!recordTransfer) return;
    let frame = 0;
    const remeasure = () => {
      frame = 0;
      const geometry = buildTransferGeometry(recordTransfer.index);
      if (!geometry) return;
      transferGeometryRef.current = geometry;
      const candidate = transferCandidateRef.current;
      if (candidate?.active) {
        candidate.geometry = geometry;
        candidate.startProgress = transferRuntimeRef.current.progress;
        candidate.startX = candidate.currentX;
        candidate.startY = candidate.currentY;
      }
      applyTransferProgress(
        transferRuntimeRef.current.progress,
        geometry,
      );
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(remeasure);
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [
    applyTransferProgress,
    buildTransferGeometry,
    recordTransfer,
  ]);

  useEffect(() => {
    if (!recordTransfer) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancelActiveTransfer();
    };
    document.addEventListener("keydown", handleEscape, true);
    return () =>
      document.removeEventListener("keydown", handleEscape, true);
  }, [cancelActiveTransfer, recordTransfer]);

  useEffect(
    () => () => {
      if (transferAnimationRef.current !== null) {
        cancelAnimationFrame(transferAnimationRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    let frame = 0;
    let sampleUntil = 0;
    const measure = () => {
      frame = 0;
      const rootRect = getRootRect();
      if (!rootRect) return;
      const next: Record<string, PersistentPlacement> = {};
      const activeTransferGeometry = recordTransfer
        ? buildTransferGeometry(recordTransfer.index)
        : null;
      const activeTransferRects =
        activeTransferGeometry && recordTransfer
          ? transferRectsAt(
              activeTransferGeometry,
              transferRuntimeRef.current.progress,
            )
          : null;
      if (activeTransferGeometry) {
        transferGeometryRef.current = activeTransferGeometry;
      }
      const pairedSleeveAnchor =
        inspection?.kind === "sleeve" &&
        inspection.origin === "shelf" &&
        inspection.phase !== "closing"
          ? getObjectRect("sleeve", inspection.index)
          : null;
      const pairedInspection =
        inspection && pairedSleeveAnchor
          ? coupledInspectionRects(
              pairedSleeveAnchor,
              getObjectRect("record", inspection.index),
              inspection.phase === "extracting" ||
                inspection.phase === "record-ready",
            )
          : null;

      for (const descriptor of descriptors) {
        const directlyInspected =
          inspection?.index === descriptor.index &&
          inspection.kind === descriptor.kind;
        const paired =
          inspection?.index === descriptor.index &&
          inspection.kind === "sleeve" &&
          inspection.origin === "shelf";
        let mode: PersistentObjectMode =
          descriptor.kind === "record" && platterIndex === descriptor.index
            ? "platter"
            : "docked";
        let rect =
          mode === "platter"
            ? getPlatterRect()
            : getObjectRect(descriptor.kind, descriptor.index);
        let transitionMs = transitioning ? 520 : 0;

        if (
          recordTransfer?.index === descriptor.index &&
          activeTransferRects
        ) {
          mode = "transfer";
          rect = activeTransferRects[descriptor.kind];
          transitionMs = 0;
        } else if (paired) {
          if (inspection.phase === "closing") {
            mode = "docked";
            rect = getObjectRect(descriptor.kind, descriptor.index);
            transitionMs = INSPECTION_CLOSE_MS;
          } else if (pairedInspection) {
            rect = pairedInspection[descriptor.kind];
            mode = "inspection";
            transitionMs =
              inspection.phase === "opening"
                ? INSPECTION_OPEN_MS
                : inspection.phase === "extracting"
                  ? RECORD_EXTRACT_MS
                  : inspection.phase === "reinserting" ||
                      inspection.phase === "reinserting-close"
                    ? RECORD_REINSERT_MS
                    : 0;
          }
        } else if (directlyInspected) {
          const returning = inspection.phase === "closing";
          if (!returning) {
            const anchor =
              inspection.origin === "platter"
                ? getPlatterRect()
                : getObjectRect(descriptor.kind, descriptor.index);
            if (anchor) {
              rect = inspectionVisualRect(anchor);
              mode = "inspection";
              transitionMs =
                inspection.phase === "opening" ? INSPECTION_OPEN_MS : 0;
            }
          } else {
            mode =
              descriptor.kind === "record" &&
              inspection.origin === "platter"
                ? "platter"
                : "docked";
            rect =
              mode === "platter"
                ? getPlatterRect()
                : getObjectRect(descriptor.kind, descriptor.index);
            transitionMs = INSPECTION_CLOSE_MS;
          }
        }

        if (rect) {
          next[descriptor.id] = persistentPlacement(
            rect,
            rootRect,
            mode,
            transitionMs,
          );
        }
      }

      setPlacements((current) => {
        const currentKeys = Object.keys(current);
        const nextKeys = Object.keys(next);
        if (
          currentKeys.length === nextKeys.length &&
          nextKeys.every((key) => samePlacement(current[key], next[key]))
        ) {
          return current;
        }
        return next;
      });
      if (performance.now() < sampleUntil) {
        frame = requestAnimationFrame(measure);
      }
    };
    const scheduleMeasure = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(measure);
    };
    const sampleSourceTransition = () => {
      sampleUntil = performance.now() + 700;
      scheduleMeasure();
    };

    measure();
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, {
      capture: true,
      passive: true,
    });
    window.addEventListener("pointerover", sampleSourceTransition, {
      passive: true,
    });
    window.addEventListener("pointerout", sampleSourceTransition, {
      passive: true,
    });
    window.addEventListener("focusin", sampleSourceTransition);
    window.addEventListener("focusout", sampleSourceTransition);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
      window.removeEventListener("pointerover", sampleSourceTransition);
      window.removeEventListener("pointerout", sampleSourceTransition);
      window.removeEventListener("focusin", sampleSourceTransition);
      window.removeEventListener("focusout", sampleSourceTransition);
    };
  }, [
    buildTransferGeometry,
    descriptors,
    getObjectRect,
    getPlatterRect,
    getRootRect,
    inspection,
    platterIndex,
    recordTransfer,
    transitioning,
  ]);

  const stages = descriptors.slice(0, mountedCount).map((descriptor) => {
    const placement = placements[descriptor.id];
    if (!placement) return null;
    const paired =
      inspection?.index === descriptor.index &&
      inspection.kind === "sleeve" &&
      inspection.origin === "shelf";
    const pairedActive = paired && inspection.phase !== "closing";
    const linkedOffsetTarget =
      paired &&
      descriptor.kind === "record" &&
      (inspection.phase === "opening" ||
        inspection.phase === "sleeve-ready" ||
        inspection.phase === "reinserting" ||
        inspection.phase === "reinserting-close")
        ? 1
        : 0;
    const linkedOffsetDuration =
      paired && descriptor.kind === "record"
        ? inspection.phase === "opening"
          ? INSPECTION_OPEN_MS
          : inspection.phase === "extracting"
            ? RECORD_EXTRACT_MS
            : inspection.phase === "reinserting" ||
                inspection.phase === "reinserting-close"
              ? RECORD_REINSERT_MS
              : inspection.phase === "closing"
                ? INSPECTION_CLOSE_MS
                : 0
        : 0;
    const transferDirection =
      descriptor.kind === "record"
        ? recordTransfer?.index === descriptor.index
          ? recordTransfer.direction
          : paired && inspection.phase === "record-ready"
            ? "to-platter"
            : platterIndex === descriptor.index
              ? "to-sleeve"
              : undefined
        : undefined;
    const interactive =
      (recordTransfer?.index === descriptor.index &&
        descriptor.kind === "record" &&
        recordTransfer.phase === "dragging") ||
      (descriptor.kind === "record" &&
        !recordTransfer &&
        platterIndex === descriptor.index) ||
      (paired
      ? (descriptor.kind === "sleeve" &&
          inspection.phase === "sleeve-ready") ||
        (descriptor.kind === "record" &&
          inspection.phase === "record-ready")
      : inspection?.index === descriptor.index &&
        inspection.kind === descriptor.kind &&
        inspection.phase === "record-ready");
    return (
      <PersistentObjectStage
        key={descriptor.id}
        album={descriptor.album}
        followLinkedPose={
          pairedActive &&
          descriptor.kind === "record" &&
          inspection.phase !== "record-ready"
        }
        id={descriptor.id}
        interactive={interactive}
        kind={descriptor.kind}
        leadLinkedPose={pairedActive && descriptor.kind === "sleeve"}
        linkedPoseIndex={descriptor.index}
        linkedPoses={linkedPosesRef}
        linkedActionRef={
          paired && descriptor.kind === "record"
            ? extractControlRef
            : undefined
        }
        linkedOffsetDuration={linkedOffsetDuration}
        linkedOffsetTarget={linkedOffsetTarget}
        onActivate={
          paired &&
          descriptor.kind === "sleeve" &&
          inspection.phase === "sleeve-ready"
            ? onReturnSleeve
            : undefined
        }
        onFailure={markFailure}
        onReady={markReady}
        paired={Boolean(pairedActive)}
        placement={placement}
        powered={powered}
        reduceMotion={reduceMotion}
        revealed={revealed}
        stageRef={(element) => {
          stageNodesRef.current[descriptor.id] = element;
        }}
        transferDirection={transferDirection}
        transferRuntime={transferRuntimeRef}
        onTransferPointerDown={beginPointerTransfer}
        onTransferPointerMove={movePointerTransfer}
        onTransferPointerUp={endPointerTransfer}
      />
    );
  });
  const inspectedSleevePlacement =
    inspection?.kind === "sleeve" && inspection.origin === "shelf"
      ? placements[`sleeve-${inspection.index}`]
      : null;
  const inspectedRecordPlacement =
    inspection?.kind === "sleeve" && inspection.origin === "shelf"
      ? placements[`record-${inspection.index}`]
      : null;
  const sleeveVisual = inspectedSleevePlacement
    ? placementVisualRect(inspectedSleevePlacement)
    : null;
  const recordVisual = inspectedRecordPlacement
    ? placementVisualRect(inspectedRecordPlacement)
    : null;

  return (
    <>
      {stages}
      {inspection?.phase === "sleeve-ready" &&
      sleeveVisual &&
      recordVisual ? (
        <button
          ref={extractControlRef}
          type="button"
          data-inspection-control
          aria-label={`Slide the record for ${albums[inspection.index]?.title ?? "this album"} out of its sleeve`}
          onClick={onExtractRecord}
          className="absolute z-[95] cursor-pointer rounded-full bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
          style={{
            height: Math.max(44, recordVisual.height * 0.64),
            left: sleeveVisual.left + sleeveVisual.width - 16,
            top:
              recordVisual.top +
              (recordVisual.height - Math.max(44, recordVisual.height * 0.64)) /
                2,
            width: Math.max(
              44,
              recordVisual.left +
                recordVisual.width -
                (sleeveVisual.left + sleeveVisual.width - 16),
            ),
          }}
        />
      ) : null}
      {inspection?.phase === "record-ready" &&
      inspection.kind === "sleeve" &&
      inspection.origin === "shelf" &&
      sleeveVisual ? (
        <button
          type="button"
          data-inspection-control
          aria-label={`Return the record for ${albums[inspection.index]?.title ?? "this album"} to its sleeve`}
          onClick={onReinsertRecord}
          className="absolute z-[95] cursor-pointer rounded-[3px] bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
          style={sleeveVisual}
        />
      ) : null}
    </>
  );
}

interface PersistentObjectStageProps {
  album: MusicAlbum;
  followLinkedPose: boolean;
  id: string;
  interactive: boolean;
  kind: InspectionKind;
  leadLinkedPose: boolean;
  linkedActionRef?: MutableRefObject<HTMLButtonElement | null>;
  linkedOffsetDuration: number;
  linkedOffsetTarget: number;
  linkedPoseIndex: number;
  linkedPoses: MutableRefObject<Array<LinkedPose | null>>;
  onActivate?: () => void;
  onFailure: () => void;
  onReady: (id: string) => void;
  onTransferPointerDown: (
    direction: RecordTransferDirection,
    index: number,
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => void;
  onTransferPointerMove: (
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => void;
  onTransferPointerUp: (pointerId: number) => void;
  paired: boolean;
  placement: PersistentPlacement;
  powered: boolean;
  reduceMotion: boolean;
  revealed: boolean;
  stageRef: (element: HTMLDivElement | null) => void;
  transferDirection?: RecordTransferDirection;
  transferRuntime: MutableRefObject<RecordTransferRuntime>;
}

function PersistentObjectStage({
  album,
  followLinkedPose,
  id,
  interactive,
  kind,
  leadLinkedPose,
  linkedActionRef,
  linkedOffsetDuration,
  linkedOffsetTarget,
  linkedPoseIndex,
  linkedPoses,
  onActivate,
  onFailure,
  onReady,
  onTransferPointerDown,
  onTransferPointerMove,
  onTransferPointerUp,
  paired,
  placement,
  powered,
  reduceMotion,
  revealed,
  stageRef,
  transferDirection,
  transferRuntime,
}: PersistentObjectStageProps) {
  const handleReady = useCallback(() => onReady(id), [id, onReady]);
  const duration = reduceMotion ? 0 : placement.transitionMs;
  const zIndex =
    placement.mode === "inspection"
      ? paired && kind === "record"
        ? 89
        : 90
      : placement.mode === "platter"
        ? 25
        : placement.mode === "transfer"
          ? kind === "record"
            ? 94
            : 90
        : kind === "sleeve"
          ? 20
          : 10;

  return (
    <div
      ref={stageRef}
      data-persistent-object={id}
      data-object-location={placement.mode}
      aria-hidden={interactive ? undefined : true}
      className="absolute"
      style={{
        height: placement.stageSize,
        left: placement.left,
        opacity: revealed ? 1 : 0,
        pointerEvents: interactive ? "auto" : "none",
        top: placement.top,
        transition: [
          `left ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `top ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `width ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `height ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          "opacity 100ms ease-out",
        ].join(", "),
        width: placement.stageSize,
        zIndex,
      }}
    >
      <ThreeStage
        album={album}
        followLinkedPose={followLinkedPose}
        interactive={interactive}
        kind={kind}
        leadLinkedPose={leadLinkedPose}
        linkedActionRef={linkedActionRef}
        linkedOffsetDuration={linkedOffsetDuration}
        linkedOffsetTarget={linkedOffsetTarget}
        linkedPoseIndex={linkedPoseIndex}
        linkedPoses={linkedPoses}
        mode={placement.mode}
        onActivate={onActivate}
        onFallback={onFailure}
        onReady={handleReady}
        onTransferPointerDown={onTransferPointerDown}
        onTransferPointerMove={onTransferPointerMove}
        onTransferPointerUp={onTransferPointerUp}
        powered={powered}
        reduceMotion={reduceMotion}
        targetSize={placement.targetSize}
        transferDirection={transferDirection}
        transferRuntime={transferRuntime}
      />
    </div>
  );
}

function snapshot(element: HTMLElement | null): RectSnapshot {
  const rect = element?.getBoundingClientRect();
  if (!rect) {
    return {
      height: Math.min(window.innerWidth * 0.66, 360),
      left: window.innerWidth * 0.17,
      top: window.innerHeight * 0.24,
      width: Math.min(window.innerWidth * 0.66, 360),
    };
  }

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

export function AlbumObjectViewer({
  album,
  automaticTransfer = false,
  getAnchorRect,
  getPlatterRect,
  getShelfRect,
  kind,
  origin,
  reduceMotion,
  onKeepSpinning,
  onPlace,
  onReturn,
}: AlbumObjectViewerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const focusedRef = useRef(false);
  const geometryRef = useRef<ViewerGeometry | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const sleeveTimerRef = useRef<number | null>(null);
  const [geometry, setGeometry] = useState<ViewerGeometry | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [fallbackRecordExtracted, setFallbackRecordExtracted] =
    useState(false);
  const [fallbackRecordMoving, setFallbackRecordMoving] =
    useState(false);
  const handleFallback = useCallback(() => setFallback(true), []);

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    return () => {
      restoreFocusRef.current?.focus();
    };
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const anchor = getAnchorRect();
      if (!anchor) return;
      const next =
        kind === "sleeve" && origin === "shelf"
          ? sleeveViewerGeometry(
              anchor,
              dialog.getBoundingClientRect(),
              fallbackRecordExtracted,
            )
          : viewerGeometry(anchor, dialog.getBoundingClientRect());
      geometryRef.current = next;
      setGeometry((current) => (sameGeometry(current, next) ? current : next));
    };
    const scheduleMeasure = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(dialog);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, {
      capture: true,
      passive: true,
    });

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [fallbackRecordExtracted, getAnchorRect, kind, origin]);

  useEffect(() => {
    if (!geometry || focusedRef.current) return;
    const frame = requestAnimationFrame(() => {
      focusedRef.current = true;
      setIsOpen(true);
      const canvas =
        objectRef.current?.querySelector<HTMLCanvasElement>(
          'canvas[tabindex="0"]',
        );
      const fallbackControl =
        objectRef.current?.querySelector<HTMLButtonElement>(
          "[data-fallback-primary]",
        );
      (canvas ?? fallbackControl ?? dialogRef.current)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [geometry]);

  const closeWith = useCallback(
    (action: CloseAction) => {
      if (closingRef.current) return;
      closingRef.current = true;
      const source =
        geometryRef.current?.visualRect ?? snapshot(objectRef.current);
      setIsOpen(false);

      window.setTimeout(
        () => {
          if (action === "return") onReturn(source);
          else onKeepSpinning();
        },
        reduceMotion ? 0 : CLOSE_DURATION_MS,
      );
    },
    [onKeepSpinning, onReturn, reduceMotion],
  );

  const returnToOrigin = useCallback(() => {
    if (
      kind === "sleeve" &&
      origin === "shelf" &&
      (fallbackRecordExtracted || fallbackRecordMoving)
    ) {
      if (sleeveTimerRef.current !== null) {
        window.clearTimeout(sleeveTimerRef.current);
      }
      setFallbackRecordExtracted(false);
      setFallbackRecordMoving(true);
      sleeveTimerRef.current = window.setTimeout(
        () => {
          setFallbackRecordMoving(false);
          closeWith("return");
        },
        reduceMotion ? 0 : RECORD_REINSERT_MS,
      );
      return;
    }
    if (kind === "record" && origin === "platter") closeWith("keep");
    else closeWith("return");
  }, [
    closeWith,
    fallbackRecordExtracted,
    fallbackRecordMoving,
    kind,
    origin,
    reduceMotion,
  ]);

  const extractFallbackRecord = useCallback(() => {
    if (fallbackRecordExtracted || fallbackRecordMoving) return;
    setFallbackRecordExtracted(true);
    setFallbackRecordMoving(true);
    sleeveTimerRef.current = window.setTimeout(
      () => {
        setFallbackRecordMoving(false);
        objectRef.current
          ?.querySelector<HTMLButtonElement>(
            '[data-fallback-action="reinsert"]',
          )
          ?.focus();
      },
      reduceMotion ? 0 : RECORD_EXTRACT_MS,
    );
  }, [fallbackRecordExtracted, fallbackRecordMoving, reduceMotion]);

  const reinsertFallbackRecord = useCallback(() => {
    if (!fallbackRecordExtracted || fallbackRecordMoving) return;
    setFallbackRecordExtracted(false);
    setFallbackRecordMoving(true);
    sleeveTimerRef.current = window.setTimeout(
      () => {
        setFallbackRecordMoving(false);
        objectRef.current
          ?.querySelector<HTMLButtonElement>(
            '[data-fallback-action="extract"]',
          )
          ?.focus();
      },
      reduceMotion ? 0 : RECORD_REINSERT_MS,
    );
  }, [fallbackRecordExtracted, fallbackRecordMoving, reduceMotion]);

  useEffect(
    () => () => {
      if (sleeveTimerRef.current !== null) {
        window.clearTimeout(sleeveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      returnToOrigin();
    };

    document.addEventListener("keydown", exitOnEscape);
    return () => document.removeEventListener("keydown", exitOnEscape);
  }, [returnToOrigin]);

  const handleDialogKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), a[href], canvas[tabindex="0"]',
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

  const titleId = `album-object-title-${kind}`;
  const descriptionId = `album-object-description-${kind}`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
      aria-modal="true"
      aria-keyshortcuts="Escape"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={handleDialogKeyDown}
      className="absolute inset-x-[-1rem] top-0 bottom-[-1.5rem] z-[80] flex min-h-[420px] items-center justify-center sm:inset-x-[-2rem] lg:inset-x-[-8rem] lg:bottom-0"
    >
      <div
        aria-hidden="true"
        onClick={returnToOrigin}
        className={`absolute inset-0 cursor-default bg-transparent transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {geometry ? (
        <div
          className="absolute z-10"
          style={{
            height: geometry.stageSize,
            left: geometry.left,
            top: geometry.top,
            transition:
              kind === "sleeve" && !reduceMotion
                ? `left ${fallbackRecordExtracted ? RECORD_EXTRACT_MS : RECORD_REINSERT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${fallbackRecordExtracted ? RECORD_EXTRACT_MS : RECORD_REINSERT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                : undefined,
            width: geometry.stageSize,
          }}
        >
          <div className="relative flex size-full items-center justify-center">
            <h3 id={titleId} className="sr-only">
              {kind === "record" ? "Vinyl" : "Sleeve and record"}{" "}
              inspection for {album.title} by {album.artist}
            </h3>

            <div
              ref={objectRef}
              data-album-viewer-object
              className="relative size-full"
            >
              {kind === "sleeve" && origin === "shelf" ? (
                fallbackRecordExtracted && !fallbackRecordMoving ? (
                  <FallbackGuidedTransfer
                    album={album}
                    direction="to-platter"
                    getPlatterRect={getPlatterRect}
                    getShelfRect={getShelfRect}
                    onComplete={(source) => onPlace(source)}
                    reduceMotion={reduceMotion}
                  />
                ) : (
                  <FallbackSleeveAssembly
                    album={album}
                    extracted={fallbackRecordExtracted}
                    moving={fallbackRecordMoving}
                    onExtract={extractFallbackRecord}
                    onReinsert={reinsertFallbackRecord}
                    onReturn={returnToOrigin}
                    reduceMotion={reduceMotion}
                    targetSize={geometry.targetSize}
                  />
                )
              ) : kind === "record" && origin === "platter" ? (
                <FallbackGuidedTransfer
                  album={album}
                  direction="to-sleeve"
                  getPlatterRect={getPlatterRect}
                  getShelfRect={getShelfRect}
                  onComplete={(source) => onReturn(source)}
                  reduceMotion={reduceMotion}
                  automatic={automaticTransfer}
                />
              ) : fallback ? (
                <FallbackObject
                  album={album}
                  kind={kind}
                  targetSize={geometry.targetSize}
                />
              ) : (
                <ThreeStage
                  album={album}
                  kind={kind}
                  reduceMotion={reduceMotion}
                  targetSize={geometry.targetSize}
                  onFallback={handleFallback}
                />
              )}
            </div>

            <p id={descriptionId} className="sr-only">
              {kind === "sleeve"
                ? "Activate the sleeve to return it to the shelf, or activate the exposed record edge to slide the record out. Once extracted, activate the sleeve to put the record back. Press Escape to close."
                : "Drag or use arrow keys to rotate. Press Escape to exit the 3D view."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface FallbackGuidedTransferProps {
  album: MusicAlbum;
  automatic?: boolean;
  direction: RecordTransferDirection;
  getPlatterRect: () => RectSnapshot | null;
  getShelfRect: () => RectSnapshot | null;
  onComplete: (source: RectSnapshot) => void;
  reduceMotion: boolean;
}

function fallbackTransferGeometry(
  shelf: RectSnapshot,
  platter: RectSnapshot,
): RecordTransferGeometry {
  const openPair = coupledInspectionRects(shelf, null, true);
  const endRecord = platterVisualRect(platter);
  const startCenterX =
    openPair.record.left + openPair.record.width / 2;
  const startCenterY =
    openPair.record.top + openPair.record.height / 2;
  const endCenterX = endRecord.left + endRecord.width / 2;
  const endCenterY = endRecord.top + endRecord.height / 2;
  const distance = Math.hypot(
    endCenterX - startCenterX,
    endCenterY - startCenterY,
  );
  const radius = Math.max(openPair.record.width, endRecord.width) / 2;

  return {
    controlX: clamp(
      (startCenterX + endCenterX) / 2,
      VIEWPORT_MARGIN + radius,
      Math.max(
        VIEWPORT_MARGIN + radius,
        document.documentElement.clientWidth -
          VIEWPORT_MARGIN -
          radius,
      ),
    ),
    controlY: clamp(
      Math.min(startCenterY, endCenterY) -
        clamp(distance * 0.22, 48, 140),
      VIEWPORT_MARGIN + radius,
      Math.max(
        VIEWPORT_MARGIN + radius,
        window.innerHeight - VIEWPORT_MARGIN - radius,
      ),
    ),
    endRecord,
    endSleeve: shelf,
    root: {
      height: window.innerHeight,
      left: 0,
      top: 0,
      width: document.documentElement.clientWidth,
    },
    startRecord: openPair.record,
    startSleeve: openPair.sleeve,
  };
}

function applyFixedRect(
  element: HTMLElement | null,
  rect: RectSnapshot,
) {
  if (!element) return;
  element.style.height = `${rect.height}px`;
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
  element.style.width = `${rect.width}px`;
}

function FallbackGuidedTransfer({
  album,
  automatic = false,
  direction,
  getPlatterRect,
  getShelfRect,
  onComplete,
  reduceMotion,
}: FallbackGuidedTransferProps) {
  const sleeveRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<number | null>(null);
  const automaticStartedRef = useRef(false);
  const progressRef = useRef(direction === "to-platter" ? 0 : 1);
  const pointerRef = useRef<{
    currentX: number;
    currentY: number;
    dragged: boolean;
    pointerId: number;
    startProgress: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [geometry] = useState<RecordTransferGeometry | null>(() => {
    const shelf = getShelfRect();
    const platter = getPlatterRect();
    return shelf && platter
      ? fallbackTransferGeometry(shelf, platter)
      : null;
  });
  const geometryRef = useRef(geometry);

  const renderProgress = useCallback((progress: number) => {
    const currentGeometry = geometryRef.current;
    if (!currentGeometry) return;
    const next = clamp(progress, 0, 1);
    progressRef.current = next;
    const rects = transferRectsAt(currentGeometry, next);
    const pose = smoothstep(0.12, 0.9, next);
    applyFixedRect(recordRef.current, rects.record);
    applyFixedRect(controlRef.current, rects.record);
    applyFixedRect(sleeveRef.current, rects.sleeve);
    if (recordRef.current) {
      recordRef.current.style.transform = `rotate(${THREE.MathUtils.lerp(
        -10,
        0,
        pose,
      )}deg) scaleY(${THREE.MathUtils.lerp(1, 0.62, pose)})`;
    }
    if (sleeveRef.current) {
      sleeveRef.current.style.transform = `perspective(900px) rotateX(${THREE.MathUtils.lerp(
        5,
        0,
        inspectionEase(next),
      )}deg) rotateY(${THREE.MathUtils.lerp(
        -15,
        0,
        inspectionEase(next),
      )}deg)`;
    }
  }, []);

  const finishReverse = useCallback(() => {
    const shelfRect = getShelfRect();
    const currentGeometry = geometryRef.current;
    if (!shelfRect || !currentGeometry) return;
    const inserted = coupledInspectionRects(shelfRect, null, false);
    const closedRecord: RectSnapshot = {
      height: shelfRect.width * RECORD_DIAMETER_RATIO,
      left:
        shelfRect.left +
        shelfRect.width *
          (1 + RECORD_PROTRUSION_RATIO - RECORD_DIAMETER_RATIO),
      top:
        shelfRect.top +
        (shelfRect.height -
          shelfRect.width * RECORD_DIAMETER_RATIO) /
          2,
      width: shelfRect.width * RECORD_DIAMETER_RATIO,
    };
    const animateRects = (
      fromRecord: RectSnapshot,
      toRecord: RectSnapshot,
      fromSleeve: RectSnapshot,
      toSleeve: RectSnapshot,
      duration: number,
      complete: () => void,
    ) => {
      const startedAt = performance.now();
      const frame = (time: number) => {
        const progress =
          duration === 0
            ? 1
            : clamp((time - startedAt) / duration, 0, 1);
        const eased = inspectionEase(progress);
        applyFixedRect(
          recordRef.current,
          lerpRect(fromRecord, toRecord, eased),
        );
        applyFixedRect(
          controlRef.current,
          lerpRect(fromRecord, toRecord, eased),
        );
        applyFixedRect(
          sleeveRef.current,
          lerpRect(fromSleeve, toSleeve, eased),
        );
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(frame);
        } else {
          animationRef.current = null;
          complete();
        }
      };
      animationRef.current = requestAnimationFrame(frame);
    };

    animateRects(
      currentGeometry.startRecord,
      inserted.record,
      currentGeometry.startSleeve,
      inserted.sleeve,
      reduceMotion ? 0 : RECORD_REINSERT_MS,
      () => {
        animateRects(
          inserted.record,
          closedRecord,
          inserted.sleeve,
          shelfRect,
          reduceMotion ? 0 : INSPECTION_CLOSE_MS,
          () => onComplete(closedRecord),
        );
      },
    );
  }, [getShelfRect, onComplete, reduceMotion]);

  const settle = useCallback(
    (target: 0 | 1) => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      const from = progressRef.current;
      const distance = Math.abs(target - from);
      const duration = reduceMotion
        ? 0
        : clamp(distance * 520, 120, 420);
      const complete = () => {
        if (direction === "to-platter" && target === 1) {
          const source =
            geometryRef.current?.endRecord ?? getPlatterRect();
          if (source) onComplete(source);
        } else if (direction === "to-sleeve" && target === 0) {
          finishReverse();
        }
      };
      if (duration === 0 || distance < 0.0001) {
        renderProgress(target);
        complete();
        return;
      }
      const startedAt = performance.now();
      const frame = (time: number) => {
        const progress = clamp((time - startedAt) / duration, 0, 1);
        renderProgress(
          THREE.MathUtils.lerp(
            from,
            target,
            inspectionEase(progress),
          ),
        );
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(frame);
        } else {
          animationRef.current = null;
          complete();
        }
      };
      animationRef.current = requestAnimationFrame(frame);
    },
    [
      direction,
      finishReverse,
      getPlatterRect,
      onComplete,
      reduceMotion,
      renderProgress,
    ],
  );

  useEffect(() => {
    if (!automatic || automaticStartedRef.current) return;
    automaticStartedRef.current = true;
    const frame = requestAnimationFrame(() => settle(0));
    return () => cancelAnimationFrame(frame);
  }, [automatic, settle]);

  useLayoutEffect(() => {
    renderProgress(progressRef.current);
    let frame = 0;
    const remeasure = () => {
      frame = 0;
      const nextShelf = getShelfRect();
      const nextPlatter = getPlatterRect();
      if (!nextShelf || !nextPlatter) return;
      geometryRef.current = fallbackTransferGeometry(
        nextShelf,
        nextPlatter,
      );
      const pointer = pointerRef.current;
      if (pointer?.dragged) {
        pointer.startProgress = progressRef.current;
        pointer.startX = pointer.currentX;
        pointer.startY = pointer.currentY;
      }
      renderProgress(progressRef.current);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(remeasure);
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [getPlatterRect, getShelfRect, renderProgress]);

  useEffect(
    () => () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    },
    [],
  );

  if (!geometry) return null;
  const initial =
    direction === "to-platter"
      ? transferRectsAt(geometry, 0)
      : transferRectsAt(geometry, 1);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerRef.current = {
      currentX: event.clientX,
      currentY: event.clientY,
      dragged: false,
      pointerId: event.pointerId,
      startProgress: progressRef.current,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = pointerRef.current;
    const currentGeometry = geometryRef.current;
    if (
      !pointer ||
      pointer.pointerId !== event.pointerId ||
      !currentGeometry
    ) {
      return;
    }
    const travel = Math.hypot(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY,
    );
    pointer.currentX = event.clientX;
    pointer.currentY = event.clientY;
    if (!pointer.dragged && travel < 6) return;
    pointer.dragged = true;
    const startX =
      currentGeometry.startRecord.left +
      currentGeometry.startRecord.width / 2;
    const startY =
      currentGeometry.startRecord.top +
      currentGeometry.startRecord.height / 2;
    const endX =
      currentGeometry.endRecord.left +
      currentGeometry.endRecord.width / 2;
    const endY =
      currentGeometry.endRecord.top +
      currentGeometry.endRecord.height / 2;
    const pathX = endX - startX;
    const pathY = endY - startY;
    const lengthSquared = Math.max(pathX * pathX + pathY * pathY, 1);
    renderProgress(
      pointer.startProgress +
        ((event.clientX - pointer.startX) * pathX +
          (event.clientY - pointer.startY) * pathY) /
          lengthSquared,
    );
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = pointerRef.current;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!pointer?.dragged) return;
    settle(progressRef.current >= 0.5 ? 1 : 0);
  };

  return (
    <>
      <div
        ref={sleeveRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-[90] overflow-hidden rounded-[3px] border-r-[8px] border-[#d7c9b4] bg-[#211b17] shadow-[20px_25px_36px_rgba(0,0,0,0.38)]"
        style={initial.sleeve}
      >
        <Image
          src={album.cover}
          alt=""
          fill
          sizes={`${Math.ceil(initial.sleeve.width)}px`}
          className="object-contain"
        />
      </div>
      <div
        ref={recordRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-[94] origin-center"
        style={initial.record}
      >
        <RecordFace
          album={album}
          sizes="360px"
          className="size-full drop-shadow-[0_16px_18px_rgba(0,0,0,0.34)]"
        />
      </div>
      <button
        ref={controlRef}
        type="button"
        data-fallback-primary
        aria-label={`Drag ${album.title} ${
          direction === "to-platter"
            ? "to the turntable"
            : "back to its sleeve"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="fixed z-[95] cursor-grab touch-none rounded-full bg-transparent outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
        style={initial.record}
      />
    </>
  );
}

interface FallbackSleeveAssemblyProps {
  album: MusicAlbum;
  extracted: boolean;
  moving: boolean;
  onExtract: () => void;
  onReinsert: () => void;
  onReturn: () => void;
  reduceMotion: boolean;
  targetSize: number;
}

function FallbackSleeveAssembly({
  album,
  extracted,
  moving,
  onExtract,
  onReinsert,
  onReturn,
  reduceMotion,
  targetSize,
}: FallbackSleeveAssemblyProps) {
  const [opened, setOpened] = useState(false);
  const recordSize = targetSize * RECORD_DIAMETER_RATIO;
  const recordOffset = targetSize * (extracted ? 1.03 : opened ? 0.15 : 0);
  const recordTransitionMs = extracted
    ? RECORD_EXTRACT_MS
    : moving
      ? RECORD_REINSERT_MS
      : INSPECTION_OPEN_MS;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpened(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative flex size-full items-center justify-center [perspective:900px]">
      <div
        className="relative shrink-0"
        style={{
          height: targetSize,
          transform: "rotateX(5deg) rotateY(-15deg)",
          transformStyle: "preserve-3d",
          width: targetSize,
        }}
      >
        <span
          className="absolute top-[3%] left-[3%] z-0 block rounded-full"
          style={{
            height: recordSize,
            transform: `translate3d(${recordOffset}px, 0, -2px)`,
            transition: reduceMotion
              ? "none"
              : `transform ${recordTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            width: recordSize,
          }}
        >
          <RecordFace
            album={album}
            sizes={`${Math.ceil(recordSize)}px`}
            className={`size-full ${
              extracted
                ? "drop-shadow-[0_20px_24px_rgba(0,0,0,0.34)]"
                : "drop-shadow-[0_6px_8px_rgba(0,0,0,0.18)]"
            }`}
          />
        </span>

        <span
          className="absolute inset-0 z-10 block overflow-hidden rounded-[3px] border-r-[8px] border-[#d7c9b4] bg-[#211b17] shadow-[20px_25px_36px_rgba(0,0,0,0.38)]"
          style={{ transform: "translateZ(0)" }}
        >
          <Image
            src={album.cover}
            alt={`${album.title} album cover`}
            fill
            sizes={`${Math.ceil(targetSize)}px`}
            className="object-contain"
          />
        </span>

        {!extracted && !moving ? (
          <button
            type="button"
            data-fallback-primary
            data-fallback-action="return"
            aria-label={`Return ${album.title} to the shelf`}
            onClick={onReturn}
            className="absolute inset-0 z-20 cursor-pointer rounded-[3px] bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
          />
        ) : null}

        {!extracted && !moving ? (
          <button
            type="button"
            data-fallback-action="extract"
            aria-label={`Slide the record for ${album.title} out of its sleeve`}
            onClick={onExtract}
            className="absolute top-[18%] right-[-28%] z-20 h-[64%] min-h-11 w-[34%] min-w-11 cursor-pointer rounded-full bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
          />
        ) : null}

        {extracted && !moving ? (
          <button
            type="button"
            data-fallback-primary
            data-fallback-action="reinsert"
            aria-label={`Return the record for ${album.title} to its sleeve`}
            onClick={onReinsert}
            className="absolute inset-0 z-20 cursor-pointer rounded-[3px] bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
          />
        ) : null}
      </div>
    </div>
  );
}

function FallbackObject({
  album,
  kind,
  targetSize,
}: Pick<AlbumObjectViewerProps, "album" | "kind"> & {
  targetSize: number;
}) {
  return (
    <div className="flex size-full items-center justify-center [perspective:900px]">
      {kind === "record" ? (
        <span style={{ height: targetSize, width: targetSize }}>
          <RecordFace
            album={album}
            sizes={`${Math.ceil(targetSize)}px`}
            className="size-full rotate-x-[9deg] rotate-y-[-16deg] drop-shadow-[0_24px_26px_rgba(0,0,0,0.38)]"
          />
        </span>
      ) : (
        <span
          className="relative block rotate-x-[5deg] rotate-y-[-15deg] overflow-hidden rounded-[3px] border-r-[8px] border-[#d7c9b4] bg-[#211b17] shadow-[20px_25px_36px_rgba(0,0,0,0.38)]"
          style={{ height: targetSize, width: targetSize }}
        >
          <Image
            src={album.cover}
            alt={`${album.title} album cover`}
            fill
            sizes={`${Math.ceil(targetSize)}px`}
            className="object-contain"
          />
        </span>
      )}
    </div>
  );
}

interface ThreeStageProps {
  album: MusicAlbum;
  followLinkedPose?: boolean;
  interactive?: boolean;
  kind: InspectionKind;
  leadLinkedPose?: boolean;
  linkedActionRef?: MutableRefObject<HTMLButtonElement | null>;
  linkedOffsetDuration?: number;
  linkedOffsetTarget?: number;
  linkedPoseIndex?: number;
  linkedPoses?: MutableRefObject<Array<LinkedPose | null>>;
  mode?: PersistentObjectMode;
  onActivate?: () => void;
  onTransferPointerDown?: (
    direction: RecordTransferDirection,
    index: number,
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => void;
  onTransferPointerMove?: (
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => void;
  onTransferPointerUp?: (pointerId: number) => void;
  powered?: boolean;
  reduceMotion: boolean;
  targetSize: number;
  transferDirection?: RecordTransferDirection;
  transferRuntime?: MutableRefObject<RecordTransferRuntime>;
  onFallback: () => void;
  onReady?: () => void;
}

function ThreeStage({
  album,
  followLinkedPose = false,
  interactive = true,
  kind,
  leadLinkedPose = false,
  linkedActionRef,
  linkedOffsetDuration = 0,
  linkedOffsetTarget = 0,
  linkedPoseIndex = -1,
  linkedPoses,
  mode = "inspection",
  onActivate,
  onTransferPointerDown,
  onTransferPointerMove,
  onTransferPointerUp,
  powered = true,
  reduceMotion,
  targetSize,
  transferDirection,
  transferRuntime,
  onFallback,
  onReady,
}: ThreeStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<{ sync: () => void } | null>(null);
  const onFallbackRef = useRef(onFallback);
  const onReadyRef = useRef(onReady);
  const runtimeRef = useRef({
    followLinkedPose,
    interactive,
    leadLinkedPose,
    linkedActionRef,
    linkedOffsetDuration,
    linkedOffsetTarget,
    linkedPoseIndex,
    linkedPoses,
    mode,
    onActivate,
    onTransferPointerDown,
    onTransferPointerMove,
    onTransferPointerUp,
    powered,
    targetSize,
    transferDirection,
    transferRuntime,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stageElement = canvas.parentElement;

    const context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!context) {
      onFallbackRef.current();
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        context,
        powerPreference: "high-performance",
      });
    } catch {
      onFallbackRef.current();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      1,
      0.1,
      100,
    );
    camera.position.set(0, 0, 8);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environmentTarget = pmrem.fromScene(room, 0.04);
    scene.environment = environmentTarget.texture;

    scene.add(new THREE.HemisphereLight(0xfff8ee, 0x2b2119, 0.48));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.25);
    key.position.set(-3.5, 4.4, 5.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(
      new THREE.Color(album.accent),
      0.42,
    );
    rim.position.set(4.5, 1.2, 2.5);
    scene.add(rim);

    const model = new THREE.Group();
    scene.add(model);

    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    let disposed = false;
    let coverTexture: THREE.Texture | null = null;
    let readySent = false;

    const requestRender = () => {
      if (!disposed) renderer.render(scene, camera);
    };
    const markReady = () => {
      if (readySent || disposed) return;
      readySent = true;
      requestRender();
      onReadyRef.current?.();
    };

    coverTexture = textureLoader.load(
      album.cover,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(maxAnisotropy, 8);
        texture.needsUpdate = true;
        requestRender();
        markReady();
      },
      undefined,
      () => {
        if (!disposed) onFallbackRef.current();
      },
    );
    coverTexture.colorSpace = THREE.SRGBColorSpace;
    textures.push(coverTexture);

    if (kind === "record") {
      const grooveTexture = makeGrooveTexture();
      grooveTexture.anisotropy = Math.min(maxAnisotropy, 8);
      const vinylTexture = textureLoader.load(
        "/on-rotation/vinyl-record.png",
        (texture) => {
          texture.colorSpace = THREE.NoColorSpace;
          texture.anisotropy = Math.min(maxAnisotropy, 8);
          texture.needsUpdate = true;
          requestRender();
        },
      );
      vinylTexture.colorSpace = THREE.NoColorSpace;
      vinylTexture.anisotropy = Math.min(maxAnisotropy, 8);
      vinylTexture.repeat.set(0.87, 0.87);
      vinylTexture.offset.set(0.065, 0.065);
      textures.push(grooveTexture, vinylTexture);

      const vinylMaterial = new THREE.MeshPhysicalMaterial({
        bumpMap: grooveTexture,
        bumpScale: 0.038,
        // A highly polished environment map produces a small, hard-edged
        // room-card reflection that travels around the record while it spins.
        // Keep the vinyl finish tactile, but diffuse enough for its sheen to
        // stay stable against the photographed turntable below it.
        clearcoat: 0.52,
        clearcoatRoughness: 0.44,
        clearcoatRoughnessMap: vinylTexture,
        color: 0x101010,
        envMapIntensity: 0.28,
        iridescence: 0.04,
        iridescenceIOR: 1.32,
        metalness: 0.06,
        roughness: 0.54,
        roughnessMap: vinylTexture,
        sheen: 0.04,
        sheenColor: new THREE.Color(album.accent),
        specularColor: new THREE.Color(album.accent).lerp(
          new THREE.Color(0xffffff),
          0.48,
        ),
        specularIntensity: 0.34,
      });
      const vinylEdgeMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.22,
        clearcoatRoughness: 0.58,
        color: 0x060606,
        envMapIntensity: 0.14,
        metalness: 0.04,
        roughness: 0.5,
      });
      materials.push(vinylMaterial, vinylEdgeMaterial);

      const discGeometry = new THREE.CylinderGeometry(
        1.9,
        1.9,
        0.075,
        128,
      );
      discGeometry.rotateX(Math.PI / 2);
      geometries.push(discGeometry);
      model.add(
        new THREE.Mesh(discGeometry, [
          vinylEdgeMaterial,
          vinylMaterial,
          vinylMaterial,
        ]),
      );

      const labelMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.12,
        clearcoatRoughness: 0.68,
        envMapIntensity: 0.22,
        map: coverTexture,
        metalness: 0,
        roughness: 0.72,
        side: THREE.DoubleSide,
      });
      materials.push(labelMaterial);
      const labelGeometry = new THREE.RingGeometry(0.065, 0.57, 96);
      geometries.push(labelGeometry);

      const frontLabel = new THREE.Mesh(labelGeometry, labelMaterial);
      frontLabel.position.z = 0.041;
      model.add(frontLabel);

      const backLabel = new THREE.Mesh(labelGeometry, labelMaterial);
      backLabel.position.z = -0.041;
      backLabel.rotation.y = Math.PI;
      model.add(backLabel);

      const holeMaterial = new THREE.MeshStandardMaterial({
        color: 0x020202,
        metalness: 0.22,
        roughness: 0.3,
      });
      materials.push(holeMaterial);
      const holeGeometry = new THREE.CylinderGeometry(
        0.058,
        0.058,
        0.11,
        32,
      );
      holeGeometry.rotateX(Math.PI / 2);
      geometries.push(holeGeometry);
      model.add(new THREE.Mesh(holeGeometry, holeMaterial));
    } else {
      const backTexture = makeSleeveBackTexture(album);
      const edgeTexture = makePaperTexture(album.accent);
      const spineTexture = makeSpineTexture(album);
      backTexture.anisotropy = Math.min(maxAnisotropy, 8);
      edgeTexture.anisotropy = Math.min(maxAnisotropy, 8);
      spineTexture.anisotropy = Math.min(maxAnisotropy, 8);
      textures.push(backTexture, edgeTexture, spineTexture);

      const edgeMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.08,
        color: new THREE.Color(album.accent).lerp(
          new THREE.Color(0xefe3d2),
          0.28,
        ),
        envMapIntensity: 0.24,
        map: edgeTexture,
        metalness: 0,
        roughness: 0.76,
      });
      const frontMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.08,
        clearcoatRoughness: 0.78,
        envMapIntensity: 0.12,
        map: coverTexture,
        metalness: 0,
        roughness: 0.84,
      });
      const backMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.1,
        clearcoatRoughness: 0.7,
        envMapIntensity: 0.2,
        map: backTexture,
        metalness: 0,
        roughness: 0.72,
      });
      const spineMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.12,
        clearcoatRoughness: 0.72,
        envMapIntensity: 0.2,
        map: spineTexture,
        metalness: 0,
        roughness: 0.68,
      });
      materials.push(
        edgeMaterial,
        frontMaterial,
        backMaterial,
        spineMaterial,
      );

      const sleeveGeometry = new THREE.BoxGeometry(
        SLEEVE_MODEL_WIDTH,
        SLEEVE_MODEL_WIDTH,
        0.14,
      );
      geometries.push(sleeveGeometry);
      model.add(
        new THREE.Mesh(sleeveGeometry, [
          spineMaterial,
          spineMaterial,
          edgeMaterial,
          edgeMaterial,
          frontMaterial,
          backMaterial,
        ]),
      );
    }

    const baseRotation = {
      x: kind === "record" ? -0.18 : -0.1,
      y: kind === "record" ? -0.38 : -0.34,
    };
    const dockedRotation = {
      x: kind === "record" ? 0 : -0.035,
      y: 0,
    };
    const platterRotation = {
      x: kind === "record" ? -Math.acos(0.62) : dockedRotation.x,
      y: 0,
    };
    const rotationForMode = (nextMode: PersistentObjectMode) => {
      if (nextMode === "inspection") return baseRotation;
      if (nextMode === "platter") return platterRotation;
      if (nextMode === "transfer") return baseRotation;
      return dockedRotation;
    };
    const modelWidthAt = (rotation: { x: number; y: number }) => {
      model.rotation.set(rotation.x, rotation.y, 0);
      model.updateMatrixWorld(true);
      return Math.max(
        new THREE.Box3()
          .setFromObject(model)
          .getSize(new THREE.Vector3()).x,
        Number.EPSILON,
      );
    };
    const dockedWidth = modelWidthAt(dockedRotation);
    const inspectionWidth = modelWidthAt(baseRotation);
    const platterWidth = modelWidthAt(platterRotation);
    let currentMode = runtimeRef.current.mode;
    let followingLinkedPose = runtimeRef.current.followLinkedPose;
    const initialRotation = rotationForMode(currentMode);
    model.rotation.set(initialRotation.x, initialRotation.y, 0);
    const currentRotation = { ...initialRotation };
    const targetRotation = { ...initialRotation };
    const velocity = { x: 0, y: 0 };
    let dragging = false;
    let interacted = false;
    let lastX = 0;
    let lastY = 0;
    let pointerTravel = 0;
    let pressBeganOnObject = false;
    let startedAt = performance.now();
    let lastFrameAt = startedAt;
    let poseTransitionStartedAt = 0;
    let poseTransitionUntil = 0;
    const poseFromRotation = { ...initialRotation };
    let linkedPoseTransitionStartedAt = 0;
    let linkedPoseTransitionUntil = 0;
    const linkedPoseFromRotation = { ...initialRotation };
    let currentLinkedOffsetTarget =
      runtimeRef.current.linkedOffsetTarget;
    let linkedOffsetAmount = currentLinkedOffsetTarget;
    let linkedOffsetFrom = linkedOffsetAmount;
    let linkedOffsetTransitionStartedAt = 0;
    let linkedOffsetTransitionUntil = 0;
    const linkedRecordCenterLocal = new THREE.Vector3(
      SLEEVE_MODEL_WIDTH * RECORD_CENTER_OFFSET_RATIO,
      0,
      0,
    );
    const linkedRecordCenterWorld = new THREE.Vector3();
    const linkedRecordCenterProjected = new THREE.Vector3();
    const linkedModelOriginWorld = new THREE.Vector3();
    let spinRotation = 0;

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const transfer = runtimeRef.current.transferRuntime?.current;
      const transferring =
        transfer?.active &&
        transfer.index === runtimeRef.current.linkedPoseIndex;
      const visibleTargetSize =
        transferring && kind === "record"
          ? transfer.recordSize
          : runtimeRef.current.targetSize;
      const targetFraction = Math.min(
        visibleTargetSize / width,
        0.98,
      );
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov =
        2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const fittedWidth =
        currentMode === "inspection" ||
        currentMode === "transfer"
          ? inspectionWidth
          : currentMode === "platter"
            ? platterWidth
            : dockedWidth;
      camera.position.z =
        fittedWidth /
        (2 * Math.tan(horizontalFov / 2) * targetFraction);
      camera.updateProjectionMatrix();
      requestRender();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const pointerIsOverObject = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const objectSize = Math.min(
        runtimeRef.current.targetSize,
        bounds.width,
        bounds.height,
      );
      const objectLeft = bounds.left + (bounds.width - objectSize) / 2;
      const objectTop = bounds.top + (bounds.height - objectSize) / 2;
      return (
        event.clientX >= objectLeft &&
        event.clientX <= objectLeft + objectSize &&
        event.clientY >= objectTop &&
        event.clientY <= objectTop + objectSize
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!runtimeRef.current.interactive) return;
      dragging = true;
      velocity.x = 0;
      velocity.y = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      pointerTravel = 0;
      pressBeganOnObject = pointerIsOverObject(event);
      canvas.setPointerCapture(event.pointerId);
      canvas.focus();
      const transferDirection =
        runtimeRef.current.transferDirection;
      if (transferDirection) {
        if (!pressBeganOnObject) {
          dragging = false;
          canvas.releasePointerCapture(event.pointerId);
          return;
        }
        runtimeRef.current.onTransferPointerDown?.(
          transferDirection,
          runtimeRef.current.linkedPoseIndex,
          event.pointerId,
          event.clientX,
          event.clientY,
        );
        return;
      }
      interacted = true;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!runtimeRef.current.interactive || !dragging) return;
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      pointerTravel += Math.hypot(deltaX, deltaY);
      if (runtimeRef.current.transferDirection) {
        runtimeRef.current.onTransferPointerMove?.(
          event.pointerId,
          event.clientX,
          event.clientY,
        );
        return;
      }
      targetRotation.y += deltaX * 0.009;
      targetRotation.x = THREE.MathUtils.clamp(
        targetRotation.x + deltaY * 0.009,
        -1.35,
        1.35,
      );
      velocity.y = deltaX * 0.00072;
      velocity.x = deltaY * 0.00072;
      requestRender();
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (reduceMotion) {
        velocity.x = 0;
        velocity.y = 0;
        requestRender();
      }
      if (runtimeRef.current.transferDirection) {
        runtimeRef.current.onTransferPointerUp?.(event.pointerId);
        pressBeganOnObject = false;
        return;
      }
      if (
        pointerTravel <= 6 &&
        pressBeganOnObject &&
        pointerIsOverObject(event)
      ) {
        runtimeRef.current.onActivate?.();
      }
      pressBeganOnObject = false;
    };

    const onPointerCancel = (event: PointerEvent) => {
      dragging = false;
      pressBeganOnObject = false;
      if (runtimeRef.current.transferDirection) {
        runtimeRef.current.onTransferPointerUp?.(event.pointerId);
      }
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!runtimeRef.current.interactive) return;
      if (runtimeRef.current.transferDirection) return;
      const step = event.shiftKey ? 0.28 : 0.14;
      if (
        runtimeRef.current.onActivate &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        runtimeRef.current.onActivate();
        return;
      }
      if (event.key === "ArrowLeft") targetRotation.y -= step;
      else if (event.key === "ArrowRight") targetRotation.y += step;
      else if (event.key === "ArrowUp") {
        targetRotation.x = THREE.MathUtils.clamp(
          targetRotation.x - step,
          -1.35,
          1.35,
        );
      } else if (event.key === "ArrowDown") {
        targetRotation.x = THREE.MathUtils.clamp(
          targetRotation.x + step,
          -1.35,
          1.35,
        );
      } else if (event.key === "Home") {
        targetRotation.x = baseRotation.x;
        targetRotation.y = baseRotation.y;
      } else return;

      event.preventDefault();
      interacted = true;
      velocity.x = 0;
      velocity.y = 0;
      requestRender();
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onFallbackRef.current();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("webglcontextlost", onContextLost);

    const renderFrame = (time: number) => {
      const deltaSeconds = Math.min((time - lastFrameAt) / 1000, 0.1);
      lastFrameAt = time;
      if (!dragging && interacted && !reduceMotion) {
        targetRotation.x += velocity.x;
        targetRotation.y += velocity.y;
        velocity.x *= 0.91;
        velocity.y *= 0.91;
      }

      if (!reduceMotion && time < poseTransitionUntil) {
        const duration = poseTransitionUntil - poseTransitionStartedAt;
        const progress = THREE.MathUtils.clamp(
          (time - poseTransitionStartedAt) / duration,
          0,
          1,
        );
        const eased = 1 - Math.pow(1 - progress, 3);
        currentRotation.x = THREE.MathUtils.lerp(
          poseFromRotation.x,
          targetRotation.x,
          eased,
        );
        currentRotation.y = THREE.MathUtils.lerp(
          poseFromRotation.y,
          targetRotation.y,
          eased,
        );
      } else {
        currentRotation.x = THREE.MathUtils.lerp(
          currentRotation.x,
          targetRotation.x,
          reduceMotion ? 1 : 0.2,
        );
        currentRotation.y = THREE.MathUtils.lerp(
          currentRotation.y,
          targetRotation.y,
          reduceMotion ? 1 : 0.2,
        );
      }
      const runtime = runtimeRef.current;
      const linkedPose =
        runtime.linkedPoseIndex >= 0
          ? runtime.linkedPoses?.current[runtime.linkedPoseIndex]
          : null;
      if (
        reduceMotion ||
        time >= linkedOffsetTransitionUntil ||
        linkedOffsetTransitionUntil <= linkedOffsetTransitionStartedAt
      ) {
        linkedOffsetAmount = currentLinkedOffsetTarget;
      } else {
        const progress = THREE.MathUtils.clamp(
          (time - linkedOffsetTransitionStartedAt) /
            (linkedOffsetTransitionUntil -
              linkedOffsetTransitionStartedAt),
          0,
          1,
        );
        linkedOffsetAmount = THREE.MathUtils.lerp(
          linkedOffsetFrom,
          currentLinkedOffsetTarget,
          inspectionEase(progress),
        );
      }
      if (runtime.followLinkedPose && linkedPose) {
        const progress =
          reduceMotion ||
          time >= linkedPoseTransitionUntil ||
          linkedPoseTransitionUntil <= linkedPoseTransitionStartedAt
            ? 1
            : inspectionEase(
                THREE.MathUtils.clamp(
                  (time - linkedPoseTransitionStartedAt) /
                    (linkedPoseTransitionUntil -
                      linkedPoseTransitionStartedAt),
                  0,
                  1,
                ),
              );
        currentRotation.x = THREE.MathUtils.lerp(
          linkedPoseFromRotation.x,
          linkedPose.x,
          progress,
        );
        currentRotation.y = THREE.MathUtils.lerp(
          linkedPoseFromRotation.y,
          linkedPose.y,
          progress,
        );
        targetRotation.x = linkedPose.x;
        targetRotation.y = linkedPose.y;
      }

      const elapsed = (time - startedAt) / 1000;
      const idleX =
        currentMode === "inspection" &&
        !runtime.followLinkedPose &&
        !reduceMotion &&
        !interacted
          ? Math.sin(elapsed * 0.72) * 0.045
          : 0;
      const idleY =
        currentMode === "inspection" &&
        !runtime.followLinkedPose &&
        !reduceMotion &&
        !interacted
          ? Math.cos(elapsed * 0.58) * 0.075
          : 0;
      if (currentMode === "platter" && runtime.powered && !reduceMotion) {
        spinRotation += deltaSeconds * ((Math.PI * 2) / 3.2);
      }
      model.rotation.x = currentRotation.x + idleX;
      model.rotation.y = currentRotation.y + idleY;
      model.rotation.z = spinRotation;
      model.position.y =
        currentMode === "inspection" &&
        !runtime.followLinkedPose &&
        !reduceMotion &&
        !interacted
          ? Math.sin(elapsed * 0.9) * 0.055
          : 0;
      const activeTransfer = runtime.transferRuntime?.current;
      if (
        activeTransfer?.active &&
        activeTransfer.index === runtime.linkedPoseIndex
      ) {
        const poseProgress = smoothstep(
          0.12,
          0.9,
          activeTransfer.progress,
        );
        const nextX =
          kind === "record"
            ? THREE.MathUtils.lerp(
                activeTransfer.inspectionX,
                platterRotation.x,
                poseProgress,
              )
            : THREE.MathUtils.lerp(
                activeTransfer.inspectionX,
                dockedRotation.x,
                inspectionEase(activeTransfer.progress),
              );
        const nextY =
          kind === "record"
            ? THREE.MathUtils.lerp(
                activeTransfer.inspectionY,
                platterRotation.y,
                poseProgress,
              )
            : THREE.MathUtils.lerp(
                activeTransfer.inspectionY,
                dockedRotation.y,
                inspectionEase(activeTransfer.progress),
              );
        currentRotation.x = nextX;
        currentRotation.y = nextY;
        targetRotation.x = nextX;
        targetRotation.y = nextY;
        model.rotation.x = nextX;
        model.rotation.y = nextY;
        model.position.y = 0;
      }
      if (
        runtime.leadLinkedPose &&
        runtime.linkedPoseIndex >= 0 &&
        runtime.linkedPoses
      ) {
        model.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);
        linkedModelOriginWorld
          .set(0, 0, 0)
          .applyMatrix4(model.matrixWorld);
        linkedRecordCenterWorld
          .copy(linkedRecordCenterLocal)
          .applyMatrix4(model.matrixWorld);
        linkedRecordCenterProjected
          .copy(linkedRecordCenterWorld)
          .project(camera);
        const centerDistance = Math.max(
          camera.position.z - linkedModelOriginWorld.z,
          Number.EPSILON,
        );
        const recordDistance = Math.max(
          camera.position.z - linkedRecordCenterWorld.z,
          Number.EPSILON,
        );
        const offsetX =
          linkedRecordCenterProjected.x * canvas.clientWidth * 0.5 -
          runtime.targetSize * RECORD_CENTER_OFFSET_RATIO;
        const offsetY =
          -linkedRecordCenterProjected.y * canvas.clientHeight * 0.5;
        const scale = clamp(centerDistance / recordDistance, 0.86, 1.14);
        const storedPose =
          runtime.linkedPoses.current[runtime.linkedPoseIndex];
        if (storedPose) {
          storedPose.offsetX = offsetX;
          storedPose.offsetY = offsetY;
          storedPose.scale = scale;
          storedPose.x = model.rotation.x;
          storedPose.y = model.rotation.y;
        } else {
          runtime.linkedPoses.current[runtime.linkedPoseIndex] = {
            offsetX,
            offsetY,
            scale,
            x: model.rotation.x,
            y: model.rotation.y,
          };
        }
      }
      if (kind === "record" && stageElement) {
        const offsetX = (linkedPose?.offsetX ?? 0) * linkedOffsetAmount;
        const offsetY = (linkedPose?.offsetY ?? 0) * linkedOffsetAmount;
        const scale = THREE.MathUtils.lerp(
          1,
          linkedPose?.scale ?? 1,
          linkedOffsetAmount,
        );
        const linked =
          linkedOffsetAmount > 0.0001 &&
          Boolean(linkedPose);
        stageElement.style.transform = linked
          ? `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`
          : "";
        stageElement.style.willChange =
          linked || time < linkedOffsetTransitionUntil
            ? "transform"
            : "";
        const linkedAction = runtime.linkedActionRef?.current;
        if (linkedAction) {
          linkedAction.style.transform = linked
            ? `translate3d(${offsetX}px, ${offsetY}px, 0)`
            : "";
          linkedAction.style.willChange = linked ? "transform" : "";
        }
      }
      renderer.render(scene, camera);

      const stillMoving =
        Math.abs(currentRotation.x - targetRotation.x) > 0.001 ||
        Math.abs(currentRotation.y - targetRotation.y) > 0.001 ||
        Math.abs(velocity.x) > 0.00001 ||
        Math.abs(velocity.y) > 0.00001 ||
        time < poseTransitionUntil ||
        time < linkedOffsetTransitionUntil ||
        time < linkedPoseTransitionUntil;
      if (
        (currentMode === "docked" ||
          (currentMode === "platter" && !runtime.powered)) &&
        !dragging &&
        !stillMoving &&
        !document.hidden
      ) {
        renderer.setAnimationLoop(null);
      }
    };

    const syncVisibility = () => {
      if (document.hidden || reduceMotion) {
        renderer.setAnimationLoop(null);
        if (!document.hidden) renderFrame(performance.now());
      } else {
        startedAt = performance.now();
        lastFrameAt = startedAt;
        renderer.setAnimationLoop(renderFrame);
      }
    };
    const syncRuntime = () => {
      const nextMode = runtimeRef.current.mode;
      const nextFollowingLinkedPose =
        runtimeRef.current.followLinkedPose;
      const nextLinkedOffsetTarget =
        runtimeRef.current.linkedOffsetTarget;
      if (nextMode !== currentMode) {
        currentMode = nextMode;
        const nextRotation = rotationForMode(currentMode);
        poseFromRotation.x = currentRotation.x;
        poseFromRotation.y = currentRotation.y;
        targetRotation.x = nextRotation.x;
        targetRotation.y = nextRotation.y;
        interacted = false;
        velocity.x = 0;
        velocity.y = 0;
        poseTransitionStartedAt = performance.now();
        poseTransitionUntil =
          poseTransitionStartedAt +
          (currentMode === "inspection"
            ? INSPECTION_OPEN_MS
            : INSPECTION_CLOSE_MS);
      }
      if (nextFollowingLinkedPose !== followingLinkedPose) {
        followingLinkedPose = nextFollowingLinkedPose;
        linkedPoseFromRotation.x = currentRotation.x;
        linkedPoseFromRotation.y = currentRotation.y;
        linkedPoseTransitionStartedAt = performance.now();
        linkedPoseTransitionUntil =
          linkedPoseTransitionStartedAt +
          (followingLinkedPose
            ? runtimeRef.current.linkedOffsetDuration
            : 0);
        interacted = false;
        velocity.x = 0;
        velocity.y = 0;
      }
      if (nextLinkedOffsetTarget !== currentLinkedOffsetTarget) {
        linkedOffsetFrom = linkedOffsetAmount;
        currentLinkedOffsetTarget = nextLinkedOffsetTarget;
        linkedOffsetTransitionStartedAt = performance.now();
        linkedOffsetTransitionUntil =
          linkedOffsetTransitionStartedAt +
          runtimeRef.current.linkedOffsetDuration;
      }
      resize();
      if (reduceMotion) {
        currentRotation.x = targetRotation.x;
        currentRotation.y = targetRotation.y;
        renderFrame(performance.now());
      } else if (!document.hidden) {
        lastFrameAt = performance.now();
        renderer.setAnimationLoop(renderFrame);
      }
    };
    controllerRef.current = { sync: syncRuntime };
    document.addEventListener("visibilitychange", syncVisibility);
    syncVisibility();

    return () => {
      disposed = true;
      controllerRef.current = null;
      renderer.setAnimationLoop(null);
      if (stageElement && kind === "record") {
        stageElement.style.transform = "";
        stageElement.style.willChange = "";
      }
      const linkedAction = runtimeRef.current.linkedActionRef?.current;
      if (linkedAction) {
        linkedAction.style.transform = "";
        linkedAction.style.willChange = "";
      }
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environmentTarget.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [album, kind, reduceMotion]);

  useEffect(() => {
    onFallbackRef.current = onFallback;
    onReadyRef.current = onReady;
    runtimeRef.current = {
      followLinkedPose,
      interactive,
      leadLinkedPose,
      linkedActionRef,
      linkedOffsetDuration,
      linkedOffsetTarget,
      linkedPoseIndex,
      linkedPoses,
      mode,
      onActivate,
      onTransferPointerDown,
      onTransferPointerMove,
      onTransferPointerUp,
      powered,
      targetSize,
      transferDirection,
      transferRuntime,
    };
    controllerRef.current?.sync();
  }, [
    followLinkedPose,
    interactive,
    leadLinkedPose,
    linkedActionRef,
    linkedOffsetDuration,
    linkedOffsetTarget,
    linkedPoseIndex,
    linkedPoses,
    mode,
    onActivate,
    onFallback,
    onReady,
    onTransferPointerDown,
    onTransferPointerMove,
    onTransferPointerUp,
    powered,
    targetSize,
    transferDirection,
    transferRuntime,
  ]);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={interactive ? 0 : -1}
      aria-label={
        interactive
          ? transferDirection
            ? `Record for ${album.title}. Drag it ${
                transferDirection === "to-platter"
                  ? "toward the turntable"
                  : "back toward its sleeve"
              }.`
            : onActivate
            ? `Interactive 3D ${kind} for ${album.title}. Click or press Enter to return it to the shelf. Drag or use arrow keys to rotate.`
            : `Interactive 3D ${kind} for ${album.title}. Drag or use arrow keys to rotate. Press Escape to exit.`
          : undefined
      }
      className={`block size-full touch-none outline-none ${
        interactive
          ? "cursor-grab active:cursor-grabbing"
          : "pointer-events-none"
      }`}
    />
  );
}

function makeGrooveTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.fillStyle = "#777";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  for (let radius = 150; radius < 500; radius += 5.5) {
    context.strokeStyle =
      radius % 22 < 6 ? "rgba(245,245,245,0.42)" : "rgba(20,20,20,0.28)";
    context.lineWidth = radius % 22 < 6 ? 1.4 : 0.8;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function makeSleeveBackTexture(album: MusicAlbum) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const accent = new THREE.Color(album.accent);
  const base = `#${accent.clone().multiplyScalar(0.54).getHexString()}`;
  const light = `#${accent
    .clone()
    .lerp(new THREE.Color(0xf4eadb), 0.42)
    .getHexString()}`;

  const gradient = context.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, light);
  gradient.addColorStop(0.58, album.accent);
  gradient.addColorStop(1, base);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 1024);

  context.globalAlpha = 0.16;
  for (let y = 0; y < 1024; y += 3) {
    const value = (Math.sin(y * 12.43) + 1) * 16;
    context.fillStyle = `rgb(${value} ${value} ${value})`;
    context.fillRect(0, y, 1024, 1);
  }
  context.globalAlpha = 1;

  context.fillStyle = "rgba(250,244,234,0.92)";
  context.font = "600 54px Arial, sans-serif";
  context.textBaseline = "top";
  wrapCanvasText(context, album.title, 86, 94, 850, 66);
  context.font = "400 30px Arial, sans-serif";
  context.fillStyle = "rgba(250,244,234,0.76)";
  context.fillText(album.artist.toUpperCase(), 90, 280);

  context.strokeStyle = "rgba(250,244,234,0.42)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(90, 350);
  context.lineTo(934, 350);
  context.stroke();

  context.font = "500 22px Arial, sans-serif";
  context.fillStyle = "rgba(250,244,234,0.72)";
  context.fillText("ON ROTATION · PERSONAL LISTENING COPY", 90, 386);
  context.font = "400 18px Arial, sans-serif";
  context.fillStyle = "rgba(250,244,234,0.54)";
  context.fillText("HANDLE WITH CARE · 33⅓ RPM · STEREO", 90, 424);

  context.fillStyle = "rgba(250,244,234,0.68)";
  for (let index = 0; index < 34; index += 1) {
    const width = index % 5 === 0 ? 5 : index % 3 === 0 ? 3 : 2;
    context.fillRect(90 + index * 9, 820, width, 92);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePaperTexture(accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.fillStyle = accent;
  context.fillRect(0, 0, 256, 256);
  for (let index = 0; index < 3200; index += 1) {
    const alpha = 0.025 + Math.random() * 0.055;
    context.fillStyle =
      index % 2 === 0
        ? `rgba(255,255,255,${alpha})`
        : `rgba(0,0,0,${alpha})`;
    context.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function makeSpineTexture(album: MusicAlbum) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const accent = new THREE.Color(album.accent);
  context.fillStyle = `#${accent
    .clone()
    .multiplyScalar(0.7)
    .getHexString()}`;
  context.fillRect(0, 0, 256, 1024);

  context.save();
  context.translate(128, 932);
  context.rotate(-Math.PI / 2);
  context.fillStyle = "rgba(250,244,234,0.9)";
  context.font = "600 52px Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillText(album.title, 0, 0, 760);
  context.restore();

  context.save();
  context.translate(202, 932);
  context.rotate(-Math.PI / 2);
  context.fillStyle = "rgba(250,244,234,0.62)";
  context.font = "400 28px Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillText(album.artist.toUpperCase(), 0, 0, 760);
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = next;
    }
  });
  context.fillText(line, x, lineY);
}
