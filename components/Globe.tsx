"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type City = { name: string; lat: number; lon: number };

/** Fewer cities, widely spaced across the globe */
const CITIES: City[] = [
  { name: "Karachi", lat: 24.86, lon: 67.0 }, // 0
  { name: "New York", lat: 40.71, lon: -74.0 }, // 1
  { name: "Tokyo", lat: 35.68, lon: 139.69 }, // 2
  { name: "São Paulo", lat: -23.55, lon: -46.63 }, // 3
  { name: "London", lat: 51.5, lon: -0.12 }, // 4
  { name: "Sydney", lat: -33.87, lon: 151.21 }, // 5
  { name: "Lagos", lat: 6.52, lon: 3.38 }, // 6
  { name: "Los Angeles", lat: 34.05, lon: -118.24 }, // 7
];

/** Long-haul jumps only — big gaps between hops */
const ROUTE_CHAIN: number[] = [
  0, // Karachi
  1, // → New York
  2, // → Tokyo
  3, // → São Paulo
  4, // → London
  5, // → Sydney
  6, // → Lagos
  7, // → Los Angeles
  0, // → Karachi
];

function latLonToVec3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export type GlobeProps = {
  /** Extra Y rotation driven by scroll (radians). */
  scrollRotY?: number;
  /** While true, auto-spin pauses and scrollRotY drives the view. */
  isScrolling?: boolean;
  /** Route arc animation only after earth is fully revealed. */
  arcsEnabled?: boolean;
};

