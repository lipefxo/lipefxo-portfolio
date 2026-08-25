import { Mesh, Program, Renderer, Texture, Triangle, Vec2 } from "ogl";
import type { BlackHoleVisualFrame, StellarPoint } from "./stellarEvolution";

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D tScene;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uHorizonRadius;
uniform float uFieldRadius;
uniform float uLensStrength;
uniform float uOpacity;
uniform float uPhotonIntensity;
uniform float uTime;
uniform float uReducedMotion;

varying vec2 vUv;

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 delta = (vUv - uCenter) * aspect;
  float radius = max(length(delta), 0.00001);
  vec2 direction = delta / radius;
  float angle = atan(delta.y, delta.x);

  float fieldFalloff = pow(clamp(1.0 - radius / uFieldRadius, 0.0, 1.0), 2.0);
  float nearField = 1.0 - smoothstep(uHorizonRadius * 1.08, uFieldRadius, radius);
  float deflection =
    (uHorizonRadius * uHorizonRadius * 0.82 * fieldFalloff * uLensStrength) /
    max(radius, uHorizonRadius * 0.72);
  float swirl =
    nearField * nearField * uLensStrength * 0.2 * (1.0 - uReducedMotion);

  vec2 warpedDelta =
    rotate2d(swirl) * direction * (radius + deflection);
  vec2 sampleUv = clamp(uCenter + warpedDelta / aspect, vec2(0.001), vec2(0.999));

  float photonRadius = uHorizonRadius * 1.16;
  float photonBand =
    1.0 - smoothstep(0.0, uHorizonRadius * 0.34, abs(radius - photonRadius));
  vec2 chromaOffset =
    direction / aspect * uHorizonRadius * 0.018 * photonBand * uLensStrength;

  vec3 sceneColor;
  sceneColor.r = texture2D(
    tScene,
    clamp(sampleUv + chromaOffset, vec2(0.001), vec2(0.999))
  ).r;
  sceneColor.g = texture2D(tScene, sampleUv).g;
  sceneColor.b = texture2D(
    tScene,
    clamp(sampleUv - chromaOffset, vec2(0.001), vec2(0.999))
  ).b;

  float magnification =
    1.0 + photonBand * uLensStrength * 0.22;
  sceneColor *= magnification;

  float horizonEdge = uHorizonRadius * (
    1.0 +
    sin(angle * 7.0 + 0.8) * 0.006 +
    sin(angle * 13.0 - 1.7) * 0.004 +
    sin(angle * 23.0 + 2.4) * 0.002
  );
  float horizonMask =
    1.0 - smoothstep(horizonEdge * 0.972, horizonEdge * 1.012, radius);
  vec3 eventHorizon = vec3(0.0015, 0.002, 0.009);
  sceneColor = mix(sceneColor, eventHorizon, horizonMask * uOpacity);

  float ringWidth = max(uHorizonRadius * 0.038, 0.0014);
  float ring =
    1.0 - smoothstep(ringWidth * 0.35, ringWidth, abs(radius - photonRadius));
  float movement = uTime * 0.7 * (1.0 - uReducedMotion);
  float knot = 0.82 + 0.18 * sin(angle * 13.0 - movement);
  knot += (hash21(floor((vUv * uResolution) / 3.0)) - 0.5) * 0.08;
  vec3 coldRing = vec3(0.52, 0.86, 1.0);
  vec3 hotRing = vec3(1.0, 0.72, 0.29);
  vec3 ringColor = mix(coldRing, hotRing, smoothstep(-0.35, 0.35, direction.x));
  sceneColor +=
    ringColor * ring * knot * uPhotonIntensity * uOpacity * 1.34;

  float outerLens =
    1.0 - smoothstep(
      uHorizonRadius * 0.065,
      uHorizonRadius * 0.21,
      abs(radius - uHorizonRadius * 1.34)
    );
  sceneColor +=
    mix(coldRing, hotRing, 0.48) * outerLens * uLensStrength * uOpacity * 0.12;

  gl_FragColor = vec4(clamp(sceneColor, 0.0, 1.0), 1.0);
}
`;

export type BlackHoleLensRenderInput = {
  source: HTMLCanvasElement;
  viewport: { width: number; height: number };
  center: StellarPoint;
  frame: BlackHoleVisualFrame;
  elapsedSeconds: number;
  reducedMotion: boolean;
};

export type BlackHoleLensRenderer = {
  render: (input: BlackHoleLensRenderInput) => void;
  destroy: () => void;
};

const RENDER_SCALE = 0.75;

export function createBlackHoleLensRenderer(
  canvas: HTMLCanvasElement,
): BlackHoleLensRenderer {
  const renderer = new Renderer({
    canvas,
    dpr: 1,
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  const gl = renderer.gl;
  const geometry = new Triangle(gl);
  const texture = new Texture(gl, {
    generateMipmaps: false,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
    flipY: true,
  });
  const program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
    uniforms: {
      tScene: { value: texture },
      uResolution: { value: new Vec2(1, 1) },
      uCenter: { value: new Vec2(0.5, 0.5) },
      uHorizonRadius: { value: 0.05 },
      uFieldRadius: { value: 0.45 },
      uLensStrength: { value: 0 },
      uOpacity: { value: 0 },
      uPhotonIntensity: { value: 0 },
      uTime: { value: 0 },
      uReducedMotion: { value: 0 },
    },
  });
  const mesh = new Mesh(gl, { geometry, program });
  let renderedWidth = 0;
  let renderedHeight = 0;
  let displayedWidth = 0;
  let displayedHeight = 0;

  const render = ({
    source,
    viewport,
    center,
    frame,
    elapsedSeconds,
    reducedMotion,
  }: BlackHoleLensRenderInput) => {
    const width = Math.max(1, Math.round(viewport.width * RENDER_SCALE));
    const height = Math.max(1, Math.round(viewport.height * RENDER_SCALE));
    const renderSizeChanged =
      width !== renderedWidth || height !== renderedHeight;
    if (renderSizeChanged) {
      renderedWidth = width;
      renderedHeight = height;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value.set(width, height);
    }
    if (
      renderSizeChanged ||
      viewport.width !== displayedWidth ||
      viewport.height !== displayedHeight
    ) {
      displayedWidth = viewport.width;
      displayedHeight = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
    }

    texture.image = source;
    texture.needsUpdate = true;
    program.uniforms.uCenter.value.set(
      center.x / Math.max(1, viewport.width),
      1 - center.y / Math.max(1, viewport.height),
    );
    program.uniforms.uHorizonRadius.value =
      frame.horizonRadius / Math.max(1, viewport.height);
    program.uniforms.uFieldRadius.value =
      frame.fieldRadius / Math.max(1, viewport.height);
    program.uniforms.uLensStrength.value = frame.lensStrength;
    program.uniforms.uOpacity.value = frame.opacity;
    program.uniforms.uPhotonIntensity.value = frame.photonIntensity;
    program.uniforms.uTime.value = reducedMotion ? 0 : elapsedSeconds;
    program.uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
    renderer.render({ scene: mesh });
  };

  const destroy = () => {
    geometry.remove();
    program.remove();
    gl.deleteTexture(texture.texture);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };

  return { render, destroy };
}
