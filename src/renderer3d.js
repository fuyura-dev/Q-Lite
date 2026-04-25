import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

const BOARD_SIZE = 7;
const CELL_SIZE = 0.9;
const CELL_HEIGHT = 0.12;
const LANE_SIZE = 0.2;
const BOARD_WORLD_SIZE = BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * LANE_SIZE;
const HALF_BOARD = BOARD_WORLD_SIZE / 2;
const WALL_SPAN = CELL_SIZE * 2 + LANE_SIZE;
const WALL_THICKNESS = LANE_SIZE * 0.8;
const WALL_HEIGHT = 0.7;
const BOARD_DEPTH = BOARD_WORLD_SIZE + WALL_SPAN * 2;
const HALF_DEPTH = BOARD_DEPTH / 2;

const BOARD_MATERIALS = {
  frame: new THREE.MeshStandardMaterial({ color: "#714d31" }),
  top: new THREE.MeshStandardMaterial({ color: "#9a7149" }),
  cell: new THREE.MeshStandardMaterial({ color: "#d9bb87" }),
  lane: new THREE.MeshStandardMaterial({ color: "#4b3423" }),
  wall: new THREE.MeshStandardMaterial({ color: "#c89352" }),
  pawnOne: new THREE.MeshStandardMaterial({ color: "#d6d6d6" }),
  pawnTwo: new THREE.MeshStandardMaterial({ color: "#5a5a5a" }),
};

function getCellCenter(index) {
  const offset = HALF_BOARD - CELL_SIZE / 2;
  return -offset + index * (CELL_SIZE + LANE_SIZE);
}

function getLaneCenter(index) {
  return getCellCenter(index) + (CELL_SIZE + LANE_SIZE) / 2;
}

function mergeWallSegments(segments, axis) {
  const grouped = new Map();

  for (const segment of segments) {
    const fixed = axis == "horizontal" ? segment.row : segment.col;
    const variable = axis == "horizontal" ? segment.col : segment.row;

    if (!grouped.has(fixed)) {
      grouped.set(fixed, []);
    }
    grouped.get(fixed).push(variable);
  }

  const mergedWalls = [];

  for (const [fixed, values] of grouped) {
    values.sort((a, b) => a - b);

    for (let i = 0; i < values.length; i++) {
      const current = values[i];
      const next = values[i + 1];

      mergedWalls.push(
        axis == "horizontal"
          ? { row: fixed, col: current }
          : { row: current, col: fixed },
      );
      i++;
    }
  }

  return mergedWalls;
}

function createPlacedWallMesh(axis, wall) {
  const isHorizontal = axis == "horizontal";
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      isHorizontal ? WALL_SPAN : WALL_THICKNESS,
      WALL_HEIGHT,
      isHorizontal ? WALL_THICKNESS : WALL_SPAN,
    ),
    BOARD_MATERIALS.wall,
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    isHorizontal ? getLaneCenter(wall.col) : getLaneCenter(wall.col),
    CELL_HEIGHT + WALL_HEIGHT / 2,
    isHorizontal ? getLaneCenter(wall.row) : getLaneCenter(wall.row),
  );

  return mesh;
}

function createReserveWallMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_SPAN),
    BOARD_MATERIALS.wall,
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createPawnMesh(playerId) {
  const pawnGroup = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.3, 0.5, 24),
    playerId == 1 ? BOARD_MATERIALS.pawnOne : BOARD_MATERIALS.pawnTwo,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = 0.3;
  pawnGroup.add(body);

  return pawnGroup;
}

function getPawnPosition(player) {
  return {
    x: getCellCenter(player.col),
    y: CELL_HEIGHT,
    z: getCellCenter(player.row),
  };
}

function getReserveWallSlots() {
  return [
    getLaneCenter(0),
    getLaneCenter(1),
    getLaneCenter(2),
    getLaneCenter(3),
    getLaneCenter(4),
    getLaneCenter(5),
    -HALF_BOARD - LANE_SIZE / 2,
    HALF_BOARD + LANE_SIZE / 2,
  ];
}

function getReserveWallPosition(playerId, index) {
  const slots = getReserveWallSlots();

  return {
    x: slots[index],
    y: CELL_HEIGHT + WALL_HEIGHT / 2,
    z: getLaneCenter(playerId == 1 ? 7 : -2),
  };
}

