// Validate non-secret release metadata before a manual signed build.
export function validateMobileRelease(env){
 if(env.RELEASE_ACK!=='DEVICE_ACCEPTANCE_COMPLETE')throw Error('Record real-device acceptance before preparing a distribution build');
 if(!/^[1-9]\d{0,8}$/.test(env.UNIPATHWAY_BUILD_NUMBER||''))throw Error('Provide a positive, increasing build number');
 if(!/^\d+\.\d+\.\d+$/.test(env.UNIPATHWAY_VERSION_NAME||''))throw Error('Provide a version in major.minor.patch format');
 if(!/^https:\/\//.test(env.DEVICE_ACCEPTANCE_URL||''))throw Error('Provide the HTTPS reference for the device acceptance record');
}
if(import.meta.url===new URL(process.argv[1], 'file:').href){validateMobileRelease(process.env);console.log('Release metadata accepted; provider signing and store validation are still required.');}
