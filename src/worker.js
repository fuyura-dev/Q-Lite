import qlite from "./wasm/wasmbuild.js";

const wasmModule = await qlite()
const engine = new wasmModule.Engine();

function arrayify(vector) {
  const result = [];
  for (const v of vector) {
    result.push(v);
  }
  return result;
}

onmessage = ({data}) => {
    const name = data.name;
    const args = data.args;
    let ret = engine[name](...args);
    console.log(name, args, ret);

    if (typeof ret == "object" && "push_back" in ret) {
        ret = arrayify(ret);
    }
    postMessage({
        ret,
        id: data.id
    });
}

postMessage({
    wallSide: wasmModule.wallSide,
    moveResult: wasmModule.moveResult,
    BUILD_TIME: wasmModule.BUILD_TIME
})

