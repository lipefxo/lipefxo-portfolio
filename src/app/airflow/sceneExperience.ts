import * as THREE from "three";
import type { Experience, HardwarePart } from "./experience";
import type { Config } from "./model";
import type { SurfaceLibrary } from "./realisticMaterials";

const OFFSETS: Record<HardwarePart, THREE.Vector3> = {
  motherboard: new THREE.Vector3(0, 0, -70), cooler: new THREE.Vector3(0, 65, 140),
  gpu: new THREE.Vector3(0, -95, 100), psu: new THREE.Vector3(100, 60, 0),
};
type Moving = { object: THREE.Object3D; base: THREE.Vector3; vector: THREE.Vector3; anchor: THREE.Vector3; part: HardwarePart | null };
type MaterialState = {
  material: THREE.MeshStandardMaterial; source: THREE.MeshStandardMaterial;
  opacity: number; transparent: boolean; depthWrite: boolean; clipping: THREE.Plane[] | null; clipShadows: boolean;
  part: HardwarePart | null; fan: boolean;
};
type Assignment = { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] };

function partOf(object: THREE.Object3D): HardwarePart | null {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (node.userData.partId in OFFSETS) return node.userData.partId as HardwarePart;
    if (node.name === "motherboard-rear-io") return "motherboard";
    if (node.name === "gpu-rear-io") return "gpu";
  }
  return null;
}
function visible(object: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}
function thermalVolume(color: string) {
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: 0 }, time: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: true, side: THREE.FrontSide,
    blending: THREE.NormalBlending, toneMapped: false, clipping: true,
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 vNormal; varying vec3 vView; void main(){
        vec4 mvPosition=modelViewMatrix*vec4(position,1.0); vView=-mvPosition.xyz;
        vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform vec3 color; uniform float strength; uniform float time;
      varying vec3 vNormal; varying vec3 vView; void main(){
        #include <clipping_planes_fragment>
        float face=max(0.0,dot(normalize(vNormal),normalize(vView)));
        float falloff=pow(face,2.3); float breathing=.94+.06*sin(time*1.7);
        gl_FragColor=vec4(color,falloff*strength*.34*breathing);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), material);
  mesh.renderOrder = 4;
  return mesh;
}

