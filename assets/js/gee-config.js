/* ตั้งค่าก่อนใช้งานแท็บ "จุดสำรวจ (ทดลอง)" — ขั้นตอนเต็มอยู่ใน README.md
   หัวข้อ "เปิดใช้งานแท็บจุดสำรวจ (Google Earth Engine)"

   1. ลงทะเบียนโปรเจกต์ Google Cloud สำหรับ Earth Engine (ไม่มีค่าใช้จ่ายสำหรับการใช้งานทั่วไป):
      https://code.earthengine.google.com/register
   2. สร้าง OAuth 2.0 Client ID ชนิด "Web application" ใน Google Cloud Console
      > APIs & Services > Credentials > Create Credentials > OAuth client ID
      ใส่ Authorized JavaScript origins ทั้งของเครื่องทดสอบ (เช่น http://localhost:8000)
      และของเว็บจริงบน GitHub Pages (เช่น https://forestry1019.github.io)
   3. แทนค่า clientId และ cloudProject ด้านล่างด้วยของจริง แล้ว commit */
const GEE_CONFIG = {
  clientId: 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com',
  cloudProject: 'YOUR_GCP_PROJECT_ID'
};
