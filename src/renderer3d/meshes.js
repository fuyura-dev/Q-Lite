import * as THREE from "three";
import {
  BOARD_MATERIALS,
  CELL_HEIGHT,
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_SPAN,
  WALL_THICKNESS,
  HALF_BOARD,
  LANE_SIZE,
} from "./constants";
import {
  getCellCenter,
  getLaneCenter,
  getWallSpan,
  getWallPreviewCenter,
} from "./geometry";
import { getReserveWallLengthFromKey } from "./reserveWalls";

const WALL_TEXTURE_WORLD_SCALE = 1.72;
const WALL_EDGE_ROUGHNESS = 0.048;
const WALL_CHIP_DEPTH = 0.07;
const WALL_SIDE_ROUGHNESS = 0.034;
const WALL_OWNER_CREST_WIDTH = 0.18;
const WALL_OWNER_CREST_HEIGHT = 0.4;
const WALL_OWNER_CREST_THICKNESS = 0.09;
const WALL_OWNER_EMBLEM_SCALE = 0.58;
const WALL_OWNER_EMBLEM_THICKNESS = 0.002;

const wallTextureLoader = new THREE.TextureLoader();
const wallMaterials = new Map();

const WALL_OWNER_PLAQUE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#6b4327",
  roughness: 0.78,
  metalness: 0.02,
  side: THREE.DoubleSide,
});

const WALL_OWNER_EMBLEM_MATERIALS = {
  1: new THREE.MeshStandardMaterial({
    color: "#b98535",
    roughness: 0.82,
    metalness: 0.04,
    side: THREE.DoubleSide,
  }),
  2: new THREE.MeshStandardMaterial({
    color: "#426b3d",
    roughness: 0.86,
    metalness: 0.03,
    side: THREE.DoubleSide,
  }),
};

function loadWallTexture(path) {
  const texture = wallTextureLoader.load(path);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const WALL_TEXTURES = {
  colorMap: loadWallTexture("/textures/board/Bricks076C_4K_Color.jpg"),
  normalMap: loadWallTexture("/textures/board/Bricks076C_4K_NormalGL.jpg"),
  roughnessMap: loadWallTexture("/textures/board/Bricks076C_4K_Roughness.jpg"),
};
WALL_TEXTURES.colorMap.colorSpace = THREE.SRGBColorSpace;

function seededNoise(a, b, salt) {
  const value = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function hashText(value) {
  return [...String(value)].reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973,
    7,
  );
}

function createWallMaterial(isSelected = false) {
  const key = isSelected ? "selected" : "default";

  if (!wallMaterials.has(key)) {
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: isSelected ? "#f0a85f" : "#d4b88d",
      map: WALL_TEXTURES.colorMap,
      normalMap: WALL_TEXTURES.normalMap,
      normalScale: new THREE.Vector2(0.42, 0.42),
      roughness: isSelected ? 0.54 : 0.86,
      roughnessMap: WALL_TEXTURES.roughnessMap,
      metalness: 0.02,
      transparent: isSelected,
      opacity: isSelected ? 0.94 : 1,
      emissive: isSelected ? "#8f4d17" : "#33210f",
      emissiveIntensity: isSelected ? 0.44 : 0.26,
    });
    const topMaterial = sideMaterial.clone();
    topMaterial.color.set(isSelected ? "#ffc979" : "#f0d5a7");
    topMaterial.emissive.set(isSelected ? "#9d581d" : "#433016");
    topMaterial.emissiveIntensity = isSelected ? 0.5 : 0.34;

    wallMaterials.set(key, [
      sideMaterial,
      sideMaterial,
      topMaterial,
      sideMaterial,
      sideMaterial,
      sideMaterial,
    ]);
  }

  return wallMaterials.get(key);
}

function applyWallUvs(geometry, width, height, depth, seed) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const offsetU = seededNoise(seed, 3, 5) * 2;
  const offsetV = seededNoise(seed, 7, 9) * 2;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const normalX = Math.abs(normal.getX(i));
    const normalY = Math.abs(normal.getY(i));
    const normalZ = Math.abs(normal.getZ(i));

    if (normalY > normalX && normalY > normalZ) {
      uv.setXY(
        i,
        (x + halfWidth) / WALL_TEXTURE_WORLD_SCALE + offsetU,
        (z + halfDepth) / WALL_TEXTURE_WORLD_SCALE + offsetV,
      );
    } else if (normalX > normalZ) {
      uv.setXY(
        i,
        (z + halfDepth) / WALL_TEXTURE_WORLD_SCALE + offsetU,
        (y + halfHeight) / WALL_TEXTURE_WORLD_SCALE + offsetV,
      );
    } else {
      uv.setXY(
        i,
        (x + halfWidth) / WALL_TEXTURE_WORLD_SCALE + offsetU,
        (y + halfHeight) / WALL_TEXTURE_WORLD_SCALE + offsetV,
      );
    }
  }

  uv.needsUpdate = true;
}

