"use client";

import { RippleGrid } from "./RippleGrid";
import styles from "./nxt-level-prototype.module.css";

export function NxtLevelBackground() {
  return (
    <RippleGrid
      className={styles.rippleBackdrop}
      enableRainbow={false}
      gridColor="#e6e6e6"
      opacity={0.08}
      glowIntensity={0}
      gridSize={20.3}
      gridThickness={50}
      gridRotation={0}
      rippleIntensity={0}
      fadeDistance={5.8}
      vignetteStrength={3.05}
      mouseInteraction={false}
      mouseInteractionRadius={0.2}
    />
  );
}
