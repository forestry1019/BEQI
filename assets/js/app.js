/* BEQI Portfolio — ต้นแบบแดชบอร์ดตามข้อกำหนดเชิงออกแบบในบทที่ 5
   หลักการบังคับ 3 ข้อ (หัวข้อ 5.3.3)
   1) เปิดเผยบริบท: ทุกหน้าแสดงนิยามหน่วยวิเคราะห์และรุ่นพารามิเตอร์
   2) ห้ามแสดงคะแนนรวมโดยลำพัง: การ์ดทุกใบแสดงคะแนนรายตัวชี้วัดคู่เสมอ (FR4)
   3) แสดงความไม่แน่นอน: คะแนนรวมมาพร้อมช่วงความเชื่อมั่น 95%

   เว็บมี 3 หน้าหลักตามลำดับการใช้งาน: วาดขอบเขตแปลงที่ดิน → ภาพรวม Portfolio → การรับรองคุณภาพ
   รายละเอียดเชิงลึก (สถิติรายโซน แผนที่ ช่องว่าง ความไม่แน่นอน ระเบียบวิธี) ตัดออกจากหน้าเว็บแล้ว
   ยังอยู่ครบใน data/beqi.json สำหรับใช้งานอ้างอิงหรือประกอบเล่มดุษฎีนิพนธ์ */
const C={deep:'#0B3D45',teal:'#2A9D8F',sand:'#E9C46A',mute:'#5C7A80',line:'#DCE6E7',
         ind:['#2A9D8F','#0B3D45','#E9C46A','#E76F51'],
         band:{A:'#1a7d32',B:'#2A9D8F',C:'#E9C46A',D:'#E76F51',E:'#B5322C'}};
const IND=['ที่ 1 พื้นที่สีเขียว','ที่ 2 การเชื่อมโยง','ที่ 3 การเข้าถึงน้ำ','ที่ 4 องค์ประกอบไบโอฟิลิก'];
/* คำอธิบายสั้นของตัวชี้วัดทั้ง 4 ด้าน สำหรับหน้าภาพรวม — ไอคอนเป็นอักษรย่อล้วน ไม่ใช้ emoji */
const IND_INFO=[
  {icon:'1',name:'ความหนาแน่นพื้นที่สีเขียว',en:'Green Area Density',
   desc:'สัดส่วนพื้นที่บกที่มีค่าดัชนีพืชพรรณ (NDVI) ตั้งแต่ 0.40 ขึ้นไป คำนวณจากภาพถ่ายดาวเทียม Sentinel-2 สะท้อนความหนาแน่นของเรือนยอดพืชพรรณในหน่วยวิเคราะห์'},
  {icon:'2',name:'การเชื่อมโยงระบบนิเวศ',en:'Ecological Connectivity',
   desc:'ดัชนี Probability of Connectivity (PC) วัดความต่อเนื่องของผืนพืชพรรณ ยิ่งเชื่อมต่อกันมาก สัตว์ป่าและเมล็ดพันธุ์ยิ่งเคลื่อนย้ายระหว่างแปลงได้ง่ายขึ้น'},
  {icon:'3',name:'การเข้าถึงพื้นที่น้ำธรรมชาติ',en:'Access to Natural Water',
   desc:'สัดส่วนพื้นที่บกที่อยู่ภายในระยะ 800 เมตรจากแนวชายฝั่งหรือแหล่งน้ำธรรมชาติ สะท้อนโอกาสเข้าถึงองค์ประกอบน้ำในชีวิตประจำวัน'},
  {icon:'4',name:'องค์ประกอบเชิงไบโอฟิลิก',en:'Biophilic Elements',
   desc:'คะแนนจากแบบตรวจสอบภาคสนาม 14 รูปแบบองค์ประกอบไบโอฟิลิกในสิ่งปลูกสร้างและพื้นที่โดยรอบ ให้คะแนน 0–2 ต่อรูปแบบ (สำรวจภาคสนามแยกต่างหาก)'}
];
const fx=(v,d=2)=>Number(v).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
const el=id=>document.getElementById(id);
let D=null,AGG='arith',charts={};

Chart.defaults.font.family='Sarabun, sans-serif';
Chart.defaults.font.size=12.5;
Chart.defaults.color=C.mute;

fetch('data/beqi.json?v=15').then(r=>r.json()).then(d=>{D=d;boot()})
  .catch(e=>document.querySelector('main').innerHTML=
    '<div class="warn">โหลดข้อมูลไม่สำเร็จ — หากเปิดไฟล์โดยตรงจากเครื่อง เบราว์เซอร์จะบล็อกการอ่านไฟล์ JSON '+
    'ให้รันเซิร์ฟเวอร์ในเครื่องด้วยคำสั่ง <code>python3 -m http.server</code> แล้วเปิด http://localhost:8000</div>');

