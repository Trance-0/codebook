import {useMemo, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const DEFAULT_TIMEOUT_MS = 5000;

function formatValue(value) {
  if (value === undefined) return '';
  return JSON.stringify(value);
}

function parseUserInput(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    throw new Error('Input is empty. Provide a value such as [1, 2, 3].');
  }

  // Try strict JSON first; then fall back to a relaxed parse that accepts
  // Python-style literals (single quotes, True/False/None).
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    // fall through
  }

  const relaxed = trimmed
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/'/g, '"');

  try {
    return JSON.parse(relaxed);
  } catch (err) {
    throw new Error(
      `Could not parse input as JSON. Expected something like [1, 2, 3] or [[1,2],[3,4]]. Details: ${err.message}`,
    );
  }
}

// Normalize both the new `examples` prop and the legacy `tests` prop into a
// single list of visible examples. No example data is hidden — whatever the
// page author passes in is rendered on screen.
function normalizeExamples(examples, tests) {
  const src = (examples && examples.length ? examples : tests) || [];
  return src.map((ex, i) => ({
    label: ex.label || `Example ${i + 1}`,
    input: ex.input,
    // `expected` and `output` are aliases; both are purely documentation.
    output: ex.output !== undefined ? ex.output : ex.expected,
    note: ex.note,
  }));
}

function RunnerInner({
  title = 'Python snippet',
  children,
  code,
  examples,
  tests, // legacy alias — kept so existing pages don't break
  packages = [],
  functionName = 'solve',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  placeholder = '[1, 2, 3]',
}) {
  const workerUrl = useBaseUrl('/workers/py-list-snippet-worker.js');
  const runIdRef = useRef(0);
  const workerRef = useRef(null);

  const normalized = useMemo(
    () => normalizeExamples(examples, tests),
    [examples, tests],
  );

  const initialInput = normalized[0] ? formatValue(normalized[0].input) : '';

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // {input, got}
  const [customInput, setCustomInput] = useState(initialInput);

  const source = useMemo(() => {
    if (typeof code === 'string' && code.trim()) return code.trim();
    if (typeof children === 'string' && children.trim()) return children.trim();
    return '';
  }, [code, children]);

  function stopCurrentWorker() {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }

  function runInput(parsedInput) {
    if (!source) {
      setStatus('error');
      setError('No Python source code was provided.');
      setResult(null);
      return;
    }

    stopCurrentWorker();

    const runId = ++runIdRef.current;
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    setStatus('running');
    setError('');
    setResult(null);

    const timer = window.setTimeout(() => {
      if (workerRef.current === worker) {
        worker.terminate();
        workerRef.current = null;
      }
      setStatus('error');
      setError(`Timed out after ${timeoutMs} ms.`);
    }, timeoutMs);

    worker.onmessage = (event) => {
      const data = event.data || {};
      if (data.id !== runId) return;

      window.clearTimeout(timer);
      stopCurrentWorker();

      if (data.ok) {
        setStatus('done');
        setResult({input: parsedInput, got: data.got});
        setError('');
      } else {
        setStatus('error');
        setResult(null);
        setError(data.error || 'Unknown worker error.');
      }
    };

    worker.onerror = (event) => {
      window.clearTimeout(timer);
      stopCurrentWorker();
      setStatus('error');
      setResult(null);
      setError(event.message || 'Worker crashed.');
    };

    worker.postMessage({
      id: runId,
      code: source,
      input: parsedInput,
      packages,
      functionName,
    });
  }

  function runCustom() {
    let parsed;
    try {
      parsed = parseUserInput(customInput);
    } catch (err) {
      setStatus('error');
      setError(err.message);
      setResult(null);
      return;
    }
    runInput(parsed);
  }

  function loadExample(ex) {
    setCustomInput(formatValue(ex.input));
    setError('');
    setResult(null);
    setStatus('idle');
  }

  const isRunning = status === 'running';

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <strong>{title}</strong>
      </div>

      <pre className={styles.codeBlock}>
        <code>{source}</code>
      </pre>

      {normalized.length > 0 && (
        <div className={styles.examples}>
          <div className={styles.examplesTitle}>Examples</div>
          {normalized.map((ex, i) => (
            <div key={i} className={styles.exampleCard}>
              <div className={styles.exampleHeader}>
                <strong>{ex.label}</strong>
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() => loadExample(ex)}
                  disabled={isRunning}
                >
                  Use this input
                </button>
              </div>
              <div className={styles.exampleRow}>
                <span className={styles.exampleLabel}>Input:</span>
                <code>{formatValue(ex.input)}</code>
              </div>
              {ex.output !== undefined && (
                <div className={styles.exampleRow}>
                  <span className={styles.exampleLabel}>Output:</span>
                  <code>{formatValue(ex.output)}</code>
                </div>
              )}
              {ex.note && (
                <div className={styles.exampleNote}>{ex.note}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.customInputBlock}>
        <div className={styles.customInputLabelRow}>
          <label
            className={styles.customInputLabel}
            htmlFor={`pyls-custom-${title}`}
          >
            Your input (JSON / Python list, e.g.{' '}
            <code>[5, 2, 4, 1, 3]</code>):
          </label>
          <button
            className={styles.button}
            type="button"
            onClick={runCustom}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
        <textarea
          id={`pyls-custom-${title}`}
          className={styles.customInput}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder={placeholder}
          rows={3}
          spellCheck={false}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.resultCard}>
          <div>
            <strong>Input:</strong>{' '}
            <code>{formatValue(result.input)}</code>
          </div>
          <div>
            <strong>Output:</strong> <code>{formatValue(result.got)}</code>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PyListSnippet(props) {
  return (
    <BrowserOnly fallback={<div>Loading Python runner...</div>}>
      {() => <RunnerInner {...props} />}
    </BrowserOnly>
  );
}
