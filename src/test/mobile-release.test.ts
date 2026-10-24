import {it,expect} from 'vitest';
import {validateMobileRelease} from '../../scripts/release/validate-mobile-release.mjs';
const env={RELEASE_ACK:'DEVICE_ACCEPTANCE_COMPLETE',UNIPATHWAY_BUILD_NUMBER:'12',UNIPATHWAY_VERSION_NAME:'1.0.1',DEVICE_ACCEPTANCE_URL:'https://example.invalid/device-review'};
it('requires explicit real-device acceptance and valid release metadata',()=>{expect(()=>validateMobileRelease(env)).not.toThrow();for(const [key,value] of Object.entries({RELEASE_ACK:'',UNIPATHWAY_BUILD_NUMBER:'-1',UNIPATHWAY_VERSION_NAME:'1.0;echo',DEVICE_ACCEPTANCE_URL:'file:///tmp/test'}))expect(()=>validateMobileRelease({...env,[key]:value})).toThrow();});
