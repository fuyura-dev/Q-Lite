### Setup (run once)

```
git submodule update --init
cd emsdk

./emsdk install latest    #emsdk.bat if Windows
./emsdk activate latest   #emsdk.bat if Windows
```

---

### Build

Make sure you are in the directory containing `CMakePresets.json`, then run:

```
cmake --preset wasm
cmake --build --preset wasm
```

This generates

```
src/wasm/wasmbuild.js
```

relative to the root of the repository which contains both the WebAssembly module and the JavaScript glue code.

---

### Example usage

```js
import qlite from "./wasm/wasmbuild.js"

// Engine class in Engine.h
const { Engine } = await qlite()

const engine = new Engine()

console.log(engine.test())

```

### Testing

```
cmake --preset standalone
cmake --build --preset standalone
ctest --preset test-all
```
