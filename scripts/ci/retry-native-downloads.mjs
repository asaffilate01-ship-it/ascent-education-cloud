import { spawn } from 'node:child_process';
import { constants } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const BACKOFF_MS = [10_000, 30_000];
const SWIFTPM_ERROR = 'xcodebuild: error: Could not resolve package dependencies:';
const GRADLE_DISTRIBUTION = String.raw`https://(?:services\.gradle\.org/distributions/|github\.com/gradle/gradle-distributions/releases/download/v[\w.-]+/)gradle-[\w.-]+-(?:all|bin)\.zip`;
const KOTLIN_ARTIFACT = String.raw`https://(?:repo\.maven\.apache\.org/maven2/org/jetbrains/kotlin/kotlin-compiler-embeddable/[\w.-]+/|github\.com/JetBrains/kotlin/releases/download/v[\w.-]+/)kotlin-compiler-embeddable-[\w.-]+\.jar`;

function logLines(output) {
  return stripVTControlCharacters(output).split(/\r?\n/)
    .map(line => line.replace(/^\uFEFF?\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/, '').replace(/^##\[error\]/, '').trim())
    .filter(line => line && !/^Process completed with exit code \d+\.$/.test(line));
}

function hasOtherFailure(lines, allowed = () => false) {
  return lines.some(line => /\b(?:error|failed|failure|fatal|exception)\b/i.test(line) && !allowed(line));
}

function gradleDownloadFailure(lines) {
  const wrapperIndex = lines.findIndex(line => line.startsWith('Exception in thread "main"'));
  if (wrapperIndex >= 0) {
    const tail = lines.slice(wrapperIndex);
    const timeout = new RegExp(`^Exception in thread "main" java\\.io\\.IOException: Downloading from ${GRADLE_DISTRIBUTION} failed: timeout \\(\\d+ms\\)$`).test(tail[0]);
    const gateway = new RegExp(`^Exception in thread "main" java\\.io\\.IOException: Server returned HTTP response code: 504 for URL: ${GRADLE_DISTRIBUTION}$`).test(tail[0]);
    return (timeout || gateway)
      && !hasOtherFailure(lines.slice(0, wrapperIndex))
      && tail.some(line => line.includes('org.gradle.wrapper.Install.forceFetch('))
      && (!timeout || tail.includes('Caused by: java.net.SocketTimeoutException: Read timed out'))
      && tail.slice(1).every(line => /^at [\w.$/]+\([^\n]*\)$/.test(line)
        || /^\.\.\. \d+ more$/.test(line)
        || (timeout && line === 'Caused by: java.net.SocketTimeoutException: Read timed out'));
  }

  // Only the observed Kotlin build-tools resolution failure is eligible. Unknown
  // causes, multiple failed tasks, and other dependency failures remain failures.
  const failure = lines.indexOf('FAILURE: Build failed with an exception.');
  const wrong = lines.indexOf('* What went wrong:', failure);
  const help = lines.indexOf('* Try:', wrong);
  if (failure < 0 || wrong !== failure + 1 || help < 0) return false;
  const causes = lines.slice(wrong + 1, help);
  const task = causes[0]?.match(/^Execution failed for task '(:[^']+)'\.$/)?.[1];
  const download = new RegExp(`^> Could not GET '${KOTLIN_ARTIFACT}'\\. Received status code 504 from server: Gateway Time-out$`);
  const resource = new RegExp(`^> Could not get resource '${KOTLIN_ARTIFACT}'\\.$`);
  if (!task || !causes.some(line => download.test(line))) return false;
  return !hasOtherFailure(lines.slice(0, failure), line => line === `> Task ${task} FAILED`)
    && causes.slice(1).every(line => download.test(line) || resource.test(line)
      || /^> Could not isolate (?:parameters|value) .*BuildToolsApiClasspathEntrySnapshotTransform.*$/.test(line)
      || /^> Could not resolve all files for configuration ':[^']+'\.$/.test(line)
      || /^> Could not download kotlin-compiler-embeddable-[\w.-]+\.jar \(org\.jetbrains\.kotlin:kotlin-compiler-embeddable:[\w.-]+\)$/.test(line))
    && lines.slice(help + 1).every(line => /^> (?:Run |Review the documentation |Get more help at https:\/\/help\.gradle\.org)/.test(line)
      || /^BUILD FAILED in [\w .]+$/.test(line)
      || /^\d+ actionable tasks: [\w ,:-]+$/.test(line));
}

function swiftPackageDownloadFailure(lines) {
  const start = lines.indexOf(SWIFTPM_ERROR);
  if (start < 0) return false;
  const artifact = /failed downloading 'https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\/releases\/download\/[\w.-]+\/(Capacitor|Cordova)\.xcframework\.zip' which is required by binary target '\1': badResponseStatusCode\(504\)/g;
  for (const line of lines.slice(0, start)) {
    const remaining = line.replace(artifact, '');
    if (remaining !== line) {
      // Echoed errors can precede the heading, with no newline before the next
      // invocation. Only these exact download errors and their suffix may vanish.
      const suffix = remaining.replace(/fatalError/g, '').trim();
      if (suffix !== '' && suffix !== 'Command line invocation:') return false;
    } else if (hasOtherFailure([line], entry => /xcodebuild\[\d+:\d+\] Writing error result bundle to /.test(entry))) return false;
  }
  const tail = lines.slice(start + 1).join('\n');
  if (!artifact.test(tail)) return false;
  // Xcode repeats its download errors without line breaks before exiting74.
  artifact.lastIndex = 0;
  return tail.replace(artifact, '').replace(/fatalError/g, '').trim() === '';
}

