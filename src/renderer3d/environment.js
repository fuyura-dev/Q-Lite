import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BOARD_DEPTH, HALF_BOARD, LANE_SIZE } from "./constants";

const CHINESE_GRASS_MODEL_PATH =
  "/models/environment/chinese_fountain_grass.glb";
const GRASS_02_MODEL_PATH = "/models/environment/grass_02.glb";
const GRASS_PATCHES_MODEL_PATH = "/models/environment/grass_patches.glb";
const LOW_POLY_GRASS_MODEL_PATH = "/models/environment/low_poly_grass.glb";
const GLOWING_MUSHROOM_MODEL_PATH = "/models/environment/glowing_mushroom.glb";
const GLOWING_MUSHROOM_ALT_MODEL_PATH =
  "/models/environment/glowing_mushroom(1).glb";
const MAGIC_MUSHROOM_MODEL_PATH =
  "/models/environment/magic_glowing_mushroom.glb";
const FRAME_SIZE = BOARD_DEPTH + 1.4;
const ENVIRONMENT_MODELS = [
  {
    path: CHINESE_GRASS_MODEL_PATH,
    count: 0,
    targetWidth: 10.72,
    minScale: 0.72,
    scaleRange: 0.46,
    y: -0.05,
    placementSalt: 300,
  },
  {
    path: GRASS_02_MODEL_PATH,
    count: 30,
    targetWidth: 1.3,
    minScale: 0.8,
    scaleRange: 0.45,
    y: 0.02,
    placementSalt: 145,
    innerChance: 0.25,
  },
  {
    path: GRASS_PATCHES_MODEL_PATH,
    count: 30,
    targetWidth: 3,
    minScale: 0.75,
    scaleRange: 0.35,
    y: 0.02,
    placementSalt: 250,
    innerChance: 0.6,
    castShadow: false,
  },
  {
    path: LOW_POLY_GRASS_MODEL_PATH,
    count: 20,
    targetWidth: 0.7,
    minScale: 0.7,
    scaleRange: 0.5,
    y: 0.02,
    placementSalt: 300,
    innerChance: 0.5,
  },
  {
    path: GLOWING_MUSHROOM_MODEL_PATH,
    count: 7,
    targetWidth: 0.45,
    minScale: 0.85,
    scaleRange: 0.35,
    y: 0.03,
    placementSalt: 570,
    innerChance: 0.5,
    glowColor: "#7df7ff",
    emissiveIntensity: 0.18,
    lightColor: "#4576ff",
    glowIntensity: 2,
    glowDistance: 3,
    glowY: 1,
    minDistance: 1.1,
  },
  {
    path: GLOWING_MUSHROOM_ALT_MODEL_PATH,
    count: 7,
    targetWidth: 0.5,
    minScale: 0.75,
    scaleRange: 0.35,
    y: 0.03,
    placementSalt: 330,
    innerChance: 0.4,
    glowColor: "#a978ff",
    emissiveIntensity: 5,
    lightColor: "#a978ff",
    glowIntensity: 3,
    glowDistance: 5,
    glowY: 1,
    minDistance: 1.1,
  },
  {
    path: MAGIC_MUSHROOM_MODEL_PATH,
    count: 6,
    targetWidth: 0.4,
    minScale: 0.8,
    scaleRange: 0.4,
    y: 0.5,
    placementSalt: 740,
    innerChance: 0.4,
    glowColor: "rgb(14, 63, 47)",
    emissiveIntensity: 0.2,
    lightColor: "#40c768",
    glowIntensity: 7,
    glowDistance: 2.4,
    glowY: 1,
    minDistance: 1.1,
  },
];

function seededNoise(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function prepareMaterial(material, config) {
  const preparedMaterial = config.glowColor ? material.clone() : material;

  preparedMaterial.side = THREE.DoubleSide;

  if (config.glowColor && preparedMaterial.emissive) {
    preparedMaterial.emissive.set(config.glowColor);
    preparedMaterial.emissiveIntensity = config.emissiveIntensity ?? 0.18;
  }

  preparedMaterial.needsUpdate = true;
  return preparedMaterial;
}

function prepareEnvironmentModel(model, config) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const largestSide = Math.max(size.x, size.z, 0.001);
  const scale = config.targetWidth / largestSide;

  model.position.x -= center.x * scale;
  model.position.y -= box.min.y * scale;
  model.position.z -= center.z * scale;
  model.scale.setScalar(scale);

  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = config.castShadow ?? true;
    child.receiveShadow = true;

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => prepareMaterial(material, config))
      : prepareMaterial(child.material, config);
  });

  return model;
}

