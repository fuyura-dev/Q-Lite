import * as THREE from "three";
import { BOARD_MATERIALS, CELL_HEIGHT } from "./constants";

const PAWN_CLASS_STYLES = {
  ghost: {
    primary: "#2c3148",
    accent: "#79d9ff",
    trim: "#cfd6e6",
    emissive: "#1c5f85",
    transparent: false,
    opacity: 1,
    roughness: 0.58,
    metalness: 0.08,
  },
  builder: {
    primary: "#a96532",
    accent: "#f0c26a",
    trim: "#5c3218",
    emissive: "#321505",
    transparent: false,
    opacity: 1,
    roughness: 0.68,
    metalness: 0.16,
  },
  runner: {
    primary: "#d7d0c2",
    accent: "#5fa8e8",
    trim: "#1f4e78",
    emissive: "#123556",
    transparent: false,
    opacity: 1,
    roughness: 0.42,
    metalness: 0.12,
  },
};

const PLAYER_BASE_STYLES = {
  1: {
    color: "#b86f25",
    emissive: "#3a1c05",
  },
  2: {
    color: "#247f78",
    emissive: "#052c2a",
  },
};

function createMaterial(style, colorKey = "primary", options = {}) {
  const transparent = options.transparent ?? style.transparent;

  return new THREE.MeshStandardMaterial({
    color: style[colorKey],
    depthWrite: !transparent,
    emissive: style.emissive,
    emissiveIntensity: options.emissiveIntensity ?? (transparent ? 0.38 : 0.14),
    metalness: options.metalness ?? style.metalness,
    opacity: options.opacity ?? style.opacity,
    roughness: options.roughness ?? style.roughness,
    transparent,
  });
}

function createPlayerMaterial(playerId, options = {}) {
  const style = PLAYER_BASE_STYLES[playerId] ?? PLAYER_BASE_STYLES[1];
  const transparent = options.transparent ?? false;

  return new THREE.MeshStandardMaterial({
    color: style.color,
    depthWrite: !transparent,
    emissive: style.emissive,
    emissiveIntensity: options.emissiveIntensity ?? 0.16,
    metalness: options.metalness ?? 0.12,
    opacity: options.opacity ?? 1,
    roughness: options.roughness ?? 0.52,
    transparent,
  });
}

function createPlayerMarker(playerId) {
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.018, 8, 36),
    createPlayerMaterial(playerId),
  );
  marker.position.y = CELL_HEIGHT + 0.085;
  marker.rotation.x = Math.PI / 2;
  marker.castShadow = true;
  marker.receiveShadow = true;
  return marker;
}

function createLatheMesh(points, material, segments = 32) {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(points, segments),
    material,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createBeveledBox(width, height, depth, bevelSize, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.lineTo(-width / 2, -height / 2);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize,
    bevelThickness: bevelSize,
    depth,
  });
  geometry.center();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createShieldMesh(material) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.13);
  shape.lineTo(0.105, 0.08);
  shape.lineTo(0.09, -0.075);
  shape.lineTo(0, -0.15);
  shape.lineTo(-0.09, -0.075);
  shape.lineTo(-0.105, 0.08);
  shape.lineTo(0, 0.13);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    depth: 0.032,
  });
  geometry.center();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createDefaultBody(material, baseMaterial = material) {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.27, 0.1, 28),
    baseMaterial,
  );
  base.castShadow = true;
  base.receiveShadow = true;
  base.position.y = CELL_HEIGHT + 0.05;
  group.add(base);

  const body = createLatheMesh(
    [
      new THREE.Vector2(0.17, CELL_HEIGHT + 0.12),
      new THREE.Vector2(0.22, CELL_HEIGHT + 0.22),
      new THREE.Vector2(0.18, CELL_HEIGHT + 0.42),
      new THREE.Vector2(0.1, CELL_HEIGHT + 0.62),
      new THREE.Vector2(0.04, CELL_HEIGHT + 0.67),
    ],
    material,
  );
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), material);
  head.castShadow = true;
  head.position.y = CELL_HEIGHT + 0.72;
  group.add(head);

  return group;
}

