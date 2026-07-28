"use client";

import Image from "next/image";
import { motion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { TurntableControlSoundHandlers } from "./useTurntableControlAudio";

export type TurntableControlVariant = "desktop" | "mobile";

interface TurntableControlsProps {
  disabled: boolean;
  ledIntensity: number;
  onIntensityChange: (value: number) => void;
  onPowerToggle: () => void;
  powered: boolean;
  reduceMotion: boolean;
  sound: TurntableControlSoundHandlers;
  variant: TurntableControlVariant;
}

interface DragState {
  eventTime: number;
  pointerAngle: number;
  pointerId: number;
  value: number;
}

const KNOB_MIN_ANGLE = -135;
const KNOB_MAX_ANGLE = 135;
const KEYBOARD_STEP = 5;
const KEYBOARD_LARGE_STEP = 10;

const VARIANT_STYLES: Record<
  TurntableControlVariant,
  {
    darkImageClass: string;
    knobIndicatorOrbit: string;
    knobPosition: string;
    ledPosition: string;
    ledSize: string;
    switchPosition: string;
    switchOnHeight: number;
    switchOnPosition: {
      height: string;
      left: string;
      top: string;
      width: string;
    };
    switchOnSrc: string;
    switchOnWidth: number;
  }
> = {
  desktop: {
    darkImageClass:
      "dark:brightness-[.82] dark:saturate-[.88] dark:contrast-[1.05]",
    knobIndicatorOrbit:
      "top-[47%] size-[32%] [transform:translate(-50%,-50%)_scaleY(.58)]",
    knobPosition: "left-[75.92%] top-[52%]",
    ledPosition: "left-[90.16%] top-[53.15%]",
    ledSize: "size-[0.42%]",
    switchPosition: "left-[94.02%] top-[51.9%]",
    switchOnHeight: 110,
    switchOnPosition: {
      height: "13.56350185%",
      left: "91.02630222%",
      top: "45.00616523%",
      width: "7.73594636%",
    },
    switchOnSrc: "/on-rotation/turntable-switch-on-desktop.png",
    switchOnWidth: 150,
  },
  mobile: {
    darkImageClass:
      "dark:brightness-[.76] dark:saturate-[.82] dark:contrast-[1.06]",
    knobIndicatorOrbit:
      "top-[46%] size-[38%] [transform:translate(-50%,-50%)_scaleY(.56)]",
    knobPosition: "left-[20.75%] top-[60.45%]",
    ledPosition: "left-[67.15%] top-[57.02%]",
    ledSize: "size-[1.15%]",
    switchPosition: "left-[85.72%] top-[52.85%]",
    switchOnHeight: 180,
    switchOnPosition: {
      height: "14.35406699%",
      left: "76.55502392%",
      top: "44.65709729%",
      width: "20.73365231%",
    },
    switchOnSrc: "/on-rotation/turntable-switch-on-mobile.png",
    switchOnWidth: 260,
  },
};

function clampIntensity(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function intensityToRotation(value: number) {
  return (
    KNOB_MIN_ANGLE +
    (clampIntensity(value) / 100) * (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE)
  );
}

function pointerAngle(
  element: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = element.getBoundingClientRect();
  const x = clientX - (rect.left + rect.width / 2);
  const y = clientY - (rect.top + rect.height / 2);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function normalizedAngleDelta(next: number, previous: number) {
  let delta = next - previous;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

export function TurntableControls({
  disabled,
  ledIntensity,
  onIntensityChange,
  onPowerToggle,
  powered,
  reduceMotion,
  sound,
  variant,
}: TurntableControlsProps) {
  const styles = VARIANT_STYLES[variant];
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewIntensity, setPreviewIntensity] = useState(ledIntensity);

  useEffect(() => {
    if (!dragRef.current) setPreviewIntensity(ledIntensity);
  }, [ledIntensity]);

  useEffect(
    () => () => {
      sound.endKnobRumble();
    },
    [sound],
  );

  useEffect(() => {
    if (!disabled || !dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    setPreviewIntensity(ledIntensity);
    sound.endKnobRumble();
  }, [disabled, ledIntensity, sound]);

  const commitIntensity = (value: number) => {
    const next = clampIntensity(value);
    setPreviewIntensity(next);
    onIntensityChange(next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      eventTime: event.timeStamp,
      pointerAngle: pointerAngle(
        event.currentTarget,
        event.clientX,
        event.clientY,
      ),
      pointerId: event.pointerId,
      value: previewIntensity,
    };
    sound.beginKnobRumble();
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextPointerAngle = pointerAngle(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    const delta = normalizedAngleDelta(nextPointerAngle, drag.pointerAngle);
    const nextValue = clampIntensity(
      drag.value + (delta / (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE)) * 100,
    );
    if (nextValue !== drag.value && Math.abs(delta) > 0.08) {
      sound.updateKnobRumble(delta, event.timeStamp - drag.eventTime);
    }
    dragRef.current = {
      ...drag,
      eventTime: event.timeStamp,
      pointerAngle: nextPointerAngle,
      value: nextValue,
    };
    setPreviewIntensity(nextValue);
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    sound.endKnobRumble();
    setIsDragging(false);
    commitIntensity(drag.value);
  };

  const cancelPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    sound.endKnobRumble();
    setIsDragging(false);
    setPreviewIntensity(ledIntensity);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next = previewIntensity;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowLeft":
        next -= KEYBOARD_STEP;
        break;
      case "ArrowUp":
      case "ArrowRight":
        next += KEYBOARD_STEP;
        break;
      case "PageDown":
        next -= KEYBOARD_LARGE_STEP;
        break;
      case "PageUp":
        next += KEYBOARD_LARGE_STEP;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    const clampedNext = clampIntensity(next);
    if (clampedNext !== previewIntensity) {
      sound.playKnobStep(clampedNext - previewIntensity);
      commitIntensity(clampedNext);
    }
  };

  const handlePowerToggle = () => {
    if (disabled) return;
    sound.playSwitchClick(!powered);
    onPowerToggle();
  };

  const knobRotation = intensityToRotation(previewIntensity);
  const glowStrength = previewIntensity / 100;
  const glowOpacity = powered ? glowStrength : 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-[34]">
      <div
        aria-hidden="true"
        className={`absolute -translate-1/2 rounded-full bg-[#ff3f28] ${styles.ledPosition} ${styles.ledSize}`}
        style={{
          boxShadow: powered
            ? `0 0 ${1.5 + glowStrength * 3.5}px ${0.25 + glowStrength * 0.65}px rgba(255, 48, 28, ${0.35 + glowStrength * 0.35})`
            : "none",
          opacity: glowOpacity,
          transition: reduceMotion
            ? "none"
            : "opacity 140ms ease-out, box-shadow 140ms ease-out",
        }}
      />

      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label="Turntable light brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={previewIntensity}
        aria-valuetext={`${previewIntensity}% brightness`}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={cancelPointerDrag}
        className={`pointer-events-auto absolute flex size-11 -translate-1/2 touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a43] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e9dfd0] ${styles.knobPosition} ${
          disabled ? "pointer-events-none opacity-60" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 ${styles.knobIndicatorOrbit}`}
        >
          <motion.span
            animate={{ rotate: knobRotation }}
            transition={
              reduceMotion || isDragging
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 34 }
            }
            className="absolute inset-0 block"
          >
            <span className="absolute top-0 left-1/2 h-[3px] w-[1.5px] -translate-x-1/2 rounded-full bg-[#3e3932]/80 shadow-[0_0_1px_rgba(255,255,255,0.72)] dark:bg-[#25211d]/85" />
          </motion.span>
        </span>
      </div>

      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: powered ? 1 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.08, ease: "easeOut" }
        }
        className="pointer-events-none absolute z-[1]"
        style={styles.switchOnPosition}
      >
        <Image
          src={styles.switchOnSrc}
          alt=""
          width={styles.switchOnWidth}
          height={styles.switchOnHeight}
          unoptimized
          draggable={false}
          className={`size-full select-none ${styles.darkImageClass}`}
        />
      </motion.div>

      <button
        type="button"
        aria-pressed={powered}
        aria-label={`Turn turntable ${powered ? "off" : "on"}`}
        disabled={disabled}
        onClick={handlePowerToggle}
        className={`pointer-events-auto absolute z-[2] size-11 -translate-1/2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a43] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e9dfd0] disabled:cursor-default ${styles.switchPosition}`}
      />
    </div>
  );
}
