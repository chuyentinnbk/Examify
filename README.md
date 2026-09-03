# 🎓 Examify — Production-Ready Full-Stack AI Exam Generation System

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Next.js%2015%20(App%20Router)-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Language-TypeScript%205-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Database-MariaDB%20%7C%20Prisma%20ORM-003545?style=for-the-badge&logo=mariadb" alt="MariaDB" />
  <img src="https://img.shields.io/badge/Cache%20%26%20Queue-Redis%20%7C%20BullMQ-DC382D?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Security-Self--Hosted%20PromptGuard-10B981?style=for-the-badge&logo=security" alt="Security" />
</p>

---

## 📌 Giới thiệu tổng quan (Overview)

**Examify** là hệ thống tạo và quản lý đề thi học thuật thông minh dựa trên Trí tuệ nhân tạo (AI), được thiết kế theo chuẩn Enterprise Architecture dành cho trường học và các tổ chức giáo dục. 

Hệ thống hoạt động độc lập hoàn toàn, **không phụ thuộc vào Cloudflare hay các dịch vụ Gateway bên thứ ba**, tự vận hành bảo mật bằng Redis Sliding Window Rate Limiter, GeoIP Resolver và động cơ phòng chống tấn công Prompt Injection (**PromptGuard**).

---

## ✨ Tính năng cốt lõi (Core Features)

### 1. 🔒 Luồng khởi tạo ban đầu & Khóa vĩnh viễn (Zero-Day Setup & Permanent Lock)
- Khi hệ thống mới triển khai (chưa có tài khoản Admin), toàn bộ người dùng sẽ được chuyển hướng bắt buộc đến trang khởi tạo `/setup`.
- Sau khi tạo thành công tài khoản **ADMIN** đầu tiên, hệ thống kích hoạt cơ chế khóa vĩnh viễn (`is_locked: true` trong bảng `SystemSetting`), tự động chặn mọi yêu cầu truy cập trái phép vào endpoint `/api/v1/setup` (trả về mã lỗi `403 Forbidden`).

### 2. 🛡️ Tầng bảo mật tự lưu trữ (Self-Hosted Security Engine)
- **Sliding Window Rate Limiter**: Kiểm soát tần suất gọi API theo thuật toán cửa sổ trượt (Sliding Window Log) lưu trữ trên Redis.
- **GeoIP Country Resolution**: Xác định vị trí quốc gia của IP truy cập trực tiếp bằng `geoip-lite` mà không cần dịch vụ đám mây bên ngoài.
- **JWT & Redis Session Validation**: Kiểm tra tính hợp lệ của token và phiên làm việc (Session) trong Redis theo thời gian thực, hỗ trợ thu hồi token (Revocation/Blacklist) ngay lập tức khi đăng xuất.

### 3. 🧠 Động cơ chống tấn công Prompt Injection (PromptGuard Engine)
- Bộ lọc bảo vệ mô hình AI phân tích prompt tùy chỉnh của giáo viên trước khi gửi sang LLM:
  - Chặn ghi đè chỉ thị hệ thống (*System Override*): `ignore previous instructions`, `bypass rules`, `disregard directives`.
  - Chặn tấn công phân tách token (*Delimiter Hijacking*): `<system>`, `[INST]`, `<<SYS>>`, `<|im_start|>`, `### Instruction:`.
  - Chặn chế độ vượt rào (*Jailbreak & Persona Switching*): `DAN mode`, `Developer mode`, `sudo/root`.
  - Chặn trích xuất dữ liệu nhạy cảm (*Data Exfiltration*): Yêu cầu in system prompt, lộ API key, hoặc mã hóa Base64 dữ liệu bí mật.