export default function Globe({
  scrollRotY = 0,
  isScrolling = false,
  arcsEnabled = false,
}: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const scrollRotRef = useRef(scrollRotY);
  const isScrollingRef = useRef(isScrolling);
  const arcsEnabledRef = useRef(arcsEnabled);

  useEffect(() => {
    scrollRotRef.current = scrollRotY;
  }, [scrollRotY]);

  useEffect(() => {
    isScrollingRef.current = isScrolling;
  }, [isScrolling]);

  useEffect(() => {
    arcsEnabledRef.current = arcsEnabled;
  }, [arcsEnabled]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = () => mount.clientWidth;
    const H = () => mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 1000);
    camera.position.set(0, 0, 15.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const GLOBE_R = 5;

    // ---------- Textured Earth ----------
    const TEX_BASE =
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/";
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    const earthDayTex = loader.load(TEX_BASE + "earth_atmos_2048.jpg");
    const earthSpecTex = loader.load(TEX_BASE + "earth_specular_2048.jpg");
    const earthNightTex = loader.load(TEX_BASE + "earth_lights_2048.png");
    const earthCloudTex = loader.load(TEX_BASE + "earth_clouds_1024.png");

    const earthGeo = new THREE.SphereGeometry(GLOBE_R, 64, 48);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthDayTex,
      specularMap: earthSpecTex,
      specular: new THREE.Color(0x333333),
      shininess: 6,
      emissiveMap: earthNightTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.1,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earth);

    const cloudGeo = new THREE.SphereGeometry(GLOBE_R + 0.035, 64, 48);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: earthCloudTex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    globeGroup.add(clouds);

    // ---------- Atmosphere glow ----------
    const glowGeo = new THREE.SphereGeometry(GLOBE_R + 0.35, 32, 24);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(0xc6b07d) } },
      vertexShader: `
        varying vec3 vNormal;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 c;
        void main(){
          float intensity = pow(0.55 - dot(vNormal, vec3(0,0,1.0)), 3.0);
          gl_FragColor = vec4(c, intensity * 0.5);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    globeGroup.add(new THREE.Mesh(glowGeo, glowMat));

    // ---------- City nodes ----------
    const ringMeshes: { mesh: THREE.Mesh; phase: number }[] = [];
    const nodeGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xf0dfae });

    CITIES.forEach((c) => {
      const pos = latLonToVec3(c.lat, c.lon, GLOBE_R + 0.03);
      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      mesh.position.copy(pos);
      globeGroup.add(mesh);

      const ringGeo = new THREE.RingGeometry(0.06, 0.075, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xc6b07d,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      globeGroup.add(ring);
      ringMeshes.push({ mesh: ring, phase: Math.random() * Math.PI * 2 });
    });

    // ---------- Arcs: continuous chain (gated by arcsEnabled) ----------
    const ARC_SEGMENTS = 60;
    const ARC_LIFT = 0.12;

    type Arc = {
      fullPoints: THREE.Vector3[];
      geo: THREE.BufferGeometry;
      mat: THREE.LineBasicMaterial;
      order: number;
    };

    function createArc(startCity: City, endCity: City, order: number): {
      arc: Arc;
      line: THREE.Line;
    } {
      // Arcs live on globeGroup → they rotate with Earth + city points
      const start = latLonToVec3(startCity.lat, startCity.lon, GLOBE_R + ARC_LIFT);
      const end = latLonToVec3(endCity.lat, endCity.lon, GLOBE_R + ARC_LIFT);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      // Higher peak so long-haul arcs clear the surface at the horizon
      mid.normalize().multiplyScalar(GLOBE_R + 1.1 + dist * 0.45);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const fullPoints = curve.getPoints(ARC_SEGMENTS).map((p) => {
        const minR = GLOBE_R + ARC_LIFT;
        if (p.length() < minR) p.multiplyScalar(minR / p.length());
        return p;
      });

      const geo = new THREE.BufferGeometry();
      const posAttr = new Float32Array((ARC_SEGMENTS + 1) * 3);
      geo.setAttribute("position", new THREE.BufferAttribute(posAttr, 3));
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffe9b0,
        transparent: true,
        opacity: 0.95,
        // depthTest ON → arcs hide behind Earth and stay glued to city points
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      globeGroup.add(line);

      return { arc: { fullPoints, geo, mat, order }, line };
    }

    const arcs: Arc[] = [];
    const arcLines: THREE.Line[] = [];
    for (let i = 0; i < ROUTE_CHAIN.length - 1; i++) {
      const { arc, line } = createArc(
        CITIES[ROUTE_CHAIN[i]],
        CITIES[ROUTE_CHAIN[i + 1]],
        i
      );
      arcs.push(arc);
      arcLines.push(line);
    }

    // 1→2 draw, wait 1s, 2→3 draw, wait 1s, …
    const DRAW_DURATION = 0.9;
    const WAIT_BETWEEN = 1.0;
    const SEGMENT_DURATION = DRAW_DURATION + WAIT_BETWEEN;
    const HOLD_FULL = 1.5;
    const FADE_ALL = 1.0;
    const DRAW_PHASE = SEGMENT_DURATION * arcs.length;
    const MASTER_CYCLE = DRAW_PHASE + HOLD_FULL + FADE_ALL;

    // ---------- Lighting ----------
    const sunLight = new THREE.DirectionalLight(0xfff2d9, 1.4);
    sunLight.position.set(6, 2, 4);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // ---------- Resize ----------
    const handleResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    window.addEventListener("resize", handleResize);

    // ---------- Animation ----------
    const rotX = -0.15;
    const EARTH_SPIN = 0.08;
    const clock = new THREE.Clock();
    let frameId: number;
    let autoSpin = 0.4;
    let lastScrollRot = scrollRotRef.current;
    let arcEpoch = -1; // elapsed time when arcs were first enabled

    function fillArcPoints(a: Arc, visibleCount: number) {
      const posArr = a.geo.attributes.position.array as Float32Array;
      for (let i = 0; i < visibleCount; i++) {
        const p = a.fullPoints[i];
        posArr[i * 3] = p.x;
        posArr[i * 3 + 1] = p.y;
        posArr[i * 3 + 2] = p.z;
      }
      a.geo.setDrawRange(0, visibleCount);
      a.geo.attributes.position.needsUpdate = true;
    }

    function clearArcs() {
      arcs.forEach((a, i) => {
        a.geo.setDrawRange(0, 0);
        a.mat.opacity = 0;
        arcLines[i].visible = false;
      });
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      const scrolling = isScrollingRef.current;
      const scrollRot = scrollRotRef.current;

      // Idle: auto-rotate. Scroll: freeze auto, apply scroll delta on Y.
      if (scrolling) {
        autoSpin += scrollRot - lastScrollRot;
      } else {
        autoSpin += dt * EARTH_SPIN;
      }
      lastScrollRot = scrollRot;

      globeGroup.rotation.y = autoSpin;
      globeGroup.rotation.x = rotX;

      ringMeshes.forEach(({ mesh, phase }) => {
        const s = 1 + 0.4 * Math.sin(t * 2 + phase);
        mesh.scale.set(s, s, s);
        (mesh.material as THREE.MeshBasicMaterial).opacity =
          0.35 + 0.25 * Math.sin(t * 2 + phase);
      });

      if (arcsEnabledRef.current) {
        if (arcEpoch < 0) arcEpoch = t;
        const cycleT = (t - arcEpoch) % MASTER_CYCLE;

        arcLines.forEach((line) => {
          line.visible = true;
        });

        if (cycleT < DRAW_PHASE) {
          const activeIndex = Math.min(
            arcs.length - 1,
            Math.floor(cycleT / SEGMENT_DURATION)
          );
          const localT = cycleT - activeIndex * SEGMENT_DURATION;
          // Draw, then hold 1s before next hop starts
          const progress =
            localT < DRAW_DURATION
              ? Math.min(1, localT / DRAW_DURATION)
              : 1;

          arcs.forEach((a) => {
            const total = a.fullPoints.length;
            if (a.order < activeIndex) {
              fillArcPoints(a, total);
              a.mat.opacity = 0.95;
            } else if (a.order === activeIndex) {
              const visibleCount = Math.max(
                2,
                Math.floor(progress * (total - 1)) + 1
              );
              fillArcPoints(a, visibleCount);
              a.mat.opacity = 0.95;
            } else {
              a.geo.setDrawRange(0, 0);
              a.mat.opacity = 0;
            }
          });
        } else if (cycleT < DRAW_PHASE + HOLD_FULL) {
          arcs.forEach((a) => {
            fillArcPoints(a, a.fullPoints.length);
            a.mat.opacity = 0.95;
          });
        } else {
          const fadeProgress =
            (cycleT - DRAW_PHASE - HOLD_FULL) / FADE_ALL;
          arcs.forEach((a) => {
            fillArcPoints(a, a.fullPoints.length);
            a.mat.opacity = 0.95 * (1 - fadeProgress);
          });
        }
      } else {
        arcEpoch = -1;
        clearArcs();
      }

      clouds.rotation.y = autoSpin + t * 0.02;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}
