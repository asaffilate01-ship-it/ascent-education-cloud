import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { classifyNativeDownloadFailure, executeNativeCommand, runNativeDownloads } from './retry-native-downloads.mjs';

// Reduced terminal sections from jobs128688791672,128683259518,
// 128686342946 and128689673260; error wording/URLs are kept intact.
const wrapperTimeout = `Exception in thread "main" java.io.IOException: Downloading from https://services.gradle.org/distributions/gradle-8.14.3-all.zip failed: timeout (10000ms)
  at org.gradle.wrapper.Install.forceFetch(SourceFile:4)
  at org.gradle.wrapper.GradleWrapperMain.main(SourceFile:67)
Caused by: java.net.SocketTimeoutException: Read timed out
  at java.base/sun.nio.ch.NioSocketImpl.timedRead(NioSocketImpl.java:278)
  at org.gradle.wrapper.Install.forceFetch(SourceFile:2)
  ... 2 more`;
const wrapper504 = `Exception in thread "main" java.io.IOException: Server returned HTTP response code: 504 for URL: https://github.com/gradle/gradle-distributions/releases/download/v8.14.3/gradle-8.14.3-all.zip
  at java.base/sun.net.www.protocol.http.HttpURLConnection.getInputStream0(HttpURLConnection.java:2034)
  at org.gradle.wrapper.Install.forceFetch(SourceFile:2)
  at org.gradle.wrapper.GradleWrapperMain.main(SourceFile:67)`;
const kotlin504 = `> Task :capacitor-camera:compileDebugKotlin FAILED
124 actionable tasks: 124 executed
FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':capacitor-camera:compileDebugKotlin'.
> Could not isolate parameters org.jetbrains.kotlin.gradle.internal.transforms.BuildToolsApiClasspathEntrySnapshotTransform$Parameters_Decorated@58e164dd of artifact transform BuildToolsApiClasspathEntrySnapshotTransform
   > Could not isolate value org.jetbrains.kotlin.gradle.internal.transforms.BuildToolsApiClasspathEntrySnapshotTransform$Parameters_Decorated@58e164dd of type BuildToolsApiClasspathEntrySnapshotTransform.Parameters
      > Could not resolve all files for configuration ':capacitor-camera:kotlinBuildToolsApiClasspath'.
         > Could not download kotlin-compiler-embeddable-2.2.20.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.20)
            > Could not get resource 'https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-compiler-embeddable/2.2.20/kotlin-compiler-embeddable-2.2.20.jar'.
               > Could not GET 'https://github.com/JetBrains/kotlin/releases/download/v2.2.20/kotlin-compiler-embeddable-2.2.20.jar'. Received status code 504 from server: Gateway Time-out

* Try:
> Run the 'artifactTransforms' report task to view details about registered transforms.
> Review the documentation on Artifact Transforms at https://docs.gradle.org/8.14.3/userguide/artifact_transforms.html.
> Run with --stacktrace option to get the stack trace.
> Get more help at https://help.gradle.org.

BUILD FAILED in 1m 30s`;
const swift504 = `Resolve Package Graph
2026-11-08 09:30:10.327 xcodebuild[1625:8215] Writing error result bundle to /tmp/example.xcresult
xcodebuild: error: Could not resolve package dependencies:
  failed downloading 'https://github.com/ionic-team/capacitor-swift-pm/releases/download/8.5.3/Capacitor.xcframework.zip' which is required by binary target 'Capacitor': badResponseStatusCode(504)
  failed downloading 'https://github.com/ionic-team/capacitor-swift-pm/releases/download/8.5.3/Cordova.xcframework.zip' which is required by binary target 'Cordova': badResponseStatusCode(504)
  fatalError

failed downloading 'https://github.com/ionic-team/capacitor-swift-pm/releases/download/8.5.3/Capacitor.xcframework.zip' which is required by binary target 'Capacitor': badResponseStatusCode(504)failed downloading 'https://github.com/ionic-team/capacitor-swift-pm/releases/download/8.5.3/Cordova.xcframework.zip' which is required by binary target 'Cordova': badResponseStatusCode(504)fatalError`;

const failed = (output, code = 1) => ({ output, code, signal: null });
const silent = () => {};

test('accepts only the observed terminal wrapper, Kotlin and SwiftPM download failures', () => {
  for (const output of [wrapperTimeout, wrapper504, kotlin504]) {
    assert.equal(classifyNativeDownloadFailure('gradle', failed(output)), true);
  }
  assert.equal(classifyNativeDownloadFailure('swiftpm', failed(swift504, 74)), true);
  const annotated = kotlin504.split('\n').map(line => `2026-11-08T09:22:28.9075456Z \u001b[31m${line}\u001b[0m`).join('\r\n');
  assert.equal(classifyNativeDownloadFailure('gradle', failed(annotated)), true);
  assert.equal(classifyNativeDownloadFailure('gradle', failed(wrapperTimeout.replace('10000ms', '60000ms'))), true);
});

