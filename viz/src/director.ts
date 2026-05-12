/**
 * CameraDirector — orchestrates a smooth camera flight through the 3D network.
 *
 * The camera follows a sequence of waypoints, each targeting a node or cluster
 * centroid. Between waypoints it accelerates/decelerates using ease-in-out curves.
 * At each waypoint it orbits slowly. The result is a continuous, never-stopping
 * motion that breathes through the graph.
 */

import * as THREE from "three";

// ---- Types ----

export interface GraphNode3D {
  id: string;
  name: string;
  class: string;
  x?: number;
  y?: number;
  z?: number;
  [key: string]: unknown;
}

export interface Waypoint {
  /** Node ID to orbit, or "centroid:<class>" for cluster centroids */
  target: string;
  /** Distance from the target point */
  orbitRadius: number;
  /** Radians per second while dwelling */
  orbitSpeed: number;
  /** Seconds to spend orbiting this waypoint */
  dwellTime: number;
  /** Seconds to transition FROM the previous waypoint to this one */
  transitionTime: number;
  /** Vertical offset angle (radians) — 0 = equator, π/4 = 45° above */
  elevationAngle: number;
}

export interface DirectorState {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  /** 0 = fully transparent/black, 1 = fully visible */
  opacity: number;
  /** Normalized progress 0–1 over the full duration */
  progress: number;
  /** Whether the animation has completed one full loop */
  looped: boolean;
}

// ---- Easing ----

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ---- Catmull-Rom interpolation for smooth paths ----

function catmullRom(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const v = new THREE.Vector3();
  v.x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  v.y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  v.z = 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
  return v;
}

// ---- Director ----

export class CameraDirector {
  private waypoints: Waypoint[];
  private totalDuration: number;
  private fadeInDuration: number;
  private fadeOutDuration: number;
  /** Computed positions of waypoint targets (resolved at start) */
  private targetPositions: THREE.Vector3[] = [];
  /** Timeline segments: [startTime, endTime, waypointIndex, isTransition] */
  private segments: { start: number; end: number; wpIndex: number; isTransition: boolean }[] = [];

  constructor(
    waypoints: Waypoint[],
    fadeInDuration = 4,
    fadeOutDuration = 5,
  ) {
    this.waypoints = waypoints;
    this.fadeInDuration = fadeInDuration;
    this.fadeOutDuration = fadeOutDuration;

    // Compute total duration from waypoints
    let t = 0;
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      if (i > 0 && wp.transitionTime > 0) {
        this.segments.push({ start: t, end: t + wp.transitionTime, wpIndex: i, isTransition: true });
        t += wp.transitionTime;
      }
      this.segments.push({ start: t, end: t + wp.dwellTime, wpIndex: i, isTransition: false });
      t += wp.dwellTime;
    }
    this.totalDuration = t;
  }

  getTotalDuration(): number {
    return this.totalDuration;
  }

  /**
   * Resolve waypoint targets to actual 3D positions from the live graph data.
   * Must be called before update() — typically once the simulation has settled.
   */
  resolveTargets(nodes: GraphNode3D[]): void {
    this.targetPositions = this.waypoints.map((wp) => {
      if (wp.target.startsWith("centroid:")) {
        return this.computeCentroid(nodes, wp.target.slice(9));
      }
      if (wp.target === "cluster-guests") {
        return this.findGuestClusters(nodes);
      }
      // Single node
      const node = nodes.find((n) => n.id === wp.target);
      if (node && node.x != null) {
        return new THREE.Vector3(node.x, node.y ?? 0, node.z ?? 0);
      }
      return new THREE.Vector3(0, 0, 0);
    });
  }

  private computeCentroid(nodes: GraphNode3D[], classOrIds: string): THREE.Vector3 {
    let targets: GraphNode3D[];
    if (classOrIds.includes(",")) {
      const ids = new Set(classOrIds.split(","));
      targets = nodes.filter((n) => ids.has(n.id) && n.x != null);
    } else {
      targets = nodes.filter((n) => n.class === classOrIds && n.x != null);
    }
    if (targets.length === 0) return new THREE.Vector3(0, 0, 0);
    const sum = new THREE.Vector3();
    for (const n of targets) sum.add(new THREE.Vector3(n.x, n.y ?? 0, n.z ?? 0));
    return sum.divideScalar(targets.length);
  }

  private findGuestClusters(nodes: GraphNode3D[]): THREE.Vector3 {
    // Return centroid of all guest nodes
    const guests = nodes.filter((n) => n.class === "guest" && n.x != null);
    if (guests.length === 0) return new THREE.Vector3(0, 0, 0);
    const sum = new THREE.Vector3();
    for (const n of guests) sum.add(new THREE.Vector3(n.x, n.y ?? 0, n.z ?? 0));
    return sum.divideScalar(guests.length);
  }

  /**
   * Compute camera state at a given elapsed time (in seconds).
   * Handles looping internally.
   */
  update(elapsed: number): DirectorState {
    const looped = elapsed >= this.totalDuration;
    const t = elapsed % this.totalDuration;
    const progress = t / this.totalDuration;

    // Find current segment
    let segIdx = 0;
    for (let i = 0; i < this.segments.length; i++) {
      if (t >= this.segments[i].start && t < this.segments[i].end) {
        segIdx = i;
        break;
      }
      if (i === this.segments.length - 1) segIdx = i;
    }
    const seg = this.segments[segIdx];
    const segProgress = Math.min(1, (t - seg.start) / Math.max(0.001, seg.end - seg.start));

    let position: THREE.Vector3;
    let lookAt: THREE.Vector3;

    if (seg.isTransition) {
      // Transitioning between waypoints
      const fromWpIdx = seg.wpIndex - 1;
      const toWpIdx = seg.wpIndex;
      const fromPos = this.getOrbitPosition(fromWpIdx, t);
      const toPos = this.getOrbitPosition(toWpIdx, t);
      const fromTarget = this.targetPositions[fromWpIdx] ?? new THREE.Vector3();
      const toTarget = this.targetPositions[toWpIdx] ?? new THREE.Vector3();

      const easedT = easeInOutCubic(segProgress);

      // Use Catmull-Rom for smoother path through waypoints
      const p0 = fromWpIdx > 0 ? this.getOrbitPosition(fromWpIdx - 1, t) : fromPos.clone().sub(toPos.clone().sub(fromPos));
      const p3 = toWpIdx < this.waypoints.length - 1 ? this.getOrbitPosition(toWpIdx + 1, t) : toPos.clone().add(toPos.clone().sub(fromPos));

      position = catmullRom(p0, fromPos, toPos, p3, easedT);
      lookAt = new THREE.Vector3().lerpVectors(fromTarget, toTarget, easedT);
    } else {
      // Dwelling / orbiting
      position = this.getOrbitPosition(seg.wpIndex, t);
      lookAt = this.targetPositions[seg.wpIndex]?.clone() ?? new THREE.Vector3();
    }

    // Fade envelope
    let opacity = 1;
    // Fade in at the start of the full cycle
    if (t < this.fadeInDuration) {
      opacity = easeInOutCubic(t / this.fadeInDuration);
    }
    // Fade out at the end
    const fadeOutStart = this.totalDuration - this.fadeOutDuration;
    if (t > fadeOutStart) {
      opacity = easeInOutCubic((this.totalDuration - t) / this.fadeOutDuration);
    }

    return { position, lookAt, opacity, progress, looped };
  }

  /** Compute the orbital camera position for a given waypoint at time t */
  private getOrbitPosition(wpIndex: number, globalTime: number): THREE.Vector3 {
    const wp = this.waypoints[Math.max(0, Math.min(wpIndex, this.waypoints.length - 1))];
    const center = this.targetPositions[Math.max(0, Math.min(wpIndex, this.targetPositions.length - 1))]?.clone() ?? new THREE.Vector3();

    // Continuous orbit angle based on global time
    const angle = globalTime * wp.orbitSpeed;
    const elev = wp.elevationAngle;

    const x = center.x + wp.orbitRadius * Math.cos(angle) * Math.cos(elev);
    const y = center.y + wp.orbitRadius * Math.sin(elev);
    const z = center.z + wp.orbitRadius * Math.sin(angle) * Math.cos(elev);

    return new THREE.Vector3(x, y, z);
  }
}

