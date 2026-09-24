# BNK48/CGM48 Vote Discord Bot

บอต Discord สำหรับค้นประวัติการโหวตจาก wallet address สรุปยอดแยกตามงานและเมมเบอร์ และดูรายการโหวตทีละ transaction

ฐานข้อมูลในโปรเจกต์มีข้อมูล 8 งาน รวม 126,346 transactions เรียบร้อยแล้ว ไม่ต้องนำเข้าไฟล์ Excel ซ้ำก่อนเริ่มใช้งาน

สำหรับ developer หรือผู้รับช่วงดูแลระบบ อ่านรายละเอียดสถาปัตยกรรม ฐานข้อมูล และสถานะฟีเจอร์ได้ที่ `docs/PROJECT_GUIDE.md`

## ความสามารถ

- ค้นด้วย wallet หรือ address โดยไม่สนตัวพิมพ์เล็กและใหญ่
- สรุปยอด token และจำนวน transactions แยกตามงานและเมมเบอร์
- แสดงรายการโหวตทีละ transaction พร้อมเวลา งาน เมมเบอร์ และจำนวน token
- กรองข้อมูลด้วยชื่องานหรือชื่อเมมเบอร์
- รองรับจำนวน token ที่มีทศนิยมหลายตำแหน่งโดยไม่เสียความแม่นยำ
- ซ่อนผลค้น wallet และ transactions เป็นข้อความส่วนตัวของผู้ใช้คำสั่ง

## งานที่มีในฐานข้อมูล

| ชื่อที่ใช้กรอง | งาน |
| --- | --- |
| `GE3` | BNK48 12th Single Senbatsu General Election |
| `GE4` | BNK48 16th Single Senbatsu General Election |
| `Songkran 2024` | มหาเทวีนางสงกรานต์๔๘ 2024 |
| `365-Nichi 2024` | 365-Nichi no Kamihikouki Senbatsu 2024 |
| `Request Hour 2024` | Battle Vote of 2024 Request Hour |
| `GE5` | BNK48 & CGM48 Senbatsu General Election 2025 |
| `Thai-Chinese 2025` | Thai-Chinese Cultural Ambassador 2025 |
| `Thai-Japan 2026` | Thai-Japan Collaboration Project 2026 |

## สิ่งที่ต้องมี

- Node.js 24.17.0 ขึ้นไป
- Discord Application ที่เปิดใช้งาน Bot แล้ว
- Bot Token

ตรวจสอบ Node.js:

```bash
node --version
npm --version
```

## สร้างและเชิญ Discord Bot