function createBoardGroup() {
  const boardGroup = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_WORLD_SIZE + 1, 0.7, BOARD_DEPTH + 1.4),
    BOARD_MATERIALS.frame,
  );
  frame.receiveShadow = true;
  frame.position.y = -0.3;
  boardGroup.add(frame);

  const topPanel = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_WORLD_SIZE + 0.42, 0.16, BOARD_DEPTH + 0.84),
    BOARD_MATERIALS.top,
  );
  topPanel.receiveShadow = true;
  topPanel.position.y = -0.02;
  boardGroup.add(topPanel);

  // CELL
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(CELL_SIZE, CELL_HEIGHT, CELL_SIZE),
        BOARD_MATERIALS.cell,
      );

      tile.castShadow = true;
      tile.receiveShadow = true;
      tile.position.set(getCellCenter(c), CELL_HEIGHT, getCellCenter(r));
      boardGroup.add(tile);

      if (r == 0 || r == BOARD_SIZE - 1) {
        const extendedCell = new THREE.Mesh(
          new THREE.BoxGeometry(
            CELL_SIZE,
            CELL_HEIGHT,
            CELL_SIZE * 2 + LANE_SIZE,
          ),
          BOARD_MATERIALS.cell,
        );
        extendedCell.castShadow = true;
        extendedCell.receiveShadow = true;
        extendedCell.position.set(
          getCellCenter(c),
          CELL_HEIGHT,
          (r === 0 ? -1 : 1) *
            (HALF_BOARD + LANE_SIZE + (CELL_SIZE * 2 + LANE_SIZE) / 2),
        );
        boardGroup.add(extendedCell);
      }
    }
  }

  // LANE
  for (let lane = 0; lane < BOARD_SIZE - 1; lane++) {
    const lanePosition =
      -HALF_BOARD + CELL_SIZE + lane * (CELL_SIZE + LANE_SIZE) + LANE_SIZE / 2;

    const verticalLane = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_SIZE, 0.08, BOARD_WORLD_SIZE + 0.14),
      BOARD_MATERIALS.lane,
    );
    verticalLane.position.set(lanePosition, 0.06, 0);
    verticalLane.receiveShadow = true;
    boardGroup.add(verticalLane);

    const horizontalLane = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_WORLD_SIZE + 0.14, 0.08, LANE_SIZE),
      BOARD_MATERIALS.lane,
    );
    horizontalLane.position.set(0, 0.06, lanePosition);
    horizontalLane.receiveShadow = true;
    boardGroup.add(horizontalLane);
  }

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

  const boardGroup = createBoardGroup();
  scene.add(boardGroup);
  const placedWallGroup = new THREE.Group();
  scene.add(placedWallGroup);
  const reserveWallGroup = new THREE.Group();
  scene.add(reserveWallGroup);
  const pawnGroup = new THREE.Group();
  scene.add(pawnGroup);

  function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    render();
  }
  resizeRenderer();

  const resizeObserver = new ResizeObserver(() => {
    resizeRenderer();
  });
  resizeObserver.observe(container);

  const clock = new THREE.Clock();
  let animationFrameId = 0;

  function animate() {
    animationFrameId = window.requestAnimationFrame(animate);
    controls.update(clock.getDelta());
    renderer.render(scene, camera);
  }
  animate();

  function render(snapshot, options = {}) {
    if (!snapshot) {
      return;
    }

    for (const player of snapshot.players) {
      const mesh = createPawnMesh(player.id);
      const position = getPawnPosition(player);
      mesh.position.set(position.x, position.y, position.z);
      pawnGroup.add(mesh);
    }

    // Placed Walls
    const horizontalWalls = mergeWallSegments(
      snapshot.horizontalWalls,
      "horizontal",
    );
    const verticalWalls = mergeWallSegments(snapshot.verticalWalls, "vertical");

    for (const wall of horizontalWalls) {
      placedWallGroup.add(createPlacedWallMesh("horizontal", wall));
    }
    for (const wall of verticalWalls) {
      placedWallGroup.add(createPlacedWallMesh("vertical", wall));
    }

    // Unplaced Walls
    for (const player of snapshot.players) {
      for (let i = 0; i < player.wallsRemaining; i++) {
        const mesh = createReserveWallMesh();
        const position = getReserveWallPosition(player.id, i);
        mesh.position.set(position.x, position.y, position.z);
        reserveWallGroup.add(mesh);
      }
    }
  }

  return {
    render,
  };
}