function createGhostBody(style, playerId) {
  const group = new THREE.Group();

  const playerMaterial = createPlayerMaterial(playerId, {
    emissiveIntensity: 0.14,
    roughness: 0.54,
  });

  const cloakMaterial = createMaterial(style, "primary", {
    emissiveIntensity: 0.18,
    metalness: 0.04,
    roughness: 0.78,
    transparent: false,
    opacity: 1,
  });

  const cloakShadowMaterial = new THREE.MeshStandardMaterial({
    color: "#111522",
    emissive: "#040711",
    emissiveIntensity: 0.12,
    metalness: 0.02,
    roughness: 0.92,
  });

  const silverMaterial = createMaterial(style, "trim", {
    emissiveIntensity: 0.1,
    metalness: 0.18,
    roughness: 0.46,
    transparent: false,
    opacity: 1,
  });

  const phaseMaterial = createMaterial(style, "accent", {
    emissiveIntensity: 0.8,
    metalness: 0.02,
    opacity: 0.42,
    roughness: 0.22,
    transparent: true,
  });

  const phaseSolidMaterial = createMaterial(style, "accent", {
    emissiveIntensity: 0.62,
    metalness: 0.05,
    roughness: 0.38,
    transparent: false,
    opacity: 1,
  });

  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: "#1b1e27",
    emissive: "#05070d",
    emissiveIntensity: 0.16,
    metalness: 0.12,
    roughness: 0.64,
  });
  const leatherMaterial = new THREE.MeshStandardMaterial({
    color: "#2b2230",
    emissive: "#08050c",
    emissiveIntensity: 0.08,
    metalness: 0.02,
    roughness: 0.8,
  });

  function createPhaseDiamond(material) {
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.038, 0),
      material,
    );

    diamond.scale.set(0.78, 1, 0.24);
    diamond.castShadow = true;

    return diamond;
  }

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.09, 8),
    playerMaterial,
  );

  base.position.y = CELL_HEIGHT + 0.045;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const baseTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.215, 0.018, 28),
    cloakShadowMaterial,
  );

  baseTop.position.y = CELL_HEIGHT + 0.1;
  baseTop.castShadow = true;
  baseTop.receiveShadow = true;
  group.add(baseTop);

  const basePhaseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.205, 0.009, 8, 36),
    phaseSolidMaterial,
  );

  basePhaseRing.position.y = CELL_HEIGHT + 0.112;
  basePhaseRing.rotation.x = Math.PI / 2;
  basePhaseRing.castShadow = true;
  group.add(basePhaseRing);

  const body = createLatheMesh(
    [
      new THREE.Vector2(0.105, CELL_HEIGHT + 0.12),
      new THREE.Vector2(0.155, CELL_HEIGHT + 0.23),
      new THREE.Vector2(0.145, CELL_HEIGHT + 0.46),
      new THREE.Vector2(0.085, CELL_HEIGHT + 0.64),
      new THREE.Vector2(0.035, CELL_HEIGHT + 0.69),
    ],
    playerMaterial,
    22,
  );

  body.scale.set(0.9, 1, 0.82);
  group.add(body);

  const waistBelt = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.012, 8, 28),
    leatherMaterial,
  );
  waistBelt.position.y = CELL_HEIGHT + 0.34;
  waistBelt.scale.set(1, 1, 0.72);
  waistBelt.rotation.x = Math.PI / 2;
  waistBelt.castShadow = true;
  group.add(waistBelt);

  const phaseBuckle = createPhaseDiamond(phaseSolidMaterial);
  phaseBuckle.position.set(0, CELL_HEIGHT + 0.34, 0.13);
  phaseBuckle.scale.set(0.62, 0.78, 0.18);
  group.add(phaseBuckle);

  const shoulderMantle = new THREE.Mesh(
    new THREE.TorusGeometry(0.158, 0.026, 8, 28),
    cloakMaterial,
  );

  shoulderMantle.position.y = CELL_HEIGHT + 0.59;
  shoulderMantle.scale.set(1.18, 1, 0.86);
  shoulderMantle.rotation.x = Math.PI / 2;
  shoulderMantle.castShadow = true;
  group.add(shoulderMantle);

  const backCloak = createBeveledBox(0.25, 0.4, 0.026, 0.008, cloakMaterial);

  backCloak.position.set(0, CELL_HEIGHT + 0.39, -0.14);
  backCloak.rotation.x = 0.16;
  backCloak.castShadow = true;
  group.add(backCloak);

  const backCloakTrim = createBeveledBox(
    0.18,
    0.018,
    0.028,
    0.004,
    silverMaterial,
  );

  backCloakTrim.position.set(0, CELL_HEIGHT + 0.205, -0.195);
  backCloakTrim.rotation.x = 0.16;
  group.add(backCloakTrim);

  for (const [x, rotZ] of [
    [-0.168, -0.14],
    [0.168, 0.14],
  ]) {
    const sidePanel = createBeveledBox(
      0.078,
      0.36,
      0.022,
      0.006,
      cloakMaterial,
    );

    sidePanel.position.set(x, CELL_HEIGHT + 0.38, -0.045);
    sidePanel.rotation.z = rotZ;
    sidePanel.rotation.x = -0.04;
    sidePanel.rotation.y = x < 0 ? -0.82 : 0.82;
    sidePanel.castShadow = true;
    group.add(sidePanel);

    const sideTrim = createBeveledBox(
      0.014,
      0.32,
      0.024,
      0.004,
      silverMaterial,
    );

    sideTrim.position.set(x * 0.92, CELL_HEIGHT + 0.37, 0.01);
    sideTrim.rotation.z = rotZ;
    sideTrim.rotation.x = -0.04;
    sideTrim.rotation.y = x < 0 ? -0.82 : 0.82;
    group.add(sideTrim);
  }

  for (const [x, z, rotZ] of [
    [-0.13, -0.12, -0.16],
    [0.13, -0.12, 0.16],
  ]) {
    const cloakFold = createBeveledBox(
      0.014,
      0.26,
      0.016,
      0.004,
      cloakShadowMaterial,
    );

    cloakFold.position.set(x, CELL_HEIGHT + 0.34, z);
    cloakFold.rotation.z = rotZ;
    cloakFold.rotation.x = 0.08;
    cloakFold.rotation.y = x < 0 ? -0.55 : 0.55;
    group.add(cloakFold);
  }

  for (const [x, rotZ] of [
    [-0.04, -0.28],
    [0.04, 0.28],
  ]) {
    const strap = createBeveledBox(0.018, 0.16, 0.016, 0.004, silverMaterial);

    strap.position.set(x, CELL_HEIGHT + 0.515, 0.185);
    strap.rotation.z = rotZ;
    strap.rotation.x = -0.08;
    group.add(strap);
  }

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 16, 12),
    playerMaterial,
  );

  head.position.y = CELL_HEIGHT + 0.72;
  head.castShadow = true;
  group.add(head);

  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.68),
    cloakMaterial,
  );

  hood.position.set(0, CELL_HEIGHT + 0.758, -0.012);
  hood.scale.set(0.88, 1.02, 1.08);
  hood.castShadow = true;
  group.add(hood);

  const hoodShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.105, 24),
    cloakShadowMaterial,
  );

  hoodShadow.position.set(0, CELL_HEIGHT + 0.74, 0.14);
  hoodShadow.scale.set(0.78, 1, 1);
  group.add(hoodShadow);

  const hoodRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.108, 0.01, 8, 32),
    silverMaterial,
  );

  hoodRim.position.set(0, CELL_HEIGHT + 0.74, 0.148);
  hoodRim.scale.set(0.66, 0.92, 1);
  group.add(hoodRim);

  const hoodCrest = createBeveledBox(0.026, 0.16, 0.018, 0.005, silverMaterial);
  hoodCrest.position.set(0, CELL_HEIGHT + 0.835, 0.03);
  hoodCrest.rotation.x = -0.18;
  group.add(hoodCrest);

  for (const [x, rotZ] of [
    [-0.078, -0.2],
    [0.078, 0.2],
  ]) {
    const cheekGuard = createBeveledBox(
      0.034,
      0.095,
      0.018,
      0.005,
      silverMaterial,
    );
    cheekGuard.position.set(x, CELL_HEIGHT + 0.705, 0.143);
    cheekGuard.rotation.z = rotZ;
    cheekGuard.rotation.x = -0.08;
    group.add(cheekGuard);
  }

  const mask = createBeveledBox(0.12, 0.056, 0.018, 0.004, silverMaterial);

  mask.position.set(0, CELL_HEIGHT + 0.73, 0.158);
  group.add(mask);

  const visor = createBeveledBox(0.095, 0.018, 0.02, 0.003, darkMetalMaterial);

  visor.position.set(0, CELL_HEIGHT + 0.735, 0.17);
  group.add(visor);

  const wallPlate = createBeveledBox(
    0.13,
    0.12,
    0.018,
    0.005,
    darkMetalMaterial,
  );

  wallPlate.position.set(0, CELL_HEIGHT + 0.455, 0.205);
  wallPlate.rotation.x = -0.08;
  group.add(wallPlate);

  for (const [x, y] of [
    [-0.042, CELL_HEIGHT + 0.482],
    [0.0, CELL_HEIGHT + 0.455],
    [0.043, CELL_HEIGHT + 0.425],
  ]) {
    const crack = createBeveledBox(
      0.012,
      0.085,
      0.012,
      0.0025,
      phaseSolidMaterial,
    );

    crack.position.set(x, y, 0.218);
    crack.rotation.z = x < 0 ? -0.52 : x > 0 ? 0.46 : -0.1;
    group.add(crack);
  }

  const chestDiamond = createPhaseDiamond(phaseSolidMaterial);
  chestDiamond.position.set(0, CELL_HEIGHT + 0.455, 0.232);
  group.add(chestDiamond);

  for (const [y, radius, rotZ] of [
    [CELL_HEIGHT + 0.36, 0.205, 0.18],
    [CELL_HEIGHT + 0.58, 0.15, -0.22],
  ]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.007, 8, 40),
      phaseMaterial,
    );

    ring.position.y = y;
    ring.scale.set(1, 1, 0.62);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = rotZ;
    group.add(ring);
  }

  for (const [x, z, scaleY] of [
    [-0.11, -0.23, 0.9],
    [0.0, -0.26, 1.15],
    [0.11, -0.23, 0.9],
  ]) {
    const wallSlice = createBeveledBox(
      0.08,
      0.23 * scaleY,
      0.018,
      0.005,
      phaseMaterial,
    );

    wallSlice.position.set(x, CELL_HEIGHT + 0.32, z);
    wallSlice.rotation.x = 0.18;
    wallSlice.castShadow = false;
    group.add(wallSlice);
  }

  for (const x of [-0.1, 0.1]) {
    const boot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.043, 0.052, 0.075, 10),
      cloakShadowMaterial,
    );

    boot.position.set(x, CELL_HEIGHT + 0.12, 0.025);
    boot.castShadow = true;
    group.add(boot);
  }

  return group;
}