### 4. 🤖 Kiến trúc đa mô hình AI (Strategy Pattern Multi-AI Engine)
- Giao diện trừu tượng `IAIProvider` hỗ trợ chuyển đổi linh hoạt giữa các nhà cung cấp:
  - **Google Gemini**: Hỗ trợ `gemini-1.5-flash`, `gemini-1.5-pro` với định dạng JSON cấu trúc chuẩn.
  - **OpenAI**: Hỗ trợ `gpt-4o`, `gpt-4o-mini` với cơ chế `json_object`.
  - **Self-Hosted LLMs**: Tương thích hoàn toàn với các mô hình tự host như **vLLM**, **Ollama**, **LocalAI**, **TGI** thông qua endpoint tương thích OpenAI (`/v1/chat/completions`).
- **Exam Prompt Builder**: Tự động ghép nối ma trận đề thi 6 cấp độ:
  - **Cây phân cấp CTGD**: Cấp học (*Level*) $\rightarrow$ Khối lớp (*Grade*) $\rightarrow$ Môn học (*Subject*) $\rightarrow$ Học kỳ (*Semester*) $\rightarrow$ Chủ đề (*Topic*) $\rightarrow$ Bài học (*Lesson*).
  - **Phân loại đề thi**: Kiểm tra 15 phút (`MIN_15`), Giữa kỳ (`MID_TERM`), Cuối kỳ (`FINAL_TERM`), Khảo sát đầu vào / Tuyển sinh (`ENTRANCE`).
  - **Ma trận năng lực (Bloom's Taxonomy)**: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.

### 5. 💾 Lưu trữ cục bộ & Nhật ký kiểm toán kép (Storage & Dual-Channel Audit Log)
- **Lưu trữ đề thi**: Ghi file JSON cấu trúc nguyên tử vào thư mục `/storage/exams/{year}/{month}/{examId}.json`.
- **Nhật ký kiểm toán kép**: Ghi đồng thời vào hệ cơ sở dữ liệu MariaDB (`AuditLog` table) và hệ thống file xoay vòng hằng ngày (**Winston Daily Rotate**) tại `/storage/logs/` (`app-%DATE%.log`, `security-%DATE%.log`, `error-%DATE%.log`).

### 6. 📨 Hàng đợi gửi Email bất đồng bộ (BullMQ Mail Engine)
- Hàng đợi tin nhắn Redis xử lý gửi email giao dịch ngầm (*Worker* chạy riêng biệt).
- Hỗ trợ cơ chế tự động thử lại theo cấp số nhân (*Exponential Backoff*).

### 7. 📖 Tài liệu API Swagger UI tích hợp sẵn (Interactive Swagger UI)
- Tích hợp tài liệu trực quan chuẩn **OpenAPI 3.0.3** tại đường dẫn `/docs`.
- Cung cấp sẵn endpoint tải spec thô: `/api/v1/docs/openapi.json` và `/api/v1/docs/openapi.yaml`.

---

## 🏗️ Cấu trúc thư mục (Directory Layout)

```
Examify/
├── .env.example                               # Mẫu cấu hình biến môi trường
├── docker-compose.yml                         # Cấu hình container MariaDB, Redis, App, Worker
├── Dockerfile                                 # Dockerfile cho Next.js Production
├── Dockerfile.worker                          # Dockerfile cho BullMQ Mail Worker
├── next.config.mjs                            # Cấu hình Next.js server external packages
├── package.json                               # Danh sách thư viện và scripts
├── tsconfig.json                              # Cấu hình TypeScript strict mode
├── prisma/
│   └── schema.prisma                          # Schema MariaDB (Models, Enums, Relations)
├── storage/
│   ├── exams/                                 # Chứa file đề thi JSON được tạo
│   └── logs/                                  # Chứa file nhật ký xoay vòng theo ngày
├── src/
│   ├── middleware.ts                          # Edge/Server Middleware (GeoIP, Rate Limit, Auth Gate)
│   ├── lib/
│   │   ├── db.ts                              # Singleton Prisma Client
│   │   ├── redis.ts                           # Singleton ioredis Client
│   │   └── utils.ts                           # Tiện ích API response chuẩn hóa
│   ├── core/
│   │   ├── security/
│   │   │   ├── prompt-guard.ts                # Động cơ lọc Prompt Injection & Jailbreak
│   │   │   ├── rate-limiter.ts                # Sliding Window Rate Limiter (Redis)
│   │   │   ├── edge-rate-limiter.ts           # Sliding Window Rate Limiter (Edge in-memory)
│   │   │   ├── jwt.ts                         # Quản lý JWT & Session Redis
│   │   │   ├── edge-jwt.ts                    # Xác thực JWT chuẩn Web Crypto trên Edge
│   │   │   └── geoip-resolver.ts              # Tự giải mã Quốc gia từ IP
│   │   ├── ai/
│   │   │   ├── types.ts                       # Interface IAIProvider & schemas
│   │   │   ├── prompt-builder.ts              # Trình dựng Prompt theo ma trận giáo dục
│   │   │   ├── ai-factory.ts                  # Factory pattern cấp phát AI Adapter
│   │   │   └── providers/
│   │   │       ├── gemini.provider.ts         # Adapter Google Gemini
│   │   │       ├── openai.provider.ts         # Adapter OpenAI GPT
│   │   │       └── self-hosted.provider.ts    # Adapter vLLM / Ollama (OpenAI-compatible)
│   │   ├── storage/
│   │   │   └── storage-manager.ts             # Quản lý đọc/ghi file đề thi nguyên tử
│   │   ├── logger/
│   │   │   └── audit-logger.ts                # Ghi log kép (Winston Rotating + MariaDB)
│   │   ├── mail/
│   │   │   ├── types.ts                       # Định nghĩa Jobs gửi mail
│   │   │   ├── mail.queue.ts                  # Producer hàng đợi BullMQ
│   │   │   └── mail.worker.ts                 # Consumer worker gửi mail qua SMTP
│   │   └── docs/
│   │       └── openapi-spec.ts                # OpenAPI 3.0.3 Specification
│   └── app/
│       ├── layout.tsx                         # Root Layout
│       ├── page.tsx                           # Trang chủ & bảng điều khiển trạng thái
│       ├── globals.css                        # CSS Design Tokens & Glassmorphism
│       ├── setup/
│       │   └── page.tsx                       # Giao diện thiết lập tài khoản Master Admin
│       ├── docs/
│       │   ├── page.tsx                       # Trang tài liệu Swagger UI
│       │   └── swagger-view.tsx               # Client component render Swagger UI
│       └── api/
│           └── v1/
│               ├── setup/route.ts             # Endpoint thiết lập hệ thống (khóa vĩnh viễn)
│               ├── auth/                      # Endpoint Đăng nhập / Đăng xuất / Profile
│               ├── curriculum/                # Endpoint truy vấn cây chương trình học
│               ├── exams/generate/route.ts    # Pipeline sinh đề thi AI hoàn chỉnh
│               └── docs/                      # Endpoint xuất file openapi.json & openapi.yaml
└── tests/
    ├── security/
    │   └── prompt-guard.test.ts               # Bộ 10 test case kiểm thử PromptGuard
    └── ai/
        └── ai-factory.test.ts                 # Kiểm thử AI Strategy Factory & Prompt Builder
```

---

## 🛠️ Công nghệ sử dụng (Technology Stack)

| Hạng mục | Công nghệ | Chi tiết sử dụng |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Server Components, Route Handlers, Edge/Node Runtime |
| **Ngôn ngữ** | TypeScript 5 (Strict) | Kiểu dữ liệu chặt chẽ cho toàn bộ dự án |
| **Cơ sở dữ liệu** | MariaDB 11.4 | Lưu trữ người dùng, cài đặt, cây CTGD, đề thi, audit log |
| **ORM** | Prisma ORM 6 | Schema-driven migrations, type-safe queries |
| **Cache & Queue** | Redis 7.2 (ioredis, BullMQ) | Sliding window rate limiting, session cache, async mail |
| **Bảo mật** | PromptGuard, geoip-lite, jose, bcryptjs | Chống jailbreak AI, giải mã GeoIP, mã hóa mật khẩu |
| **AI Providers** | Google Gemini, OpenAI, vLLM / Ollama | Strategy Pattern (`IAIProvider`) |
| **Logging** | Winston, Winston Daily Rotate File | Xoay vòng file log tự động theo ngày |
| **API Docs** | Swagger UI React, OpenAPI 3.0.3, YAML | Tài liệu API tương tác trực tiếp |

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Quickstart Guide)

