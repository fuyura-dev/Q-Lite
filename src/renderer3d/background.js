import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const CAVE_BACKGROUND_MODEL_PATH =
  "/textures/skybox/stylized_alien_cave_skybox.glb";
const BACKGROUND_WIDTH = 100;
const BACKGROUND_Y = 20;
const BACKGROUND_Z = 0;
const BACKGROUND_COLOR = "#2f3548";
const BACKGROUND_EMISSIVE_INTENSITY = 8;

function frameBackgroundModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const largestSide = Math.max(size.x, size.y, size.z, 0.001);
  const scale = BACKGROUND_WIDTH / largestSide;

  model.position.x -= center.x * scale;
  model.position.y -= center.y * scale;
  model.position.z -= center.z * scale;
  model.scale.setScalar(scale);

  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = false;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      material.depthWrite = false;
      material.color?.set(BACKGROUND_COLOR);
      material.emissive?.set(BACKGROUND_COLOR);
      material.emissiveIntensity = BACKGROUND_EMISSIVE_INTENSITY;
      material.side = THREE.BackSide;
      material.needsUpdate = true;
    }
  });
}

export function createCaveBackground() {
  const group = new THREE.Group();
  const loader = new GLTFLoader();

  loader.load(
    CAVE_BACKGROUND_MODEL_PATH,
    (gltf) => {
      const model = gltf.scene;

      frameBackgroundModel(model);
      group.add(model);
    },
    undefined,
    (error) => {
      console.warn("Unable to load cave background model", error);
    },
  );

  group.position.set(0, BACKGROUND_Y, BACKGROUND_Z);

  return group;
}
