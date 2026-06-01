import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export function createSceneBundle(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07131c");

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 8, 10);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.7;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.minDistance = 3;
  controls.maxDistance = 25;

  const ambientLight = new THREE.AmbientLight("#6f8fb8", 0.3);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight("#8ebfff", "#182415", 0.78);
  hemiLight.position.set(0, 12, 0);
  scene.add(hemiLight);

  const fillLight = new THREE.DirectionalLight("#395c88", 0.42);
  fillLight.position.set(-7, 5, 5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight("#8fb7ff", 0.35);
  rimLight.position.set(-4, 6, -8);
  scene.add(rimLight);

  const keyLight = new THREE.DirectionalLight("#b8d6ff", 1.38);
  keyLight.position.set(5, 12, 8);
  keyLight.castShadow = true;
  keyLight.shadow.camera.left = -18;
  keyLight.shadow.camera.right = 18;
  keyLight.shadow.camera.top = 18;
  keyLight.shadow.camera.bottom = -18;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 34;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.normalBias = 0.04;
  keyLight.shadow.radius = 3.5;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  scene.add(keyLight);

  return { camera, controls, renderer, scene };
}
