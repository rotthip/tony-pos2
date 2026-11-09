# SabaiPOS (สบายโพส) - Thai Restaurant & Cafe POS

ระบบขายหน้าร้านสำหรับร้านอาหาร คาเฟ่ และร้านเครื่องดื่ม ออกแบบสำหรับการใช้งานด้วยแท็บเล็ตและสมาร์ทโฟน รองรับการทำงานออฟไลน์ สแกน QR PromptPay แบบไดนามิก หน้าจอครัว (KDS) และรายงานยอดขายรายวัน โดยทำงานบน Firebase Spark (Free) Plan 100%

---

## ฟีเจอร์หลัก (Key Features)

1. **ผังโต๊ะและสั่งด่วนกลับบ้าน (Floor Plan & Quick Takeaway)**
   - จัดการโซนโต๊ะ (ห้องแอร์, หน้าร้าน, สวน) พร้อมสถานะสี (ว่าง, กำลังสั่ง, รอชำระเงิน)
   - สั่งออเดอร์กลับบ้าน (Takeaway) พร้อมรันเลขคิวอัตโนมัติ (A01, A02...)
2. **ระบบสั่งอาหารและเครื่องดื่ม (Touch-First Ordering)**
   - เมนูพร้อมหมวดหมู่ ค้นหาตัวเลือก ระดับความหวาน ท็อปปิ้ง และหมายเหตุเฉพาะรายการ
   - ส่งรายการเข้าครัว/บาร์เฉพาะรายการใหม่ (Send to Kitchen/Bar)
3. **จัดการออเดอร์ (Order Management)**
   - ย้ายโต๊ะ รวมโต๊ะ โอนรายการข้ามบิล
   - ยกเลิกรายการ (Void Item) พร้อมต้องใส่รหัส PIN ผู้จัดการและระบุสาเหตุ
4. **ระบบชำระเงินและพร้อมเพย์ (Payment & Dynamic PromptPay QR)**
   - เงินสดพร้อมปุ่มทอนเงินด่วน (20, 50, 100, 500, 1,000, พอดี)
   - สร้าง QR PromptPay แบบ EMVCo ไดนามิกคำนวณยอดเงินและ CRC16 ฝั่งไคลเอนต์ 100%
   - แยกบิลตามรายการ (Split by Item) หรือหารเท่า (Split Equally)
   - รองรับส่วนลด (บาท / %), Service Charge, และ VAT (รวมใน / แยกนอก / ยกเว้น)
5. **ใบเสร็จรับเงิน (Thermal Receipt)**
   - รูปแบบใบกำกับภาษีอย่างย่อ
   - รองรับขนาด 58 มม. และ 80 มม. ผ่านเบราว์เซอร์
6. **หน้าจอครัวและบาร์ (Kitchen Display System - KDS)**
   - แสดงคิวตามสเตชั่น (ครัว / บาร์) พร้อมแจ้งเตือนเสียง chime
   - แถบสีเตือนเวลาที่รอนาน (เขียว / ส้ม / แดง)
7. **ระบบเปิด-ปิดกะ (Shift Management)**
   - บันทึกเงินทอนเริ่มต้น บันทึกเงินสดรับ-จ่าย (Pay In / Pay Out) และตรวจนับเงินปิดกะ
8. **จัดการเมนู (Menu Management)**
   - สร้าง/แก้ไขหมวดหมู่ เมนู ท็อปปิ้ง และปุ่มกด "สินค้าหมด" ทันที
9. **รายงานสรุปยอดขาย (Daily Reports)**
   - สรุปยอดขายรายวัน รายสัปดาห์ รายเดือน แยกตามช่องทางชำระ และเมนูขายดี จาก Firestore `daily` summary doc ประหยัดโควตา Free Plan
10. **ระบบออฟไลน์ (Offline Persistence)**
    - ใช้ Firestore `persistentLocalCache` ทำงานต่อได้แม้เน็ตหลุด และซิงค์อัตโนมัติเมื่อต่อเน็ต

---

## การติดตั้งและตั้งค่า Firebase (Firebase Setup)

### 1. สร้าง Firebase Project (ฟรี Spark Plan)
1. เข้าไปที่ [Firebase Console](https://console.firebase.google.com/) แล้วสร้างโปรเจกต์ใหม่
2. เปิดใช้งาน **Authentication**:
   - ไปที่ **Build** > **Authentication** > **Sign-in method**
   - เปิดใช้งาน **Email/Password** และ **Google**
3. เปิดใช้งาน **Cloud Firestore**:
   - ไปที่ **Build** > **Firestore Database** > กด **Create database**
   - เลือก Location ใกล้ประเทศไทย เช่น `asia-southeast1` (Singapore)
4. อัปเดตกฎความปลอดภัย (Security Rules):
   - คัดลอกเนื้อหาจากไฟล์ `firestore.rules` ไปวางในแท็บ **Rules** ของ Firestore แล้วกด **Publish**

### 2. ตั้งค่า Configuration ในแอป
1. ในหน้า Project Settings ของ Firebase สร้าง Web App แล้วคัดลอก `firebaseConfig`
2. นำค่ามาใส่ในไฟล์ `src/firebaseConfig.ts` หรือสามารถใส่ผ่านเมนู **"ตั้งค่าระบบ (Settings)"** ภายในแอปได้โดยตรง
3. หากยังไม่มี Firebase หรือต้องการทดลองใช้ทันที ระบบมีโหมด **"Demo Mode"** พร้อมข้อมูลตัวอย่างเมนูอาหารไทยครบวงจร

---

## การพัฒนาในเครื่อง (Local Development)

```bash
# ติดตั้ง dependencies
npm install

# รัน dev server
npm run dev
```

เปิดบราวเซอร์ที่ `http://localhost:3000`

---

## การ Deploy ขึ้น GitHub Pages

1. ไปที่ GitHub Repository Settings > **Pages**
2. เลือก Source เป็น **GitHub Actions**
3. Push โค้ดขึ้น branch `main` เวิร์กโฟลว์ใน `.github/workflows/deploy.yml` จะทำการ build และ deploy ให้อัตโนมัติ