function getEdgeDecorationPosition(index) {
  const outerLimit = FRAME_SIZE / 2 - 0.55;
  const innerLimit = HALF_BOARD + LANE_SIZE * 3.2;
  const side = Math.floor(seededNoise(index, 1) * 4);
  const along = -outerLimit + seededNoise(index, 2) * outerLimit * 2;
  const edgeOffset =
    innerLimit + seededNoise(index, 3) * (outerLimit - innerLimit);

  if (side == 0) {
    return { x: along, z: -edgeOffset };
  }

  if (side == 1) {
    return { x: along, z: edgeOffset };
  }

  return {
    x: side == 2 ? -edgeOffset : edgeOffset,
    z: along,
  };
}

function getInnerDecorationPosition(index) {
  const innerLimit = HALF_BOARD - LANE_SIZE * 0.7;
  const x = -innerLimit + seededNoise(index, 6) * innerLimit * 2;
  const z = -innerLimit + seededNoise(index, 7) * innerLimit * 2;

  return { x, z };
}

function getDecorationPosition(index, config) {
  const innerChance = config.innerChance ?? 0;

  if (seededNoise(index, 8) < innerChance) {
    return getInnerDecorationPosition(index);
  }

  return getEdgeDecorationPosition(index);
}

function isTooCloseToOccupied(position, occupiedPositions, minDistance) {
  const minDistanceSq = minDistance * minDistance;

  return occupiedPositions.some((occupiedPosition) => {
    const dx = position.x - occupiedPosition.x;
    const dz = position.z - occupiedPosition.z;

    return dx * dx + dz * dz < minDistanceSq;
  });
}

function createEnvironmentPlacement(index, config, occupiedPositions) {
  const minDistance = config.minDistance ?? 0;
  const maxAttempts = minDistance ? 30 : 1;
  let fallbackPlacement = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const placementIndex = index + config.placementSalt + attempt * 997;
    const position = getDecorationPosition(placementIndex, config);
    const placement = { placementIndex, position };

    fallbackPlacement = placement;

    if (
      !minDistance ||
      !isTooCloseToOccupied(position, occupiedPositions, minDistance)
    ) {
      occupiedPositions.push(position);
      return placement;
    }
  }

  occupiedPositions.push(fallbackPlacement.position);
  return fallbackPlacement;
}

function createEnvironmentPlacements(config, occupiedPositions) {
  const placements = [];

  for (let i = 0; i < config.count; i++) {
    placements.push(createEnvironmentPlacement(i, config, occupiedPositions));
  }

  return placements;
}

function createEnvironmentPatch(sourceModel, placement, config) {
  const patch = sourceModel.clone(true);
  const { placementIndex, position } = placement;
  const scale =
    config.minScale + seededNoise(placementIndex, 4) * config.scaleRange;

  patch.position.set(position.x, config.y, position.z);
  patch.rotation.y = seededNoise(placementIndex, 5) * Math.PI * 2;
  patch.scale.multiplyScalar(scale);

  if (config.glowColor) {
    const light = new THREE.PointLight(
      config.lightColor ?? config.glowColor,
      config.glowIntensity ?? 0.6,
      config.glowDistance ?? 2,
      2,
    );

    light.position.set(0, config.glowY ?? 0.35, 0);
    patch.add(light);
  }

  return patch;
}

export function createBoardEnvironment() {
  const group = new THREE.Group();
  const loader = new GLTFLoader();
  const occupiedMushroomPositions = [];

  for (const config of ENVIRONMENT_MODELS) {
    const occupiedPositions = config.minDistance
      ? occupiedMushroomPositions
      : [];
    const placements = createEnvironmentPlacements(config, occupiedPositions);

    loader.load(
      config.path,
      (gltf) => {
        const sourceModel = prepareEnvironmentModel(gltf.scene, config);

        for (const placement of placements) {
          group.add(createEnvironmentPatch(sourceModel, placement, config));
        }
      },
      undefined,
      (error) => {
        console.warn(
          `Unable to load board environment model: ${config.path}`,
          error,
        );
      },
    );
  }

  return group;
}
