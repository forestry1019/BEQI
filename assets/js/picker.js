/* แท็บแรกของเว็บ "วาดขอบเขตแปลงที่ดิน" — ผู้ใช้คลิกไล่ตามขอบเขตแปลงที่ดินจริงทีละจุด (waypoint)
   เพื่อสร้างรูปหลายเหลี่ยม แล้วคำนวณตัวชี้วัดที่ 1–3 สดจากภาพดาวเทียมเฉพาะภายในรูปทรงนั้นผ่าน Google Earth Engine
   (client-side, ไม่ต้องมี backend) โดยใช้พารามิเตอร์ชุดเดียวกับต้นแบบ
   (meta.params ใน data/beqi.json)

   เดิมแท็บนี้ใช้วงกลมรัศมีคงที่รอบจุดที่คลิก ซึ่งไม่สะท้อนรูปทรงแปลงที่ดินจริงที่มีทั้งแคบและกว้าง
   จึงเปลี่ยนมาใช้รูปหลายเหลี่ยมที่ผู้ใช้วาดเองเป็นขอบเขตวิเคราะห์โดยตรง

   ตัวชี้วัดที่ 4 (องค์ประกอบไบโอฟิลิก) ไม่ได้กรอกในหน้านี้ — มาจากระบบสำรวจภาคสนาม (backend) แยกต่างหาก
   คะแนนที่แสดงจึงเป็นค่าเฉลี่ยจาก 3 ตัวชี้วัดที่มีข้อมูลเท่านั้น ยังไม่ใช่ค่า BEQI ฉบับสมบูรณ์
   และยังสรุปสถานะการรับรองไม่ได้จนกว่าจะเชื่อมข้อมูลตัวชี้วัดที่ 4 เข้ามา */
