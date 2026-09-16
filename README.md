# 🎓 Examify — Production-Ready Full-Stack AI Exam Generation System

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Next.js%2015%20(App%20Router)-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Language-TypeScript%205-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Database-MariaDB%20%7C%20Prisma%20ORM-003545?style=for-the-badge&logo=mariadb" alt="MariaDB" />
  <img src="https://img.shields.io/badge/Cache%20%26%20Queue-Redis%20%7C%20BullMQ-DC382D?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Math-KaTeX%20Live%20Sync-green?style=for-the-badge&logo=latex" alt="KaTeX" />
  <img src="https://img.shields.io/badge/Docs-Scalar%20OpenAPI%203.0-blueviolet?style=for-the-badge&logo=openapi-initiative" alt="Scalar Docs" />
  <img src="https://img.shields.io/badge/Security-PromptGuard%20%26%202FA%20TOTP-10B981?style=for-the-badge&logo=security" alt="Security" />
</p>

---

## 📌 Giới thiệu tổng quan (Overview)

**Examify** là nền tảng tạo và quản lý đề thi học thuật thông minh ứng dụng Trí tuệ nhân tạo (AI), được thiết kế theo tiêu chuẩn Enterprise Architecture phục vụ các trường học, giáo viên và tổ chức giáo dục chuẩn chương trình GDPT 2018 cũng như bậc Đại học/Cao đẳng.

Hệ thống hoạt động độc lập hoàn toàn (**Self-Hosted**), **không phụ thuộc vào Cloudflare hay các dịch vụ Gateway bên thứ ba**, tự vận hành lớp bảo mật với Redis Sliding Window Rate Limiter, GeoIP Resolver, cơ chế phòng chống tấn công Prompt Injection (**PromptGuard**), xác thực 2 lớp (**2FA TOTP**) và bảng điều khiển quản trị AI Multi-Key Pool thời gian thực.

---

## ✨ Tính năng cốt lõi (Core Features)

