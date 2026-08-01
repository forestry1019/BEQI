/* แท็บแรกของเว็บ "จิ้มพิกัดดูค่า BEQI" — ผู้ใช้คลิกจุดภายในกรอบ 3 โซนวิจัยหลัก
   แล้วดึงผลค่า BEQI ที่ประมวลผลไว้ล่วงหน้าของโซนนั้นจาก data/beqi.json (zones[])
   ไม่มีการคำนวณสดเพิ่มเติม — ทุกแท็บในเว็บนี้อ้างอิงชุดข้อมูลเดียวกัน จึงตัวเลขตรงกันเสมอ
   ปุ่ม "ดูรายละเอียดเชิงลึก" เรียก SEL/cards()/zoneSel()/zoneDetail() ของ app.js โดยตรง
   เพราะทั้งสองไฟล์เป็น classic script จึงใช้ scope ระดับหน้าเว็บร่วมกัน */
(function(){
const COL=['#2A9D8F','#E9C46A','#0B3D45']; // เหนือ/กลาง/ใต้ — สีเดียวกับแท็บ "แผนที่"
const IND_COL=['#2A9D8F','#0B3D45','#E9C46A','#E76F51'];
const IND=['ที่ 1 พื้นที่สีเขียว','ที่ 2 การเชื่อมโยง','ที่ 3 การเข้าถึงน้ำ','ที่ 4 องค์ประกอบไบโอฟิลิก'];
const BAND={A:'#1a7d32',B:'#2A9D8F',C:'#E9C46A',D:'#E76F51',E:'#B5322C'};
const el=id=>document.getElementById(id);
const fx=(v,d=2)=>Number(v).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});

let data=null, map=null, marker=null;

fetch('data/beqi.json').then(r=>r.json()).then(d=>{data=d;boot()})
  .catch(()=>{el('pickerMapNote').textContent='โหลดข้อมูลไม่สำเร็จ';});

function boot(){
  initMap();
  document.querySelector('nav button[data-t="picker"]').addEventListener('click',()=>{
    setTimeout(()=>{if(map) map.invalidateSize();},80);
  });
}

function zoneAt(lat,lng){
  return data.zones.find(z=>{const b=z.bbox; return lng>=b[0]&&lng<=b[2]&&lat>=b[1]&&lat<=b[3];});
}

function initMap(){
  map=L.map('pickerMap').setView([8.63,98.26],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
  data.zones.forEach((z,i)=>{
    const b=z.bbox;
    L.rectangle([[b[1],b[0]],[b[3],b[2]]],{color:COL[i],weight:2,fillOpacity:.1})
      .bindTooltip(z.name_th+' — '+z.sub_th).addTo(map);
  });
  map.on('click',e=>{
    const {lat,lng}=e.latlng, z=zoneAt(lat,lng);
    if(marker) map.removeLayer(marker);
    marker=L.marker([lat,lng]).addTo(map);
    if(!z){
      el('pickerMapNote').innerHTML='<b>จุดนี้อยู่นอกขอบเขต 3 โซนหลักของงานวิจัย</b> กรุณาคลิกภายในกรอบสีบนแผนที่';
      el('pickerResult').innerHTML='<p class="note" style="margin-top:0">ยังไม่มีผลลัพธ์ — คลิกภายในกรอบสีเพื่อดูค่าดัชนี BEQI</p>';
      return;
    }
    const i=data.zones.indexOf(z);
    el('pickerMapNote').innerHTML='พิกัดที่เลือก '+fx(lat,5)+', '+fx(lng,5)+
      ' — อยู่ใน <b style="color:'+COL[i]+'">'+z.name_th+'</b>';
    renderResult(z);
  });
  el('pickerMapNote').textContent='คลิกภายในกรอบสีเพื่อดูค่าดัชนี BEQI ของโซนนั้น';
}

function renderResult(z){
  el('pickerResult').innerHTML=`
    <div class="zh">
      <div><p class="zn">${z.name_th}</p><p class="zs">${z.sub_th}</p></div>
      <span class="badge">${z.asset}</span>
    </div>
    <p class="score">${fx(z.beqi)}<small> / 100 · ระดับ ${z.band}</small></p>
    <p class="ci">ช่วงความเชื่อมั่น 95% [${fx(z.mc.lo)}, ${fx(z.mc.hi)}] · พื้นที่บก ${fx(z.land_area_km2)} ตร.กม.</p>
    <div class="bars">${z.norm.map((v,i)=>`
      <div class="bar"><div class="bl"><span>${IND[i]}</span><span>${fx(v,3)}</span></div>
      <div class="bt"><div class="bf" style="width:${v*100}%;background:${IND_COL[i]}"></div></div></div>`).join('')}
    </div>
    <p class="ci" style="margin:12px 0 0">สถานะการรับรอง:
      <b style="color:${z.cert_years?BAND[z.band]:'#B5322C'}">${z.cert}${z.cert_years?' ('+z.cert_years+' ปี)':''}</b></p>
    <button class="btn" id="pickerDeepBtn" style="margin-top:10px">ดูรายละเอียดเชิงลึกของโซนนี้ →</button>`;
  el('pickerDeepBtn').onclick=()=>{
    SEL=z.id; cards(); zoneSel(); zoneDetail();
    document.querySelector('nav button[data-t="zone"]').click();
  };
}
})();
