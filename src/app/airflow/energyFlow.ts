import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Fan-local, direction-aware energy filaments; time is advanced in RPM-scaled seconds. */
export function createEnergyFlow(radius: number, direction: 1 | -1, color: THREE.Color): {
  group: THREE.Group;
  material: THREE.ShaderMaterial;
} {
  const group = new THREE.Group();
  group.name = "Energy airflow";
  const geometries: THREE.BufferGeometry[] = [];
  const laneCount = 10;
  for (let lane = 0; lane < laneCount; lane++) {
    const phase = lane * Math.PI * 2 / laneCount;
    const laneRadius = radius * (.26 + .49 * ((lane * 7 % laneCount) / (laneCount - 1)));
    const points: THREE.Vector3[] = [];
    for (let step = 0; step <= 18; step++) {
      const t = step / 18;
      const angle = phase + t * .7 + Math.sin(t * Math.PI * 2 + phase) * .12;
      // Tight through the rotor, gently spreading toward the exhaust.
      const spread = 0.62 + 0.55 * Math.pow(Math.abs(t - 0.34) / 0.66, 1.4);
      const r = laneRadius * spread;
      points.push(new THREE.Vector3(
        Math.cos(angle) * r + Math.sin(t * Math.PI * 3 + phase) * radius * .025,
        Math.sin(angle) * r + Math.cos(t * Math.PI * 2 + phase) * radius * .022,
        (-64 + 190 * t) * direction,
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    for (const halo of [0, 1]) {
      const geometry = new THREE.TubeGeometry(curve, 52, halo ? 5.2 : .65, 6, false);
      const count = geometry.attributes.position.count;
      const flow = new Float32Array(count);
      const lanes = new Float32Array(count);
      const halos = new Float32Array(count);
      for (let vertex = 0; vertex < count; vertex++) {
        flow[vertex] = geometry.attributes.uv.getX(vertex);
        lanes[vertex] = lane * .137;
        halos[vertex] = halo;
      }
      geometry.setAttribute("flow", new THREE.BufferAttribute(flow, 1));
      geometry.setAttribute("lane", new THREE.BufferAttribute(lanes, 1));
      geometry.setAttribute("halo", new THREE.BufferAttribute(halos, 1));
      geometries.push(geometry);
    }
  }
  // Broad translucent ribbons weave through the finer filaments. Their width
  // gathers at the rotor and opens into the downstream plume.
  for (let lane = 0; lane < 3; lane++) {
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [];
    const flows: number[] = [], lanes: number[] = [], halos: number[] = [];
    const segments = 52;
    const vertex = (step: number, side: number) => {
      const t = step / segments;
      const angle = lane * Math.PI * 2 / 3 + t * 1.7 + Math.sin(t * 6 + lane) * 0.13;
      const spread = 0.55 + 0.42 * Math.pow(Math.abs(t - 0.34) / 0.66, 1.4);
      const width = (2 + Math.sin(t * Math.PI) * 7) * side;
      const r = radius * spread;
      positions.push(Math.cos(angle) * r - Math.sin(angle) * width, Math.sin(angle) * r + Math.cos(angle) * width, (-64 + 190 * t) * direction);
      normals.push(Math.cos(angle), Math.sin(angle), 0);
      uvs.push(t, (side + 1) / 2);
      flows.push(t); lanes.push(lane * .31); halos.push(2);
    };
    for (let i = 0; i < segments; i++) {
      vertex(i,-1); vertex(i,1); vertex(i+1,-1);
      vertex(i+1,-1); vertex(i,1); vertex(i+1,1);
    }
    const ribbon = new THREE.BufferGeometry();
    ribbon.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    ribbon.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    ribbon.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    ribbon.setAttribute("flow", new THREE.Float32BufferAttribute(flows, 1));
    ribbon.setAttribute("lane", new THREE.Float32BufferAttribute(lanes, 1));
    ribbon.setAttribute("halo", new THREE.Float32BufferAttribute(halos, 1));
    geometries.push(ribbon);
  }
  // Tube geometries are indexed, ribbons are explicit triangles.
  const triangles = geometries.map(geometry => geometry.index ? geometry.toNonIndexed() : geometry);
  const merged = mergeGeometries(triangles, false)!;
  triangles.forEach(geometry => { if (!geometries.includes(geometry)) geometry.dispose(); });
  geometries.forEach(geometry => geometry.dispose());
  const material = new THREE.ShaderMaterial({
    name: "Luminous flowing energy",
    uniforms: { time: { value: 0 }, color: { value: color.clone() }, intensity: { value: 1 } },
    transparent: true,
    blending: THREE.NormalBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float flow;
      attribute float lane;
      attribute float halo;
      varying float vFlow;
      varying float vLane;
      varying float vHalo;
      varying float vAcross;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vFlow = flow;
        vLane = lane;
        vHalo = halo;
        vAcross = uv.y;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float intensity;
      uniform vec3 color;
      varying float vFlow;
      varying float vLane;
      varying float vHalo;
      varying float vAcross;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float envelope = smoothstep(0.0, 0.12, vFlow) * (1.0 - smoothstep(0.75, 1.0, vFlow));
        float phase = fract(vFlow * 1.6 - time * 0.58 + vLane);
        float pulse = exp(-pow((phase - 0.52) * 8.0, 2.0));
        float spark = exp(-pow((phase - 0.58) * 31.0, 2.0));
        float shimmer = 0.92 + 0.08 * sin(vFlow * 39.0 - time * 4.0 + vLane * 9.0);
        float facing = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.8);
        float energy = (0.24 + pulse * 1.05 + spark * 0.65) * shimmer;
        float ribbon = step(1.5, vHalo);
        float halo = min(vHalo, 1.0);
        float opacity = mix(mix(0.88, 0.20, halo) * facing, 0.16 * pow(sin(vAcross * 3.14159), 1.4), ribbon) * energy * envelope * intensity;
        vec3 tint = mix(color, vec3(0.86, 0.96, 1.0), (1.0 - min(vHalo, 1.0)) * (0.04 + spark * 0.20));
        gl_FragColor = vec4(tint, opacity);
      }
    `,
  });
  const filaments = new THREE.Mesh(merged, material);
  filaments.name = "Flowing filaments and soft halos";
  filaments.renderOrder = 3;
  group.add(filaments);
  const auraMaterial = new THREE.ShaderMaterial({
    name: "Rotor energy field",
    uniforms: material.uniforms,
    transparent: true,
    blending: THREE.NormalBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float intensity;
      uniform vec3 color;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float angle = atan(p.y, p.x);
        float ring = exp(-pow((r - 0.74) * 8.5, 2.0));
        float coreRing = exp(-pow((r - 0.74) * 42.0, 2.0));
        float wisps = 0.7 + 0.3 * sin(angle * 3.0 - time * 1.5 + r * 14.0);
        float breathe = 0.88 + 0.12 * sin(time * 2.0);
        float opacity = (ring * 0.26 * wisps + coreRing * 0.22) * breathe * intensity;
        opacity *= smoothstep(0.35, 0.55, r) * (1.0 - smoothstep(0.85, 1.0, r));
        gl_FragColor = vec4(mix(color, vec3(0.85, 0.96, 1.0), coreRing * 0.2), opacity);
      }
    `,
  });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), auraMaterial);
  aura.name = "Soft rotor energy field";
  aura.position.z = 16 * direction;
  aura.renderOrder = 3;
  group.add(aura);
  return { group, material };
}