### 1. 🤖 Kiến trúc Đa Mô hình AI & Xoay tua Multi-Key Pool (Multi-AI & Key Pool Rotation)
- **Đa nhà cung cấp AI (Strategy Pattern)**: Hỗ trợ linh hoạt thông qua chuẩn `IAIProvider`:
  - **Google Gemini**: Hỗ trợ các model thế hệ mới nhất (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-pro`).
  - **OpenAI**: Tích hợp các model flagship (`gpt-4o`, `gpt-4o-mini`, `o1`, `o3`).
  - **Anthropic Claude**: Tích hợp Claude 3.5 Sonnet và Claude 3.7 Sonnet với khả năng lập luận sắc bén.
  - **Self-Hosted LLMs**: Tương thích hoàn toàn với các mô hình tự host như **vLLM**, **Ollama**, **LocalAI**, **TGI** qua endpoint OpenAI-compatible (`/v1/chat/completions`).
  - **Custom MCP**: Hỗ trợ kết nối chuẩn Model Context Protocol.
- **Dynamic Multi-Key Pool**: Cho phép cấu hình nhiều API key trên từng provider, tự động xoay tua Round-Robin, hồi phục cooldown khi gặp Rate Limit (HTTP 429) và đo độ trễ mạng (Ping latency ms) ngay trên giao diện quản trị.
- **Real-Time Model Fetching**: Tải trực tiếp danh sách mô hình từ official API endpoints của Google, OpenAI và Anthropic.
- **Token Enforcement Guard**: Tự động phát hiện và khóa (disable) các AI Provider chưa cấu hình key/token trong giao diện tạo đề, tự động chuyển về provider sẵn sàng.

### 2. 🛡️ Động cơ Chống Trùng Lặp Câu Hỏi Tuyệt Đối (Zero-Duplication Engine)
- **Ràng buộc Prompt Engineering**: Buộc LLM sinh đề với 100% câu hỏi độc lập về tham số, ngữ cảnh và dữ liệu.
- **Post-Generation Signature Deduplication**: Thuật toán quét chữ ký định danh hash câu hỏi ở tầng backend; nếu phát hiện trùng lặp sẽ tự động thay thế bằng câu hỏi mới cùng cấp độ Bloom.
- **Ngân hàng câu hỏi GDPT 2018 & Sinh biến thiên (Procedural Generation)**: Tích hợp sẵn hàng chục câu hỏi chuẩn môn học (Toán, Lý, Hóa, Sinh, Anh, Văn, Sử, Địa, Tin) với cơ chế biến thiên tham số ngẫu nhiên không giới hạn.
- **Tạo lại câu hỏi đơn lẻ (Regenerate Question)**: Nhận biết toàn bộ câu hỏi hiện hữu trên đề để không bao giờ sinh câu trùng lặp.

### 3. 📐 Trình Soạn Thảo Đề Thi 2 Cột & KaTeX Live Preview
- **Giao diện Split-View chuyên nghiệp**:
  - **Cột trái**: Soạn thảo văn bản thô, mã công thức LaTeX (`$...$` và `$$...$$`), tùy chỉnh câu hỏi, 4 phương án lựa chọn và lời giải chi tiết.
  - **Cột phải**: Bản xem trước trực quan (KaTeX Live Preview) tự động đồng bộ thời gian thực theo từng ký tự gõ.
- **Hỗ trợ công thức đa môn học**: Toán học, Vật lý, Hóa học, Sinh học chuẩn ký hiệu khoa học quốc tế.

### 4. 📄 Xuất Bản Đề Thi Đa Định Dạng (Multi-Format Export)
- **Xuất Microsoft Word (`.docx`)**: Tạo file Word định dạng chuẩn thi cử của Bộ GD&ĐT, bao gồm tiêu đề trường, mã đề, bảng đáp án và hướng dẫn giải chi tiết.
- **In trực tiếp & Xuất PDF**: Hỗ trợ giao diện xem trước khi in (`window.print()`) chuẩn khổ giấy A4, ẩn các thanh công cụ điều hướng.
- **Lưu trữ JSON nguyên tử**: Lưu file cấu trúc tại thư mục `/storage/exams/{year}/{month}/{examId}.json`.

### 5. 🔒 Bảo Mật Cấp Doanh Nghiệp & Zero-Day Setup (Enterprise Security)
- **Zero-Day Setup & Permanent Lock**: Khi hệ thống mới triển khai, người dùng được chuyển hướng đến trang `/setup` để tạo Master Admin. Sau khi hoàn tất, hệ thống kích hoạt cơ chế khóa vĩnh viễn (`is_locked: true` trong bảng `SystemSetting`), tự động chặn mọi truy cập trái phép.
- **Xác thực 2 lớp (2FA TOTP)**: Tích hợp trình tạo mã QR tương thích với Google Authenticator / Authy để tăng cường bảo vệ tài khoản.
- **Sliding Window Rate Limiter**: Kiểm soát tần suất gọi API theo thuật toán cửa sổ trượt lưu trữ trên Redis.
- **GeoIP Resolver Cục Bộ**: Định danh quốc gia của IP truy cập trực tiếp bằng `geoip-lite` không qua dịch vụ đám mây bên ngoài.
- **JWT & Redis Session Revocation**: Kiểm tra tính hợp lệ của token và phiên làm việc theo thời gian thực; hỗ trợ thu hồi token lập tức khi đăng xuất.
- **PromptGuard Engine**: Bộ lọc phát hiện và vô hiệu hóa tấn công Prompt Injection, Jailbreak (DAN mode), Delimiter Hijacking, trích xuất System Prompt và API Key.

### 6. ⚙️ Bảng Điều Khiển Quản Trị Toàn Diện (Admin Console)
- **Quản lý AI Settings trực tiếp**: Thêm, xóa, test từng API Key, xem masked tokens, tùy chỉnh Daily Token Quota, Max Tokens và Temperature.
- **Quản lý người dùng**: Xem danh sách tài khoản, phân quyền (`ADMIN`, `TEACHER`, `STUDENT`), kích hoạt/vô hiệu hóa tài khoản.
- **Nhật ký kiểm toán kép (Dual-Channel Audit Log)**: Ghi đồng thời vào cơ sở dữ liệu MariaDB (`AuditLog`) và hệ thống xoay vòng file hằng ngày (**Winston Daily Rotate File**) tại `/storage/logs/`.

### 7. 📖 Tài liệu API Chuẩn Scalar OpenAPI 3.0
- Tích hợp tài liệu trực quan hiện đại bằng **Scalar API Reference** tại `/docs`.
- Cung cấp raw spec: `/api/v1/docs/openapi.json` và `/api/v1/docs/openapi.yaml`.

### 8. 📨 Hàng Đợi Gửi Email Bất Đồng Bộ (BullMQ Mail Engine)
- Hàng đợi tin nhắn Redis xử lý gửi email giao dịch ngầm qua SMTP riêng biệt.
- Hỗ trợ cơ chế tự động chuyển sang máy chủ SMTP dự phòng (**Multi-SMTP Fallback**) và tự động thử lại theo cấp số nhân (*Exponential Backoff*).

---

## 🏗️ Cấu trúc thư mục (Directory Layout)

```
Examify/
├── .env.example                               # Mẫu cấu hình biến môi trường
├── docker-compose.yml                         # Cấu hình MariaDB, Redis, App, Mail Worker
├── Dockerfile                                 # Dockerfile đa tầng cho Next.js Production
├── Dockerfile.worker                          # Dockerfile cho BullMQ Mail Worker
├── next.config.mjs                            # Cấu hình Next.js server external packages
├── package.json                               # Danh sách thư viện và scripts
├── tsconfig.json                              # Cấu hình TypeScript strict mode
├── prisma/
│   └── schema.prisma                          # Schema MariaDB (Models, Enums, Relations)
├── storage/
│   ├── exams/                                 # File đề thi JSON nguyên tử (.gitkeep)
│   └── logs/                                  # File nhật ký xoay vòng theo ngày (.gitkeep)
├── src/
│   ├── middleware.ts                          # Edge Middleware (GeoIP, Rate Limit, Session Gate)
│   ├── instrumentation.ts                     # Khởi tạo dịch vụ nền khi server Next.js boot
│   ├── lib/
│   │   ├── db.ts                              # Singleton Prisma Client
│   │   ├── redis.ts                           # Singleton ioredis Client
│   │   ├── utils.ts                           # Tiện ích API response chuẩn hóa
│   │   ├── export-exam.ts                     # Xuất đề thi sang file Word (.docx) & In ấn
│   │   ├── curriculum-questions.ts            # Ngân hàng câu hỏi GDPT 2018 & sinh biến thiên
│   │   ├── gravatar.ts                        # Sinh ảnh đại diện Gravatar theo email
│   │   └── store/
│   │       └── app-store.tsx                  # Global State Store (Auth, Route, Notifications)
│   ├── components/
│   │   ├── common/
│   │   │   ├── MathText.tsx                   # Component render công thức KaTeX ($...$, $$...$$)
│   │   │   └── UserAvatar.tsx                 # Avatar người dùng kèm hỗ trợ Gravatar
│   │   ├── layout/
│   │   │   ├── Header.tsx                     # Thanh điều hướng trên cùng (User info, 2FA status)
│   │   │   ├── Sidebar.tsx                    # Sidebar điều hướng chức năng
│   │   │   └── Toast.tsx                      # Hệ thống thông báo toast notification
│   │   └── views/
│   │       ├── DashboardView.tsx              # Bảng tin tổng quan, thống kê & đề thi gần đây
│   │       ├── CreateExamView.tsx             # Giao diện tạo đề thi AI (Token-guarded, live models)
│   │       ├── EditorView.tsx                 # Soạn thảo đề thi 2 cột & KaTeX Live Preview
│   │       ├── AdminView.tsx                  # Quản trị hệ thống, Multi-Key Pool, Logs, Users
│   │       ├── ProfileView.tsx                # Hồ sơ cá nhân, đổi mật khẩu, kích hoạt 2FA TOTP
│   │       ├── LoginView.tsx                  # Đăng nhập hệ thống & xác thực 2FA
│   │       └── SetupWizardView.tsx            # Trình hướng dẫn khởi tạo Master Admin lần đầu
│   ├── core/
│   │   ├── security/
│   │   │   ├── prompt-guard.ts                # Động cơ phòng chống Prompt Injection & Jailbreak
│   │   │   ├── rate-limiter.ts                # Sliding Window Rate Limiter (Redis)
│   │   │   ├── edge-rate-limiter.ts           # Sliding Window Rate Limiter (Edge in-memory)
│   │   │   ├── jwt.ts                         # Quản lý JWT & Session Redis
│   │   │   ├── edge-jwt.ts                    # Xác thực JWT chuẩn Web Crypto trên Edge
│   │   │   ├── totp.ts                        # Tạo khóa bí mật, mã QR & xác thực mã 2FA TOTP
│   │   │   └── geoip-resolver.ts              # Định vị quốc gia từ IP bằng geoip-lite
│   │   ├── ai/
│   │   │   ├── types.ts                       # Interface IAIProvider & types
│   │   │   ├── key-pool.ts                    # Quản lý xoay tua Multi-Key Pool & Health Check
│   │   │   ├── prompt-builder.ts              # Dựng prompt ma trận đề thi & chống trùng lặp
│   │   │   ├── ai-factory.ts                  # Factory pattern cấp phát AI Adapter
│   │   │   └── providers/
│   │   │       ├── gemini.provider.ts         # Adapter Google Gemini (2.0-flash, 1.5-pro, ...)
│   │   │       ├── openai.provider.ts         # Adapter OpenAI GPT-4o, o1, o3
│   │   │       ├── claude.provider.ts         # Adapter Anthropic Claude 3.5 / 3.7 Sonnet
│   │   │       └── self-hosted.provider.ts    # Adapter vLLM / Ollama (OpenAI-compatible)
│   │   ├── storage/
│   │   │   └── storage-manager.ts             # Quản lý đọc/ghi file đề thi JSON nguyên tử
│   │   ├── logger/
│   │   │   └── audit-logger.ts                # Ghi log kép (Winston Daily Rotate + MariaDB)
│   │   ├── mail/
│   │   │   ├── types.ts                       # Định nghĩa Jobs gửi mail
│   │   │   ├── mail.queue.ts                  # Producer hàng đợi BullMQ
│   │   │   └── mail.worker.ts                 # Consumer worker gửi mail qua SMTP
│   │   └── docs/
│   │       └── openapi-spec.ts                # OpenAPI 3.0.3 Specification
│   └── app/
│       ├── layout.tsx                         # Root Layout
│       ├── page.tsx                           # Single Page Architecture & Route Guard
│       ├── globals.css                        # CSS Design Tokens, Glassmorphism & Animations
│       ├── docs/
│       │   ├── page.tsx                       # Trang tài liệu Scalar API
│       │   └── scalar-view.tsx                # Client component render Scalar OpenAPI
│       └── api/
│           └── v1/
│               ├── setup/                     # Khởi tạo hệ thống & test kết nối ban đầu
│               ├── auth/                      # Đăng nhập, Đăng xuất, Profile, 2FA, Đổi mật khẩu
│               ├── ai/                        # Quản trị Multi-Key Pool (/settings) & Live Models
│               ├── curriculum/                # Truy vấn cây chương trình học GDPT
│               ├── exams/                     # Danh sách, Chi tiết, Sinh đề AI & Tạo lại câu hỏi
│               └── docs/                      # Xuất openapi.json & openapi.yaml
└── tests/
    ├── security/
    │   └── prompt-guard.test.ts               # Bộ test kiểm thử PromptGuard
    └── ai/
        └── ai-factory.test.ts                 # Kiểm thử AI Strategy Factory & Prompt Builder
```

---

## 🛠️ Công nghệ sử dụng (Technology Stack)

| Hạng mục | Công nghệ | Chi tiết sử dụng |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.2 (App Router) | React 19, Server Components, Route Handlers |
| **Ngôn ngữ** | TypeScript 5.8 (Strict) | Hệ thống kiểu dữ liệu an toàn toàn dự án |
| **Cơ sở dữ liệu** | MariaDB 11.4 | Lưu trữ Users, Settings, Curriculum, Exams, Audit Logs |
| **ORM** | Prisma ORM 6.4 | Type-safe migrations, dynamic querying |
| **Cache & Queue** | Redis 7.2 (ioredis, BullMQ) | Sliding window rate limiter, sessions, background mailer |
| **Hiển thị Toán học** | KaTeX 0.18 | Render công thức Toán/Lý/Hóa LaTeX thời gian thực |
| **Xuất bản đề thi** | Docx 9.7 | Xuất đề thi và bảng đáp án ra định dạng Microsoft Word |
| **Bảo mật** | PromptGuard, 2FA TOTP, geoip-lite, jose, bcryptjs | Chống Prompt Injection, xác thực 2FA, giải mã GeoIP, JWT |
| **AI Providers** | Google Gemini, OpenAI, Claude, vLLM / Ollama | Multi-AI Strategy, Multi-Key Pool Rotation |
| **Ghi nhật ký** | Winston 3.17 & Winston Daily Rotate File | Xoay vòng file log theo ngày + lưu trữ database |
| **API Documentation** | Scalar (@scalar/api-reference-react) | Giao diện tài liệu tương tác OpenAPI 3.0.3 hiện đại |

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Quickstart Guide)

### 1. Yêu cầu hệ thống (Prerequisites)
- **Node.js**: Phiên bản `>= 20.x` (Khuyên dùng `v22.x LTS`)
- **MariaDB / MySQL**: Đang chạy cục bộ (port `3306`) hoặc server từ xa
- **Redis Server**: Đang chạy cục bộ (port `6379`) hoặc server từ xa
- **npm** (kèm Node.js) hoặc **pnpm**

---

### 2. Cài đặt trực tiếp (Local Development)

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
Mở `.env` và cập nhật thông số kết nối:
```env
# 1. Kết nối MariaDB
DATABASE_URL="mysql://root:your_password@localhost:3306/examify_db"

# 2. Kết nối Redis
REDIS_URL="redis://localhost:6379"

# 3. Chế độ Debug (true: in chi tiết query log & AI rotation; false: terminal sạch sẽ)
DEBUG=false

# 4. Khóa bí mật JWT (tối thiểu 32 ký tự)
JWT_SECRET="super_secret_jwt_encryption_key_change_me_in_production_min_32_chars"

# 5. Cấu hình AI Provider mặc định
DEFAULT_AI_PROVIDER=gemini

# Cấu hình Google Gemini (Hỗ trợ Multi-Key Pool phân tách bằng dấu phẩy)
GEMINI_API_KEY="AIzaSyKey1, AIzaSyKey2"
GEMINI_MODEL="gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro"

# Cấu hình OpenAI (Tùy chọn)
OPENAI_API_KEY="sk-key1, sk-key2"
OPENAI_MODEL="gpt-4o-mini, gpt-4o"

# Cấu hình Anthropic Claude (Tùy chọn)
CLAUDE_API_KEY="sk-ant-api03-key1"
CLAUDE_MODEL="claude-3-5-sonnet-20241022"

# Cấu hình Mô hình Self-Hosted / Ollama / vLLM (Tùy chọn)
SELF_HOSTED_BASE_URL="http://localhost:11434/v1"
SELF_HOSTED_MODEL="llama3.1:8b"

# 6. Cấu hình Gửi Email (SMTP Chính & SMTP Dự phòng)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password

SMTP_BACKUP_HOST=smtp.backup-provider.com
SMTP_BACKUP_PORT=587
SMTP_BACKUP_USER=backup_user
SMTP_BACKUP_PASSWORD=backup_pass
```

> [!TIP]
> Nếu bạn chạy trên Linux (Ubuntu/Debian), hãy khởi động MariaDB và Redis:
> ```bash
> sudo systemctl start mariadb redis
> ```

#### Bước 3: Đồng bộ Database Schema (Prisma ORM)
```bash
# Sinh Prisma Client
npm run db:generate

# Tự động tạo bảng & khóa ngoại trong MariaDB
npm run db:push
```

#### Bước 4: Khởi chạy máy chủ phát triển
```bash
npm run dev
```
🌐 Truy cập ứng dụng: **[http://localhost:3000](http://localhost:3000)**  
📖 Xem tài liệu Scalar API: **[http://localhost:3000/docs](http://localhost:3000/docs)**

#### Bước 5: Chạy Worker gửi email ngầm (Tùy chọn)
Trong một terminal khác:
```bash
npm run worker:mail
```

---

### 3. Triển khai với Docker Compose (Tùy chọn)

#### Cách A: Chỉ chạy MariaDB & Redis qua Docker (Khuyên dùng khi dev)
```bash
# Khởi động container MariaDB và Redis
docker compose up -d mariadb redis

# Thực thi Prisma và chạy ứng dụng trên máy chủ thật
npm run db:push
npm run dev
```

#### Cách B: Chạy toàn bộ hệ thống bằng Docker
```bash
# Build và chạy trọn bộ 4 container: app, worker, mariadb, redis
docker compose up -d --build

# Theo dõi nhật ký container ứng dụng
docker compose logs -f app
```

---

## 🧭 Hướng dẫn luồng sử dụng (System Workflow)

1. **Khởi tạo hệ thống lần đầu (Zero-Day Setup)**:
   - Truy cập `http://localhost:3000`. Hệ thống tự động chuyển sang giao diện Setup Wizard.
   - Điền thông tin trường học, họ tên và mật khẩu cho **Master Admin**.
   - Nhấn **Khởi Tạo Hệ Thống & Khóa Vĩnh Viễn**. Endpoint `/setup` sẽ được khóa hoàn toàn.

2. **Quản trị AI & Multi-Key Pool**:
   - Đăng nhập với tài khoản Admin, vào mục **Quản Trị Hệ Thống** $\rightarrow$ Tab **Cấu hình AI & Token Pool**.
   - Bổ sung nhiều API Key cho Gemini, OpenAI, Claude; nhấn **Test riêng Key này** để kiểm tra tính hợp lệ và đo độ trễ.
   - Thiết lập Daily Quota và Token Limit theo nhu cầu sử dụng của nhà trường.

3. **Tạo và Biên tập Đề Thi**:
   - Vào mục **Tạo Đề Thi Mới**, chọn cấp học, khối lớp, môn học, phân loại đề thi (15 phút, Giữa kỳ, Cuối kỳ).
   - Chọn nhà cung cấp AI sẵn sàng (hệ thống tự động khóa nhà cung cấp chưa có token).
   - Bấm **Bắt Đầu Sinh Đề Thi**. Hệ thống sẽ kiểm tra PromptGuard, kích hoạt AI sinh câu hỏi không trùng lặp.
   - Chuyển sang **Trình Soạn Thảo Đề Thi**: Chỉnh sửa nội dung câu hỏi bên trái, xem kết quả render công thức KaTeX toán học trực tiếp bên phải.
   - Nhấn **Tải Word (.docx)** để xuất đề thi chuẩn in ấn hoặc **In Đề Thi** để xuất PDF.

4. **Bảo mật tài khoản với 2FA TOTP**:
   - Truy cập **Hồ Sơ Cá Nhân**, bấm **Kích hoạt 2FA (Google Authenticator)**.
   - Quét mã QR bằng ứng dụng Authenticator và nhập mã 6 số để kích hoạt.

---

## 📜 Danh mục API chính (Key API Endpoints)

| Phương thức | Endpoint | Mô tả | Quyền hạn |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/setup` | Kiểm tra trạng thái khởi tạo hệ thống | Public |
| `POST` | `/api/v1/setup` | Khởi tạo tài khoản Master Admin (chỉ 1 lần) | Public (Chưa thiết lập) |
| `POST` | `/api/v1/setup/test-connection` | Kiểm tra kết nối Database & AI Key live | Public (Setup) / Admin |
| `POST` | `/api/v1/auth/login` | Đăng nhập hệ thống (hỗ trợ xác thực 2FA OTP) | Public |
| `POST` | `/api/v1/auth/logout` | Đăng xuất & thu hồi token trong Redis Session | Authenticated |
| `GET` | `/api/v1/auth/me` | Lấy thông tin tài khoản hiện tại | Authenticated |
| `PUT` | `/api/v1/auth/profile` | Cập nhật thông tin cá nhân & trường học | Authenticated |
| `POST` | `/api/v1/auth/change-password` | Đổi mật khẩu tài khoản | Authenticated |
| `POST` | `/api/v1/auth/2fa/setup` | Tạo khóa bí mật & mã QR kích hoạt 2FA | Authenticated |
| `POST` | `/api/v1/auth/2fa/verify` | Xác thực mã OTP và kích hoạt 2FA | Authenticated |
| `POST` | `/api/v1/auth/2fa/toggle` | Tắt chế độ xác thực 2FA | Authenticated |
| `GET` | `/api/v1/ai/settings` | Lấy danh sách AI Providers, masked keys, models | `ADMIN` |
| `POST` | `/api/v1/ai/settings` | Cập nhật Multi-API Key Pool & thông số AI | `ADMIN` |
| `GET` | `/api/v1/ai/models` | Lấy danh sách model thời gian thực từ official API | Authenticated |
| `GET` | `/api/v1/curriculum` | Truy vấn cây chương trình giáo dục phổ thông | Authenticated |
| `GET` | `/api/v1/exams` | Lấy danh sách đề thi theo bộ lọc và tìm kiếm | Authenticated |
| `POST` | `/api/v1/exams` | Lưu trữ đề thi mới hoặc cập nhật đề thi | `TEACHER`, `ADMIN` |
| `GET` | `/api/v1/exams/:id` | Xem chi tiết nội dung đề thi | Authenticated |
| `POST` | `/api/v1/exams/generate` | Sinh đề thi AI với động cơ chống trùng lặp | `TEACHER`, `ADMIN` |
| `POST` | `/api/v1/exams/regenerate-question` | Tạo lại câu hỏi đơn lẻ không bị trùng | `TEACHER`, `ADMIN` |
| `GET` | `/api/v1/docs/openapi.json` | Tải về OpenAPI specification dạng JSON | Public |
| `GET` | `/api/v1/docs/openapi.yaml` | Tải về OpenAPI specification dạng YAML | Public |

---

## 🧪 Kiểm thử & Đảm bảo chất lượng (Quality Assurance)

```bash
# 1. Kiểm thử động cơ chống Prompt Injection & Jailbreak (PromptGuard)
npm run test:security

# 2. Kiểm tra tính hợp lệ của schema Prisma
npx prisma validate

# 3. Kiểm tra kiểu dữ liệu TypeScript nghiêm ngặt (0 lỗi)
npx tsc --noEmit

# 4. Kiểm tra biên dịch bản dựng Production
npm run build
```

---

## 📄 Bản quyền (License)

Dự án được xây dựng và phát triển bởi đội ngũ **Examify**. Bảo lưu mọi quyền.