function roughenWallGeometry(geometry, width, height, depth, seed) {
  const position = geometry.getAttribute("position");
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const edgeEpsilon = 0.001;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const isXEdge = Math.abs(Math.abs(x) - halfWidth) < edgeEpsilon;
    const isZEdge = Math.abs(Math.abs(z) - halfDepth) < edgeEpsilon;
    const isTop = Math.abs(y - halfHeight) < edgeEpsilon;
    const along = Math.round((x + halfWidth) * 13 + (z + halfDepth) * 17);
    const chipNoise = seededNoise(seed, along, 14);
    const roughNoise = seededNoise(seed, along, 21) - 0.5;
    const edgeNoise = seededNoise(seed, along, 28) - 0.5;
    const hardChip =
      chipNoise > 0.78 ? (chipNoise - 0.78) * WALL_CHIP_DEPTH : 0;
    const edgeOffset = edgeNoise * WALL_EDGE_ROUGHNESS - hardChip;
    const sideNoise =
      seededNoise(
        seed,
        Math.round((x + halfWidth) * 19 + (z + halfDepth) * 23),
        Math.round((y + halfHeight) * 29),
      ) - 0.5;
    const sideOffset = sideNoise * WALL_SIDE_ROUGHNESS;

    if (isXEdge) {
      position.setX(i, x + Math.sign(x) * (edgeOffset + sideOffset));
    }

    if (isZEdge) {
      position.setZ(i, z + Math.sign(z) * (edgeOffset + sideOffset));
    }

    if (isTop) {
      const topRoughness = roughNoise * 0.026 - hardChip * 0.35;
      position.setY(i, y + topRoughness);
    }
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createWallGeometry(width, height, depth, seed) {
  const widthSegments = Math.max(1, Math.ceil(width / 0.18));
  const heightSegments = 5;
  const depthSegments = Math.max(1, Math.ceil(depth / 0.18));
  const geometry = new THREE.BoxGeometry(
    width,
    height,
    depth,
    widthSegments,
    heightSegments,
    depthSegments,
  );

  roughenWallGeometry(geometry, width, height, depth, seed);
  applyWallUvs(geometry, width, height, depth, seed);
  return geometry;
}

function createCrestGeometry(width, height, thickness) {
  const halfWidth = width / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth, height * 0.32);
  shape.lineTo(halfWidth, height * 0.32);
  shape.lineTo(halfWidth * 0.82, -height * 0.18);
  shape.quadraticCurveTo(0, -height * 0.5, -halfWidth * 0.82, -height * 0.18);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.008,
    bevelThickness: 0.004,
    depth: thickness,
  });
  geometry.center();
  return geometry;
}

function createWallOwnerMarker(axis, width, depth, ownerId) {
  const emblemMaterial = WALL_OWNER_EMBLEM_MATERIALS[ownerId];

  if (!emblemMaterial) {
    return null;
  }

  const group = new THREE.Group();
  const isHorizontal = axis == "horizontal";
  const longSide = isHorizontal ? width : depth;
  const crestWidth = Math.min(WALL_OWNER_CREST_WIDTH, longSide * 0.25);
  const crestHeight = Math.min(WALL_OWNER_CREST_HEIGHT, WALL_HEIGHT * 0.48);
  const crestGeometry = createCrestGeometry(
    crestWidth,
    crestHeight,
    WALL_OWNER_CREST_THICKNESS,
  );
  const emblemGeometry = createCrestGeometry(
    crestWidth * WALL_OWNER_EMBLEM_SCALE,
    crestHeight * WALL_OWNER_EMBLEM_SCALE,
    WALL_OWNER_EMBLEM_THICKNESS,
  );
  const cornerOffset = crestWidth * 0.85;
  const crestY = WALL_HEIGHT * 0.3;
  const faceOffset = -0.02;

  for (const side of [-1, 1]) {
    const crest = new THREE.Group();
    const plate = new THREE.Mesh(crestGeometry, WALL_OWNER_PLAQUE_MATERIAL);
    const emblem = new THREE.Mesh(emblemGeometry, emblemMaterial);

    plate.castShadow = true;
    plate.receiveShadow = true;
    emblem.castShadow = true;
    emblem.receiveShadow = true;
    emblem.position.z =
      WALL_OWNER_CREST_THICKNESS / 2 + WALL_OWNER_EMBLEM_THICKNESS / 2 + 0.008;
    crest.add(plate, emblem);

    if (isHorizontal) {
      crest.position.set(
        -width / 2 + cornerOffset,
        crestY,
        side * (depth / 2 + faceOffset),
      );
      crest.rotation.y = side > 0 ? 0 : Math.PI;
    } else {
      crest.position.set(
        side * (width / 2 + faceOffset),
        crestY,
        -depth / 2 + cornerOffset,
      );
      crest.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    group.add(crest);
  }

  return group;
}

export function clearGroup(group) {
  group.traverse((object) => {
    if (!object.isSprite || !object.material) {
      return;
    }

    object.material.map?.dispose();
    object.material.dispose();
  });
  group.clear();
}

export function createPlacedWallMesh(axis, wall) {
  const isHorizontal = axis == "horizontal";
  const wallSpan = getWallSpan(wall.length ?? 2);
  const width = isHorizontal ? wallSpan : WALL_THICKNESS;
  const depth = isHorizontal ? WALL_THICKNESS : wallSpan;
  const seed = wall.pos.row * 17 + wall.pos.col * 31 + (isHorizontal ? 5 : 11);
  const center = getWallPreviewCenter(
    { axis, row: wall.pos.row, col: wall.pos.col },
    wall.length ?? 2,
  );
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    createWallGeometry(width, WALL_HEIGHT, depth, seed),
    createWallMaterial(),
  );
  const ownerMarker = createWallOwnerMarker(axis, width, depth, wall.ownerId);

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (ownerMarker) {
    group.add(ownerMarker);
  }

  group.position.set(center.x, CELL_HEIGHT + WALL_HEIGHT / 2, center.z);
  return group;
}