Dự án được tối ưu hóa để chạy trực tiếp trên máy chủ / máy cá nhân bằng **Node.js**, không bắt buộc dùng Docker. Docker Compose được cung cấp dưới dạng tùy chọn bổ sung cho môi trường container.

### 1. Yêu cầu hệ thống (Prerequisites)
- **Node.js**: Phiên bản `>= 20.x` (Khuyên dùng `v22.x LTS`)
- **MariaDB / MySQL**: Đang chạy cục bộ (port `3306`) hoặc máy chủ từ xa
- **Redis Server**: Đang chạy cục bộ (port `6379`) hoặc máy chủ từ xa
- **npm** (đi kèm Node.js) hoặc **pnpm**

---

### 2. Cài đặt trực tiếp (Native / Local Development - Mặc định)

#### Bước 1: Clone mã nguồn & Cài đặt dependencies
```bash
git clone https://github.com/chuyentinnbk/Examify.git
cd Examify

npm install
```

#### Bước 2: Cấu hình biến môi trường
Sao chép file cấu hình mẫu:
```bash
cp .env.example .env
```
Mở `.env` và cập nhật chuỗi kết nối phù hợp với máy chủ của bạn:
```env
# 1. Cơ sở dữ liệu MariaDB cục bộ / từ xa
DATABASE_URL="mysql://root:your_password@localhost:3306/examify_db"

# 2. Redis Cục bộ / từ xa
REDIS_URL="redis://localhost:6379"

# 3. Chế độ Debug (true: in chi tiết query log & AI rotation; false: terminal sạch sẽ)
DEBUG=false

# 4. Khóa bảo mật JWT (tối thiểu 32 ký tự)
JWT_SECRET="super_secret_jwt_encryption_key_change_me_in_production_min_32_chars"

# 5. Cấu hình AI Đa Token & Đa Model với Auto-Fallback
DEFAULT_AI_PROVIDER=gemini
# Hỗ trợ nhiều API key (ngăn cách bằng dấu phẩy) tự động xoay tua & hồi phục cooldown
GEMINI_API_KEY="AIzaSyKey1, AIzaSyKey2, AIzaSyKey3"
# Hỗ trợ danh sách model tự động chuyển đổi dự phòng khi gặp 429 hoặc quá tải
GEMINI_MODEL="gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash"

OPENAI_API_KEY="sk-key1, sk-key2"
OPENAI_MODEL="gpt-4o-mini, gpt-4o"

# 6. Cấu hình Email với Multi-SMTP Fallback
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
# SMTP Dự phòng (tự động chuyển sang khi máy chủ chính gặp sự cố)
SMTP_BACKUP_HOST=smtp.backup-provider.com
SMTP_BACKUP_PORT=587
SMTP_BACKUP_USER=backup_user
SMTP_BACKUP_PASSWORD=backup_pass
```