function addBuilderDetails(group, style) {
  const helmetMaterial = createMaterial(style, "accent", {
    metalness: 0.2,
    roughness: 0.46,
  });
  const trimMaterial = createMaterial(style, "trim", {
    metalness: 0.08,
    roughness: 0.62,
  });
  const badgeMaterial = new THREE.MeshStandardMaterial({
    color: "#d4a23c",
    emissive: "#3a2304",
    emissiveIntensity: 0.14,
    metalness: 0.32,
    roughness: 0.42,
  });
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: "#595b55",
    metalness: 0.02,
    roughness: 0.88,
  });
  const stoneDarkMaterial = new THREE.MeshStandardMaterial({
    color: "#343631",
    metalness: 0.01,
    roughness: 0.92,
  });
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: "#c89b3a",
    emissive: "#3a2204",
    emissiveIntensity: 0.12,
    metalness: 0.28,
    roughness: 0.48,
  });
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: "#5b351b",
    metalness: 0.02,
    roughness: 0.82,
  });
  const apronMaterial = new THREE.MeshStandardMaterial({
    color: "#70431f",
    metalness: 0.02,
    roughness: 0.84,
  });

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    helmetMaterial,
  );
  helmet.position.y = CELL_HEIGHT + 0.78;
  helmet.castShadow = true;
  group.add(helmet);

  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.16, 0.03, 32),
    helmetMaterial,
  );
  brim.position.set(0, CELL_HEIGHT + 0.75, 0.03);
  brim.scale.set(1, 0.55, 0.76);
  brim.castShadow = true;
  group.add(brim);

  const frontBrim = createBeveledBox(0.27, 0.026, 0.09, 0.01, helmetMaterial);
  frontBrim.position.set(0, CELL_HEIGHT + 0.748, 0.12);
  group.add(frontBrim);

  const centerRidge = createBeveledBox(0.045, 0.032, 0.31, 0.008, trimMaterial);
  centerRidge.position.set(0, CELL_HEIGHT + 0.875, 0.01);
  group.add(centerRidge);

  for (const x of [-0.065, 0.065]) {
    const sideRidge = createBeveledBox(0.024, 0.02, 0.24, 0.006, trimMaterial);
    sideRidge.position.set(x, CELL_HEIGHT + 0.84, 0.012);
    group.add(sideRidge);
  }

  const frontBadge = createBeveledBox(0.07, 0.06, 0.012, 0.006, badgeMaterial);
  frontBadge.position.set(0, CELL_HEIGHT + 0.8, 0.18);
  group.add(frontBadge);

  const badgeInset = createBeveledBox(0.032, 0.032, 0.014, 0.004, trimMaterial);
  badgeInset.position.set(0, CELL_HEIGHT + 0.8, 0.188);
  badgeInset.rotation.z = Math.PI / 4;
  group.add(badgeInset);

  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.018, 8, 32),
    trimMaterial,
  );
  belt.position.y = CELL_HEIGHT + 0.32;
  belt.scale.set(1.04, 1, 0.82);
  belt.rotation.x = Math.PI / 2;
  belt.castShadow = true;
  group.add(belt);

  const apron = createBeveledBox(0.13, 0.28, 0.024, 0.008, apronMaterial);
  apron.position.set(0, CELL_HEIGHT + 0.38, 0.195);
  apron.rotation.x = -0.08;
  group.add(apron);

  for (const y of [CELL_HEIGHT + 0.48, CELL_HEIGHT + 0.29]) {
    const apronTrim = createBeveledBox(
      0.145,
      0.018,
      0.028,
      0.004,
      trimMaterial,
    );
    apronTrim.position.set(0, y, 0.21);
    apronTrim.rotation.x = -0.08;
    group.add(apronTrim);
  }

  for (const x of [-0.035, 0.035]) {
    const rivet = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.018, 0),
      badgeMaterial,
    );
    rivet.position.set(x, CELL_HEIGHT + 0.455, 0.22);
    rivet.scale.set(1, 1, 0.35);
    group.add(rivet);
  }

  const shield = new THREE.Group();
  const shieldFace = createShieldMesh(stoneMaterial);
  shield.add(shieldFace);

  const shieldRim = createShieldMesh(trimMaterial);
  shieldRim.scale.set(1.08, 1.08, 0.58);
  shieldRim.position.z = -0.012;
  shield.add(shieldRim);

  const shieldBoss = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.045, 0),
    badgeMaterial,
  );
  shieldBoss.position.z = 0.03;
  shieldBoss.scale.set(1, 1, 0.32);
  shield.add(shieldBoss);

  shield.scale.setScalar(1.18);
  shield.position.set(-0.27, CELL_HEIGHT + 0.42, 0.12);
  shield.rotation.y = -Math.PI / 4;
  group.add(shield);

  const hammer = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.4, 10),
    woodMaterial,
  );
  handle.position.y = -0.03;
  handle.castShadow = true;
  hammer.add(handle);

  const gripWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.055, 10),
    trimMaterial,
  );
  gripWrap.position.y = -0.16;
  gripWrap.castShadow = true;
  hammer.add(gripWrap);

  const handleCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.032, 12),
    trimMaterial,
  );
  handleCap.position.y = -0.25;
  handleCap.castShadow = true;
  hammer.add(handleCap);

  const hammerHead = createBeveledBox(0.16, 0.16, 0.23, 0.018, stoneMaterial);
  hammerHead.position.y = 0.2;
  hammer.add(hammerHead);

  for (const x of [-0.088, 0.088]) {
    const sideSeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.13, 0.205),
      stoneDarkMaterial,
    );
    sideSeam.position.set(x, 0.2, 0);
    hammer.add(sideSeam);
  }

  for (const y of [0.284, 0.116]) {
    const edgeSeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.009, 0.205),
      stoneDarkMaterial,
    );
    edgeSeam.position.set(0, y, 0);
    hammer.add(edgeSeam);
  }

  for (const z of [-0.126, 0.126]) {
    const facePlate = createBeveledBox(
      0.118,
      0.118,
      0.014,
      0.008,
      stoneDarkMaterial,
    );
    facePlate.position.set(0, 0.2, z);
    hammer.add(facePlate);
  }

  const topCap = createBeveledBox(0.085, 0.032, 0.105, 0.008, trimMaterial);
  topCap.position.y = 0.3;
  hammer.add(topCap);

  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.052, 0.08, 12),
    trimMaterial,
  );
  socket.position.y = 0.065;
  socket.castShadow = true;
  hammer.add(socket);

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.052, 0),
    goldMaterial,
  );
  diamond.position.set(0, 0.2, 0.132);
  diamond.scale.set(0.58, 0.78, 0.12);
  diamond.rotation.z = Math.PI / 4;
  hammer.add(diamond);

  for (const [x, y, z, rotation] of [
    [-0.045, 0.225, 0.132, -0.45],
    [0.055, 0.165, 0.132, 0.4],
    [0.0, 0.18, -0.134, 0.7],
    [-0.06, 0.255, -0.134, -0.25],
  ]) {
    const crack = new THREE.Mesh(
      new THREE.BoxGeometry(0.007, 0.065, 0.006),
      stoneDarkMaterial,
    );
    crack.position.set(x, y, z);
    crack.rotation.z = rotation;
    hammer.add(crack);
  }

  for (const y of [-0.11, -0.02, 0.07]) {
    const handleBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.024, 0.0035, 6, 16),
      trimMaterial,
    );
    handleBand.position.y = y;
    handleBand.rotation.x = Math.PI / 2;
    hammer.add(handleBand);
  }

  hammer.position.set(0.28, CELL_HEIGHT + 0.35, 0.03);
  group.add(hammer);
}

