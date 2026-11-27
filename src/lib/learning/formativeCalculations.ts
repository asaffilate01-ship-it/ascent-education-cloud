import type {FormativeQuestion} from './formativeQuestions';
type Calculation={code:string;subject:string;scope:string;topic:string;prompt:string;answer:number;wrong:number[];unit?:string;explanation:string};
const school='Classes 8–12 / calculation practice', accounting='Accountancy fundamentals / calculation practice';
function question(c:Calculation,index:number):FormativeQuestion{
 const format=(value:number)=>String(value)+(c.unit?' '+c.unit:'');
 const choices=c.wrong.map(format);choices.splice(index%4,0,format(c.answer));
 return {id:'UP-FQ4-CALC-'+c.code+'-'+String(index+1).padStart(2,'0'),subject:c.subject,scope:c.scope,topic:c.topic,question:c.prompt,options:choices,answer:format(c.answer),explanation:c.explanation,revision:1,status:'draft_review_required'};
}
export const CALCULATION_PRACTICE:readonly FormativeQuestion[]=Array.from({length:4},(_,i)=>{
 const x=5+i*3, a=3+i, b=7+i, amount=400+200*i,percent=10+5*i;
 const width=4+i,length=9+2*i, distance=120+30*i,time=10, mass=6+i, acceleration=3, volume=5+i,density=4+i;
 const work=240+60*i, seconds=12, revenue=10000+2000*i,cost=6000+1000*i,assetCost=12000+6000*i,residual=2000+1000*i,years=5,oldBalance=1500+500*i,creditSales=2800+400*i,receipts=900+200*i;
 const rows:Calculation[]=[
  {code:'EQ',subject:'School maths',scope:school,topic:'Linear equations',prompt:`Solve ${a}x + ${b} = ${a*x+b}.`,answer:x,wrong:[x+1,x-1,x+2],explanation:`Subtract ${b} from both sides and divide ${a*x} by ${a}; x = ${x}.`},
  {code:'PCT',subject:'School maths',scope:school,topic:'Percentage discount',prompt:`A book costs PKR ${amount}. Find its price after a ${percent}% discount.`,answer:amount*(100-percent)/100,wrong:[amount,amount*(100+percent)/100,amount*percent/100],unit:'PKR',explanation:`Discount = ${amount} × ${percent}/100 = ${amount*percent/100} PKR. Subtract from ${amount}.`},
  {code:'AREA',subject:'School maths',scope:school,topic:'Area',prompt:`Find the area of a rectangle measuring ${length} cm by ${width} cm.`,answer:length*width,wrong:[2*(length+width),length+width,length*(width+1)],unit:'cm²',explanation:`Area = length × width = ${length} × ${width} = ${length*width} cm².`},
  {code:'MEAN',subject:'School maths',scope:school,topic:'Arithmetic mean',prompt:`Find the mean of ${x-3}, ${x-1}, ${x+1}, and ${x+3}.`,answer:x,wrong:[x-1,x+1,x*4],explanation:`The sum is ${x*4}; divide by 4 to find the mean.`},
  {code:'SPEED',subject:'School physics',scope:school,topic:'Average speed',prompt:`A trolley travels ${distance} m in ${time} s. What is its average speed?`,answer:distance/time,wrong:[distance,time,distance/time+5],unit:'m/s',explanation:`Average speed = distance ÷ time = ${distance}/${time} = ${distance/time} m/s.`},
  {code:'FORCE',subject:'School physics',scope:school,topic:'Newton’s second law',prompt:`What resultant force accelerates a ${mass} kg object at ${acceleration} m/s²?`,answer:mass*acceleration,wrong:[mass,acceleration,mass*acceleration+3],unit:'N',explanation:`F = ma = ${mass} × ${acceleration} = ${mass*acceleration} N.`},
  {code:'DENSITY',subject:'School physics',scope:school,topic:'Density',prompt:`A sample has mass ${volume*density} g and volume ${volume} cm³. Find its density.`,answer:density,wrong:[volume*density,density+1,density+2],unit:'g/cm³',explanation:`Density = mass ÷ volume = ${volume*density}/${volume} = ${density} g/cm³.`},
  {code:'POWER',subject:'School physics',scope:school,topic:'Power',prompt:`A motor transfers ${work} J in ${seconds} s. What is its average power?`,answer:work/seconds,wrong:[work,seconds,work/seconds+5],unit:'W',explanation:`Power = energy ÷ time = ${work}/${seconds} = ${work/seconds} W.`},
  {code:'GP',subject:'ACCA preparation',scope:accounting,topic:'Gross profit',prompt:`Revenue is PKR ${revenue} and cost of sales is PKR ${cost}. Find gross profit.`,answer:revenue-cost,wrong:[revenue,cost,revenue+cost],unit:'PKR',explanation:`Gross profit = revenue − cost of sales = ${revenue} − ${cost} = ${revenue-cost} PKR.`},
  {code:'DEP',subject:'ACCA preparation',scope:accounting,topic:'Straight-line depreciation',prompt:`An asset costs PKR ${assetCost}, has residual value PKR ${residual}, and a useful life of ${years} years. Find annual straight-line depreciation.`,answer:(assetCost-residual)/years,wrong:[assetCost/years,assetCost-residual,(assetCost+residual)/years],unit:'PKR',explanation:`Annual depreciation = (cost − residual value) ÷ useful life = (${assetCost} − ${residual})/${years}.`},
  {code:'AR',subject:'ACCA preparation',scope:accounting,topic:'Trade receivables',prompt:`Opening receivables are PKR ${oldBalance}, credit sales PKR ${creditSales}, and customer receipts PKR ${receipts}. With no other movements, what is closing receivables?`,answer:oldBalance+creditSales-receipts,wrong:[oldBalance+creditSales,oldBalance+creditSales+receipts,creditSales-receipts],unit:'PKR',explanation:`Opening receivables + credit sales − receipts = ${oldBalance} + ${creditSales} − ${receipts}.`},
  {code:'BE',subject:'Business management',scope:'Level 3–6 / calculation practice',topic:'Break-even',prompt:`Fixed costs are PKR ${(i+4)*1200}. Selling price is PKR 200 and variable cost per unit is PKR 80. Find break-even units.`,answer:(i+4)*10,wrong:[(i+4)*6,(i+4)*15,(i+4)*12],unit:'units',explanation:`Contribution per unit = 200 − 80 = 120 PKR. Divide fixed costs by 120 to get ${(i+4)*10} units.`},
 ];
 return rows.map(c=>question(c,i));
}).flat();
