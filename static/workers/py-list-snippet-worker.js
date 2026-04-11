const PYODIDE_VERSION = "0.29.3";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = null;
let pyodide = null;
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

self.onmessage = async (event) => {
  const {
    id,
    code,
    tests = [],
    functionName = "solve",
    packages = [],
  } = event.data || {};

  try {
    const api = await ensurePackages(packages);

    api.globals.set("USER_CODE", code);
    api.globals.set("RAW_TESTS", tests);
    api.globals.set("FUNCTION_NAME", functionName);

    const payloadJson = await api.runPythonAsync(`
import json
from js import USER_CODE, RAW_TESTS, FUNCTION_NAME

tests = RAW_TESTS.to_py()
function_name = str(FUNCTION_NAME)
user_code = str(USER_CODE)

ns = {}
exec(user_code, ns)

if function_name not in ns:
    raise NameError(f"Expected a function named {function_name}")

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

results = []

for case in tests:
    xs = case["input"]
    # Treat a missing or explicitly None "expected" as "no assertion".
    has_expected = "expected" in case and case.get("expected") is not None
    expected = case.get("expected")

    try:
        got = fn(xs)
        got_n = normalize(got)
        entry = {
            "input": normalize(xs),
            "got": got_n,
            "passed": True,
            "error": None,
        }
        if has_expected:
            expected_n = normalize(expected)
            entry["expected"] = expected_n
            entry["passed"] = got_n == expected_n
        results.append(entry)
    except Exception as e:
        entry = {
            "input": normalize(xs),
            "got": None,
            "passed": False,
            "error": f"{type(e).__name__}: {e}",
        }
        if has_expected:
            entry["expected"] = normalize(expected)
        results.append(entry)

json.dumps({
    "ok": True,
    "results": results,
})
    `);

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