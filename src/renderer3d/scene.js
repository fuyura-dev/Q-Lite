import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export function createSceneBundle(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a2832");

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 8, 10);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.minDistance = 3;
  controls.maxDistance = 25;

  const ambientLight = new THREE.AmbientLight("#f0e5cf", 0.55);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight("#b9dcff", "#5c4630", 0.7);
  hemiLight.position.set(0, 12, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight("#ffffff", 1.85);
  keyLight.position.set(7, 11, 6);
  keyLight.castShadow = true;
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  scene.add(keyLight);

  return { camera, controls, renderer, scene };
}