test('rejects failed compile, signature, integrity, authentication, unknown and mixed causes', () => {
  const cases = [
    ['gradle', kotlin504.replace('> Could not GET', '> Compilation error. Could not GET'), 1],
    ['gradle', `e: file:///App.kt:12:4 Unresolved reference\n${kotlin504}`, 1],
    ['gradle', `App.java:12: error: cannot find symbol\n${kotlin504}`, 1],
    ['gradle', `> Task :app:compileDebugJavaWithJavac FAILED\n${kotlin504}`, 1],
    ['gradle', kotlin504.replace('* Try:', '> Unknown configuration problem.\n* Try:'), 1],
    ['gradle', `${kotlin504}\nSignature verification failed`, 1],
    ['gradle', `${wrapperTimeout}\nCaused by: java.io.IOException: Unknown failure`, 1],
    ['gradle', wrapper504.replace('504', '403'), 1],
    ['gradle', wrapper504.replace('504', '404'), 1],
    ['gradle', wrapper504.replace('github.com/gradle/', 'downloads.example.com/gradle/'), 1],
    ['gradle', kotlin504.replace('504', '401'), 1],
    ['gradle', 'A test fixture mentions504. Compilation failed.', 1],
    ['gradle', 'jar is unsigned.\njarsigner: signature verification failed', 1],
    ['swiftpm', `${swift504}\nThe checksum of downloaded artifact does not match`, 74],
    ['swiftpm', swift504.replaceAll('badResponseStatusCode(504)', 'badResponseStatusCode(403)'), 74],
    ['swiftpm', swift504.replace("binary target 'Cordova': badResponseStatusCode(504)", "binary target 'Cordova': badResponseStatusCode(404)"), 74],
    ['swiftpm', `App.swift:4:7: error: cannot find type\n${swift504}`, 74],
    ['swiftpm', `${swift504}\nunknown package resolution failure`, 74],
    ['swiftpm', swift504.replace('Capacitor.xcframework.zip', 'Unexpected.xcframework.zip'), 74],
    ['swiftpm', swift504, 65],
    ['gradle', kotlin504, 0],
    ['unknown', kotlin504, 1],
  ];
  for (const [mode, output, code] of cases) {
    assert.equal(classifyNativeDownloadFailure(mode, failed(output, code)), false, `${mode}: ${output.slice(-120)}`);
  }
  assert.equal(classifyNativeDownloadFailure('gradle', { ...failed(kotlin504), signal: 'SIGTERM' }), false);
});

function runner(results, overrides = {}) {
  const calls = [];
  const delays = [];
  const messages = [];
  return {
    calls, delays, messages,
    run: () => runNativeDownloads({
      mode: 'gradle', command: 'bash', args: ['android/gradlew', '-p', 'android', 'assembleDebug'],
      stdout: silent, stderr: chunk => messages.push(chunk),
      execute: async invocation => { calls.push(invocation); return results[calls.length - 1]; },
      sleep: async milliseconds => { delays.push(milliseconds); },
      ...overrides,
    }),
  };
}

test('runs a successful command once and does not sleep', async () => {
  const harness = runner([{ code: 0, signal: null, output: 'BUILD SUCCESSFUL' }]);
  assert.deepEqual(await harness.run(), { code: 0, signal: null, attempts: 1 });
  assert.equal(harness.calls.length, 1);
  assert.deepEqual(harness.delays, []);
});

test('reuses invocation and permits at most3 attempts with10s/30s backoff', async () => {
  const env = { CI: 'true', GRADLE_USER_HOME: '/tmp/existing-cache' };
  const harness = runner([failed(wrapperTimeout), failed(kotlin504), { code: 0, signal: null, output: '' }], { cwd: '/tmp/same-job', env });
  assert.deepEqual(await harness.run(), { code: 0, signal: null, attempts: 3 });
  assert.deepEqual(harness.delays, [10_000, 30_000]);
  assert.equal(harness.messages.length, 2);
  for (const call of harness.calls) {
    assert.equal(call.command, 'bash');
    assert.deepEqual(call.args, ['android/gradlew', '-p', 'android', 'assembleDebug']);
    assert.equal(call.cwd, '/tmp/same-job');
    assert.equal(call.env, env);
  }
});