export function createReserveWallMesh(reserveWallKey, isSelected = false) {
  const wallLength = getReserveWallLengthFromKey(reserveWallKey);
  const seed = hashText(reserveWallKey);
  const mesh = new THREE.Mesh(
    createWallGeometry(
      WALL_THICKNESS,
      WALL_HEIGHT,
      getWallSpan(wallLength),
      seed,
    ),
    createWallMaterial(isSelected),
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.reserveWallKey = reserveWallKey;
  mesh.userData.wallLength = wallLength;

  return mesh;
}

export function createHoverCellMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(CELL_SIZE * 0.92, 0.05, CELL_SIZE * 0.92),
    new THREE.MeshStandardMaterial({
      color: "#c8a040",
      transparent: true,
      opacity: 0.45,
      emissive: "#7a5010",
      emissiveIntensity: 0.4,
    }),
  );
  mesh.visible = false;
  return mesh;
}

export function createSelectedCellMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(CELL_SIZE * 0.82, 0.07, CELL_SIZE * 0.82),
    new THREE.MeshStandardMaterial({
      color: "#e08020",
      transparent: true,
      opacity: 0.72,
      emissive: "#6a3000",
      emissiveIntensity: 0.5,
    }),
  );
  mesh.visible = false;
  return mesh;
}

export function createHoverWallMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SPAN, WALL_HEIGHT, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({
      color: "#f0bd62",
      transparent: true,
      opacity: 0.68,
      emissive: "#8a5a12",
      emissiveIntensity: 0.6,
    }),
  );
  mesh.visible = false;
  return mesh;
}

export function createSelectedWallMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SPAN, WALL_HEIGHT, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({
      color: "#ff9a34",
      transparent: true,
      opacity: 0.9,
      emissive: "#a33f00",
      emissiveIntensity: 0.75,
    }),
  );
  mesh.visible = false;
  return mesh;
}

export function updateWallPreviewMesh(mesh, wallSlot) {
  const wallSpan = getWallSpan(mesh.userData.wallLength ?? 2);
  const center = getWallPreviewCenter(wallSlot, mesh.userData.wallLength ?? 2);
  mesh.geometry.dispose();
  mesh.geometry = new THREE.BoxGeometry(
    wallSlot.axis == "horizontal" ? wallSpan : WALL_THICKNESS,
    WALL_HEIGHT,
    wallSlot.axis == "horizontal" ? WALL_THICKNESS : wallSpan,
  );
  mesh.position.set(center.x, CELL_HEIGHT + WALL_HEIGHT / 2, center.z);
}

export function createMoveTargetMesh(moveTarget) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.05, 20),
    new THREE.MeshStandardMaterial({
      color: "#c8a030",
      transparent: true,
      opacity: 0.8,
      emissive: "#6a4800",
      emissiveIntensity: 0.5,
    }),
  );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.moveTarget = moveTarget;
  mesh.position.set(
    getCellCenter(moveTarget.col),
    CELL_HEIGHT + 0.08,
    getCellCenter(moveTarget.row),
  );
  return mesh;
}
