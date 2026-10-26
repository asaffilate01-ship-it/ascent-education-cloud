// Opaque-origin frame + disposable worker: never run learner code in the LMS origin.
export const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
const literal = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');
export function isolatedRunner(language: 'python' | 'javascript', code: string, input: string, token: string) {
  const python = language === 'python';
  const worker = `(async () => {
const send = self.postMessage.bind(self);
let output = '', truncated = false;
function write(value) {
 if (truncated) return;
 const text = String(value) + '\\n';
 output += text.slice(0, Math.max(0, 20000 - output.length));
 if (output.length >= 20000) { output += '\\n[Output limit reached]'; truncated = true; }
}
try {
 ${python ? `
 importScripts('${PYODIDE_URL}pyodide.js');
 const py = await loadPyodide({indexURL: '${PYODIDE_URL}'});
 const inputs = ${literal(input)}.split('\\n'); let index = 0;
 py.setStdin({stdin: () => index < inputs.length ? inputs[index++] : null});
 py.setStdout({batched: write}); py.setStderr({batched: write});
 send({phase: 'running'});
 const result = await py.runPythonAsync(${literal(code)});
 if (result && typeof result.destroy === 'function') result.destroy();
 ` : `
 send({phase: 'running'});
 const console = Object.fromEntries(['log','warn','error','info'].map(name => [name, (...args) => write(args.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' '))]));
 await new Function('console', ${literal(code)})(console);
 `}
 send({phase: 'done', output: output || '(no output)'});
} catch (error) { send({phase: 'done', output: output + '\\n' + String(error)}); }
})();`;
  const policy = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${python ? PYODIDE_URL : ''}; worker-src blob:; connect-src ${python ? PYODIDE_URL : "'none'"}; img-src 'none'; style-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'`;
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><script>
const token = ${literal(token)};
const url = URL.createObjectURL(new Blob([${literal(worker)}], {type:'text/javascript'}));
const worker = new Worker(url);
const send = data => parent.postMessage({kind:'unipathway-code',token,...data}, '*');
let timer = setTimeout(() => finish('Runtime download timed out. Check your connection and run again.'), 90000);
function finish(output) { clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url); send({phase:'done',output}); }
addEventListener('pagehide', () => { clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url); });
worker.onmessage = ({data}) => {
 if (data.phase === 'running') { clearTimeout(timer); timer = setTimeout(() => finish('Execution stopped after 10 seconds. Check for an endless loop.'), 10000); send({phase:'running'}); }
 else if(data.phase === 'done') finish(String(data.output).slice(0,20500));
};
worker.onerror = () => finish('The runtime could not start. Check your connection and browser support, then retry.');
</script>`;
}