function createRunnerBody(playerId) {
  const group = new THREE.Group();
  const playerMaterial = createPlayerMaterial(playerId);

  const stoneBaseMaterial = new THREE.MeshStandardMaterial({
    color: "#6f6c64",
    metalness: 0.03,
    roughness: 0.86,
  });

  const stoneDarkMaterial = new THREE.MeshStandardMaterial({
    color: "#3d3c38",
    metalness: 0.02,
    roughness: 0.9,
  });

  const armorMaterial = new THREE.MeshStandardMaterial({
    color: "#d7d0c2",
    emissive: "#2c2a25",
    emissiveIntensity: 0.08,
    metalness: 0.18,
    roughness: 0.5,
  });
  const darkArmorMaterial = new THREE.MeshStandardMaterial({
    color: "#3a3d3e",
    emissive: "#111314",
    emissiveIntensity: 0.08,
    metalness: 0.12,
    roughness: 0.62,
  });

  const scarfMaterial = new THREE.MeshStandardMaterial({
    color: "#2b6fa7",
    emissive: "#0b2f54",
    emissiveIntensity: 0.22,
    metalness: 0.02,
    roughness: 0.72,
  });

  const scarfLightMaterial = new THREE.MeshStandardMaterial({
    color: "#74b7ef",
    emissive: "#123b62",
    emissiveIntensity: 0.28,
    metalness: 0.02,
    roughness: 0.55,
  });

  const goldMaterial = new THREE.MeshStandardMaterial({
    color: "#d6a64a",
    emissive: "#3a2607",
    emissiveIntensity: 0.12,
    metalness: 0.25,
    roughness: 0.48,
  });

  const leatherMaterial = new THREE.MeshStandardMaterial({
    color: "#684222",
    metalness: 0.02,
    roughness: 0.82,
  });

  const visorMaterial = new THREE.MeshStandardMaterial({
    color: "#101214",
    emissive: "#02080c",
    emissiveIntensity: 0.18,
    metalness: 0.05,
    roughness: 0.7,
  });

  function createTriangleShard(width, height, depth, material) {
    const shape = new THREE.Shape();

    shape.moveTo(0, height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(-width / 2, -height / 2);
    shape.lineTo(0, height / 2);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.006,
      bevelThickness: 0.006,
      depth,
    });

    geometry.center();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  function createArrowEmblem(material) {
    const arrow = new THREE.Group();

    const arrowHead = createTriangleShard(0.11, 0.12, 0.012, material);
    arrowHead.position.y = 0.035;
    arrow.add(arrowHead);

    const arrowTail = createBeveledBox(0.04, 0.105, 0.012, 0.004, material);
    arrowTail.position.y = -0.04;
    arrow.add(arrowTail);

    arrow.rotation.z = -Math.PI / 4;

    return arrow;
  }

  function createStarEmblem(material) {
    const star = new THREE.Group();
    const vertical = createTriangleShard(0.075, 0.16, 0.012, material);
    vertical.position.y = 0.02;
    star.add(vertical);

    const horizontal = createTriangleShard(0.06, 0.13, 0.012, material);
    horizontal.position.y = -0.006;
    horizontal.rotation.z = Math.PI / 2;
    star.add(horizontal);

    const center = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.022, 0),
      material,
    );
    center.scale.set(1, 1, 0.32);
    star.add(center);

    return star;
  }

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.29, 0.09, 8),
    playerMaterial,
  );
  base.castShadow = true;
  base.receiveShadow = true;
  base.position.y = CELL_HEIGHT + 0.045;
  group.add(base);

  const baseTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.205, 0.215, 0.018, 32),
    stoneDarkMaterial,
  );
  baseTop.position.y = CELL_HEIGHT + 0.1;
  baseTop.castShadow = true;
  baseTop.receiveShadow = true;
  group.add(baseTop);

  const speedRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.009, 8, 36),
    scarfLightMaterial,
  );
  speedRing.position.y = CELL_HEIGHT + 0.112;
  speedRing.rotation.x = Math.PI / 2;
  speedRing.castShadow = true;
  group.add(speedRing);

  const lowerBody = createLatheMesh(
    [
      new THREE.Vector2(0.095, CELL_HEIGHT + 0.12),
      new THREE.Vector2(0.145, CELL_HEIGHT + 0.22),
      new THREE.Vector2(0.13, CELL_HEIGHT + 0.46),
    ],
    armorMaterial,
    18,
  );
  lowerBody.scale.set(0.9, 1, 0.78);
  group.add(lowerBody);

  const upperBody = createLatheMesh(
    [
      new THREE.Vector2(0.13, CELL_HEIGHT + 0.46),
      new THREE.Vector2(0.08, CELL_HEIGHT + 0.64),
      new THREE.Vector2(0.035, CELL_HEIGHT + 0.69),
    ],
    playerMaterial,
    18,
  );
  upperBody.scale.set(0.9, 1, 0.78);
  group.add(upperBody);

  const lowerTrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.007, 8, 28),
    scarfLightMaterial,
  );
  lowerTrim.position.y = CELL_HEIGHT + 0.465;
  lowerTrim.scale.set(1, 1, 0.68);
  lowerTrim.rotation.x = Math.PI / 2;
  group.add(lowerTrim);

  for (const x of [-0.05, 0.05]) {
    const clothSeam = createBeveledBox(
      0.01,
      0.2,
      0.012,
      0.003,
      scarfLightMaterial,
    );
    clothSeam.position.set(x, CELL_HEIGHT + 0.29, 0.105);
    clothSeam.rotation.z = x < 0 ? -0.08 : 0.08;
    group.add(clothSeam);
  }

  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.132, 0.014, 8, 24),
    leatherMaterial,
  );
  belt.position.y = CELL_HEIGHT + 0.335;
  belt.scale.set(1.02, 1, 0.72);
  belt.rotation.x = Math.PI / 2;
  belt.castShadow = true;
  group.add(belt);

  const sash = createBeveledBox(0.24, 0.04, 0.018, 0.006, scarfMaterial);
  sash.position.set(0, CELL_HEIGHT + 0.36, 0.09);
  sash.rotation.z = -0.18;
  sash.rotation.x = -0.08;
  group.add(sash);

  const chestPlate = createBeveledBox(
    0.13,
    0.18,
    0.024,
    0.007,
    darkArmorMaterial,
  );
  chestPlate.position.set(0, CELL_HEIGHT + 0.45, 0.118);
  chestPlate.rotation.x = -0.08;
  group.add(chestPlate);

  const chestStar = createStarEmblem(armorMaterial);
  chestStar.scale.setScalar(0.58);
  chestStar.position.set(0, CELL_HEIGHT + 0.455, 0.135);
  group.add(chestStar);

  for (const [x, z, rz] of [
    [-0.085, 0.035, 0.28],
    [0.09, -0.005, -0.22],
  ]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.032, 0.16, 8),
      playerMaterial,
    );
    leg.position.set(x, CELL_HEIGHT + 0.18, z);
    leg.rotation.z = rz;
    leg.castShadow = true;
    group.add(leg);

    const boot = createBeveledBox(0.07, 0.035, 0.11, 0.008, leatherMaterial);
    boot.position.set(x + Math.sign(x) * 0.015, CELL_HEIGHT + 0.105, z + 0.035);
    boot.rotation.y = Math.sign(x) * 0.18;
    group.add(boot);
  }

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 16, 12),
    playerMaterial,
  );
  head.position.y = CELL_HEIGHT + 0.725;
  head.castShadow = true;
  group.add(head);

  const helmet = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.22, 6),
    armorMaterial,
  );
  helmet.position.y = CELL_HEIGHT + 0.85;
  helmet.rotation.y = Math.PI / 6;
  helmet.castShadow = true;
  group.add(helmet);

  const helmetBrim = createBeveledBox(0.22, 0.035, 0.09, 0.008, armorMaterial);
  helmetBrim.position.set(0, CELL_HEIGHT + 0.745, 0.095);
  group.add(helmetBrim);

  const visor = createBeveledBox(0.16, 0.052, 0.018, 0.004, visorMaterial);
  visor.position.set(0, CELL_HEIGHT + 0.728, 0.145);
  group.add(visor);

  const sideWing = createTriangleShard(0.09, 0.13, 0.018, armorMaterial);
  sideWing.position.set(0.125, CELL_HEIGHT + 0.79, 0.03);
  sideWing.rotation.set(0.2, 0.25, -0.55);
  sideWing.scale.set(0.7, 0.75, 0.7);
  group.add(sideWing);

  const neckScarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.024, 8, 28),
    scarfMaterial,
  );
  neckScarf.position.y = CELL_HEIGHT + 0.64;
  neckScarf.scale.set(1.0, 1, 0.62);
  neckScarf.rotation.x = Math.PI / 2;
  neckScarf.castShadow = true;
  group.add(neckScarf);

  const cape = new THREE.Group();

  const capeShape = new THREE.Shape();

  capeShape.moveTo(0, 0.18);
  capeShape.lineTo(0.14, 0.08);

  capeShape.lineTo(0.18, -0.12);
  capeShape.lineTo(0.09, -0.34);

  capeShape.lineTo(0, -0.42);

  capeShape.lineTo(-0.09, -0.34);
  capeShape.lineTo(-0.18, -0.12);
  capeShape.lineTo(-0.14, 0.08);

  capeShape.lineTo(0, 0.18);

  const capeGeometry = new THREE.ExtrudeGeometry(capeShape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    depth: 0.018,
  });

  capeGeometry.center();

  const capeMesh = new THREE.Mesh(capeGeometry, scarfMaterial);
  capeMesh.castShadow = true;
  capeMesh.receiveShadow = true;

  capeMesh.position.set(0, CELL_HEIGHT + 0.46, -0.18);

  capeMesh.rotation.x = 0.85;

  capeMesh.scale.set(1.05, 1.1, 1);

  cape.add(capeMesh);

  for (const x of [-0.06, 0.06]) {
    const fold = createBeveledBox(
      0.012,
      0.34,
      0.012,
      0.003,
      scarfLightMaterial,
    );

    fold.position.set(x, CELL_HEIGHT + 0.41, -0.19);
    fold.rotation.x = 0.85;
    fold.rotation.z = x < 0 ? -0.12 : 0.12;

    cape.add(fold);
  }

  const capeTip = createTriangleShard(0.12, 0.08, 0.014, scarfLightMaterial);
  capeTip.position.set(0, CELL_HEIGHT + 0.13, -0.49);
  capeTip.rotation.x = 0.85;
  cape.add(capeTip);

  const capeClasp = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.035, 0),
    goldMaterial,
  );

  capeClasp.position.set(0, CELL_HEIGHT + 0.61, -0.075);
  capeClasp.scale.set(1, 1, 0.4);
  capeClasp.castShadow = true;
  cape.add(capeClasp);

  group.add(cape);

  for (const [x, y, z, scale, rz] of [
    [-0.02, 0.61, -0.21, [0.18, 0.36, 1], -0.28],
    [0.075, 0.56, -0.29, [0.14, 0.32, 1], 0.12],
  ]) {
    const tail = createTriangleShard(0.12, 0.34, 0.018, scarfMaterial);
    tail.position.set(x, CELL_HEIGHT + y, z);
    tail.rotation.set(Math.PI / 2.7, 0, rz);
    tail.scale.set(...scale);
    group.add(tail);
  }

  for (const [x, y, z, scale] of [
    [-0.11, 0.5, -0.33, [0.12, 0.52, 0.65]],
    [0.02, 0.43, -0.38, [0.105, 0.62, 0.55]],
    [0.12, 0.35, -0.31, [0.09, 0.45, 0.5]],
  ]) {
    const shard = createTriangleShard(0.13, 0.42, 0.014, scarfLightMaterial);
    shard.position.set(x, CELL_HEIGHT + y, z);
    shard.rotation.set(Math.PI / 2.6, 0, -0.15);
    shard.scale.set(...scale);
    group.add(shard);
  }

  for (const [x, rz] of [
    [-0.15, -0.25],
    [0.15, 0.25],
  ]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.03, 0.22, 8),
      playerMaterial,
    );
    arm.position.set(x, CELL_HEIGHT + 0.42, 0.02);
    arm.rotation.z = rz;
    arm.castShadow = true;
    group.add(arm);

    const glove = new THREE.Mesh(
      new THREE.SphereGeometry(0.037, 10, 8),
      leatherMaterial,
    );
    glove.position.set(x + Math.sign(x) * 0.025, CELL_HEIGHT + 0.305, 0.025);
    glove.castShadow = true;
    group.add(glove);
  }

  return group;
}

function createClassBody(style, classId, playerId) {
  if (classId == "ghost") {
    return createGhostBody(style, playerId);
  }

  if (classId == "runner") {
    return createRunnerBody(playerId);
  }

  const playerMaterial = createPlayerMaterial(playerId);
  const body = createDefaultBody(playerMaterial, playerMaterial);

  if (classId == "builder") {
    body.scale.set(1.08, 1, 1.08);
    addBuilderDetails(body, style);
  }

  return body;
}

export function createPawnMesh(playerId, classId = "default") {
  const pawnGroup = new THREE.Group();
  const classStyle = PAWN_CLASS_STYLES[classId];

  const body = classStyle
    ? createClassBody(classStyle, classId, playerId)
    : createDefaultBody(
        playerId == 1 ? BOARD_MATERIALS.pawnOne : BOARD_MATERIALS.pawnTwo,
      );
  pawnGroup.add(body);

  if (classId == "ghost") {
    pawnGroup.add(createPlayerMarker(playerId));
  }

  pawnGroup.userData.classId = classId;
  pawnGroup.userData.playerId = playerId;

  return pawnGroup;
}