function boot(){
  ctxBar(); nav(); cards(); indCards(); radar(); barBeqi(); cmpTable(); certLevels(); certView();
  el('foot').textContent='ชุดข้อมูล '+D.meta.param_version+' · สร้างเมื่อ '+D.meta.generated+
    ' · ระบบพิกัด '+D.meta.crs;
}
/* ---------- 1) แถบบริบทบังคับ ---------- */
function ctxBar(){
  const p=D.meta.params;
  el('ctx').innerHTML=[
    ['หน่วยวิเคราะห์',D.meta.analysis_unit],
    ['รุ่นพารามิเตอร์',D.meta.param_version],
    ['ความละเอียด',p.scale_m+' ม.'],
    ['ความถูกต้องการจำแนก','ร้อยละ '+fx(D.meta.accuracy.oa*100)+' (Kappa '+fx(D.meta.accuracy.kappa,4)+')']
  ].map(([k,v])=>`<span><b>${k}:</b> ${v}</span>`).join('');
}
function nav(){
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
    document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===b.dataset.t));
    window.scrollTo({top:0,behavior:'smooth'});
  });
}
/* ---------- 2) การ์ดพอร์ตโฟลิโอ — คะแนนรวม + รายตัวชี้วัดเสมอ ---------- */
function cards(){
  el('cards').innerHTML=D.zones.map(z=>`
    <div class="card zone" style="border-top-color:${C.band[z.band]}">
      <div class="zh">
        <div><p class="zn">${z.name_th}</p><p class="zs">${z.sub_th}</p></div>
        <span class="badge">${z.asset}</span>
      </div>
      <p class="score">${fx(z.beqi)}<small> / 100 · ระดับ ${z.band}</small></p>
      <p class="ci">ช่วงความเชื่อมั่น 95% [${fx(z.mc.lo)}, ${fx(z.mc.hi)}] · พื้นที่บก ${fx(z.land_area_km2)} ตร.กม.</p>
      <div class="bars">${z.norm.map((v,i)=>`
        <div class="bar"><div class="bl"><span>${IND[i]}</span><span>${fx(v,3)}</span></div>
        <div class="bt"><div class="bf" style="width:${v*100}%;background:${C.ind[i]}"></div></div></div>`).join('')}
      </div>
    </div>`).join('');
}
/* ---------- ตัวชี้วัดทั้ง 4 ด้านพร้อมคำอธิบาย ---------- */
function indCards(){
  el('indCards').innerHTML=IND_INFO.map((n,i)=>`
    <div class="card indcard">
      <div class="indicon" style="background:${C.ind[i]}">${n.icon}</div>
      <p class="indname">ตัวชี้วัดที่ ${n.icon}<br>${n.name}</p>
      <p class="inden">${n.en}</p>
      <p class="inddesc">${n.desc}</p>
      <p class="indweight">น้ำหนักในคะแนนรวม <b>${fx(D.meta.weights[i]*100,0)}%</b></p>
    </div>`).join('');
}
/* ---------- กราฟ ---------- */
function kill(k){if(charts[k]){charts[k].destroy();delete charts[k]}}
function radar(){
  kill('radar');
  charts.radar=new Chart(el('radar'),{type:'radar',
    data:{labels:IND,datasets:D.zones.map((z,i)=>({label:z.name_th,data:z.norm,
      borderColor:[C.teal,C.sand,C.deep][i],backgroundColor:'transparent',borderWidth:2,pointRadius:4}))},
    options:{scales:{r:{min:0,max:1,ticks:{stepSize:.2,backdropColor:'transparent'},grid:{color:C.line}}},
      plugins:{legend:{position:'bottom'}}}});
}
function barBeqi(){
  kill('bar');
  charts.bar=new Chart(el('barBeqi'),{type:'bar',
    data:{labels:D.zones.map(z=>z.name_th),datasets:[
      {label:'คะแนน BEQI',data:D.zones.map(z=>z.beqi),backgroundColor:D.zones.map(z=>C.band[z.band])},
      {label:'ขอบล่าง 95%',data:D.zones.map(z=>z.mc.lo),type:'line',borderColor:C.mute,
       borderDash:[5,4],pointStyle:'line',fill:false,borderWidth:1.5},
      {label:'ขอบบน 95%',data:D.zones.map(z=>z.mc.hi),type:'line',borderColor:C.mute,
       borderDash:[5,4],pointStyle:'line',fill:false,borderWidth:1.5}]},
    options:{scales:{y:{beginAtZero:true,max:100,grid:{color:C.line}}},plugins:{legend:{position:'bottom'}}}});
  el('mcnote').textContent='จำลองมอนติคาร์โล '+D.meta.mc.nsim.toLocaleString()+' รอบ โดยสุ่มการกระจายพื้นที่จริง'+
    'จากเมทริกซ์ความคลาดเคลื่อน · ลำดับของทั้งสามโซนคงเดิมร้อยละ '+D.meta.mc.rank_prob+' ของการจำลอง';
}
function cmpTable(){
  const g=AGG==='geom';
  el('cmp').innerHTML='<thead><tr><th>ตัวชี้วัด</th>'+
    D.zones.map(z=>`<th class="n">${z.name_th}</th>`).join('')+'</tr></thead><tbody>'+
    IND.map((nm,i)=>`<tr><td>${nm}</td>${D.zones.map(z=>`<td class="n">${fx(z.norm[i],4)}</td>`).join('')}</tr>`).join('')+
    `<tr class="hl"><td>คะแนนรวม (${g?'เรขาคณิต':'เลขคณิต'})</td>`+
    D.zones.map(z=>`<td class="n">${fx(g?z.beqi_geom:z.beqi)}</td>`).join('')+'</tr>'+
    '<tr><td>ส่วนต่างเลขคณิต − เรขาคณิต</td>'+
    D.zones.map(z=>`<td class="n">${fx(z.beqi-z.beqi_geom)}</td>`).join('')+'</tr></tbody>';
  const s=D.zones.map(z=>g?z.beqi_geom:z.beqi), d=Math.abs(s[2]-s[0]);
  el('aggnote').innerHTML=g
    ? 'ค่าเฉลี่ยเรขาคณิตลดการชดเชยระหว่างมิติและลงโทษความไม่สมดุล ส่วนต่างระหว่างโซนใต้กับโซนเหนือ'+
      ' ลดลงเหลือ '+fx(d)+' คะแนน ซึ่งเล็กกว่าส่วนเบี่ยงเบนมาตรฐานจากการจำลอง (0.40–0.44) '+
      'จึงต้องตีความว่าทั้งสองโซนไม่แตกต่างกันอย่างมีนัยสำคัญภายใต้วิธีรวมค่าแบบนี้'
    : 'ค่าเฉลี่ยเลขคณิตยอมให้ตัวชี้วัดชดเชยกันได้เต็มที่ ส่วนต่างระหว่างคะแนนสองวิธีจึงใช้เป็นดัชนี'+
      'ความไม่สมดุลระหว่างมิติได้โดยตรง ยิ่งส่วนต่างมาก ยิ่งเหลื่อมล้ำระหว่างมิติมาก';
}
document.addEventListener('change',e=>{if(e.target.name==='agg'){AGG=e.target.value;cmpTable()}});
/* ---------- การรับรอง ---------- */
/* กฎเดียวกับที่ใช้สร้างชุดข้อมูล: ต้องผ่านทั้งเกณฑ์คะแนนรวมและเกณฑ์ขั้นต่ำรายตัวชี้วัดของระดับนั้น
   หากไม่ผ่าน ให้ไล่ลงระดับถัดไป มิฉะนั้นถือว่าไม่ผ่านการรับรอง */
