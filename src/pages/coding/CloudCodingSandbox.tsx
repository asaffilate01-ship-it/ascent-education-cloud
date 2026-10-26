import { isolatedRunner } from '@/lib/coding/isolatedRunner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Download, Copy, CheckCircle, Code2, Terminal, FileCode } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATES: Record<string, { name: string; language: string; code: string }> = {
  html: {
    name: 'HTML/CSS/JS',
    language: 'html',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; margin: 40px auto; }
    h1 { color: #333; margin-bottom: 8px; }
    p { color: #666; }
    button { background: #B51A2D; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 12px; }
    button:hover { background: #8B1538; }
    #output { margin-top: 12px; padding: 12px; background: #f0f0f0; border-radius: 8px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello, UniPathway!</h1>
    <p>Edit this code and click Run to see changes.</p>
    <button onclick="greet()">Click Me</button>
    <div id="output"></div>
  </div>
  <script>
    function greet() {
      const el = document.getElementById('output');
      el.style.display = 'block';
      el.textContent = 'Hello from JavaScript! The time is ' + new Date().toLocaleTimeString();
    }
  </script>
</body>
</html>`,
  },
  python: {
    name: 'Python',
    language: 'python',
    code: `# Python — executes in your browser using Pyodide
# Functions, loops and the Python standard library are supported

def fibonacci(n):
    a, b = 0, 1
    result = []
    for i in range(n):
        result.append(a)
        a, b = b, a + b
    return result

# Generate first 10 Fibonacci numbers
fib = fibonacci(10)
print("Fibonacci sequence:", fib)
print("Sum:", sum(fib))

# String manipulation
name = "UniPathway Student"
print(f"Hello, {name}!")
print(f"Name length: {len(name)}")
`,
  },
  javascript: {
    name: 'JavaScript',
    language: 'javascript',
    code: `// JavaScript Playground
// Output appears in the console below

function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

const data = [64, 34, 25, 12, 22, 11, 90];
console.log("Original:", data);
console.log("Sorted:", bubbleSort([...data]));

// Array methods
const students = ["Alice", "Bob", "Charlie", "Diana"];
console.log("Students:", students.join(", "));
console.log("Filtered (length > 4):", students.filter(s => s.length > 4));
console.log("Mapped:", students.map(s => s.toUpperCase()));
`,
  },
};

export default function CloudCodingSandbox() {
  const [template, setTemplate] = useState('html');
  const [code, setCode] = useState(TEMPLATES.html.code);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(TEMPLATES.html.code);
  const drafts = useRef<Record<string,string>>({});
  const [copied, setCopied] = useState(false);
  const [isolatedScript,setIsolatedScript] = useState('');
  const runnerRef=useRef<HTMLIFrameElement>(null);
  const tokenRef=useRef<string|null>(null);

  const stop = useCallback(() => {
    tokenRef.current = null;
    setIsolatedScript('');
    setRunning(false);
  }, []);
  const handleTemplateChange = (key: string) => {
    drafts.current[template] = code;
    stop();
    setTemplate(key);
    setCode(drafts.current[key] ?? TEMPLATES[key].code);
    setOutput('');
  };
  const runCode = useCallback(() => {
    if (running) return;
    if (template === 'html') {
      setPreview(code);
      return;
    }
    const token = crypto.randomUUID();
    tokenRef.current = token;
    setRunning(true);
    setOutput(template === 'python' ? 'Loading Python… First use requires an internet download.' : 'Starting JavaScript…');
    setIsolatedScript(isolatedRunner(template as 'python' | 'javascript', code, input, token));
  }, [code, template, input, running]);

  useEffect(()=>{
    const receive=(e:MessageEvent)=>{
      if(e.source!==runnerRef.current?.contentWindow||e.origin!=='null')return;
      const data=e.data as {kind?:string;token?:string;output?:string;phase?:string}|null;
      if(!data||data.kind!=='unipathway-code'||data.token!==tokenRef.current)return;
      if (data.phase === 'running') { setOutput('Running…'); return; }
      if (data.phase !== 'done') return;
      setOutput(String(data.output||'').slice(0,20500));
      stop();
    };
    window.addEventListener('message',receive);
    return()=>window.removeEventListener('message',receive);
  },[stop]);
    const handleCopy = async () => {
    try { await navigator.clipboard.writeText(code); }
    catch { toast.error('Copy unavailable. Select the code or use Download.'); return; }
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = template === 'html' ? 'html' : template === 'python' ? 'py' : 'js';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      title="Code Sandbox"
      subtitle="Write, run, and experiment with code"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5 mr-1" /> Download
          </Button>
          {running && <Button variant="outline" size="sm" onClick={() => { stop(); setOutput('Stopped. Your code is still in the editor.'); }}>Stop</Button>}
          <Button size="sm" onClick={runCode} disabled={running}>
            <Play className="w-3.5 h-3.5 mr-1" /> {running ? 'Running...' : 'Run'}
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-xl border bg-secondary/40 p-3 text-sm text-muted-foreground">
        Practise HTML, JavaScript and real Python in your browser. Python downloads its runtime on first use; no cloud account is needed. Runs start fresh and stop after 10 seconds. Download your code before leaving. For Linux desktops, databases and assessed project work, use your assigned course labs.
      </div>
      {isolatedScript&&<iframe ref={runnerRef} srcDoc={isolatedScript}
         title="Isolated code execution sandbox" sandbox="allow-scripts"
         className="hidden" aria-hidden="true" />}
      {/* Template selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => handleTemplateChange(key)}
            aria-pressed={template === key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-default ${
              template === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            {t.name}
          </button>
        ))}
      </div>

      {template === 'python' && <label className="mb-4 block text-sm font-medium">
        Program input <span className="font-normal text-muted-foreground">— one line per input() call</span>
        <textarea aria-label="Program input" value={input} onChange={e => setInput(e.target.value)} rows={2}
          className="mt-2 w-full rounded-lg border bg-background p-3 font-mono text-sm" />
      </label>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="surface-card min-w-0 min-h-[360px] lg:min-h-[520px] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Editor</span>
            <button aria-label="Reset code to example" onClick={() => { stop(); setCode(TEMPLATES[template].code); setOutput(''); }} className="ml-auto text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            aria-label="Code editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full bg-background text-foreground text-xs font-mono p-4 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Output */}
        <div className="surface-card min-w-0 min-h-[360px] lg:min-h-[520px] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Output</span>
          </div>
          {template === 'html' ? (
            <iframe
              srcDoc={preview}
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts"
              title="HTML Preview"
            />
          ) : (
            <pre role="status" aria-live="polite" className="flex-1 w-full bg-background text-foreground text-xs font-mono p-4 overflow-auto whitespace-pre-wrap">
              {output || 'Click "Run" to see output...'}
            </pre>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
