import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkManifestLock,verifyRepositoryLock} from './verify-root-lockfile.mjs';

const fixed=()=>({
 manifest:{name:'app',dependencies:{react:'^18.3.1'},devDependencies:{'@lovable.dev/preview':'^1.3.3'}},
 lock:{lockfileVersion:3,packages:{
  '':{name:'app',dependencies:{react:'^18.3.1'},devDependencies:{'@lovable.dev/preview':'^1.3.3'}},
  'node_modules/react':{version:'18.3.1',resolved:'https://registry.npmjs.org/react/-/react-18.3.1.tgz',integrity:'sha512-test'},
  'node_modules/@lovable.dev/preview':{version:'1.3.3',resolved:'https://registry.npmjs.org/@lovable.dev/preview/-/preview-1.3.3.tgz',integrity:'sha512-test'},
 }},
});

test('current repository root lock contains all directly declared packages',()=>{
 assert.deepEqual(verifyRepositoryLock(),[]);
});
test('valid manifest is accepted before npm install',()=>{
 const x=fixed();assert.deepEqual(checkManifestLock(x.manifest,x.lock),[]);
});
test('catches missing preview packages before failing seven npm ci jobs',()=>{
 const x=fixed();delete x.lock.packages['node_modules/@lovable.dev/preview'];
 assert.match(checkManifestLock(x.manifest,x.lock).join('\n'),/Missing locked package version: @lovable.dev\/preview/);
});
test('catches manifest / root lock spec drift',()=>{
 const x=fixed();x.manifest.devDependencies['@lovable.dev/preview']='^1.8.0';
 assert.match(checkManifestLock(x.manifest,x.lock).join('\n'),/Manifest\/lock mismatch/);
});
test('rejects unlocked tarball metadata and stale root lock entries',()=>{
 const x=fixed();delete x.lock.packages['node_modules/react'].integrity;
 x.lock.packages[''].dependencies['not-in-manifest']='1.0.0';
 const problems=checkManifestLock(x.manifest,x.lock).join('\n');
 assert.match(problems,/Missing resolved tarball\/integrity: react/);
 assert.match(problems,/Stale dependencies entry/);
});
test('does not permit dependency in multiple root manifest groups',()=>{
 const x=fixed();x.manifest.devDependencies.react='^18.3.1';x.lock.packages[''].devDependencies.react='^18.3.1';
 assert.match(checkManifestLock(x.manifest,x.lock).join('\n'),/Duplicate direct dependency react/);
});
