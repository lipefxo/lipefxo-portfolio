"use client";

import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";
import { RippleGrid } from "./RippleGrid";
import styles from "./nxt-level-prototype.module.css";

export function NxtLevelBackground() {
  const grid = useDialKit(
    "Ripple Grid",
    {
      enableRainbow: false,
      gridColor: "#e6e6e6",
      opacity: [0.08, 0, 1, 0.01],
      glowIntensity: [0, 0, 2, 0.01],
      gridSize: [20.3, 1, 40, 0.1],
      gridThickness: [50, 1, 80, 0.5],
      gridRotation: [0, 0, 360, 1],
      rippleIntensity: [0, 0, 0.15, 0.001],
      fadeDistance: [5.8, 0.1, 6, 0.05],
      vignetteStrength: [3.05, 0, 8, 0.05],
      mouseInteraction: false,
      mouseInteractionRadius: [0.2, 0.05, 3, 0.05],
    },
    {
      id: "nxt-level-ripple-grid-v2",
      persist: true,
    },
  );

  return (
    <>
      <RippleGrid
        className={styles.rippleBackdrop}
        enableRainbow={grid.enableRainbow}
        gridColor={grid.gridColor}
        opacity={grid.opacity}
        glowIntensity={grid.glowIntensity}
        gridSize={grid.gridSize}
        gridThickness={grid.gridThickness}
        gridRotation={grid.gridRotation}
        rippleIntensity={grid.rippleIntensity}
        fadeDistance={grid.fadeDistance}
        vignetteStrength={grid.vignetteStrength}
        mouseInteraction={grid.mouseInteraction}
        mouseInteractionRadius={grid.mouseInteractionRadius}
      />
      <DialRoot theme="light" />
    </>
  );
}