export function classifyNativeDownloadFailure(mode, { code, signal, output }) {
  if (signal || code !== (mode === 'gradle' ? 1 : 74) || !['gradle', 'swiftpm'].includes(mode)) return false;
  const lines = logLines(output);
  if (lines.some(line => /\b(?:checksum|signature|keystore|certificate|unauthorized|forbidden|authentication)\b|permission denied|^e:\s/i.test(line)
    || (/\berror:/i.test(line) && line !== SWIFTPM_ERROR))) return false;
  return mode === 'gradle' ? gradleDownloadFailure(lines) : swiftPackageDownloadFailure(lines);
}

function signalResult(signal) {
  const name = typeof signal === 'string' && constants.signals[signal] ? signal : 'SIGTERM';
  return { code: 128 + constants.signals[name], signal: name };
}

export function executeNativeCommand({ command, args, cwd, env, signal, stdout, stderr }) {
  if (signal?.aborted) return Promise.resolve({ ...signalResult(signal.reason), output: '' });
  return new Promise(resolveResult => {
    let output = '';
    let spawnCode;
    const child = spawn(command, args, { cwd, env, stdio: ['inherit', 'pipe', 'pipe'] });
    const abort = () => child.kill(signalResult(signal.reason).signal);
    signal?.addEventListener('abort', abort, { once: true });
    const channels = [
      { stream: child.stdout, write: stdout, pending: '' },
      { stream: child.stderr, write: stderr, pending: '' },
    ];
    for (const channel of channels) {
      channel.stream.setEncoding('utf8');
      channel.stream.on('data', chunk => {
        // Keep live output unchanged, but never splice another stream into an
        // unfinished diagnostic line in the classifier's private capture.
        channel.pending += chunk;
        const end = channel.pending.lastIndexOf('\n');
        if (end >= 0) {
          output += channel.pending.slice(0, end + 1);
          channel.pending = channel.pending.slice(end + 1);
        }
        channel.write(chunk);
      });
    }
    child.once('error', error => {
      spawnCode = error.code === 'ENOENT' ? 127 : 126;
      const message = `${error.message}\n`;
      output += message;
      stderr(message);
    });
    child.once('close', (code, childSignal) => {
      signal?.removeEventListener('abort', abort);
      for (const channel of channels) {
        if (channel.pending) output += `${channel.pending}\n`;
      }
      resolveResult({ ...(childSignal ? signalResult(childSignal) : { code: spawnCode ?? code ?? 1, signal: null }), output });
    });
    if (signal?.aborted) abort();
  });
}

export async function runNativeDownloads({
  mode, command, args = [], cwd = process.cwd(), env = process.env,
  execute = executeNativeCommand,
  sleep = (milliseconds, signal) => delay(milliseconds, undefined, { signal }),
  signal, stdout = chunk => process.stdout.write(chunk), stderr = chunk => process.stderr.write(chunk),
}) {
  if (!['gradle', 'swiftpm'].includes(mode) || typeof command !== 'string' || !command
    || !Array.isArray(args) || args.some(arg => typeof arg !== 'string')) {
    throw new TypeError('Expected gradle or swiftpm, followed by -- and a command with its arguments.');
  }
  for (let attempt = 1; attempt <= BACKOFF_MS.length + 1; attempt += 1) {
    if (signal?.aborted) return { ...signalResult(signal.reason), attempts: attempt - 1 };
    const result = await execute({ command, args, cwd, env, signal, stdout, stderr });
    if (signal?.aborted) return { ...signalResult(signal.reason), attempts: attempt };
    if (result.signal || result.code === 0 || attempt > BACKOFF_MS.length
      || !classifyNativeDownloadFailure(mode, result)) {
      return { ...(result.signal ? signalResult(result.signal) : { code: result.code, signal: null }), attempts: attempt };
    }
    const milliseconds = BACKOFF_MS[attempt - 1];
    stderr(`[native downloads] ${mode} dependency download failed; retry ${attempt + 1}/3 in ${milliseconds / 1000}s.\n`);
    try {
      await sleep(milliseconds, signal);
    } catch (error) {
      if (!signal?.aborted) throw error;
      return { ...signalResult(signal.reason), attempts: attempt };
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, separator, command, ...args] = process.argv.slice(2);
  if (separator !== '--' || !command || !['gradle', 'swiftpm'].includes(mode)) {
    process.stderr.write('Usage: node scripts/ci/retry-native-downloads.mjs <gradle|swiftpm> -- <command> [args...]\n');
    process.exitCode = 2;
  } else {
    const controller = new AbortController();
    const interrupt = () => controller.abort('SIGINT');
    const terminate = () => controller.abort('SIGTERM');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', terminate);
    try {
      const result = await runNativeDownloads({ mode, command, args, signal: controller.signal });
      process.exitCode = result.code;
    } catch (error) {
      process.stderr.write(`[native downloads] ${error.message}\n`);
      process.exitCode = 1;
    } finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', terminate);
    }
  }
}