(function(){
const AOI_COL=['#2A9D8F','#E9C46A','#0B3D45']; // สีอ้างอิง 3 โซนหลัก — แสดงเป็นบริบทบนแผนที่เท่านั้น ไม่ใช่ข้อจำกัดของรูปที่วาด
const IND=['ที่ 1 พื้นที่สีเขียว','ที่ 2 การเชื่อมโยง (โดยประมาณ)','ที่ 3 การเข้าถึงน้ำ'];
const BAR_COL=['#2A9D8F','#0B3D45','#E9C46A'];
const el=id=>document.getElementById(id);
const fx=(v,d=2)=>Number(v).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
const clamp01=v=>Math.min(Math.max(v,0),1);

let meta=null, zones=null, map=null, ready=false;
let verts=[], vmarkers=[], polyline=null, polygon=null, closed=false;

fetch('data/beqi.json').then(r=>r.json()).then(d=>{meta=d.meta; zones=d.zones; boot()})
  .catch(()=>{el('pickerMapNote').textContent='โหลดพารามิเตอร์ไม่สำเร็จ';});

function boot(){
  initMap();
  initAuthUI();
  wireButtons();
  document.querySelector('nav button[data-t="picker"]').addEventListener('click',()=>{
    setTimeout(()=>{if(map) map.invalidateSize();},80);
  });
}

function initMap(){
  map=L.map('pickerMap').setView([8.63,98.26],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
  zones.forEach((z,i)=>{
    const latlngs=z.boundary.map(([lon,lat])=>[lat,lon]);
    L.polygon(latlngs,
      {color:AOI_COL[i],weight:1.5,fillOpacity:.05,dashArray:'4,4'})
      .bindTooltip(z.name_th+' — '+z.sub_th).addTo(map);
  });
  map.on('click',e=>{
    if(closed) return;
    addVertex(e.latlng);
  });
  statusNote();
}

function addVertex(ll){
  verts.push(ll);
  const m=L.circleMarker(ll,{radius:8,color:'#0B3D45',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(map);
  // คลิกจุดแรกซ้ำเพื่อปิดรูปได้ทันที (พฤติกรรมมาตรฐานของเครื่องมือวาดรูปหลายเหลี่ยม)
  if(verts.length===1) m.on('click',()=>{ if(!closed) closePolygon(); });
  vmarkers.push(m);
  if(polyline) map.removeLayer(polyline);
  polyline=L.polyline(verts,{color:'#0B3D45',weight:2,dashArray:'5,5'}).addTo(map);
  refreshButtons();
  statusNote();
}

function undoVertex(){
  if(closed||!verts.length) return;
  verts.pop();
  map.removeLayer(vmarkers.pop());
  if(polyline){map.removeLayer(polyline);polyline=null;}
  if(verts.length) polyline=L.polyline(verts,{color:'#0B3D45',weight:2,dashArray:'5,5'}).addTo(map);
  refreshButtons();
  statusNote();
}

function closePolygon(){
  if(closed||verts.length<3) return;
  closed=true;
  if(polyline){map.removeLayer(polyline);polyline=null;}
  polygon=L.polygon(verts,{color:'#0B3D45',weight:2,fillColor:'#2A9D8F',fillOpacity:.18}).addTo(map);
  refreshButtons();
  statusNote();
}

function clearAll(){
  vmarkers.forEach(m=>map.removeLayer(m)); vmarkers=[];
  if(polyline){map.removeLayer(polyline);polyline=null;}
  if(polygon){map.removeLayer(polygon);polygon=null;}
  verts=[]; closed=false;
  el('pickerResultCard').hidden=true;
  refreshButtons();
  statusNote();
}

function wireButtons(){
  el('undoBtn').onclick=undoVertex;
  el('closeBtn').onclick=closePolygon;
  el('clearBtn').onclick=clearAll;
  el('runBtn').onclick=runAnalysis;
  refreshButtons();
}
function refreshButtons(){
  el('undoBtn').disabled=closed||!verts.length;
  el('closeBtn').disabled=closed||verts.length<3;
  el('runBtn').disabled=!closed||!ready;
}
function statusNote(){
  if(closed){
    el('pickerMapNote').innerHTML='ปิดรูปแล้ว ('+verts.length+' จุดขอบเขต) — กด "คำนวณ BEQI" ด้านล่าง'+
      (ready?'':' <span class="note" style="margin:0">(ต้องเชื่อมต่อ Earth Engine ก่อน)</span>');
  }else if(verts.length){
    el('pickerMapNote').textContent='วางแล้ว '+verts.length+' จุด — คลิกต่อเพื่อเพิ่มจุด, คลิกจุดแรกซ้ำ หรือกด "ปิดรูปหลายเหลี่ยม" เมื่อครบ (อย่างน้อย 3 จุด)';
  }else{
    el('pickerMapNote').textContent='คลิกไล่ตามขอบเขตแปลงที่ดินทีละจุด (waypoint) เพื่อเริ่มวาดรูปหลายเหลี่ยม';
  }
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
  if(location.protocol==='file:'){
    box.innerHTML='<b>เปิดไฟล์โดยตรงอยู่ (file://) — เชื่อมต่อ Earth Engine ไม่ได้</b><br>'+
      'OAuth Client ID อนุญาตเฉพาะโดเมนที่ลงทะเบียนไว้ล่วงหน้า (เช่น http://localhost:8000 หรือ '+
      'https://forestry1019.github.io) การเปิดไฟล์ตรง ๆ ผ่าน file:// จะเชื่อมต่อไม่ได้เสมอ '+
      'ให้รันเซิร์ฟเวอร์ในเครื่องก่อนด้วยคำสั่ง <code>python3 -m http.server 8000</code> แล้วเปิด '+
      'http://localhost:8000 (ดูหัวข้อ "การใช้งาน" ใน README.md)';
    return;
  }
  // ขั้นที่ 1: เรียก authenticateViaOauth เพื่อ "ลงทะเบียน" client ID ไว้กับไลบรารี (จำเป็นสำหรับ
  // authenticateViaPopup ในขั้นที่ 2) และลองตรวจสอบเซสชันเดิมแบบเงียบไปพร้อมกัน
  // ข้อควรระวัง: การตรวจสอบแบบเงียบใช้ iframe ข้ามโดเมน ซึ่งเบราว์เซอร์ที่บล็อก third-party cookies
  // อาจทำให้ค้างเงียบตลอดไปไม่เรียก callback ฝั่งใดเลย (พบปัญหานี้จริงระหว่างทดสอบ)
  // จึงตั้งเวลาสำรองไว้ — ถ้าผ่านไป 4 วินาทีแล้วยังไม่มี callback ใดทำงาน ให้บังคับแสดงปุ่มเชื่อมต่อไปเลย
  let authSettled=false;
  const fallback=setTimeout(()=>{ if(!authSettled) showLoginButton(); },4000);
  const onImmediateFailed=()=>{ authSettled=true; clearTimeout(fallback); showLoginButton(); };
  const onImmediateAuthed=()=>{ authSettled=true; clearTimeout(fallback); onAuthed(); };
  box.innerHTML='<span class="note" id="geeStatus" style="margin:0">กำลังตรวจสอบสถานะการเชื่อมต่อ…</span>';
  ee.data.authenticateViaOauth(GEE_CONFIG.clientId, onImmediateAuthed, ()=>{},
    ['https://www.googleapis.com/auth/earthengine.readonly'], onImmediateFailed, true);
}
function showLoginButton(){
  const box=el('geeAuthBox');
  box.innerHTML='<button id="geeLogin" class="btn">เชื่อมต่อบัญชี Google Earth Engine</button> '+
    '<span class="note" id="geeStatus" style="margin:0 0 0 10px">ยังไม่ได้เชื่อมต่อ</span>';
  el('geeLogin').onclick=()=>{
    el('geeStatus').textContent='กำลังเปิดหน้าต่างล็อกอินของ Google… (หากไม่มีป๊อปอัปเด้งขึ้นมา '+
      'ให้ตรวจสอบว่าเบราว์เซอร์บล็อกป๊อปอัปของหน้านี้อยู่หรือไม่ แล้วอนุญาตแล้วลองใหม่)';
    // ขั้นที่ 2: เปิดป๊อปอัปให้ผู้ใช้ล็อกอินจริง (ต้องเรียกจาก authenticateViaPopup ไม่ใช่ authenticateViaOauth
    // ซึ่งใช้สำหรับตรวจสอบแบบเงียบเท่านั้นและไม่เปิดป๊อปอัปให้)
    try{
      ee.data.authenticateViaPopup(onAuthed, onAuthErr);
    }catch(e){
      onAuthErr(e);
    }
  };
}
function onAuthed(){
  ee.initialize(null,null,()=>{
    ready=true;
    el('geeStatus').textContent='เชื่อมต่อสำเร็จ พร้อมคำนวณ';
    refreshButtons();
    statusNote();
  }, onAuthErr, null, GEE_CONFIG.cloudProject);
}
function onAuthErr(e){
  console.error('BEQI picker: Earth Engine auth/init error',e);
  const msg=(e&&e.message)?e.message:(typeof e==='string'?e:JSON.stringify(e));
  el('geeStatus').textContent='เชื่อมต่อไม่สำเร็จ: '+msg+' (ดูรายละเอียดเพิ่มเติมใน Console — กด F12)';
}

// ดึงค่าจาก ee.Dictionary แบบปลอดภัย — ถ้าไม่มีคีย์นั้น (เช่น แปลงที่วาดไม่มีพิกเซลสีเขียว/น้ำเลย
// ในแบนด์นั้น ทำให้ reduceRegion ไม่คืนคีย์นั้นมา) ให้ใช้ 0 แทน โดยไม่พึ่ง .get(key, default)
// ซึ่งเวอร์ชันไลบรารีบางรุ่นอาจไม่รองรับอาร์กิวเมนต์ที่สอง
function safeGet(dict,key){
  return ee.Algorithms.If(dict.contains(key), dict.get(key), 0);
}

function runAnalysis(){
  if(!closed||!ready) return;
  el('pickerResultCard').hidden=false;
  el('pickerResult').innerHTML='<p>กำลังประมวลผลบน Google Earth Engine…</p>';
  let done=false;
  const timer=setTimeout(()=>{
    if(done) return;
    el('pickerResult').innerHTML='<div class="warn">การประมวลผลใช้เวลานานผิดปกติ (เกิน 30 วินาที) '+
      'อาจเกิดจากแปลงที่วาดมีขนาดใหญ่เกินไป การเชื่อมต่ออินเทอร์เน็ตช้า หรือบัญชี/โปรเจกต์ Earth Engine '+
      'ยังไม่ได้รับสิทธิ์ใช้งาน — ลองวาดแปลงให้เล็กลง ตรวจสอบ Console ของเบราว์เซอร์ (F12) '+
      'เพื่อดูข้อความ error โดยตรง หรือรีเฟรชหน้าแล้วเชื่อมต่อบัญชีใหม่</div>';
  },30000);

  try{
    const p=meta.params;
    const ring=verts.map(v=>[v.lng,v.lat]);
    ring.push(ring[0]);
    const poly=ee.Geometry.Polygon([ring]);

    const s2=ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterDate('2024-01-14','2025-12-24').filterBounds(poly)
      .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE',p.cloud_filter_pct)).median();
    const ndvi=s2.normalizedDifference(['B8','B4']).rename('ndvi');
    const wc=ee.ImageCollection('ESA/WorldCover/v200').first().select('Map');
    const land=wc.neq(80).rename('land');
    const water=wc.eq(80).rename('water');
    const greenLand=ndvi.gte(p.ndvi_threshold).and(land).rename('green');

    const ind1=greenLand.updateMask(land).reduceRegion(
      {reducer:ee.Reducer.mean(),geometry:poly,scale:p.scale_m,maxPixels:1e9,bestEffort:true});

    const patch=greenLand.selfMask().connectedPixelCount({maxSize:256,eightConnected:true});
    const ind2=patch.reduceRegion(
      {reducer:ee.Reducer.mean(),geometry:poly,scale:p.scale_m,maxPixels:1e9,bestEffort:true});

    const dist=water.fastDistanceTransform(256).sqrt().multiply(p.scale_m);
    const within=dist.lte(800).rename('w800');
    const ind3=within.updateMask(land).reduceRegion(
      {reducer:ee.Reducer.mean(),geometry:poly,scale:p.scale_m,maxPixels:1e9,bestEffort:true});

    const combined=ee.Dictionary({
      g:safeGet(ind1,'green'), p:safeGet(ind2,'green'), w:safeGet(ind3,'w800'), area:poly.area(1)
    });
    combined.evaluate((r,err)=>{
      done=true; clearTimeout(timer);
      if(err){
        console.error('BEQI picker: Earth Engine evaluate error',err);
        el('pickerResult').innerHTML='<div class="warn">คำนวณไม่สำเร็จ: '+err+'</div>';
        return;
      }
      renderResult(r);
    });
  }catch(e){
    done=true; clearTimeout(timer);
    console.error('BEQI picker: error building Earth Engine request',e);
    el('pickerResult').innerHTML='<div class="warn">คำนวณไม่สำเร็จ (เกิดข้อผิดพลาดก่อนส่งคำขอ): '+
      (e&&e.message?e.message:e)+' — ดูรายละเอียดเพิ่มเติมใน Console (F12)</div>';
  }
}

function renderResult(r){
  const green=(r.g||0)*100, pc=clamp01((r.p||0)/256), w800=(r.w||0)*100;
  const areaKm2=(r.area||0)/1e6;
  const norm=[clamp01(green/100),pc,clamp01(w800/100)];
  const partial=norm.reduce((a,b)=>a+b,0)/norm.length*100;
  el('pickerResult').innerHTML=`
    <p class="score">${fx(partial)}<small> / 100 · เฉลี่ยจาก 3 ตัวชี้วัดที่มีข้อมูล (ยังไม่รวมตัวชี้วัดที่ 4)</small></p>
    <div class="bars">${norm.map((v,i)=>`
      <div class="bar"><div class="bl"><span>${IND[i]}</span><span>${fx(v,3)}</span></div>
      <div class="bt"><div class="bf" style="width:${v*100}%;background:${BAR_COL[i]}"></div></div></div>`).join('')}
    </div>
    <p class="ci" style="margin:12px 0 0">สถานะการรับรอง: <b style="color:#5C7A80">รอข้อมูลตัวชี้วัดที่ 4 จากระบบสำรวจภาคสนาม (backend)</b></p>
    <div class="kv"><span>ค่าดิบ ความหนาแน่นพื้นที่สีเขียว (NDVI ≥ ${meta.params.ndvi_threshold})</span><b>${fx(green)} %</b></div>
    <div class="kv"><span>ค่าดิบ ตัวแทนดัชนีการเชื่อมโยง (proxy)</span><b>${fx(pc,4)}</b></div>
    <div class="kv"><span>ค่าดิบ พื้นที่ในรัศมี 800 ม. จากแหล่งน้ำ</span><b>${fx(w800)} %</b></div>
    <div class="kv"><span>พื้นที่แปลงที่วาด</span><b>${fx(areaKm2,4)} ตร.กม. (${fx(r.area||0,0)} ตร.ม.)</b></div>
    <div class="kv"><span>จำนวนจุดขอบเขต</span><b>${verts.length} จุด</b></div>
    <div class="kv"><span>รุ่นพารามิเตอร์</span><b>${meta.param_version}</b></div>`;
}
})();
