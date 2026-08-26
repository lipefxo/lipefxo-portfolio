"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

type RippleGridProps = {
  className?: string;
  enableRainbow?: boolean;
  gridColor?: string;
  rippleIntensity?: number;
  gridSize?: number;
  gridThickness?: number;
  fadeDistance?: number;
  vignetteStrength?: number;
  glowIntensity?: number;
  opacity?: number;
  gridRotation?: number;
  mouseInteraction?: boolean;
  mouseInteractionRadius?: number;
};

type Uniform<T> = { value: T };

type RippleUniforms = {
  iTime: Uniform<number>;
  iResolution: Uniform<[number, number]>;
  enableRainbow: Uniform<boolean>;
  gridColor: Uniform<[number, number, number]>;
  rippleIntensity: Uniform<number>;
  gridSize: Uniform<number>;
  gridThickness: Uniform<number>;
  fadeDistance: Uniform<number>;
  vignetteStrength: Uniform<number>;
  glowIntensity: Uniform<number>;
  opacity: Uniform<number>;
  gridRotation: Uniform<number>;
  mouseInteraction: Uniform<boolean>;
  mousePosition: Uniform<[number, number]>;
  mouseInfluence: Uniform<number>;
  mouseInteractionRadius: Uniform<number>;
};

const HEX_COLOR_PATTERN = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform bool enableRainbow;
uniform vec3 gridColor;
uniform float rippleIntensity;
uniform float gridSize;
uniform float gridThickness;
uniform float fadeDistance;
uniform float vignetteStrength;
uniform float glowIntensity;
uniform float opacity;
uniform float gridRotation;
uniform bool mouseInteraction;
uniform vec2 mousePosition;
uniform float mouseInfluence;
uniform float mouseInteractionRadius;
varying vec2 vUv;

const float PI = 3.141592;

mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  if (gridRotation != 0.0) {
    uv = rotate(gridRotation * PI / 180.0) * uv;
  }

  float dist = length(uv);
  float func = sin(PI * (iTime - dist));
  vec2 rippleUv = uv + uv * func * rippleIntensity;

  if (mouseInteraction && mouseInfluence > 0.0) {
    vec2 mouseUv = mousePosition * 2.0 - 1.0;
    mouseUv.x *= iResolution.x / iResolution.y;
    float mouseDist = length(uv - mouseUv);
    float influence = mouseInfluence * exp(
      -mouseDist * mouseDist /
      (mouseInteractionRadius * mouseInteractionRadius)
    );
    float mouseWave = sin(PI * (iTime * 2.0 - mouseDist * 3.0)) * influence;
    vec2 mouseDirection = (uv - mouseUv) / max(mouseDist, 0.0001);
    rippleUv += mouseDirection * mouseWave * rippleIntensity * 0.3;
  }

  vec2 a = sin(gridSize * 0.5 * PI * rippleUv - PI / 2.0);
  vec2 b = abs(a);
  float aaWidth = 0.5;
  vec2 smoothB = vec2(
    smoothstep(0.0, aaWidth, b.x),
    smoothstep(0.0, aaWidth, b.y)
  );

  vec3 color = vec3(0.0);
  color += exp(-gridThickness * smoothB.x * (0.8 + 0.5 * sin(PI * iTime)));
  color += exp(-gridThickness * smoothB.y);
  color += 0.5 * exp(-(gridThickness / 4.0) * sin(smoothB.x));
  color += 0.5 * exp(-(gridThickness / 3.0) * smoothB.y);

  if (glowIntensity > 0.0) {
    color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.x);
    color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.y);
  }

  float centerFade = exp(-2.0 * clamp(pow(dist, fadeDistance), 0.0, 1.0));
  vec2 vignetteCoords = vUv - 0.5;
  float vignetteDistance = length(vignetteCoords);
  float vignette = 1.0 - pow(vignetteDistance * 2.0, vignetteStrength);
  vignette = clamp(vignette, 0.0, 1.0);

  vec3 tint;
  if (enableRainbow) {
    tint = vec3(
      uv.x * 0.5 + 0.5 * sin(iTime),
      uv.y * 0.5 + 0.5 * cos(iTime),
      pow(cos(iTime), 4.0)
    ) + 0.5;
  } else {
    tint = gridColor;
  }

  float finalFade = centerFade * vignette;
  float alpha = length(color) * finalFade * opacity;
  gl_FragColor = vec4(color * tint * finalFade * opacity, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const result = HEX_COLOR_PATTERN.exec(hex);

  return result
    ? [
        Number.parseInt(result[1], 16) / 255,
        Number.parseInt(result[2], 16) / 255,
        Number.parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
}

export function RippleGrid({
  className,
  enableRainbow = false,
  gridColor = "#ffffff",
  rippleIntensity = 0.05,
  gridSize = 10,
  gridThickness = 15,
  fadeDistance = 1.5,
  vignetteStrength = 2,
  glowIntensity = 0.1,
  opacity = 1,
  gridRotation = 0,
  mouseInteraction = true,
  mouseInteractionRadius = 1,
}: RippleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<RippleUniforms | null>(null);
  const mouseInfluenceTargetRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;

    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio, 2),
        alpha: true,
      });
    } catch (error) {
      console.error("Unable to initialize the RippleGrid WebGL renderer.", error);
      return;
    }

    const gl = renderer.gl;
    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const canvas = gl.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const uniforms: RippleUniforms = {
      iTime: { value: 0 },
      iResolution: { value: [1, 1] },
      enableRainbow: { value: enableRainbow },
      gridColor: { value: hexToRgb(gridColor) },
      rippleIntensity: { value: rippleIntensity },
      gridSize: { value: gridSize },
      gridThickness: { value: gridThickness },
      fadeDistance: { value: fadeDistance },
      vignetteStrength: { value: vignetteStrength },
      glowIntensity: { value: glowIntensity },
      opacity: { value: opacity },
      gridRotation: { value: gridRotation },
      mouseInteraction: { value: mouseInteraction },
      mousePosition: { value: [0.5, 0.5] },
      mouseInfluence: { value: 0 },
      mouseInteractionRadius: { value: mouseInteractionRadius },
    };
    uniformsRef.current = uniforms;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      cullFace: false,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(gl, { geometry, program });
    const mousePosition = { x: 0.5, y: 0.5 };
    const targetMouse = { x: 0.5, y: 0.5 };
    let animationFrameId: number | null = null;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

    const drawFrame = (time: number) => {
      uniforms.iTime.value = motionPreference.matches ? 0 : time * 0.001;
      mousePosition.x += (targetMouse.x - mousePosition.x) * 0.1;
      mousePosition.y += (targetMouse.y - mousePosition.y) * 0.1;
      uniforms.mouseInfluence.value +=
        (mouseInfluenceTargetRef.current - uniforms.mouseInfluence.value) * 0.05;
      uniforms.mousePosition.value = [mousePosition.x, mousePosition.y];
      renderer.render({ scene: mesh });

      animationFrameId =
        document.hidden || motionPreference.matches
          ? null
          : window.requestAnimationFrame(drawFrame);
    };

    const startAnimation = () => {
      if (animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(drawFrame);
      }
    };

    const syncAnimation = () => {
      if (document.hidden || motionPreference.matches) {
        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        drawFrame(0);
        return;
      }

      startAnimation();
    };

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height);
      uniforms.iResolution.value = [width, height];

      if (document.hidden || motionPreference.matches) {
        renderer.render({ scene: mesh });
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!uniforms.mouseInteraction.value) {
        mouseInfluenceTargetRef.current = 0;
        return;
      }

      const rect = container.getBoundingClientRect();
      targetMouse.x = (event.clientX - rect.left) / rect.width;
      targetMouse.y = 1 - (event.clientY - rect.top) / rect.height;
      mouseInfluenceTargetRef.current = 1;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("visibilitychange", syncAnimation);
    motionPreference.addEventListener("change", syncAnimation);

    resize();
    syncAnimation();

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      uniformsRef.current = null;
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", syncAnimation);
      motionPreference.removeEventListener("change", syncAnimation);
      geometry.remove();
      program.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
    // Initialized once; live prop updates are applied through uniforms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uniforms = uniformsRef.current;
    if (!uniforms) return;

    uniforms.enableRainbow.value = enableRainbow;
    uniforms.gridColor.value = hexToRgb(gridColor);
    uniforms.rippleIntensity.value = rippleIntensity;
    uniforms.gridSize.value = gridSize;
    uniforms.gridThickness.value = gridThickness;
    uniforms.fadeDistance.value = fadeDistance;
    uniforms.vignetteStrength.value = vignetteStrength;
    uniforms.glowIntensity.value = glowIntensity;
    uniforms.opacity.value = opacity;
    uniforms.gridRotation.value = gridRotation;
    uniforms.mouseInteraction.value = mouseInteraction;
    uniforms.mouseInteractionRadius.value = mouseInteractionRadius;

    if (!mouseInteraction) {
      mouseInfluenceTargetRef.current = 0;
    }
  }, [
    enableRainbow,
    fadeDistance,
    glowIntensity,
    gridColor,
    gridRotation,
    gridSize,
    gridThickness,
    mouseInteraction,
    mouseInteractionRadius,
    opacity,
    rippleIntensity,
    vignetteStrength,
  ]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
