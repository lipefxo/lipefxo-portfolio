"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import s from "./airflow.module.css";

export default function FloatingPanel({
  title,
  code,
  className = "",
  children,
  onClose,
}: {
  title: string;
  code: string;
  className?: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    const reset = () => setOffset({ x: 0, y: 0 });
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);
  const start = (e: PointerEvent<HTMLButtonElement>) => {
    if (
      e.button !== 0 ||
      !e.isPrimary ||
      matchMedia("(max-width: 760px)").matches ||
      !ref.current
    )
      return;
    const rect = ref.current.getBoundingClientRect();
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setMoving(true);
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const x = Math.min(
      Math.max(8 - d.left, e.clientX - d.x),
      innerWidth - 8 - d.left - d.width,
    );
    const y = Math.min(
      Math.max(70 - d.top, e.clientY - d.y),
      Math.max(70 - d.top, innerHeight - 50 - d.top - d.height),
    );
    setOffset({ x: d.offsetX + x, y: d.offsetY + y });
  };
  const end = () => {
    drag.current = null;
    setMoving(false);
  };
  const keyboardMove = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Home") {
      e.preventDefault();
      setOffset({ x: 0, y: 0 });
      return;
    }
    if (!e.key.startsWith("Arrow") || !ref.current) return;
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const step = e.shiftKey ? 40 : 10;
    const x =
      e.key === "ArrowRight"
        ? Math.min(step, innerWidth - rect.right - 8)
        : e.key === "ArrowLeft"
          ? Math.max(-step, 8 - rect.left)
          : 0;
    const y =
      e.key === "ArrowDown"
        ? Math.min(step, innerHeight - rect.bottom - 50)
        : e.key === "ArrowUp"
          ? Math.max(-step, 70 - rect.top)
          : 0;
    setOffset((o) => ({ x: o.x + x, y: o.y + y }));
  };
  return (
    <section
      ref={ref}
      className={`${s.floatingPanel} ${className}`}
      aria-label={title}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        zIndex: moving ? 50 : undefined,
      }}
    >
      <header className={s.panelHeader}>
        <button
          className={s.dragHandle}
          aria-label={`Move ${title.toLowerCase()} panel`}
          title="Drag to move · arrow keys to nudge · Home to reset"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
          onKeyDown={keyboardMove}
        >
          <span>{code}</span>
          <strong>{title}</strong>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="4" cy="3" r=".8" />
            <circle cx="8" cy="3" r=".8" />
            <circle cx="4" cy="6" r=".8" />
            <circle cx="8" cy="6" r=".8" />
            <circle cx="4" cy="9" r=".8" />
            <circle cx="8" cy="9" r=".8" />
          </svg>
        </button>
        {onClose ? (
          <button
            className={s.panelAction}
            aria-label={`Close ${title.toLowerCase()} panel`}
            onClick={onClose}
          >
            ×
          </button>
        ) : (
          <button
            className={s.panelAction}
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${title.toLowerCase()} panel`}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? "+" : "−"}
          </button>
        )}
      </header>
      <div className={s.panelContent} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
