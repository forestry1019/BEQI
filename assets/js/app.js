/* BEQI Portfolio — ต้นแบบแดชบอร์ดตามข้อกำหนดเชิงออกแบบในบทที่ 5
   หลักการบังคับ 3 ข้อ (หัวข้อ 5.3.3)
   1) เปิดเผยบริบท: ทุกหน้าแสดงนิยามหน่วยวิเคราะห์และรุ่นพารามิเตอร์
   2) ห้ามแสดงคะแนนรวมโดยลำพัง: การ์ดทุกใบแสดงคะแนนรายตัวชี้วัดคู่เสมอ (FR4)
   3) แสดงความไม่แน่นอน: คะแนนรวมมาพร้อมช่วงความเชื่อมั่น 95% */
const C={deep:'#0B3D45',teal:'#2A9D8F',sand:'#E9C46A',mute:'#5C7A80',line:'#DCE6E7',
         ind:['#2A9D8F','#0B3D45','#E9C46A','#E76F51'],
         band:{A:'#1a7d32',B:'#2A9D8F',C:'#E9C46A',D:'#E76F51',E:'#B5322C'}};
const IND=['ที่ 1 พื้นที่สีเขียว','ที่ 2 การเชื่อมโยง','ที่ 3 การเข้าถึงน้ำ','ที่ 4 องค์ประกอบไบโอฟิลิก'];
const fx=(v,d=2)=>Number(v).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
const el=id=>document.getElementById(id);
let D=null,SEL='North',AGG='arith',charts={};

Chart.defaults.font.family='Sarabun, sans-serif';
Chart.defaults.font.size=12.5;
Chart.defaults.color=C.mute;

fetch('data/beqi.json').then(r=>r.json()).then(d=>{D=d;boot()})
  .catch(e=>document.querySelector('main').innerHTML=
    '<div class="warn">โหลดข้อมูลไม่สำเร็จ — หากเปิดไฟล์โดยตรงจากเครื่อง เบราว์เซอร์จะบล็อกการอ่านไฟล์ JSON '+
    'ให้รันเซิร์ฟเวอร์ในเครื่องด้วยคำสั่ง <code>python3 -m http.server</code> แล้วเปิด http://localhost:8000</div>');