// ---- Default choreography for Salotto network ----

export function createDefaultChoreography(): { waypoints: Waypoint[]; fadeIn: number; fadeOut: number } {
  const waypoints: Waypoint[] = [
    // Act 1+2: Fade in on Salotto — wider orbit so connected labels are visible (0–20s)
    {
      target: "SALOTTO",
      orbitRadius: 110,
      orbitSpeed: 0.12,
      dwellTime: 20,
      transitionTime: 0,
      elevationAngle: 0.25,
    },
    // Act 3a: Transition to founders cluster — wide enough to show all 6 founders (20–28s), orbit (28–42s)
    {
      target: "centroid:P001,P002,P003,P004,P005,P006",
      orbitRadius: 130,
      orbitSpeed: 0.15,
      dwellTime: 14,
      transitionTime: 8,
      elevationAngle: 0.2,
    },
    // Act 3b: Transition to Flou (42–48s), orbit (48–58s)
    {
      target: "O_FLOU",
      orbitRadius: 60,
      orbitSpeed: 0.25,
      dwellTime: 10,
      transitionTime: 6,
      elevationAngle: 0.35,
    },
    // Act 4a: First guest cluster drift (58–64s), orbit (64–78s)
    {
      target: "centroid:guest",
      orbitRadius: 100,
      orbitSpeed: 0.18,
      dwellTime: 14,
      transitionTime: 6,
      elevationAngle: 0.15,
    },
    // Act 4b: Quick acceleration to ambient area (78–82s), orbit (82–92s)
    {
      target: "centroid:ambient",
      orbitRadius: 90,
      orbitSpeed: 0.22,
      dwellTime: 10,
      transitionTime: 4,
      elevationAngle: -0.1,
    },
    // Act 4c: Back toward guests from different angle (92–97s), orbit (97–107s)
    {
      target: "centroid:guest",
      orbitRadius: 120,
      orbitSpeed: 0.12,
      dwellTime: 10,
      transitionTime: 5,
      elevationAngle: 0.4,
    },
    // Act 5: Pull way back, zoom out (107–115s), dwell (115–120s)
    {
      target: "SALOTTO",
      orbitRadius: 300,
      orbitSpeed: 0.08,
      dwellTime: 5,
      transitionTime: 8,
      elevationAngle: 0.5,
    },
  ];

  return { waypoints, fadeIn: 4, fadeOut: 5 };
}
