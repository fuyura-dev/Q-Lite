import * as THREE from "three";

const BOARD_SIZE = 7;
const TILE_SIZE = 1;
const BOARD_WORLD_SIZE = BOARD_SIZE * TILE_SIZE;
const HALF_BOARD = BOARD_WORLD_SIZE / 2;

function createBoardGroup() {
  const boardGroup = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_WORLD_SIZE + 3, 0.5, BOARD_WORLD_SIZE + 1),
    new THREE.MeshStandardMaterial({
      color: "#70533c",
    }),
  );
  base.receiveShadow = true;
  boardGroup.add(base);

  return boardGroup;
}

export function createRenderer3D(container) {
  if (!container) {
    throw new Error("Missing board viewport element");
  }
  container.replaceChildren();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a2832");

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 8, 15);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const keyLight = new THREE.DirectionalLight("#ffffff", 1.7);
  keyLight.position.set(6, 10, 4);
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  scene.add(keyLight);

  const boardGroup = createBoardGroup();
  scene.add(boardGroup);

  function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    render();
  }
  resizeRenderer();

  const resizeObserver = new ResizeObserver(() => {
    resizeRenderer();
  });
  resizeObserver.observe(container);

  function render(snapshot, options = {}) {
    renderer.render(scene, camera);
  }

  return {
    render,
  };
}
