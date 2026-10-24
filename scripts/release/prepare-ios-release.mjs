// Run on the authorised signing Mac. Produces an IPA; never uploads to a store.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateMobileRelease} from './validate-mobile-release.mjs';
validateMobileRelease(process.env);
if(process.platform!=='darwin')throw Error('An authorised Mac with Xcode and installed distribution certificate/profile is required');
const team=process.env.APPLE_TEAM_ID,profile=process.env.APPLE_PROFILE_NAME;
if(!/^[A-Z0-9]{10}$/.test(team||'')||!profile||profile.length>200)throw Error('APPLE_TEAM_ID and installed APPLE_PROFILE_NAME required');
mkdirSync('mobile-release',{recursive:true});
const root=resolve('mobile-release',`ios-${process.env.UNIPATHWAY_BUILD_NUMBER}`);mkdirSync(root,{recursive:false});
const archive=resolve(root,'UniPathway.xcarchive'),options=resolve(root,'ExportOptions.plist');
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
writeFileSync(options,`<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>signingStyle</key><string>manual</string><key>teamID</key><string>${team}</string><key>provisioningProfiles</key><dict><key>pk.edu.unipathway.app</key><string>${xml(profile)}</string></dict><key>uploadSymbols</key><true/></dict></plist>`,{flag:'wx'});
function run(command,args){const r=spawnSync(command,args,{stdio:'inherit'});if(r.error||r.status!==0)throw Error(`${command} failed; no distribution upload was attempted`);}
run('npm',['run','build']);run('npx',['cap','sync','ios']);
run('xcodebuild',['-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Release','-destination','generic/platform=iOS','-archivePath',archive,`DEVELOPMENT_TEAM=${team}`,'CODE_SIGN_STYLE=Manual','CODE_SIGN_IDENTITY=Apple Distribution',`PROVISIONING_PROFILE_SPECIFIER=${profile}`,`CURRENT_PROJECT_VERSION=${process.env.UNIPATHWAY_BUILD_NUMBER}`,`MARKETING_VERSION=${process.env.UNIPATHWAY_VERSION_NAME}`,'archive']);
run('xcodebuild',['-exportArchive','-archivePath',archive,'-exportOptionsPlist',options,'-exportPath',root]);
console.log('Signed export prepared. Validate and upload with Xcode/Transporter after reviewing the device acceptance record.');
