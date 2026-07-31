/* แท็บ "จุดสำรวจ (ทดลอง)" — คำนวณ BEQI แบบสดจากจุดที่ผู้ใช้เลือกบนแผนที่ ผ่าน Google Earth Engine
   ใช้พารามิเตอร์ชุดเดียวกับต้นแบบ (data/beqi.json > meta.params / meta.anchors / meta.weights / meta.cert_rules)
   ข้อจำกัดเชิงระเบียบวิธีเทียบกับต้นแบบแสดงไว้ในกล่องเตือนบนหน้าเว็บแล้ว ดูรายละเอียดเพิ่มเติมได้ที่นั่น */
(function(){
const AOI=[ // ขอบเขตเดียวกับที่ใช้สร้าง data/beqi.json (zones[].bbox)
  {name:'แหลมปะการัง – หาดคึกคัก', bbox:[98.21,8.66,98.28,8.76]},
  {name:'หาดบางเนียง – หาดนางทอง', bbox:[98.22,8.61,98.28,8.67]},
  {name:'อุทยานแห่งชาติเขาหลัก–ลำรู่', bbox:[98.21,8.50,98.31,8.61]}
];
const IND=['ที่ 1 พื้นที่สีเขียว','ที่ 2 การเชื่อมโยง (โดยประมาณ)','ที่ 3 การเข้าถึงน้ำ','ที่ 4 องค์ประกอบไบโอฟิลิก'];
const BAR_COL=['#2A9D8F','#0B3D45','#E9C46A','#E76F51'];
const BAND_COL={A:'#1a7d32',B:'#2A9D8F',C:'#E9C46A',D:'#E76F51',E:'#B5322C'};
const el=id=>document.getElementById(id);
const fx=(v,d=2)=>Number(v).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
const clamp01=v=>Math.min(Math.max(v,0),1);

let meta=null, map=null, marker=null, picked=null, ready=false;

fetch('data/beqi.json').then(r=>r.json()).then(d=>{meta=d.meta; boot()})
  .catch(()=>{el('surveyMapNote').textContent='โหลดพารามิเตอร์ไม่สำเร็จ';});

function boot(){
  initMap();
  initChecklist();
  initAuthUI();
  document.querySelector('nav button[data-t="survey"]').addEventListener('click',()=>{
    setTimeout(()=>{if(map) map.invalidateSize();},80);
  });
}

function insideAOI(lat,lng){
  return AOI.some(z=>{const b=z.bbox; return lng>=b[0]&&lng<=b[2]&&lat>=b[1]&&lat<=b[3];});
}

function initMap(){
  map=L.map('surveyMap').setView([8.63,98.26],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
  AOI.forEach(z=>{const b=z.bbox;
    L.rectangle([[b[1],b[0]],[b[3],b[2]]],
      {color:'#2A9D8F',weight:1.5,fillOpacity:.06,dashArray:'4,4'}).bindTooltip(z.name).addTo(map);
  });
  map.on('click',e=>{
    const {lat,lng}=e.latlng;
    if(!insideAOI(lat,lng)){
      el('surveyMapNote').innerHTML='<b>จุดนี้อยู่นอกขอบเขตพื้นที่ศึกษา</b> กรุณาคลิกภายในกรอบเส้นประ';
      return;
    }
    picked={lat,lng};
    if(marker) map.removeLayer(marker);
    marker=L.marker([lat,lng]).addTo(map);
    el('surveyResultCard').hidden=true;
    el('surveyMapNote').innerHTML='พิกัดที่เลือก: '+fx(lat,5)+', '+fx(lng,5)+' &nbsp; '+
      '<button id="runBtn" class="btn" '+(ready?'':'disabled')+'>คำนวณ BEQI ที่จุดนี้</button>'+
      (ready?'':' <span class="note" style="margin:0">(ต้องเชื่อมต่อ Earth Engine ก่อน)</span>');
    el('runBtn').onclick=runAnalysis;
  });
  el('surveyMapNote').textContent='คลิกภายในกรอบเส้นประเพื่อเลือกจุดสำรวจ';
}

function initChecklist(){
  el('surveyChecklist').innerHTML=meta.patterns.map((p,i)=>`
    <div class="chkrow"><span>${p[0]}. ${p[1]}</span>
      <div class="ctl">
        <label><input type="radio" name="cf${i}" value="0" checked> 0</label>
        <label><input type="radio" name="cf${i}" value="1"> 1</label>
        <label><input type="radio" name="cf${i}" value="2"> 2</label>
      </div></div>`).join('');
}
function checklistScore(){
  return meta.patterns.reduce((s,_,i)=>{
    const r=document.querySelector(`input[name=cf${i}]:checked`);
    return s+(r?+r.value:0);
  },0);
}

function initAuthUI(){
  const box=el('geeAuthBox');
  if(typeof ee==='undefined'){
    box.innerHTML='<b>โหลดไลบรารี Earth Engine ไม่สำเร็จ</b> ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรชหน้านี้';
    return;
  }
  if(!GEE_CONFIG||!GEE_CONFIG.clientId||GEE_CONFIG.clientId.indexOf('YOUR_')===0){
    box.innerHTML='<b>ยังไม่ได้ตั้งค่า Google Earth Engine</b><br>'+
      'แก้ไขไฟล์ <code>assets/js/gee-config.js</code> ใส่ OAuth Client ID และ Cloud Project ID ก่อนใช้งานแท็บนี้ '+
      '(ดูขั้นตอนใน README.md)';
    return;
  }
  box.innerHTML='<button id="geeLogin" class="btn">เชื่อมต่อบัญชี Google Earth Engine</button> '+
    '<span class="note" id="geeStatus" style="margin:0 0 0 10px">ยังไม่ได้เชื่อมต่อ</span>';
  el('geeLogin').onclick=()=>{
    el('geeStatus').textContent='กำลังเชื่อมต่อ…';
    ee.data.authenticateViaOauth(GEE_CONFIG.clientId, onAuthed, onAuthErr,
      ['https://www.googleapis.com/auth/earthengine.readonly'], null, true);
  };
}
function onAuthed(){
  ee.initialize(null,null,()=>{
    ready=true;
    el('geeStatus').textContent='เชื่อมต่อสำเร็จ พร้อมคำนวณ';
    const rb=el('runBtn'); if(rb) rb.disabled=false;
  }, onAuthErr, null, GEE_CONFIG.cloudProject);
}
function onAuthErr(e){
  el('geeStatus').textContent='เชื่อมต่อไม่สำเร็จ: '+e;
}

function bandFromScore(s){if(s>=80)return 'A';if(s>=70)return 'B';if(s>=60)return 'C';if(s>=50)return 'D';return 'E';}
function certLevel(score,norm){
  const mn=Math.min(...norm);
  for(const r of meta.cert_rules) if(score>=r.min_score&&mn>=r.min_ind) return r;
  return {level:'ไม่ผ่านการรับรอง',years:0};
}

function runAnalysis(){
  if(!picked||!ready) return;
  el('surveyResultCard').hidden=false;
  el('surveyResult').innerHTML='<p>กำลังประมวลผลบน Google Earth Engine…</p>';
  const {lat,lng}=picked, p=meta.params;
  const pt=ee.Geometry.Point([lng,lat]);
  const buf=pt.buffer(p.pc_distance_m);

  const s2=ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2024-01-14','2025-12-24').filterBounds(buf)
    .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE',p.cloud_filter_pct)).median();
  const ndvi=s2.normalizedDifference(['B8','B4']).rename('ndvi');
  const wc=ee.ImageCollection('ESA/WorldCover/v200').first().select('Map');
  const land=wc.neq(80).rename('land');
  const water=wc.eq(80).rename('water');
  const greenLand=ndvi.gte(p.ndvi_threshold).and(land).rename('green');

  const ind1=greenLand.updateMask(land).reduceRegion(
    {reducer:ee.Reducer.mean(),geometry:buf,scale:p.scale_m,maxPixels:1e9,bestEffort:true});

  const patch=greenLand.selfMask().connectedPixelCount({maxSize:256,eightConnected:true});
  const ind2=patch.reduceRegion(
    {reducer:ee.Reducer.first(),geometry:pt,scale:p.scale_m,maxPixels:1e9});

  const dist=water.fastDistanceTransform(256).sqrt().multiply(p.scale_m);
  const within=dist.lte(800).rename('w800');
  const ind3=within.updateMask(land).reduceRegion(
    {reducer:ee.Reducer.mean(),geometry:buf,scale:p.scale_m,maxPixels:1e9,bestEffort:true});

  const combined=ee.Dictionary({g:ind1.get('green'),p:ind2.get('green'),w:ind3.get('w800')});
  combined.evaluate((r,err)=>{
    if(err){el('surveyResult').innerHTML='<div class="warn">คำนวณไม่สำเร็จ: '+err+'</div>';return;}
    renderResult(r);
  });
}

function renderResult(r){
  const green=(r.g||0)*100, pc=clamp01((r.p||0)/256), w800=(r.w||0)*100, ind4raw=checklistScore();
  const norm=[clamp01(green/100),pc,clamp01(w800/100),clamp01(ind4raw/28)];
  const beqi=norm.reduce((a,b)=>a+b,0)/4*100;
  const band=bandFromScore(beqi), cert=certLevel(beqi,norm);
  el('surveyResult').innerHTML=`
    <p class="score">${fx(beqi)}<small> / 100 · ระดับ ${band}</small></p>
    <div class="bars">${norm.map((v,i)=>`
      <div class="bar"><div class="bl"><span>${IND[i]}</span><span>${fx(v,3)}</span></div>
      <div class="bt"><div class="bf" style="width:${v*100}%;background:${BAR_COL[i]}"></div></div></div>`).join('')}
    </div>
    <p class="ci" style="margin:12px 0 0">สถานะการรับรอง: <b style="color:${cert.years?BAND_COL[band]:'#B5322C'}">${cert.level}</b></p>
    <div class="kv"><span>ค่าดิบ ความหนาแน่นพื้นที่สีเขียว (NDVI ≥ ${p_ndvi()})</span><b>${fx(green)} %</b></div>
    <div class="kv"><span>ค่าดิบ ตัวแทนดัชนีการเชื่อมโยง (proxy)</span><b>${fx(pc,4)}</b></div>
    <div class="kv"><span>ค่าดิบ พื้นที่ในรัศมี 800 ม. จากแหล่งน้ำ</span><b>${fx(w800)} %</b></div>
    <div class="kv"><span>ค่าดิบ คะแนนแบบตรวจสอบ</span><b>${ind4raw} / 28</b></div>
    <div class="kv"><span>พิกัด</span><b>${fx(picked.lat,5)}, ${fx(picked.lng,5)}</b></div>
    <div class="kv"><span>รัศมีวิเคราะห์รอบจุด</span><b>${meta.params.pc_distance_m} ม.</b></div>
    <div class="kv"><span>รุ่นพารามิเตอร์</span><b>${meta.param_version}</b></div>`;
}
function p_ndvi(){return meta.params.ndvi_threshold;}
})();
