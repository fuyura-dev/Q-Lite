import * as THREE from "three";
import {
  BOARD_WORLD_SIZE,
  CELL_HEIGHT,
  LANE_SIZE,
  MAX_RESERVE_WALL_SPAN,
} from "./constants";

const GRASS_LANE_Y = CELL_HEIGHT - 0.05;
const GRASS_LANE_HEIGHT = 0.03;
const GRASS_TEXTURE_WORLD_SCALE = 5;

const grassTextureLoader = new THREE.TextureLoader();

const grassSideMaterial = new THREE.MeshStandardMaterial({
  color: "#2c4f2a",
});

function seededNoise(a, b, salt) {
  const value = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function loadGrassTexture(path) {
  const texture = grassTextureLoader.load(path);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const GRASS_TEXTURES = {
  colorMap: loadGrassTexture("/textures/board/grass-8_diffuse.jpg"),
  normalMap: loadGrassTexture("/textures/board/grass-8_normals.jpg"),
};
GRASS_TEXTURES.colorMap.colorSpace = THREE.SRGBColorSpace;

function createGrassMaterial(width, depth, row, col) {
  const colorMap = GRASS_TEXTURES.colorMap.clone();
  const normalMap = GRASS_TEXTURES.normalMap.clone();
  const repeatX = width / GRASS_TEXTURE_WORLD_SCALE;
  const repeatY = depth / GRASS_TEXTURE_WORLD_SCALE;
  const offsetX = seededNoise(row, col, 12);
  const offsetY = seededNoise(row, col, 13);

  colorMap.repeat.set(repeatX, repeatY);
  normalMap.repeat.set(repeatX, repeatY);
  colorMap.offset.set(offsetX, offsetY);
  normalMap.offset.set(offsetX, offsetY);
  colorMap.needsUpdate = true;
  normalMap.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    color: "#758d7b",
    map: colorMap,
    normalMap,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.96,
    metalness: 0,
  });
}

function createGrassPlane() {
  const grassWidth = BOARD_WORLD_SIZE + LANE_SIZE * 3;
  const grassDepth = BOARD_WORLD_SIZE + (MAX_RESERVE_WALL_SPAN + LANE_SIZE) * 2;
  const topMaterial = createGrassMaterial(grassWidth, grassDepth, 0, 0);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(grassWidth, GRASS_LANE_HEIGHT, grassDepth),
    [
      grassSideMaterial,
      grassSideMaterial,
      topMaterial,
      grassSideMaterial,
      grassSideMaterial,
      grassSideMaterial,
    ],
  );

  mesh.position.set(0, GRASS_LANE_Y, 0);
  mesh.receiveShadow = true;
  return mesh;
}

export function createGrassLaneUnderlay() {
  const group = new THREE.Group();

  group.add(createGrassPlane());
  return group;
}