function boot(){
  ctxBar(); nav(); cards(); radar(); barBeqi(); cmpTable();
  zoneSel(); zoneDetail(); mapInit(); gapView(); certView(); qualityView(); methodView();
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
    if(b.dataset.t==='map'&&charts.map) setTimeout(()=>charts.map.invalidateSize(),80);
  });
}
/* ---------- 2) การ์ดพอร์ตโฟลิโอ — คะแนนรวม + รายตัวชี้วัดเสมอ ---------- */
function cards(){
  el('cards').innerHTML=D.zones.map(z=>`
    <div class="card zone ${z.id===SEL?'sel':''}" data-z="${z.id}" style="border-top-color:${C.band[z.band]}">
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
      <p class="ci" style="margin:12px 0 0">สถานะการรับรอง: <b style="color:${z.cert_years?C.band[z.band]:'#B5322C'}">${z.cert}</b></p>
    </div>`).join('');
  document.querySelectorAll('.zone').forEach(c=>c.onclick=()=>{
    SEL=c.dataset.z; cards(); zoneSel(); zoneDetail();
    document.querySelector('nav button[data-t="zone"]').click();
  });
  el('fr4note').innerHTML='<b>ข้อกำหนด FR4:</b> ระบบไม่แสดงคะแนนรวมโดยลำพัง เนื่องจากตัวชี้วัดที่ 2 '+
    'ให้ลำดับสวนทางกับตัวชี้วัดอื่นในทุกโซน การอ่านเฉพาะคะแนนรวมจะปิดบังจุดอ่อนเชิงโครงสร้างนี้';
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
/* ---------- รายละเอียดรายโซน ---------- */
function zoneSel(){
  el('zsel').innerHTML=D.zones.map(z=>
    `<label><input type="radio" name="zs" value="${z.id}" ${z.id===SEL?'checked':''}> ${z.name_th}</label>`).join('');
  document.querySelectorAll('input[name=zs]').forEach(r=>r.onchange=()=>{SEL=r.value;cards();zoneDetail()});
}
function kv(rows){return rows.map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}
function zoneDetail(){
  const z=D.zones.find(x=>x.id===SEL),d=z.detail,p=D.meta.params;
  el('d1').innerHTML=kv([['ค่าดิบ สัดส่วนพื้นที่สีเขียว',fx(z.raw.green_pct)+' %'],
    ['ค่ามาตรฐาน n₁',fx(z.norm[0],4)],['พื้นที่สีเขียว',fx(d.green_km2)+' ตร.กม.'],
    ['ค่าเฉลี่ย NDVI บนพื้นที่บก',fx(d.ndvi_mean,3)+' ± '+fx(d.ndvi_sd,3)],
    ['เกณฑ์จุดภาพสีเขียว','NDVI ≥ '+p.ndvi_threshold]]);
  el('d2').innerHTML=kv([['ค่าดิบ ดัชนี PC',fx(z.raw.pc,4)],['ค่ามาตรฐาน n₂',fx(z.norm[1],4)],
    ['พื้นที่เชื่อมโยงเทียบเท่า ECA',fx(d.eca_ha)+' เฮกตาร์'],
    ['พื้นที่แกนกลางรวม',fx(d.core_ha)+' เฮกตาร์'],
    ['จำนวนแปลงแกนกลาง',d.core_patches+' แปลง'],
    ['แปลงที่ใหญ่ที่สุด',fx(d.largest_patch_ha)+' เฮกตาร์'],
    ['สัดส่วนแกนกลาง / มิใช่แกนกลาง / เกาะ',fx(d.mspa.core)+' / '+fx(d.mspa.noncore)+' / '+fx(d.mspa.islet)+' %']]);
  el('d3').innerHTML=kv([['ค่าดิบ สัดส่วนในรัศมี 800 ม.',fx(z.raw.buffer800_pct)+' %'],
    ['ค่ามาตรฐาน n₃',fx(z.norm[2],4)],
    ['พื้นที่ในรัศมี 400 ม.',fx(d.buffer400_km2)+' ตร.กม. ('+fx(d.buffer400_pct)+' %)'],
    ['พื้นที่ในรัศมี 800 ม.',fx(d.buffer800_km2)+' ตร.กม.'],
    ['จุดเข้าถึงชายฝั่ง',d.access_points+' จุด ('+fx(d.access_density)+' จุด/ตร.กม.)']]);
  el('d4').innerHTML=kv([['ค่าดิบ คะแนนแบบตรวจสอบ',z.raw.checklist+' / 28'],
    ['ค่ามาตรฐาน n₄',fx(z.norm[3],4)],
    ['จำนวนสิ่งปลูกสร้าง',d.buildings.toLocaleString()+' หลัง'],
    ['ความหนาแน่นสิ่งปลูกสร้าง',fx(d.bld_density)+' หลัง/ตร.กม.'],
    ['วิธีเก็บข้อมูล','สำรวจภาคสนาม 3 ขั้น (ภาพความละเอียดสูง → แบบตรวจสอบ → UAV)']]);
  kill('lulc');
  charts.lulc=new Chart(el('lulc'),{type:'bar',
    data:{labels:['ป่าไม้','ไม้พุ่ม/หญ้า','สิ่งปลูกสร้าง','เปิดโล่ง/ทราย'],
      datasets:[{data:d.lulc,backgroundColor:['#1a7d32','#a3d977','#d7191c','#f6e8b1']}]},
    options:{indexAxis:'y',scales:{x:{max:100,grid:{color:C.line}}},plugins:{legend:{display:false}}}});
  kill('chk');
  charts.chk=new Chart(el('chk'),{type:'bar',
    data:{labels:D.meta.patterns.map(p=>p[0]),
      datasets:[{data:z.checklist,backgroundColor:z.checklist.map(v=>['#E76F51','#E9C46A','#2A9D8F'][v])}]},
    options:{scales:{y:{max:2,ticks:{stepSize:1},grid:{color:C.line}}},
      plugins:{legend:{display:false},tooltip:{callbacks:{title:c=>D.meta.patterns[c[0].dataIndex][1]}}}}});
}
/* ---------- แผนที่ ---------- */
function mapInit(){
  charts.map=L.map('map').setView([8.63,98.26],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(charts.map);
  D.zones.forEach((z,i)=>{
    const b=z.bbox,col=[C.teal,C.sand,C.deep][i];
    L.rectangle([[b[1],b[0]],[b[3],b[2]]],{color:col,weight:2,fillOpacity:.12})
      .bindPopup(`<b>${z.name_th}</b><br>${z.sub_th}<br>BEQI ${fx(z.beqi)} · ระดับ ${z.band}<br>
        พื้นที่บก ${fx(z.land_area_km2)} ตร.กม.<br>การรับรอง ${z.cert}`).addTo(charts.map);
  });
  el('mapnote').textContent='ขอบเขตที่แสดงเป็นกรอบสำรวจ (bounding box) ในระบบพิกัด WGS84 · '+
    'หน่วยวิเคราะห์ที่ใช้คำนวณค่าดัชนีคือแถบพื้นที่บกกว้าง 1 กิโลเมตรจากแนวน้ำภายในกรอบนี้ '+
    'ซึ่งมีขอบเขตตามรูปทรงชายฝั่งจริง มิใช่รูปสี่เหลี่ยม';
}
/* ---------- ช่องว่างและลำดับความสำคัญ ---------- */
function gapView(){
  kill('gapc');
  charts.gapc=new Chart(el('gapc'),{type:'bar',
    data:{labels:D.zones.map(z=>z.name_th),
      datasets:IND.map((nm,i)=>({label:nm,data:D.zones.map(z=>z.gap.per[i]),backgroundColor:C.ind[i]}))},
    options:{scales:{x:{stacked:true},y:{stacked:true,grid:{color:C.line}}},plugins:{legend:{position:'bottom'}}}});
  kill('prio');
  charts.prio=new Chart(el('prio'),{type:'doughnut',
    data:{labels:D.zones.map(z=>z.name_th),datasets:[{data:D.zones.map(z=>z.gap.share),
      backgroundColor:[C.teal,C.sand,C.deep]}]},options:{plugins:{legend:{position:'bottom'}}}});
  el('gapt').innerHTML='<thead><tr><th>โซน</th>'+IND.map(n=>`<th class="n">${n}</th>`).join('')+
    '<th class="n">ช่องว่างรวม</th><th class="n">พื้นที่บก</th><th class="n">ดัชนีความสำคัญ</th><th class="n">สัดส่วนงบ</th></tr></thead><tbody>'+
    D.zones.map(z=>`<tr><td>${z.name_th}</td>${z.gap.per.map(v=>`<td class="n">${fx(v,4)}</td>`).join('')}
      <td class="n">${fx(z.gap.sum,4)}</td><td class="n">${fx(z.land_area_km2)}</td>
      <td class="n">${fx(z.gap.priority,3)}</td><td class="n">${fx(z.gap.share,1)} %</td></tr>`).join('')+'</tbody>';
  el('gapnote').innerHTML='<b>ข้อค้นพบเชิงนโยบาย:</b> ทั้งสามโซนมีจุดอ่อนร่วมกันที่ตัวชี้วัดที่ 2 '+
    'การลงทุนที่ให้ผลตอบแทนต่อคะแนนสูงที่สุดจึงเป็นการเชื่อมผืนพืชพรรณที่ถูกตัดขาดให้ต่อเนื่องกัน '+
    'มากกว่าการเพิ่มพื้นที่สีเขียวใหม่ในแปลงที่แยกส่วนอยู่แล้ว';
}
/* ---------- การรับรอง ---------- */
/* กฎเดียวกับที่ใช้สร้างชุดข้อมูล: ต้องผ่านทั้งเกณฑ์คะแนนรวมและเกณฑ์ขั้นต่ำรายตัวชี้วัดของระดับนั้น
   หากไม่ผ่าน ให้ไล่ลงระดับถัดไป มิฉะนั้นถือว่าไม่ผ่านการรับรอง */
function certLevel(score,norm){
  const mn=Math.min(...norm);
  for(const r of D.meta.cert_rules) if(score>=r.min_score&&mn>=r.min_ind) return r;
  return {level:'ไม่ผ่านการรับรอง',years:0};
}
function certView(){
  el('rules').innerHTML='<thead><tr><th>ระดับ</th><th class="n">คะแนนรวมขั้นต่ำ</th>'+
    '<th class="n">ทุกตัวชี้วัดไม่ต่ำกว่า</th><th class="n">อายุใบรับรอง</th></tr></thead><tbody>'+
    D.meta.cert_rules.map(r=>`<tr><td>BEQI Certified — ${r.level}</td><td class="n">${r.min_score}</td>
      <td class="n">${fx(r.min_ind,2)}</td><td class="n">${r.years} ปี</td></tr>`).join('')+
    '<tr><td>ไม่ผ่านการรับรอง</td><td class="n">ต่ำกว่า 60</td><td class="n">—</td><td class="n">ยื่นใหม่ได้หลัง 12 เดือน</td></tr></tbody>';
  el('certt').innerHTML='<thead><tr><th>โซน</th><th class="n">คะแนนรวม</th><th class="n">ตัวชี้วัดต่ำสุด</th>'+
    '<th>ระดับตามคะแนน</th><th>ผลหลังใช้เงื่อนไขขั้นต่ำ</th></tr></thead><tbody>'+
    D.zones.map(z=>{const mn=Math.min(...z.norm);
      const byScore=D.meta.cert_rules.find(r=>z.beqi>=r.min_score);
      return `<tr><td>${z.name_th}</td><td class="n">${fx(z.beqi)}</td><td class="n">${fx(mn,4)}</td>
        <td>${byScore?byScore.level:'ไม่ผ่าน'}</td>
        <td><b style="color:${z.cert_years?C.band[z.band]:'#B5322C'}">${z.cert}</b></td></tr>`}).join('')+'</tbody>';
  el('certnote').innerHTML='<b>ผลของเงื่อนไขขั้นต่ำรายตัวชี้วัด:</b> เมื่อใช้เกณฑ์นี้กับข้อมูลจริง '+
    'มีเพียงโซนเหนือที่ผ่านการรับรอง (ระดับ Silver) ส่วนโซนกลางและโซนใต้ไม่ผ่าน '+
    'แม้โซนใต้จะมีคะแนนรวมสูงที่สุด 80.12 เนื่องจากตัวชี้วัดที่ 2 อยู่ที่ 0.3158 ซึ่งต่ำกว่าเกณฑ์ขั้นต่ำทุกระดับ '+
    '<br><br><b>ข้อควรพิจารณา:</b> ค่าตัวชี้วัดที่ 2 ที่ต่ำในทุกโซนส่วนหนึ่งเป็นผลจากการที่หน่วยวิเคราะห์ '+
    'เป็นแถบชายฝั่งกว้าง 1 กิโลเมตร ซึ่งตัดผืนพืชพรรณที่ทอดลึกเข้าแผ่นดินออก (ดูหัวข้อ 4.2.2) '+
    'มิใช่สภาพนิเวศที่แท้จริงทั้งหมด เกณฑ์ขั้นต่ำของตัวชี้วัดนี้จึงควรผ่านการทบทวนด้วยข้อมูล'+
    'จากพื้นที่ที่หลากหลายกว่านี้ก่อนนำไปใช้ตัดสินจริง';
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
/* ---------- คุณภาพข้อมูล ---------- */
function qualityView(){
  const a=D.meta.accuracy;
  el('accCards').innerHTML=[['ความถูกต้องโดยรวม','ร้อยละ '+fx(a.oa*100)],
    ['สัมประสิทธิ์แคปปา',fx(a.kappa,4)],['จุดตัวอย่างตรวจสอบอิสระ',a.n_valid.toLocaleString()+' จุด']]
    .map(([k,v])=>`<div class="card" style="text-align:center">
      <p style="font-size:30px;font-weight:700;color:${C.teal};margin:4px 0">${v}</p>
      <p style="margin:0;color:${C.mute};font-size:14px">${k}</p></div>`).join('');
  const cm=a.cm;
  el('cmt').innerHTML='<thead><tr><th>อ้างอิง \\ จำแนก</th>'+a.classes.map((_,j)=>`<th class="n">${j+1}</th>`).join('')+
    '<th class="n">ผู้ผลิต</th></tr></thead><tbody>'+
    a.classes.map((c,i)=>`<tr><td>${i+1}. ${c}</td>`+
      a.classes.map((_,j)=>`<td class="n${i===j?' hl':''}">${cm[i*5+j]}</td>`).join('')+
      `<td class="n">${fx(a.producers[i]*100)} %</td></tr>`).join('')+
    '<tr><td><b>ผู้ใช้</b></td>'+a.consumers.map(v=>`<td class="n">${fx(v*100)} %</td>`).join('')+'<td class="n">—</td></tr></tbody>';
  const S=D.meta.sensitivity,names={'W1 equal weights (arithmetic)':'น้ำหนักเท่ากัน เลขคณิต (กรณีฐาน)',
    'W2 equal weights (geometric)':'น้ำหนักเท่ากัน เรขาคณิต',
    'W3 ecological emphasis .35/.35/.15/.15':'เน้นมิตินิเวศ',
    'W4 experiential emphasis .15/.15/.35/.35':'เน้นมิติประสบการณ์',
    'W5 excluding indicator 2':'ตัดตัวชี้วัดที่ 2 ออก','W6 excluding indicator 4':'ตัดตัวชี้วัดที่ 4 ออก'};
  el('senst').innerHTML='<thead><tr><th>สถานการณ์</th>'+D.zones.map(z=>`<th class="n">${z.name_th}</th>`).join('')+
    '</tr></thead><tbody>'+Object.keys(S).map(k=>`<tr><td>${names[k]||k}</td>`+
      D.zones.map(z=>`<td class="n">${fx(S[k].score[z.id])} <span style="color:${C.mute}">(${S[k].rank[z.id]})</span></td>`).join('')+
      '</tr>').join('')+'</tbody>';
  el('sensnote').textContent='ตัวเลขในวงเล็บคืออันดับ · ลำดับของทั้งสามโซนคงที่ในทุกสถานการณ์ '+
    'แต่ขนาดของช่องว่างเปลี่ยนแปลงตามวิธีรวมค่าอย่างมีนัยสำคัญ';
}
/* ---------- ระเบียบวิธี ---------- */
function methodView(){
  const p=D.meta.params;
  el('params').innerHTML=kv([['คอลเลกชันภาพ',p.collection],['ระวาง MGRS',p.tile],
    ['จำนวนภาพ Sentinel-2',p.n_scenes+' ภาพ'],['จำนวนภาพ Sentinel-1',p.s1_scenes+' ภาพ'],
    ['เกณฑ์กรองเมฆระดับภาพ','ไม่เกินร้อยละ '+p.cloud_filter_pct],
    ['เมฆเฉลี่ยของภาพที่ใช้','ร้อยละ '+fx(p.mean_cloud_pct)],
    ['เกณฑ์ Cloud Score+','≥ '+fx(p.cloud_score_plus,2)],
    ['ความละเอียดหลัก / สัณฐาน / ระยะทาง',p.scale_m+' / '+p.mspa_scale_m+' / '+p.buffer_scale_m+' ม.'],
    ['เกณฑ์ NDVI พื้นที่สีเขียว','≥ '+p.ndvi_threshold],
    ['ระยะกำหนดของ PC',p.pc_distance_m+' ม. (p = 0.5)'],
    ['ความกว้างขอบ MSPA',p.edge_width_m+' ม.'],['แปลงแกนกลางขั้นต่ำ',p.min_patch_ha+' เฮกตาร์'],
    ['อัลกอริทึมจำแนก','Random Forest '+D.meta.accuracy.trees+' ต้น, '+D.meta.accuracy.predictors+' ตัวแปร']]);
  el('anch').innerHTML='<thead><tr><th>ตัวชี้วัด</th><th>ค่าดิบ</th><th class="n">ช่วงอ้างอิง</th><th class="n">น้ำหนัก</th></tr></thead><tbody>'+
    D.meta.anchors.map((a,i)=>`<tr><td>ที่ ${a.id} ${a.name}</td><td>${a.raw}</td>
      <td class="n">${a.min}–${a.max} ${a.unit}</td><td class="n">${fx(D.meta.weights[i],2)}</td></tr>`).join('')+'</tbody>';
  el('lims').innerHTML=D.meta.limitations.map(t=>`<li>${t}</li>`).join('');
}
