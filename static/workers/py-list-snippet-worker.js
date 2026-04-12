// Web worker that runs a user-provided Python snippet against a single input
// using Pyodide. The caller supplies the source code, a JSON-serializable
// input value, and the name of the function to invoke.
//
// Note: variables set via `pyodide.globals.set(name, value)` land directly in
// Python's top-level globals namespace. They are NOT accessible as
// `from js import name` — attempting that raises ImportError. We therefore
// reference them by name inside Python.

const PYODIDE_VERSION = "0.29.3";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = null;
let pyodide = null;
let runnerInstalled = false;
const loadedPackages = new Set();

async function ensurePyodide() {
  if (pyodide) return pyodide;

  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      importScripts(`${PYODIDE_BASE}pyodide.js`);
      pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
      return pyodide;
    })();
  }

  return pyodidePromise;
}

async function ensurePackages(packages) {
  const api = await ensurePyodide();
  const missing = (packages || []).filter((name) => !loadedPackages.has(name));

  if (missing.length > 0) {
    await api.loadPackage(missing);
    missing.forEach((name) => loadedPackages.add(name));
  }

  return api;
}

// Installed once per worker. Uses only names that are set via
// `pyodide.globals.set` — no `from js import` — which is the bug the old
// version tripped on.
const RUNNER_PY = `
import json

def __run_snippet(user_code, user_input_json, function_name):
    user_input = json.loads(user_input_json)

    ns = {}
    exec(user_code, ns)

    if function_name not in ns:
        raise NameError(
            f"Expected a function named {function_name!r} to be defined in the snippet."
        )

    fn = ns[function_name]

    def normalize(value):
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if hasattr(value, "tolist"):
            value = value.tolist()
        if isinstance(value, dict):
            return {str(k): normalize(v) for k, v in value.items()}
        if isinstance(value, (list, tuple)):
            return [normalize(v) for v in value]
        return repr(value)

    try:
        got = fn(user_input)
        return json.dumps({"ok": True, "got": normalize(got)})
    except Exception as e:
        return json.dumps({
            "ok": False,
            "error": f"{type(e).__name__}: {e}",
        })
`;

async function installRunner(api) {
  if (runnerInstalled) return;
  await api.runPythonAsync(RUNNER_PY);
  runnerInstalled = true;
}

self.onmessage = async (event) => {
  const {
    id,
    code,
    input,
    functionName = "solve",
    packages = [],
  } = event.data || {};

  try {
    const api = await ensurePackages(packages);
    await installRunner(api);

    // Serialize the input as JSON so Python sees native dict/list/int/etc.,
    // sidestepping Pyodide's JsProxy wrappers entirely.
    api.globals.set("__USER_CODE__", code);
    api.globals.set("__USER_INPUT_JSON__", JSON.stringify(input));
    api.globals.set("__FUNCTION_NAME__", functionName);

    const payloadJson = await api.runPythonAsync(
      "__run_snippet(__USER_CODE__, __USER_INPUT_JSON__, __FUNCTION_NAME__)"
    );

    self.postMessage({
      id,
      ...JSON.parse(payloadJson),
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: String(error?.message || error),
    });
  }
};