function certLevel(score,norm){
  const mn=Math.min(...norm);
  for(const r of D.meta.cert_rules) if(score>=r.min_score&&mn>=r.min_ind) return r;
  return {level:'ไม่ผ่านการรับรอง',years:0};
}
function certLevels(){
  el('certLevels').innerHTML=D.meta.cert_rules.map(r=>`
    <div class="card certlevel">
      <p class="certname">BEQI Certified</p>
      <p class="certband">${r.level}</p>
      <div class="kv"><span>คะแนนรวมขั้นต่ำ</span><b>${r.min_score}</b></div>
      <div class="kv"><span>ทุกตัวชี้วัดไม่ต่ำกว่า</span><b>${fx(r.min_ind,2)}</b></div>
      <div class="kv"><span>อายุใบรับรอง</span><b>${r.years} ปี</b></div>
    </div>`).join('');
}
function certView(){
  el('sim').innerHTML=IND.map((n,i)=>`
    <div class="bar"><div class="bl"><span>${n}</span><span id="sv${i}">0.500</span></div>
    <input type="range" min="0" max="1" step="0.001" value="0.5" data-i="${i}" class="simr"></div>`).join('');
  document.querySelectorAll('.simr').forEach(r=>r.oninput=sim);
  sim();
}
function sim(){
  const v=[...document.querySelectorAll('.simr')].map(r=>+r.value);
  v.forEach((x,i)=>el('sv'+i).textContent=fx(x,3));
  const s=v.reduce((a,b)=>a+b,0)/4*100, r=certLevel(s,v), mn=Math.min(...v);
  el('simout').innerHTML=`<div class="kv"><span>คะแนนรวม BEQI</span><b>${fx(s)} / 100</b></div>
    <div class="kv"><span>ตัวชี้วัดต่ำสุด</span><b>${fx(mn,3)}</b></div>
    <div class="kv"><span>ผลการรับรอง</span><b style="color:${r.years?C.teal:'#B5322C'}">${r.level}</b></div>`;
}
