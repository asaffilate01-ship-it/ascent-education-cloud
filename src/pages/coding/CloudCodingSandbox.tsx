import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useCallback } from 'react';
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
    <h1>Hello, EduCloud!</h1>
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
    name: 'Python (Simulated)',
    language: 'python',
    code: `# Python Simulator — runs basic Python-like code
# Supported: print(), variables, arithmetic, loops, functions

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
name = "EduCloud Student"
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
  const [copied, setCopied] = useState(false);

  const handleTemplateChange = (key: string) => {
    setTemplate(key);
    setCode(TEMPLATES[key].code);
    setOutput('');
  };

  const runCode = useCallback(() => {
    setRunning(true);
    setOutput('');

    setTimeout(() => {
      try {
        if (template === 'html') {
          // HTML runs in iframe — handled by preview
          setOutput('✅ HTML rendered in preview panel below');
        } else if (template === 'javascript') {
          const logs: string[] = [];
          const mockConsole = {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
            error: (...args: any[]) => logs.push('❌ ' + args.join(' ')),
            warn: (...args: any[]) => logs.push('⚠️ ' + args.join(' ')),
          };
          const fn = new Function('console', code);
          fn(mockConsole);
          setOutput(logs.join('\n') || '(no output)');
        } else if (template === 'python') {
          // Simple Python simulator
          const logs: string[] = [];
          const lines = code.split('\n');
          const vars: Record<string, any> = {};

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('def ') || trimmed.startsWith('for ') || trimmed.startsWith('if ')) continue;
            const printMatch = trimmed.match(/^print\((.+)\)$/);
            if (printMatch) {
              try {
                let content = printMatch[1];
                content = content.replace(/f"([^"]*)"/, (_, s) => {
                  return '"' + s.replace(/\{([^}]+)\}/g, '" + $1 + "') + '"';
                });
                logs.push(String(eval(content)));
              } catch {
                logs.push(trimmed);
              }
            }
          }
          setOutput(logs.join('\n') || '# Python simulation complete (basic support only)');
        }
      } catch (e: any) {
        setOutput(`❌ Error: ${e.message}`);
      }
      setRunning(false);
    }, 500);
  }, [code, template]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5 mr-1" /> Download
          </Button>
          <Button size="sm" onClick={runCode} disabled={running}>
            <Play className="w-3.5 h-3.5 mr-1" /> {running ? 'Running...' : 'Run'}
          </Button>
        </div>
      }
    >
      {/* Template selector */}
      <div className="flex gap-2 mb-4">
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => handleTemplateChange(key)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-260px)]">
        {/* Editor */}
        <div className="surface-card flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Editor</span>
            <button onClick={() => { setCode(TEMPLATES[template].code); setOutput(''); }} className="ml-auto text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full bg-background text-foreground text-xs font-mono p-4 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Output */}
        <div className="surface-card flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Output</span>
          </div>
          {template === 'html' ? (
            <iframe
              srcDoc={code}
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts"
              title="HTML Preview"
            />
          ) : (
            <pre className="flex-1 w-full bg-background text-foreground text-xs font-mono p-4 overflow-auto whitespace-pre-wrap">
              {output || 'Click "Run" to see output...'}
            </pre>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
