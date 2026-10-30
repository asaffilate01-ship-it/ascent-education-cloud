import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
// Approved illustrative stills only. No stock licence, generation service or runtime dependency.
// Preserve the classroom framing: 3:2 canvas instead of cropping it down to 16:9.
const images=['src/assets/promo-hero-1200.webp','public/images/heroes/academy-technology-v3.webp','public/images/heroes/academy-crafts-v1.webp','src/assets/promo-hero-1200.webp'];
mkdirSync('public/media',{recursive:true});
const args=['-hide_banner','-loglevel','error','-y'];
for(const image of images)args.push('-loop','1','-framerate','24','-i',image);
// Supersampling keeps tiny camera moves smooth. Ease in AND out; no abrupt zoom reset.
// The last dissolve lands on the exact opening composition for a clean loop seam.
const filters=images.map((_,i)=>`[${i}:v]scale=3600:2400:force_original_aspect_ratio=decrease,pad=3600:2400:(ow-iw)/2:(oh-ih)/2:color=0x0b2421,setsar=1,zoompan=z='${i===3?'1':'1+0.018*(1-cos(2*PI*on/215))/2'}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1200x800:fps=24,trim=duration=${i===3?1.5:9},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);
filters.push('[v0][v1]xfade=transition=fade:duration=1.5:offset=7.5[a]','[a][v2]xfade=transition=fade:duration=1.5:offset=15[b]','[b][v3]xfade=transition=fade:duration=1.5:offset=22.5[out]');
args.push('-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[out]','-t','24','-an','-c:v','libx264','-preset','slow','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','public/media/unipathway-learning-hero-v2.mp4');
const result=spawnSync('ffmpeg',args,{stdio:'inherit'});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
