import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PLANETS, planetLongitude, sunPositionAt, type Coordinates } from "@/lib/solar";

/**
 * The orrery in the hero.
 *
 * Everything here is read from the clock rather than tuned to look busy: the
 * planets sit at their real heliocentric longitudes, Earth is turned so that the
 * reader's own location faces the sun at their local solar noon, and the marker
 * on it is lit only when the sun is actually above their horizon.
 *
 * That honesty costs visible speed. Earth moves about a degree a day and turns
 * 15 degrees an hour, so nothing here races. The motion you can see is the
 * camera drifting; the bodies move at the rate they really move.
 */

const RAD = Math.PI / 180;
/** Scene units per astronomical unit. */
const SCALE = 3.4;

type Props = { coordinates: Coordinates; isNight: boolean };

export default function SolarScene({ coordinates, isNight }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  // Kept in a ref so a location arriving later does not tear down the scene.
  const live = useRef({ coordinates, isNight });
  live.current = { coordinates, isNight };

  useEffect(() => {
    const mount = holder.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      // No WebGL. The surrounding markup already reads without this.
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    // The bodies live in their own group so they can be nudged clear of the
    // figures stacked over the top-right of the hero without dragging the star
    // field off centre with them.
    const system = new THREE.Group();
    system.position.set(-0.7, 0, 0.4);
    scene.add(system);

    // Everything created here is disposed on teardown; WebGL contexts are a
    // limited resource and a remount would otherwise leak one each time.
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    // ---- the sun -----------------------------------------------------------
    const sunGeometry = track(new THREE.SphereGeometry(0.62, 48, 48));
    const sunMaterial = track(new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    system.add(sun);

    // A second, larger shell at low opacity reads as corona without a shader.
    const halo = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.95, 32, 32)),
      track(new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.14 })),
    );
    system.add(halo);

    system.add(new THREE.PointLight(0xfff0d4, 300, 60, 2));
    // Enough fill that a planet turning its night side to the camera still
    // reads on the light theme. The phase stays visible; it just is not black.
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));

    // ---- orbits and planets ------------------------------------------------
    const bodies = PLANETS.map((planet, index) => {
      const radius = planet.radiusAu * SCALE;

      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const ring = new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints(curve.getPoints(180))),
        track(new THREE.LineBasicMaterial({ color: 0x8ea2c8, transparent: true, opacity: 0.24 })),
      );
      ring.rotation.x = Math.PI / 2;
      system.add(ring);

      const size = planet.key === "earth" ? 0.2 : planet.key === "venus" ? 0.17 : 0.12;
      const colour = planet.key === "earth" ? 0x4d7fd6 : planet.key === "venus" ? 0xd8b98a : 0x9aa3b2;
      const mesh = new THREE.Mesh(
        track(new THREE.SphereGeometry(size, 32, 32)),
        track(new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85, metalness: 0.05 })),
      );
      system.add(mesh);

      // Orbits are drawn flat; a small tilt keeps them from overlapping into one
      // line when the camera swings low.
      ring.rotation.z = index * 0.02;
      return { planet, radius, mesh };
    });

    const earth = bodies.find((body) => body.planet.key === "earth")!;

    // ---- the reader's own position ----------------------------------------
    const marker = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.035, 16, 16)),
      track(new THREE.MeshBasicMaterial({ color: 0xffffff })),
    );
    earth.mesh.add(marker);

    // ---- stars -------------------------------------------------------------
    const starCount = 420;
    const starPositions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      // Deterministic scatter: a golden-angle spiral on a sphere, so the field
      // is even and does not need a random seed.
      const t = index / starCount;
      const angle = index * 2.399963;
      const y = 1 - t * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      starPositions.set([Math.cos(angle) * ring * 34, y * 34, Math.sin(angle) * ring * 34], index * 3);
    }
    const starGeometry = track(new THREE.BufferGeometry());
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = track(
      new THREE.PointsMaterial({ color: 0xdfe6f5, size: 0.075, transparent: true, opacity: 0.5 }),
    );
    scene.add(new THREE.Points(starGeometry, starMaterial));

    // ---- layout ------------------------------------------------------------
    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    // ---- the frame ---------------------------------------------------------
    let frame = 0;
    const draw = () => {
      const now = new Date();
      const { coordinates: place, isNight: night } = live.current;

      for (const body of bodies) {
        const angle = planetLongitude(body.planet.key, now) * RAD;
        body.mesh.position.set(Math.cos(angle) * body.radius, 0, -Math.sin(angle) * body.radius);
      }

      // Turn Earth so the reader's longitude faces the sun at their solar noon,
      // then tilt the marker to their latitude. The marker crosses onto the lit
      // side exactly when the sun rises where they are.
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
      const sunwardLongitude = (utcHours - 12) * 15 + 180;
      const earthAngle = planetLongitude("earth", now) * RAD;
      earth.mesh.rotation.y = earthAngle - (sunwardLongitude + place.longitude) * RAD;
      earth.mesh.rotation.z = 23.44 * RAD;
      const lat = place.latitude * RAD;
      marker.position.set(Math.cos(lat) * 0.2, Math.sin(lat) * 0.2, 0);

      // The marker brightens with the sun's real altitude where the reader is.
      const altitude = sunPositionAt(now, place).altitude;
      const lit = Math.max(0, Math.min(1, (altitude + 6) / 26));
      (marker.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.72 + lit * 0.28, 0.42 + lit * 0.58);

      sun.rotation.y += 0.0015;
      halo.position.copy(sun.position);
      starMaterial.opacity = night ? 0.62 : 0.2;

      // The camera is the only thing here moving at a pace an eye can follow.
      // Earth's orbit reaches 3.4 units and the group is nudged 0.7 further, so
      // the camera sits back far enough that 4.1 units clears the frustum at
      // this field of view rather than running off the edge of the hero.
      const drift = reduceMotion ? 0 : Date.now() / 42000;
      camera.position.set(Math.sin(drift) * 12.4, 5.4, Math.cos(drift) * 12.4);
      camera.lookAt(-0.7, 0, 0.4);

      renderer.render(scene, camera);
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const item of disposables) item.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={holder} className="solar-scene" aria-hidden="true" />;
}