1. เปิด [Discord Developer Portal](https://discord.com/developers/applications)
2. กด `New Application` และตั้งชื่อบอต
3. เปิดเมนู `Bot` แล้วสร้างหรือ reset token
4. เก็บ token ไว้เป็นความลับ ห้ามส่งในแชตหรือ commit ลง Git
5. เปิดเมนู `OAuth2` แล้วเลือก `URL Generator`
6. เลือก scopes `bot` และ `applications.commands`
7. เลือก permissions `Send Messages`, `Embed Links` และ `Manage Channels` (ใช้สำหรับล็อกห้อง Whale Alert)
8. เปิด URL ที่ได้แล้วเลือกเซิร์ฟเวอร์ที่ต้องการเพิ่มบอต

## ตั้งค่า

เข้าโฟลเดอร์โปรเจกต์:

```bash
cd "/Users/ar677186/Documents/Codex/2026-09-08/new-chat"
```

สร้างไฟล์ `.env`:

```bash
cp .env.example .env
```

ใส่เพียง Bot Token:

```env
DISCORD_TOKEN=ใส่_bot_token_ตรงนี้
```

ไม่ต้องใส่ Application ID บอตจะอ่าน ID และลงทะเบียน Slash Commands อัตโนมัติหลังล็อกอิน

### ตั้งค่าเซิร์ฟเวอร์ทดสอบ (ไม่บังคับ)

ถ้าต้องการให้คำสั่งใหม่ปรากฏทันที ให้เปิด Developer Mode ใน Discord คัดลอก Server ID แล้วเพิ่ม:

```env
DISCORD_TOKEN=ใส่_bot_token_ตรงนี้
DISCORD_GUILD_ID=ใส่_server_id_ตรงนี้
```

เมื่อไม่ใส่ `DISCORD_GUILD_ID` บอตจะลงทะเบียนคำสั่งให้ทุกเซิร์ฟเวอร์ที่บอตเข้าร่วมโดยอัตโนมัติ คำสั่งจึงปรากฏได้ทันทีโดยไม่ต้องหา Server ID

## ติดตั้งและเปิดบอต

ติดตั้ง dependencies ครั้งแรก:

```bash
npm install
```

เปิดบอตระหว่างพัฒนา:

```bash
npm run dev
```

เมื่อพร้อมใช้งานจริง:

```bash
npm run build
npm start
```

ถ้าทำงานสำเร็จ terminal จะแสดงชื่อบอตและจำนวน Slash Commands ที่ติดตั้ง

## คำสั่ง Discord

### `/wallet`

สรุปว่า address เคยโหวตงานใด ให้ใคร กี่ tokens และกี่ transactions

```text
/wallet id:0x1234...
```

ตัวอย่างผลลัพธ์:

```text
GE4
Sita: 3,000 tokens (12 tx)
Champoo: 2,000 tokens (8 tx)

GE5
Nammonn: 500 tokens (2 tx)
```

### `/transactions`

แสดงจำนวน transactions ทั้งหมดและรายการโหวตทีละรายการ เรียงรายการล่าสุดก่อน หน้าละ 10 รายการ

```text
/transactions id:0x1234...
/transactions id:0x1234... event:GE4 page:2
```

แต่ละรายการแสดง:

- ชื่อเมมเบอร์หรือรายการที่ได้รับโหวต
- จำนวน tokens
- วันที่และเวลา
- ชื่องาน

### `/member`

ดูยอดของเมมเบอร์ แยกตามงานหรือกรองเฉพาะงาน

```text
/member name:Sita
/member name:Sita event:GE4
```

### `/privacy`

ผู้ดูแลเซิร์ฟเวอร์ที่มีสิทธิ์ `Manage Server` ใช้คำสั่งนี้เพื่อกำหนดว่าผล `/wallet` และ `/transactions` จะเห็นเฉพาะผู้ค้นหาหรือเห็นได้ทุกคนในห้อง การตั้งค่าจะแยกกันในแต่ละเซิร์ฟเวอร์และไม่หายเมื่อปิดบอต

```text
/privacy command:wallet visibility:เฉพาะผู้ค้นหา
/privacy command:wallet visibility:ทุกคนในห้อง
/privacy command:transactions visibility:เฉพาะผู้ค้นหา
/privacy command:transactions visibility:ทุกคนในห้อง
```

ค่าเริ่มต้นของทั้งสองคำสั่งคือ `เฉพาะผู้ค้นหา` และเมื่อใช้ใน Direct Message ผลลัพธ์จะเป็นส่วนตัวเสมอ

### `/forecast`

ดูผลคาดการณ์ GE6 จาก prediction run ล่าสุด:

```text
/forecast table
/forecast table page:2
/forecast member name:Sita
/forecast member name:Sita rank:13
```

`table` แสดงอันดับและคะแนนคาดหมาย ณ block/เวลาที่โมเดลประมวลผล ส่วน `member` แสดงโอกาสอันดับ 1, Kami7, Senbatsu, Under Girls, Next Girls, ไม่ติดอันดับ และโอกาสอันดับ Center ที่ 1, 13 และ 25 สามารถระบุ `rank` ตั้งแต่ 1–58 เพื่อดูความน่าจะเป็นของอันดับอื่นเพิ่มเติมได้

ถ้ายังไม่มีรายชื่อผู้สมัครหรือ prediction run คำสั่งจะแจ้งว่าไม่มีผลคาดการณ์และจะไม่สร้างเปอร์เซ็นต์สมมติ

### `/whale`

ผู้ดูแลที่มีสิทธิ์ `Manage Server` และ `Manage Channels` สามารถเลือก Text Channel สำหรับแจ้งเตือนธุรกรรม GE6 ขนาดใหญ่ได้ บอตจะปิดสิทธิ์ส่งข้อความ เพิ่ม reaction และสร้าง thread ของ `@everyone` ในห้องนั้น เหลือเฉพาะบอตที่ส่งข้อความได้

```text
/whale setup channel:#whale-alert
/whale setup channel:#whale-alert threshold:1000
/whale test member:Sita amount:1000 address:0x1234...
/whale status
/whale disable
```

ค่า threshold เริ่มต้นคือ 1,000 tokens การทดสอบที่ต่ำกว่า threshold จะไม่ส่ง alert ส่วน alert จริงจะส่งหลัง TokenX indexer ยืนยัน transaction แล้ว โดยป้องกันการยิงซ้ำด้วย transaction hash และ log index

### `/ge6`

ดูผู้สมัคร GE6 ทั้ง 58 คนและเพลงที่คาดหวังคนละ 3 เพลง ข้อมูลมาจาก `withmywish.com/ge2026/`

```text
/ge6 candidates
/ge6 candidates page:2
/ge6 member name:Arlee
```

ช่อง `name` มี autocomplete ให้กดเลือกเมมเบอร์ ผลลัพธ์รายคนแสดงวง/ทีม รูป เพลงลำดับ 1–3 และปุ่ม `เปิดข้อมูลต้นทาง`

อัปเดตข้อมูลจากเว็บและบันทึกลง `ge6-analysis.sqlite` ด้วย:

```bash
npm run ge6:sync-roster
```

ระบบจะยกเลิกการบันทึกถ้าดึงได้ไม่ครบ 58 คนหรือมีใครได้เพลงไม่ครบ 3 เพลง เพื่อป้องกันข้อมูลบางส่วนเขียนทับ roster ที่สมบูรณ์

## ฐานข้อมูล

ข้อมูลแยกเป็นสามฐานและใช้ SQLite แบบ WAL:

- `data/historical-votes.sqlite` เก็บข้อมูล 8 งานเดิม ใช้ค้นหาและเป็นข้อมูลอ้างอิงสำหรับสร้างโมเดล ห้ามให้ตัวดึงข้อมูล GE6 เขียนลงฐานนี้
- `data/ge6-analysis.sqlite` เก็บ candidate roster, ธุรกรรมสดจาก TokenX, checkpoint การ sync และผลการจำลองอันดับของ GE6
- `data/bot-settings.sqlite` เก็บค่าการมองเห็นคำสั่งและการตั้งค่าห้อง Whale Alert แยกจากข้อมูล training

สร้างหรือตรวจ schema ของทั้งสองฐานได้ด้วย:

```bash
npm run db:init
```

ข้อมูลที่เก็บต่อหนึ่งรายการ:

- Event
- Member หรือรายการที่ได้รับโหวต
- Token amount
- Wallet/address
- วันและเวลา
- Transaction hash ถ้าไฟล์ต้นทางมีข้อมูล
- ไฟล์ ชีท และแถวต้นทาง

ไฟล์ปัจจุบันไม่มี transaction hash จึงแสดงรายละเอียดรายการได้ แต่ยังสร้างลิงก์ไป TokenX Explorer ราย transaction ไม่ได้

## นำเข้าไฟล์เพิ่มเติม

สำรองฐานข้อมูลก่อนนำเข้าไฟล์ใหม่ แล้วรัน:

```bash
npm run import -- "/path/to/file.xlsx"
```

นำเข้าหลายไฟล์พร้อมกันได้:

```bash
npm run import -- "/path/to/file-1.xlsx" "/path/to/file-2.xlsx"
```

ตัวนำเข้าจะอ่านชีทชื่อ `transaction` เป็นหลัก การนำเข้าไฟล์และชีทเดิมซ้ำจะเขียนข้อมูลชุดนั้นใหม่เพื่อไม่ให้เกิดแถวซ้ำ

รูปแบบคอลัมน์ที่รองรับได้แก่ `Date`, `Name`, `Score divide` หรือ `Score` และ `Wallet` ไฟล์ CSV ทั่วไปดูรูปแบบได้จาก `sample-votes.csv`

## ตรวจสอบโปรเจกต์

```bash
npm run build
npm test
```

## ใช้งานด้วย Docker

สร้าง image:

```bash
docker build -t bnk48-vote-bot .
```

เปิด container โดยใช้ `.env` และเก็บฐานข้อมูลไว้นอก container:

```bash
docker run --name bnk48-vote-bot \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  --restart unless-stopped \
  bnk48-vote-bot
```

## ปัญหาที่พบบ่อย

### คำสั่ง Slash Commands ไม่ปรากฏ

- ตรวจว่าตอนเชิญบอตเลือก scope `applications.commands`
- ใส่ `DISCORD_GUILD_ID` ระหว่างทดสอบแล้วเปิดบอตใหม่
- ตรวจว่าบอตอยู่ในเซิร์ฟเวอร์ที่ระบุ

### ขึ้น `Invalid Token`

- ตรวจว่าใช้ Bot Token ไม่ใช่ Application ID หรือ Public Key
- ลบช่องว่างหรือเครื่องหมายคำพูดรอบ token
- ถ้า token เคยถูกเปิดเผย ให้ reset token ที่ Developer Portal

### Terminal ยังใช้ Node.js 12

```bash
source ~/.zshrc
nvm use 24.17.0
node --version
```

### บอตปิดเมื่อปิด Terminal

ใช้ Docker พร้อม `--restart unless-stopped` หรือใช้ process manager เช่น PM2 บนเครื่องที่จะเปิดบอตตลอดเวลา

## แผน GE6 และ TokenX

บอตมี Blockscout indexer สำหรับอ่าน Event `Voted` จากสัญญา GE6 โดยไม่ต้องใช้ RPC หรือ WebSocket ค่าเริ่มต้นที่ตรวจจาก transaction สร้าง poll คือ:

```text
Contract:    0x86a1F49e1b1Cbd69971e99B66123264c75Ac2c8F
Create tx:   0x151b2ca5a3715fc6fc23eb52218b292487c971e1cdb4d432d8521ef192689919
Start block: 49475830
End block:   50696530
Event:       Voted(address indexed _voter, uint256 indexed _index, uint256 _amount, bytes32 _hash)
Chain ID:    35
Decimals:    18
```

เปิดใช้งานด้วยค่าใน `.env.example` บอตจะ poll ทุก 10 วินาที บันทึก checkpoint ลง `ge6-analysis.sqlite` และไม่ยิง transaction เดิมซ้ำ:

```env
TOKENX_BLOCKSCOUT_MODE=browser
TOKENX_BLOCKSCOUT_API_URL=https://api.tokenx.finance/api/v2
GE6_INDEXER_ENABLED=true
GE6_CONTRACT_ADDRESS=0x86a1F49e1b1Cbd69971e99B66123264c75Ac2c8F
GE6_START_BLOCK=49475830
GE6_TOKEN_DECIMALS=18
GE6_POLL_INTERVAL_MS=10000
GE6_TARGET_MAP_PATH=./data/ge6-vote-targets.json
GE6_BROWSER_CHANNEL=chrome
GE6_BROWSER_HEADLESS=true
```

ตรวจว่าเครื่องที่รันบอตเข้าถึง API ได้ก่อนเปิดบอต:

```bash
npm run ge6:check-api
```

`browser` mode ใช้ Chrome ที่ติดตั้งบน PC เปิด TokenX Scan ก่อน แล้วอ่าน API ภายใน browser session จึงไม่ต้องใช้ Blockscout API key หากใช้ Microsoft Edge ให้เปลี่ยนเป็น:

```env
GE6_BROWSER_CHANNEL=msedge
```

ถ้า TokenX ป้องกัน headless browser ให้ใช้:

```env
GE6_BROWSER_HEADLESS=false
```

กรณีนี้จะเห็นหน้าต่าง browser เปิดค้างอยู่ ห้ามปิดระหว่างที่บอตทำงาน หากติดตั้ง browser ไว้ตำแหน่งอื่น สามารถกำหนด path เต็มผ่าน `GE6_BROWSER_EXECUTABLE_PATH`

โหมด `api` แบบเดิมยังใช้ได้สำหรับเครื่องที่ไม่ถูกปฏิเสธหรือมี API key:

```env
TOKENX_BLOCKSCOUT_MODE=api
TOKENX_BLOCKSCOUT_API_KEY=ใส่_key_ถ้ามี
```

Docker image ปัจจุบันไม่มี Chrome ในตัว จึงควรใช้ `api` mode เมื่อรันด้วย Docker หรือปรับ image ให้ติดตั้ง Chromium เพิ่ม

ฟิลด์ `_hash` คือรหัสเป้าหมายการโหวต ถ้าเป็น bytes32 ที่อ่านเป็นชื่อได้ บอตจะแปลงอัตโนมัติ ถ้าเป็น hash ทึบ ให้สร้าง `data/ge6-vote-targets.json` จากตัวอย่าง `ge6-vote-targets.example.json`:

```json
{
  "0xค่า_hash_เต็ม_64_หลัก": "Sita"
}
```

เมื่อยังไม่มี mapping บอตยังบันทึก transaction และส่ง Whale Alert ได้ แต่จะแสดง `ไม่ทราบเมมเบอร์ (0x...)` จนกว่าจะเติม mapping แล้วเปิดบอตใหม่

ข้อมูลสดที่ indexer บันทึกประกอบด้วย transaction hash, log index, block, voter address, member/target, token amount, timestamp และ raw log เฉพาะใน `ge6-analysis.sqlite` ฐานข้อมูลเดิมไม่ถูกแก้ไข

ข้อมูลที่ต้องตรวจซ้ำหาก Token X เปลี่ยนระบบในภายหลัง:

- Contract address ของ token และระบบโหวต
- Contract ABI หรือ event signature
- Chain ID
- RPC/WebSocket endpoint หรือ Explorer API key
- นิยามว่า transaction แบบใดถือเป็นคะแนนโหวต
- Mapping ระหว่าง contract/address ผู้รับกับชื่อเมมเบอร์

ข้อมูลย้อนหลังใน `historical-votes.sqlite` จะใช้แบบ read-only สำหรับฝึกและคำนวณ feature

โมเดลแบ่งผลลัพธ์เป็นสองระดับ:

- Wallet prediction: ความน่าจะเป็นที่แต่ละ address จะโหวตให้เมมเบอร์แต่ละคนและจำนวน token ที่คาดไว้
- Ranking simulation: จำลองผลโหวตหลายรอบเพื่อคำนวณคะแนนและอันดับคาดหมาย รวมถึงโอกาสอยู่ในแต่ละกลุ่มอันดับ

โครงสร้างอันดับ GE6 สำหรับผู้สมัครทั้งหมด 58 คน:

| อันดับ | กลุ่ม |
| --- | --- |
| 1–7 | Kami7 และเป็นส่วนหนึ่งของ Senbatsu |
| 8–12 | Senbatsu |
| 13–24 | Under Girls |
| 25–36 | Next Girls |
| 37–58 | ไม่ติดอันดับ |

ผล simulation จะรายงานโอกาสอันดับ 1, Kami7, Senbatsu, Under Girls, Next Girls และไม่ติดอันดับ โดยความน่าจะเป็น Senbatsu รวมอันดับ 1–12 และ Kami7 เป็นค่าย่อยของ Senbatsu

ปัจจัยเริ่มต้นได้แก่ประวัติเมมเบอร์ที่เคยโหวต สัดส่วน token ความถี่และความใหม่ของการโหวต ความต่อเนื่องข้ามงาน และสถานะเมมเบอร์ในรายชื่อ GE6 ผลคาดการณ์ต้องแสดงเวลาตัดข้อมูลและเวอร์ชันโมเดลทุกครั้ง
