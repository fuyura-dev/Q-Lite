import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const ISLAND_MODEL_PATH = "/models/floating-island.glb";

function frameIslandModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const largestSide = Math.max(size.x, size.z, 0.001);
  const targetWidth = 30.6;
  const scale = targetWidth / largestSide;

  model.position.sub(center);
  model.scale.setScalar(scale);
  model.position.y -= 0.7;
}

export function createFloatingIsland() {
  const group = new THREE.Group();
  const loader = new GLTFLoader();

  loader.load(
    ISLAND_MODEL_PATH,
    (gltf) => {
      const model = gltf.scene;

      model.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      });

      frameIslandModel(model);
      group.add(model);
    },
    undefined,
    (error) => {
      console.warn("Unable to load floating island model", error);
    },
  );

  group.position.y = 0.67;

  return group;
}