/** A camera-facing temperature mark: cool teal through amber to coral. */
function temperatureMark() {
  const material = new THREE.ShaderMaterial({
    uniforms: { warmth: { value: 0 }, time: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv=uv;
        vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);
        center.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
        gl_Position=projectionMatrix*center;
      }`,
    fragmentShader: `
      varying vec2 vUv; uniform float warmth; uniform float time;
      void main() {
        vec2 p=(vUv-.5)*2.; float r=length(p);
        vec3 cool=vec3(.12,.57,.52), warm=vec3(.91,.57,.17), hot=vec3(.88,.24,.16);
        vec3 color=warmth<.5?mix(cool,warm,warmth*2.):mix(warm,hot,(warmth-.5)*2.);
        float breath=1.+.025*sin(time*1.3);
        float glow=exp(-r*r*6./breath)*(.22+warmth*.15);
        float ring=smoothstep(.69,.72,r)*(1.-smoothstep(.75,.78,r));
        float angle=mod(atan(p.x,p.y)+6.283185,6.283185)/6.283185;
        float arc=1.-smoothstep(.08+warmth*.84,.1+warmth*.84,angle);
        float core=(1.-smoothstep(.09,.17,r))*.85;
        float alpha=max(core,glow+ring*(.12+arc*.65));
        gl_FragColor=vec4(color,alpha*(1.-smoothstep(.85,1.,r)));
      }`,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1), material);
  mesh.scale.setScalar(42); mesh.renderOrder=12; mesh.frustumCulled=false;
  return mesh;
}

/** Runtime-only presentation layers. All offsets are reversible and materials are owned locally. */
export function createSceneExperience(
  scene: THREE.Scene,
  staticGroup: THREE.Group,
  componentGroup: THREE.Group,
  dynamicGroup: THREE.Group,
  surfaces: SurfaceLibrary,
) {
  const overlay = new THREE.Group(); overlay.name = "Inspection overlays"; scene.add(overlay);
  const sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 100);
  const clippingPlanes = [sectionPlane];
  const section = new THREE.Group(); section.name = "Section cut marker"; overlay.add(section);
  const slice = new THREE.Mesh(new THREE.PlaneGeometry(432, 302), new THREE.MeshBasicMaterial({ color: "#4c9cae", transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false }));
  section.add(slice);
  const sliceEdge = new THREE.LineSegments(new THREE.EdgesGeometry(slice.geometry), new THREE.LineBasicMaterial({ color: "#74b4c3", transparent: true, opacity: .44, depthWrite: false }));
  section.add(sliceEdge);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(4, 23, 1), new THREE.MeshBasicMaterial({ color: "#38869b", transparent: true, opacity: .8 }));
  tab.position.set(218, 119, 0); section.add(tab);
  const selection = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color("#54a9bd"));
  selection.name = "Selected component bounds";
  const selectionMaterial = selection.material as THREE.LineBasicMaterial;
  selectionMaterial.transparent = true; selectionMaterial.opacity = .6; selectionMaterial.depthWrite = false;
  overlay.add(selection);
  const cpuHeat = thermalVolume("#ffb35b"), gpuHeat = thermalVolume("#ff7554");
  cpuHeat.name = "CPU power source"; gpuHeat.name = "GPU power source";
  overlay.add(cpuHeat, gpuHeat);
  const cpuTemperature=temperatureMark(), gpuTemperature=temperatureMark();
  cpuTemperature.name="CPU temperature indicator"; gpuTemperature.name="GPU temperature indicator";
  overlay.add(cpuTemperature,gpuTemperature);
  const leaderGeometry = new THREE.BufferGeometry();
  const leaderPositions = new Float32Array(64 * 6);
  leaderGeometry.setAttribute("position", new THREE.BufferAttribute(leaderPositions, 3).setUsage(THREE.DynamicDrawUsage));
  leaderGeometry.setAttribute("lineDistance", new THREE.BufferAttribute(new Float32Array(64 * 2), 1).setUsage(THREE.DynamicDrawUsage));
  const leaderMaterial = new THREE.LineDashedMaterial({ color: "#7393a0", transparent: true, opacity: .45, dashSize: 3, gapSize: 4, depthWrite: false });
  const leaders = new THREE.LineSegments(leaderGeometry, leaderMaterial); leaders.frustumCulled = false; overlay.add(leaders);
  let moving: Moving[] = [], states: MaterialState[] = [], assignments: Assignment[] = [];
  let cloned = new Set<THREE.Material>();
  let signature = "", appearance = "", previous = "";
  let amount = 0, heatAmount = 0, sectionPosition = 100, elapsed = 0;
  let disposed = false, texturesReady = false;
  const parts = new Map<HardwarePart, THREE.Object3D>();
  const worldStart = new THREE.Vector3(), worldEnd = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  surfaces.ready.then(() => { if (!disposed) texturesReady = true; }).catch(() => {});

  const restoreMaterials = () => {
    assignments.forEach(({ mesh, original }) => { mesh.material = original; });
    states.forEach(state => {
      if (cloned.has(state.material)) return;
      const m = state.material;
      m.opacity = state.opacity; m.transparent = state.transparent; m.depthWrite = state.depthWrite;
      m.clippingPlanes = state.clipping; m.clipShadows = state.clipShadows; m.needsUpdate = true;
    });
    cloned.forEach(material => material.dispose());
    states = []; assignments = []; cloned = new Set();
  };
  const rebuild = (targets: THREE.Object3D[]) => {
    restoreMaterials();
    const old = new Map(moving.map(entry => [entry.object, entry]));
    moving = []; parts.clear();
    scene.updateMatrixWorld(true);
    for (const object of targets) {
      const part = partOf(object);
      if (object.parent === componentGroup && part) parts.set(part, object);
      const supplied = object.userData.explodeVector;
      const vector = supplied instanceof THREE.Vector3 ? supplied.clone() : Array.isArray(supplied) ? new THREE.Vector3(...supplied as [number, number, number]) : part ? OFFSETS[part].clone() : new THREE.Vector3();
      const existing = old.get(object);
      const base = existing?.base ?? (object.userData.basePosition instanceof THREE.Vector3 ? object.userData.basePosition.clone() : object.position.clone());
      const box = new THREE.Box3().setFromObject(object);
      const localBox = box.isEmpty() ? new THREE.Box3(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1)) : box.applyMatrix4(inverse.copy(object.matrixWorld).invert());
      moving.push({ object, base, vector, anchor: localBox.getCenter(new THREE.Vector3()), part });
    }
    const clonesByRole = new Map<string, THREE.MeshStandardMaterial>();
    for (const root of [staticGroup, componentGroup, dynamicGroup]) root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      let fan = false;
      for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node.userData.mountId) fan = true;
      const part = partOf(object);
      const original = object.material;
      const convert = (source: THREE.Material) => {
        if (!(source instanceof THREE.MeshStandardMaterial)) return source;
        // Shared surface-library materials must never inherit a global x-ray or clip state.
        const key = `${source.uuid}:${part ?? "case"}:${fan}`;
        let material = source;
        if (source.userData.shared) {
          const cached = clonesByRole.get(key);
          if (cached) return cached;
          material = source.clone(); material.userData = { ...source.userData, shared: true };
          clonesByRole.set(key, material); cloned.add(material);
        }
        if (!states.some(state => state.material === material)) states.push({
          material, source, opacity: source.opacity, transparent: source.transparent, depthWrite: source.depthWrite,
          clipping: source.clippingPlanes, clipShadows: source.clipShadows, part, fan,
        });
        return material;
      };
      object.material = Array.isArray(original) ? original.map(convert) : convert(original);
      if (object.material !== original) assignments.push({ mesh: object, original });
    });
    appearance = "";
  };

  return {
    update(experience: Experience, selected: HardwarePart | null, config: Config, delta: number, reducedMotion: boolean, temperatures?: { cpu: number; gpu: number }): boolean {
      if (disposed) return false;
      const targets: THREE.Object3D[] = [];
      const collect = (root: THREE.Object3D) => root.traverse(object => {
        if (object === root) return;
        if (object.parent === componentGroup || object.userData.explodeVector || object.name === "motherboard-rear-io" || object.name === "gpu-rear-io") targets.push(object);
      });
      collect(componentGroup); collect(staticGroup); collect(dynamicGroup);
      const nextSignature = targets.map(object => object.uuid).join(":") + dynamicGroup.children.map(object=>object.uuid).join(":");
      const rebuilt = nextSignature !== signature;
      if (rebuilt) { signature = nextSignature; rebuild(targets); }
      const nextState = JSON.stringify([experience, selected, config.cpuPower, config.gpuPower, config.gpuInstalled]);
      let changed = rebuilt || nextState !== previous || texturesReady; previous = nextState;
      const dt = Math.min(.1, Math.max(0, delta));
      const blend = reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
      const targetAmount = THREE.MathUtils.clamp(experience.explode, 0, 1);
      amount = THREE.MathUtils.lerp(amount, targetAmount, blend);
      if (Math.abs(amount-targetAmount)<.0001) amount=targetAmount;
      const targetHeat = experience.mode === "heat" ? 1 : 0;
      heatAmount = THREE.MathUtils.lerp(heatAmount,targetHeat,blend);
      if(Math.abs(heatAmount-targetHeat)<.001) heatAmount=targetHeat;
      const targetSection = 100 - THREE.MathUtils.clamp(experience.section,0,1) * 200;
      sectionPosition = THREE.MathUtils.lerp(sectionPosition,targetSection,blend);
      if (Math.abs(sectionPosition-targetSection)<.01) sectionPosition=targetSection;
      changed ||= amount!==targetAmount || heatAmount!==targetHeat || (experience.sectionEnabled && sectionPosition!==targetSection);
      for (const entry of moving) entry.object.position.copy(entry.base).addScaledVector(entry.vector, amount);
      scene.updateMatrixWorld(true);
      let lineCount=0;
      const distances=leaderGeometry.attributes.lineDistance as THREE.BufferAttribute;
      for(const entry of moving) {
        if (!visible(entry.object) || lineCount>=64) continue;
        worldEnd.copy(entry.anchor); entry.object.localToWorld(worldEnd);
        worldStart.copy(entry.anchor).multiply(entry.object.scale).applyQuaternion(entry.object.quaternion).add(entry.base); entry.object.parent?.localToWorld(worldStart);
        worldStart.toArray(leaderPositions,lineCount*6); worldEnd.toArray(leaderPositions,lineCount*6+3);
        distances.setX(lineCount*2,0); distances.setX(lineCount*2+1,worldStart.distanceTo(worldEnd)); lineCount++;
      }
      leaderGeometry.setDrawRange(0,lineCount*2); leaderGeometry.attributes.position.needsUpdate=true; distances.needsUpdate=true;
      leaders.visible=amount>.005; leaderMaterial.opacity=Math.min(.45,amount*1.5);
      sectionPlane.constant=sectionPosition; section.position.z=sectionPosition; section.visible=experience.sectionEnabled;
      const nextAppearance=`${experience.mode}:${experience.isolateFlow}:${experience.sectionEnabled}:${selected}`;
      if(appearance!==nextAppearance || texturesReady) {
        for(const state of states) {
          const m=state.material, source=state.source;
          if(m!==source) {
            m.map=source.map; m.bumpMap=source.bumpMap; m.bumpScale=source.bumpScale; m.color.copy(source.color);
          }
          const xray=experience.mode==="airflow";
          const opacity=experience.mode==="heat"
            ? state.fan ? .45 : state.part && state.part===selected ? .55 : state.part ? .28 : .18
            : xray ? state.fan ? .9 : state.part && state.part===selected ? .82 : state.part ? (experience.isolateFlow ? .16 : .48) : (experience.isolateFlow ? .12 : .28) : state.opacity;
          const transparent=state.transparent || opacity<1;
          const needsCompile=m.transparent!==transparent || Boolean(m.clippingPlanes?.length)!==experience.sectionEnabled || texturesReady;
          m.opacity=opacity; m.transparent=transparent; m.depthWrite=opacity<.65 ? false : state.depthWrite;
          m.clippingPlanes=experience.sectionEnabled ? clippingPlanes : state.clipping;
          m.clipShadows=experience.sectionEnabled || state.clipShadows;
          if(needsCompile) m.needsUpdate=true;
        }
        for (const volume of [cpuHeat,gpuHeat]) {
          const enabled=Boolean(volume.material.clippingPlanes?.length);
          volume.material.clippingPlanes=experience.sectionEnabled ? clippingPlanes : null;
          if(enabled!==experience.sectionEnabled) volume.material.needsUpdate=true;
        }
        appearance=nextAppearance; texturesReady=false;
      }
      const selectedObject=selected ? parts.get(selected) : undefined;
      selection.visible=Boolean(selectedObject && visible(selectedObject));
      if(selectedObject && selected) {
        // Mechanical envelopes exclude power leads that route into other assemblies.
        const box=selection.box;
        switch(selected) {
          case "gpu":
            box.min.set(-190,81-config.gpuThickness,13-config.gpuWidth/2);
            box.max.set(-190+config.gpuLength,81,13+config.gpuWidth/2);
            break;
          case "psu": box.min.set(103,205.25,-86.5); box.max.set(203,268.75,38.5); break;
          case "cooler": box.min.set(-145,96,-69.5); box.max.set(-24,206,-69.5+config.coolerHeight); break;
          case "motherboard": box.min.set(-177,20,-78); box.max.set(67,264,-37); break;
        }
        box.applyMatrix4(selectedObject.matrixWorld).expandByScalar(3);
      }
      const board=parts.get("motherboard"), gpu=parts.get("gpu");
      cpuHeat.visible=heatAmount>.001 && Boolean(board && visible(board));
      gpuHeat.visible=heatAmount>.001 && config.gpuInstalled && Boolean(gpu && visible(gpu));
      if(board) { cpuHeat.position.set(-92,151,-50); board.localToWorld(cpuHeat.position); }
      if(gpu) { gpuHeat.position.set(-190+config.gpuLength/2,81-config.gpuThickness/2,13); gpu.localToWorld(gpuHeat.position); }
      const cooler=parts.get("cooler");
      cpuTemperature.visible=Boolean(temperatures && cooler && visible(cooler));
      gpuTemperature.visible=Boolean(temperatures && config.gpuInstalled && gpu && visible(gpu));
      if(cooler) { cpuTemperature.position.set(-85,160,config.coolerHeight-69.5+8); cooler.localToWorld(cpuTemperature.position); }
      if(gpu) { gpuTemperature.position.set(-190+config.gpuLength*.6,87,13+config.gpuWidth*.25); gpu.localToWorld(gpuTemperature.position); }
      if(temperatures) {
        for(const [mark,temperature] of [[cpuTemperature,temperatures.cpu],[gpuTemperature,temperatures.gpu]] as const) {
          const target=THREE.MathUtils.clamp((temperature-30)/60,0,1);
          const current=mark.material.uniforms.warmth.value;
          mark.material.uniforms.warmth.value=reducedMotion?target:THREE.MathUtils.damp(current,target,4,dt);
          mark.material.uniforms.time.value=elapsed;
          changed ||= Math.abs(current-target)>.001;
        }
      }
      cpuHeat.scale.set(55,58,48); gpuHeat.scale.set(config.gpuLength*.47,config.gpuThickness*.9,config.gpuWidth*.58);
      cpuHeat.material.uniforms.strength.value=heatAmount*THREE.MathUtils.clamp(config.cpuPower/160,0,1.5);
      gpuHeat.material.uniforms.strength.value=heatAmount*THREE.MathUtils.clamp(config.gpuPower/350,0,1.5);
      if(!reducedMotion) elapsed+=dt;
      cpuHeat.material.uniforms.time.value=elapsed; gpuHeat.material.uniforms.time.value=elapsed;
      changed ||= heatAmount>.001 && !reducedMotion;
      return changed;
    },
    dispose() {
      if(disposed) return; disposed=true;
      moving.forEach(entry=>entry.object.position.copy(entry.base)); restoreMaterials();
      scene.remove(overlay);
      overlay.traverse(object=>{
        if(object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials=Array.isArray(object.material)?object.material:[object.material];
          materials.forEach(material=>material.dispose());
        }
      });
    },
  };
}
