import * as THREE from "three";
import { createPawnMesh } from "./pawns";

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();

    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        material.dispose?.();
      }
    } else {
      child.material?.dispose?.();
    }
  });
}

export function createClassPreviewRenderer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const pawnGroup = new THREE.Group();

  let activePawn = null;
  let isVisible = false;
  let animationFrame = null;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  camera.position.set(0, 0.62, 2.85);
  camera.lookAt(0, 0.42, 0);

  const keyLight = new THREE.DirectionalLight(0xffe0a8, 2.4);
  keyLight.position.set(1.4, 2.2, 2.2);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x7fc7ff, 1.1);
  fillLight.position.set(-1.6, 1.3, 1.6);
  scene.add(fillLight);

  scene.add(new THREE.AmbientLight(0x8a7058, 1.2));
  scene.add(pawnGroup);

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animate() {
    animationFrame = window.requestAnimationFrame(animate);

    if (!isVisible || !activePawn) {
      return;
    }

    pawnGroup.rotation.y += 0.018;
    renderer.render(scene, camera);
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    renderer.render(scene, camera);
  });
  resizeObserver.observe(container);
  resize();
  animate();

  return {
    show({ playerId, classId }) {
      if (activePawn) {
        pawnGroup.remove(activePawn);
        disposeObject(activePawn);
      }

      activePawn = createPawnMesh(playerId, classId);
      activePawn.scale.setScalar(1.32);
      activePawn.position.y = -0.34;
      pawnGroup.rotation.y = 0;
      pawnGroup.add(activePawn);
      isVisible = true;
      renderer.render(scene, camera);
    },

    hide() {
      isVisible = false;
    },

    dispose() {
      resizeObserver.disconnect();

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      if (activePawn) {
        disposeObject(activePawn);
      }

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
