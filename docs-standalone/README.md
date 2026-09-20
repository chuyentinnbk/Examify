# Examify API Documentation (Standalone Package)

Gói tài liệu API độc lập (Standalone) hoàn chỉnh của hệ thống **Examify AI Assessment Engine**.
Toàn bộ đặc tả chuẩn **OpenAPI 3.0.3** đã được nhúng trực tiếp vào các tệp HTML (hoạt động 100% không lo lỗi CORS, có thể mở trực tiếp không cần server).

---

## 📁 Cấu Trúc Thư Mục

```
docs-standalone/
├── index.html        # Giao diện Scalar hiện đại, có playground test API trực tiếp (KHUYÊN DÙNG)
├── swagger.html      # Giao diện Swagger UI kinh điển
├── redoc.html        # Giao diện Redoc chuẩn văn bản 3 cột
├── openapi.json      # Đặc tả máy đọc được (dùng cho Postman / Insomnia)
├── openapi.yaml      # Đặc tả YAML (dùng cho CI/CD / Swagger)
└── README.md         # Hướng dẫn triển khai
```

---

## 🚀 Các Cách Triển Khai (Hosting) Riêng Biệt

### Cách 1: Chạy Thử Ngay Trên Máy Tính (Không Cần Cài Đặt Gì)
Bạn chỉ cần nhấp đúp (Double-click) trực tiếp vào tệp `index.html` trên máy tính. Trình duyệt sẽ mở tài liệu lên ngay lập tức!

Hoặc dùng lệnh chạy server tĩnh nhanh:
```bash
npx serve docs-standalone -p 8080
```
Mở: `http://localhost:8080`

---

### Cách 2: Đưa Lên GitHub Pages (Miễn Phí 100%)
1. Đưa thư mục này vào một repository trên GitHub (hoặc nhánh `gh-pages`).
2. Vào **Settings** của Repo -> Chọn mục **Pages**.
3. Chọn nhánh chính (hoặc `gh-pages`) và thư mục gốc (`/`).
4. Nhấn **Save**. Trang web tài liệu sẽ trực tiếp hoạt động tại:
   `https://<username>.github.io/<repo-name>/`

---

### Cách 3: Đưa Lên Cloudflare Pages / Vercel / Netlify
1. Kéo thả trực tiếp cả thư mục `docs-standalone` vào bảng điều khiển của:
   - **Cloudflare Pages**: Chọn *Upload Assets* -> Kéo thả thư mục -> Deploy.
   - **Netlify**: Kéo thả vào vùng *Deploy your site*.
2. Nhận ngay tên miền miễn phí cực nhanh, bảo mật SSL đầy đủ (ví dụ: `https://examify-api-docs.pages.dev`).

---

### Cách 4: Triển Khai Bằng Nginx
Tạo cấu hình Nginx đơn giản:
```nginx
server {
    listen 80;
    server_name api-docs.yourdomain.com;
    root /var/www/docs-standalone;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Cách 5: Chạy Bằng Docker (1 Lệnh Duy Nhất)
```bash
docker run -d --name examify-docs -p 8080:80 -v $(pwd):/usr/share/nginx/html:ro nginx:alpine
```
Truy cập: `http://localhost:8080`
