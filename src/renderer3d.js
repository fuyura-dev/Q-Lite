export function createRenderer3D(container) {
  if (!container) {
    throw new Error("Missing board viewport element");
  }

  const placeholder = document.createElement("div");
  container.replaceChildren(placeholder);

  function render(snapshot, options = {}) {
    placeholder.innerHTML = `<p>${options.engineStatus ?? "Loading Engine..."}<br>${options.mode}</p>`;
  }

  return {
    render,
  };
}