> [!TIP]
> Nếu bạn sử dụng Linux, hãy đảm bảo MariaDB và Redis đã được khởi động:
> ```bash
> sudo systemctl start mariadb redis
> ```

#### Bước 3: Đồng bộ Database Schema (Prisma ORM)
```bash
# Sinh Prisma Client
npm run db:generate

# Tự động tạo bảng & khóa ngoại trong cơ sở dữ liệu MariaDB
npm run db:push
```

#### Bước 4: Khởi chạy máy chủ phát triển
```bash
npm run dev
```
🌐 Truy cập ứng dụng tại: **[http://localhost:3000](http://localhost:3000)**  
📖 Xem tài liệu Swagger UI tại: **[http://localhost:3000/docs](http://localhost:3000/docs)**

#### Bước 5: Khởi chạy Mail Worker xử lý email ngầm (Tùy chọn)
Trong một cửa sổ terminal khác:
```bash
npm run worker:mail
```

---

### 3. Triển khai với Docker Compose (Tùy chọn / Optional)

Nếu bạn muốn chạy ứng dụng đóng gói trong container hoặc không muốn cài MariaDB/Redis trực tiếp lên máy:

#### Cách A: Chỉ chạy MariaDB & Redis qua Docker (Khuyên dùng khi dev)
```bash
# Khởi động MariaDB và Redis container
docker compose up -d mariadb redis

# Sau đó chạy lệnh Prisma và Next.js trên máy host
npm run db:push
npm run dev
```

#### Cách B: Chạy toàn bộ hệ thống (App + MariaDB + Redis + Worker) bằng Docker
```bash
# Build và khởi chạy tất cả 4 services trong nền
docker compose up -d --build

# Xem logs thời gian thực
docker compose logs -f app
```

---

## 🧪 Kiểm thử tự động (Automated Testing)

Dự án đi kèm các bộ unit test chuyên biệt cho bảo mật và AI:

```bash
# 1. Kiểm thử động cơ chống Prompt Injection & Jailbreak (PromptGuard)
npm run test:security

# 2. Kiểm thử tính hợp lệ của schema Prisma
npx prisma validate

# 3. Kiểm tra kiểu dữ liệu TypeScript (0 errors)
npx tsc --noEmit

# 4. Kiểm tra biên dịch bản dựng Production
npm run build
```

---

## 🧭 Hướng dẫn luồng sử dụng (System Workflow)

1. **Khởi tạo hệ thống lần đầu**:
   - Truy cập **`http://localhost:3000/setup`**.
   - Nhập thông tin Trường/Tổ chức, Họ tên và Mật khẩu của **Master Admin**.
   - Nhấn **Initialize & Lock Setup**. Hệ thống sẽ tự động cấu hình cây chương trình học mặc định và khóa endpoint setup vĩnh viễn.

2. **Tra cứu tài liệu API**:
   - Truy cập **`http://localhost:3000/docs`** để xem giao diện Swagger UI tương tác.
   - Nhập token xác thực (JWT) tại nút `Authorize` để thử nghiệm trực tiếp các API được bảo vệ.

3. **Tạo đề thi với AI**:
   - Gửi yêu cầu `POST /api/v1/exams/generate` kèm thông tin môn học, dạng đề, ma trận câu hỏi và chỉ thị bổ sung.
   - Hệ thống tự động kiểm tra bảo mật bằng `PromptGuard`, gọi mô hình AI tương ứng, lưu trữ file JSON tại `/storage/exams/`, ghi log kiểm toán và gửi mail thông báo.

---

## 📜 Danh mục API chính (Key API Endpoints)

| Phương thức | Endpoint | Mô tả | Quyền truy cập |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/setup` | Kiểm tra trạng thái khởi tạo của hệ thống | Public |
| `POST` | `/api/v1/setup` | Khởi tạo tài khoản Master Admin (Chỉ chạy 1 lần) | Public (Chưa khởi tạo) |
| `POST` | `/api/v1/auth/login` | Đăng nhập hệ thống & cấp phát JWT + Session | Public |
| `POST` | `/api/v1/auth/logout` | Đăng xuất & thu hồi token trong Redis | Authenticated |
| `GET` | `/api/v1/auth/me` | Lấy thông tin tài khoản hiện tại | Authenticated |
| `GET` | `/api/v1/curriculum` | Lấy toàn bộ cây danh mục chương trình học | Authenticated |
| `POST` | `/api/v1/exams/generate` | Tạo đề thi mới bằng AI | `TEACHER`, `ADMIN` |
| `GET` | `/api/v1/docs/openapi.json` | Tải về đặc tả OpenAPI dạng JSON | Public |
| `GET` | `/api/v1/docs/openapi.yaml` | Tải về đặc tả OpenAPI dạng YAML | Public |

---

## 📄 Bản quyền (License)

Dự án được xây dựng và phát triển bởi đội ngũ **Examify**. Bảo lưu mọi quyền.
