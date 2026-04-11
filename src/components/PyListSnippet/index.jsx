import React, {useMemo, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const DEFAULT_TIMEOUT_MS = 5000;

function parseUserInput(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    throw new Error('Input is empty. Provide a value such as [1, 2, 3].');
  }

  // Try strict JSON first; then fall back to a relaxed parse that accepts
  // Python-style lists with single quotes, True/False/None, etc.
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
      `Could not parse input as JSON list. Expected something like [1, 2, 3] or [[1,2],[3,4]]. Details: ${err.message}`,
    );
  }
}

function RunnerInner({
  title = 'Python snippet',
  children,
  code,
  tests = [],
  packages = [],
  functionName = 'solve',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  placeholder = '[1, 2, 3]',
}) {
  const workerUrl = useBaseUrl('/workers/py-list-snippet-worker.js');
  const runIdRef = useRef(0);
  const workerRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [mode, setMode] = useState('samples'); // 'samples' | 'custom'

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

  function dispatch(payloadTests, runMode) {
    if (!source) {
      setStatus('error');
      setError('No Python source code was provided.');
      setResults([]);
      return;
    }

    stopCurrentWorker();

    const runId = ++runIdRef.current;
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    setStatus('running');
    setMode(runMode);
    setError('');
    setResults([]);

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
        setResults(data.results || []);
        setError('');
      } else {
        setStatus('error');
        setResults([]);
        setError(data.error || 'Unknown worker error.');
      }
    };

    worker.onerror = (event) => {
      window.clearTimeout(timer);
      stopCurrentWorker();
      setStatus('error');
      setResults([]);
      setError(event.message || 'Worker crashed.');
    };

    worker.postMessage({
      id: runId,
      code: source,
      tests: payloadTests,
      packages,
      functionName,
    });
  }

  function runSampleTests() {
    dispatch(tests, 'samples');
  }

  function runCustomInput() {
    let parsed;
    try {
      parsed = parseUserInput(customInput);
    } catch (err) {
      setStatus('error');
      setError(err.message);
      setResults([]);
      return;
    }
    dispatch([{input: parsed}], 'custom');
  }

  const isRunning = status === 'running';

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <strong>{title}</strong>
        <div className={styles.buttonGroup}>
          {tests.length > 0 && (
            <button
              className={styles.button}
              type="button"
              onClick={runSampleTests}
              disabled={isRunning}
            >
              {isRunning && mode === 'samples' ? 'Running...' : 'Run sample tests'}
            </button>
          )}
          <button
            className={styles.button}
            type="button"
            onClick={runCustomInput}
            disabled={isRunning}
          >
            {isRunning && mode === 'custom' ? 'Running...' : 'Run on my input'}
          </button>
        </div>
      </div>

      <pre className={styles.codeBlock}>
        <code>{source}</code>
      </pre>

      <div className={styles.customInputBlock}>
        <label className={styles.customInputLabel} htmlFor={`pyls-custom-${title}`}>
          Your input (list format, e.g. <code>[5, 2, 4, 1, 3]</code>):
        </label>
        <textarea
          id={`pyls-custom-${title}`}
          className={styles.customInput}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder={placeholder}
          rows={2}
          spellCheck={false}
        />
      </div>

      {tests.length > 0 && (
        <details className={styles.details}>
          <summary>Sample test cases ({tests.length})</summary>
          <pre className={styles.testBlock}>
            <code>{JSON.stringify(tests, null, 2)}</code>
          </pre>
        </details>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((row, i) => (
            <div
              key={i}
              className={`${styles.resultCard} ${
                row.expected === undefined
                  ? styles.neutral
                  : row.passed
                  ? styles.pass
                  : styles.fail
              }`}
            >
              <div>
                <strong>
                  {mode === 'custom' ? 'Custom input' : `Case ${i + 1}`}
                </strong>
                {row.expected !== undefined && (
                  <> — {row.passed ? 'PASS' : 'FAIL'}</>
                )}
              </div>
              <div>
                <strong>input:</strong> <code>{JSON.stringify(row.input)}</code>
              </div>
              {row.expected !== undefined && (
                <div>
                  <strong>expected:</strong>{' '}
                  <code>{JSON.stringify(row.expected)}</code>
                </div>
              )}
              <div>
                <strong>got:</strong> <code>{JSON.stringify(row.got)}</code>
              </div>
              {row.error && (
                <div>
                  <strong>error:</strong> <code>{row.error}</code>
                </div>
              )}
            </div>
          ))}
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