test('exhausted SwiftPM retries preserve exit74', async () => {
  const harness = runner(Array.from({ length: 3 }, () => failed(swift504, 74)), { mode: 'swiftpm' });
  assert.deepEqual(await harness.run(), { code: 74, signal: null, attempts: 3 });
  assert.equal(harness.calls.length, 3);
  assert.deepEqual(harness.delays, [10_000, 30_000]);
});

test('a later compiler failure never reuses an earlier network error', async () => {
  const harness = runner([failed(kotlin504), failed('Compilation failed: unresolved symbol', 7)]);
  assert.deepEqual(await harness.run(), { code: 7, signal: null, attempts: 2 });
  assert.deepEqual(harness.delays, [10_000]);
});

test('unknown, signing and signal failures stop immediately', async () => {
  for (const result of [failed('unknown failure', 23), failed('jarsigner: signature verification failed'), { code: null, signal: 'SIGINT', output: kotlin504 }]) {
    const harness = runner([result]);
    const actual = await harness.run();
    assert.equal(actual.code, result.signal ? 130 : result.code);
    assert.equal(actual.signal, result.signal);
    assert.equal(harness.calls.length, 1);
    assert.deepEqual(harness.delays, []);
  }
});

test('abort before execution and during backoff cannot start another attempt', async () => {
  const before = new AbortController();
  before.abort('SIGINT');
  const notStarted = runner([], { signal: before.signal });
  assert.deepEqual(await notStarted.run(), { code: 130, signal: 'SIGINT', attempts: 0 });
  assert.equal(notStarted.calls.length, 0);

  const during = new AbortController();
  const stopped = runner([failed(kotlin504)], {
    signal: during.signal,
    sleep: async () => { during.abort('SIGTERM'); throw new Error('aborted'); },
  });
  assert.deepEqual(await stopped.run(), { code: 143, signal: 'SIGTERM', attempts: 1 });
  assert.equal(stopped.calls.length, 1);
});

test('real subprocess streams both channels and preserves literal arguments, cwd, env and status', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'native-retry-'));
  try {
    let stdout = '';
    let stderr = '';
    const script = `process.stdout.write(JSON.stringify({args:process.argv.slice(1),cwd:process.cwd(),value:process.env.NATIVE_RETRY_FIXTURE}));process.stderr.write('compiler diagnostic\\n');process.exitCode=19;`;
    const args = ['-e', script, '--', 'value with spaces', '$(must-stay-literal)', 'semi;colon'];
    const result = await runNativeDownloads({ mode: 'gradle', command: process.execPath, args, cwd,
      env: { ...process.env, NATIVE_RETRY_FIXTURE: 'kept' },
      stdout: chunk => { stdout += chunk; }, stderr: chunk => { stderr += chunk; },
      sleep: async () => assert.fail('A compiler failure must not retry'),
    });
    assert.deepEqual(result, { code: 19, signal: null, attempts: 1 });
    assert.deepEqual(JSON.parse(stdout), { args: args.slice(3), cwd, value: 'kept' });
    assert.equal(stderr, 'compiler diagnostic\n');
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('aborting a running subprocess forwards the signal and does not retry', async () => {
  const controller = new AbortController();
  let attempts = 0;
  const result = await runNativeDownloads({ mode: 'gradle', command: process.execPath,
    args: ['-e', `process.stdout.write('ready\\n');setInterval(()=>{},1000);`], signal: controller.signal,
    stdout: chunk => { if (chunk.includes('ready')) controller.abort('SIGTERM'); }, stderr: silent,
    execute: invocation => { attempts += 1; return executeNativeCommand(invocation); },
    sleep: async () => assert.fail('An interrupted command must not retry'),
  });
  assert.deepEqual(result, { code: 143, signal: 'SIGTERM', attempts: 1 });
  assert.equal(attempts, 1);
});

test('missing executables are non-retryable and return127', async () => {
  const result = await runNativeDownloads({ mode: 'gradle', command: '/not/a/native-command', stdout: silent, stderr: silent,
    sleep: async () => assert.fail('A missing executable must not retry'),
  });
  assert.deepEqual(result, { code: 127, signal: null, attempts: 1 });
});

test('CLI rejects malformed arguments and preserves child failure status', async () => {
  const script = fileURLToPath(new URL('./retry-native-downloads.mjs', import.meta.url));
  const runCli = args => new Promise(resolveResult => {
    const child = spawn(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('close', code => resolveResult({ code, stderr }));
  });
  const invalid = await runCli(['gradle', 'bash']);
  assert.equal(invalid.code, 2);
  assert.match(invalid.stderr, /Usage:/);
  const failedCli = await runCli(['gradle', '--', process.execPath, '-e', `process.stderr.write('build rejected\\n');process.exitCode=17;`]);
  assert.equal(failedCli.code, 17);
  assert.equal(failedCli.stderr, 'build rejected\n');
});
