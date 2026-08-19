"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

export type TopographyColorMode = "elevation" | "uniform" | "alternating";

interface TopographyProps {
  lowColor?: string;
  midColor?: string;
  highColor?: string;
  speed?: number;
  morphAmount?: number;
  morphSpeed?: number;
  bands?: number;
  thickness?: number;
  scale?: number;
  pixelSize?: number;
  glow?: number;
  colorMode?: TopographyColorMode;
  contrast?: number;
  brightness?: number;
  fillBands?: boolean;
  opacity?: number;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  mouseStrength?: number;
  className?: string;
}

type TopographyContext = {
  renderer: Renderer;
  program: Program;
  mesh: Mesh;
  motion: {
    speed: number;
    morphAmount: number;
    morphSpeed: number;
    time: number;
  };
  renderFrame: (time: number) => void;
  requestFrame: () => void;
};

const contextMap = new WeakMap<HTMLDivElement, TopographyContext>();

const controlIndices = [
  [1, -2, 3, -4],
  [9, -8, 7, -6],
  [5, 2, 5, -5],
  [-1, -3, 8, 9],
] as const;

const vertexShader = `#version 300 es
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uMorphAmount;
uniform float uBands;
uniform float uThickness;
uniform float uScale;
uniform float uPixelSize;
uniform float uGlow;
uniform float uColorMode;
uniform float uContrast;
uniform float uBrightness;
uniform float uFillBands;
uniform float uOpacity;
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec2 uMouse;
uniform float uMouseEnabled;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec4 uCtrlA;
uniform vec4 uCtrlB;
uniform vec4 uCtrlC;
uniform vec4 uCtrlD;

out vec4 fragColor;

float bez(float t, vec4 c) {
  float w = 6.2831853 * t;
  return 0.5 * (c.x * sin(w) + c.y * cos(w) + c.z * sin(2.0 * w) + c.w * cos(2.0 * w));
}

float field(vec2 uv) {
  vec2 a = vec2(bez(uv.x, uCtrlA), bez(uv.x, uCtrlB));
  vec2 b = vec2(bez(uv.y, uCtrlC), bez(uv.y, uCtrlD));
  return distance(a, b);
}

vec3 elevationColor(float elevation) {
  vec3 color = mix(uLow, uMid, smoothstep(0.0, 0.5, elevation));
  return mix(color, uHigh, smoothstep(0.5, 1.0, elevation));
}

void main() {
  vec2 resolution = iResolution.xy;
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 scaledUv = (uv - 0.5) / max(uScale, 0.001) + 0.5;
  vec2 sampleUv = scaledUv;

  if (uPixelSize > 1.0) {
    vec2 pixels = resolution / uPixelSize;
    sampleUv = (floor(scaledUv * pixels) + 0.5) / pixels;
  }

  float fieldValue = field(sampleUv);

  if (uMouseEnabled > 0.5) {
    vec2 distanceFromMouse = uv - uMouse;
    distanceFromMouse.x *= resolution.x / max(resolution.y, 1.0);
    float radius = max(uMouseRadius, 0.001);
    float bump = exp(-dot(distanceFromMouse, distanceFromMouse) / (radius * radius)) * uMouseStrength * uMouseActive;
    fieldValue += bump;
  }

  float bands = fieldValue * uBands;
  float bandFraction = fract(bands);
  float lineDistance = min(bandFraction, 1.0 - bandFraction);
  float antialias = fwidth(bands) + 0.0001;
  float mask = 1.0 - smoothstep(uThickness - antialias, uThickness + antialias, lineDistance);
  float glowRadius = uThickness + uGlow * 0.5 + antialias;
  float glow = (1.0 - smoothstep(uThickness, glowRadius, lineDistance)) * step(0.0001, uGlow);
  float elevation = clamp(fieldValue / (uMorphAmount * 2.5 + 0.001), 0.0, 1.0);

  vec3 lineColor;
  if (uColorMode < 0.5) {
    lineColor = elevationColor(elevation);
  } else if (uColorMode < 1.5) {
    lineColor = uMid;
  } else {
    float parity = mod(floor(bands), 2.0);
    lineColor = mix(uMid, uHigh, parity);
  }

  float coverage = clamp(mask + glow * 0.55, 0.0, 1.0);
  coverage = pow(coverage, max(uContrast, 0.001));
  vec3 outputColor = lineColor;
  float outputAlpha = coverage;

  if (uFillBands > 0.5) {
    vec3 fillColor = elevationColor(elevation);
    float fillAlpha = 0.1 * elevation;
    outputColor = mix(fillColor, lineColor, coverage);
    outputAlpha = clamp(coverage + fillAlpha, 0.0, 1.0);
  }

  if (uGrain > 0.5) {
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453);
    outputAlpha += (grain - 0.5) * uGrainIntensity;
  }

  outputColor = clamp(outputColor * uBrightness, 0.0, 1.0);
  float alpha = clamp(outputAlpha, 0.0, 1.0) * uOpacity;
  fragColor = vec4(outputColor * alpha, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];

  return [
    Number.parseInt(result[1], 16) / 255,
    Number.parseInt(result[2], 16) / 255,
    Number.parseInt(result[3], 16) / 255,
  ];
}

function colorModeToFloat(mode: TopographyColorMode) {
  if (mode === "uniform") return 1;
  if (mode === "alternating") return 2;
  return 0;
}

export default function Topography({
  lowColor = "#5227ff",
  midColor = "#ff9ffc",
  highColor = "#ffffff",
  speed = 0.35,
  morphAmount = 3,
  morphSpeed = 0.05,
  bands = 2,
  thickness = 0.01,
  scale = 1,
  pixelSize = 1,
  glow = 0.5,
  colorMode = "elevation",
  contrast = 3,
  brightness = 1,
  fillBands = false,
  opacity = 1,
  grain = true,
  grainIntensity = 0.05,
  mouseInteraction = true,
  mouseRadius = 0.3,
  mouseStrength = 0.4,
  className = "",
}: TopographyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialMotionRef = useRef({ speed, morphAmount, morphSpeed, time: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uMorphAmount: { value: 3 },
        uBands: { value: 2 },
        uThickness: { value: 0.01 },
        uScale: { value: 1 },
        uPixelSize: { value: 1 },
        uGlow: { value: 0.5 },
        uColorMode: { value: 0 },
        uContrast: { value: 3 },
        uBrightness: { value: 1 },
        uFillBands: { value: 0 },
        uOpacity: { value: 1 },
        uGrain: { value: 1 },
        uGrainIntensity: { value: 0.05 },
        uLow: { value: new Float32Array([1, 1, 1]) },
        uMid: { value: new Float32Array([1, 1, 1]) },
        uHigh: { value: new Float32Array([1, 1, 1]) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseEnabled: { value: 1 },
        uMouseRadius: { value: 0.3 },
        uMouseStrength: { value: 0.4 },
        uMouseActive: { value: 0 },
        uCtrlA: { value: new Float32Array(4) },
        uCtrlB: { value: new Float32Array(4) },
        uCtrlC: { value: new Float32Array(4) },
        uCtrlD: { value: new Float32Array(4) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    const motion = initialMotionRef.current;

    const controlArrays = [
      program.uniforms.uCtrlA.value as Float32Array,
      program.uniforms.uCtrlB.value as Float32Array,
      program.uniforms.uCtrlC.value as Float32Array,
      program.uniforms.uCtrlD.value as Float32Array,
    ];

    const updateControls = (time: number) => {
      for (let group = 0; group < controlArrays.length; group += 1) {
        const values = controlArrays[group];
        const indices = controlIndices[group];

        for (let item = 0; item < values.length; item += 1) {
          const index = indices[item];
          values[item] = motion.morphAmount * Math.sin(
            time * motion.speed * Math.sin(index * motion.morphSpeed) + index,
          );
        }
      }
    };

    const renderFrame = (time: number) => {
      motion.time = time;
      program.uniforms.iTime.value = time;
      updateControls(time);
      renderer.render({ scene: mesh });
    };

    renderFrame(0);

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const resolution = program.uniforms.iResolution.value as Float32Array;
      resolution[0] = gl.drawingBufferWidth;
      resolution[1] = gl.drawingBufferHeight;
      renderFrame(motion.time);
    };

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);
    setSize();

    const currentMouse: [number, number] = [0.5, 0.5];
    const targetMouse: [number, number] = [0.5, 0.5];
    let mouseActive = 0;
    let mouseActiveTarget = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse[0] = (event.clientX - rect.left) / rect.width;
      targetMouse[1] = 1 - (event.clientY - rect.top) / rect.height;
      mouseActiveTarget = 1;
      tryStart();
    };

    const onMouseLeave = () => {
      mouseActiveTarget = 0;
      tryStart();
    };

    let animationFrame = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const startTime = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const hasContinuousMotion = () => (
      Math.abs(motion.speed) > 0.0001
      || Number(program.uniforms.uGrain.value) > 0.5
    );

    const hasPendingMouseMotion = () => (
      Math.abs(currentMouse[0] - targetMouse[0]) > 0.0001
      || Math.abs(currentMouse[1] - targetMouse[1]) > 0.0001
      || Math.abs(mouseActive - mouseActiveTarget) > 0.001
    );

    const loop = (timestamp: number) => {
      const time = (timestamp - startTime) * 0.001;
      currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
      currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      const mouse = program.uniforms.uMouse.value as Float32Array;
      mouse[0] = currentMouse[0];
      mouse[1] = currentMouse[1];

      mouseActive += 0.05 * (mouseActiveTarget - mouseActive);
      program.uniforms.uMouseActive.value = mouseActive;
      renderFrame(time);
      if (hasContinuousMotion() || hasPendingMouseMotion()) {
        animationFrame = window.requestAnimationFrame(loop);
      } else {
        animationFrame = 0;
      }
    };

    function tryStart() {
      if (!reduceMotion && isVisible && isPageVisible && animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(loop);
      }
    }

    function tryStop() {
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    }

    contextMap.set(container, {
      renderer,
      program,
      mesh,
      motion,
      renderFrame,
      requestFrame: tryStart,
    });
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) tryStart();
      else tryStop();
    });
    intersectionObserver.observe(container);

    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    tryStart();

    return () => {
      tryStop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      contextMap.delete(container);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const context = contextMap.get(container);
    if (!context) return;

    const { program, motion, renderFrame, requestFrame } = context;
    const uniforms = program.uniforms;
    motion.speed = speed;
    motion.morphAmount = morphAmount;
    motion.morphSpeed = morphSpeed;
    uniforms.uMorphAmount.value = morphAmount;
    uniforms.uBands.value = bands;
    uniforms.uThickness.value = thickness;
    uniforms.uScale.value = scale;
    uniforms.uPixelSize.value = pixelSize;
    uniforms.uGlow.value = glow;
    uniforms.uColorMode.value = colorModeToFloat(colorMode);
    uniforms.uContrast.value = contrast;
    uniforms.uBrightness.value = brightness;
    uniforms.uFillBands.value = fillBands ? 1 : 0;
    uniforms.uOpacity.value = opacity;
    uniforms.uGrain.value = grain ? 1 : 0;
    uniforms.uGrainIntensity.value = grainIntensity;
    uniforms.uLow.value = new Float32Array(hexToRgb(lowColor));
    uniforms.uMid.value = new Float32Array(hexToRgb(midColor));
    uniforms.uHigh.value = new Float32Array(hexToRgb(highColor));
    uniforms.uMouseEnabled.value = mouseInteraction ? 1 : 0;
    uniforms.uMouseRadius.value = mouseRadius;
    uniforms.uMouseStrength.value = mouseStrength;
    renderFrame(motion.time);
    requestFrame();
  }, [
    bands,
    brightness,
    colorMode,
    contrast,
    fillBands,
    glow,
    grain,
    grainIntensity,
    highColor,
    lowColor,
    midColor,
    morphAmount,
    mouseInteraction,
    mouseRadius,
    mouseStrength,
    opacity,
    pixelSize,
    scale,
    speed,
    thickness,
    morphSpeed,
  ]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
