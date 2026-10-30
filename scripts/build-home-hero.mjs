import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
// No new image generation, stock downloads or paid services. Animate approved local stills.
const images=['src/assets/promo-hero-1200.webp','public/images/heroes/academy-technology-v3.webp','public/images/heroes/academy-crafts-v1.webp','src/assets/promo-hero-1200.webp'];
mkdirSync('public/media',{recursive:true});
const args=['-hide_banner','-loglevel','error','-y'];
for(const image of images)args.push('-loop','1','-i',image);
const filters=images.map((_,i)=>`[${i}:v]scale=2560:-1,crop=2560:1440,zoompan=z='${i===3?'1':'min(1.035,1+on*0.00035)'}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1280x720:fps=20,trim=duration=${i===3?1:5},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);
filters.push('[v0][v1]xfade=transition=fade:duration=1:offset=4[a]','[a][v2]xfade=transition=fade:duration=1:offset=8[b]','[b][v3]xfade=transition=fade:duration=1:offset=12[out]');
args.push('-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[out]','-t','13','-an','-c:v','libx264','-preset','slow','-crf','30','-pix_fmt','yuv420p','-movflags','+faststart','public/media/unipathway-learning-hero.mp4');
const result=spawnSync('ffmpeg',args,{stdio:'inherit'});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
