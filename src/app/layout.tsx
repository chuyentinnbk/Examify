import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Examify AI - Hệ Thống Khảo Thí & Tạo Đề Thi Thông Minh',
  description:
    'Examify AI - Hệ Thống Khảo Thí & Tạo Đề Thi Chuẩn Hóa Bằng Trí Tuệ Nhân Tạo dành cho Giáo viên & Cán bộ Quản lý Giáo dục',
  icons: {
    icon: '/assets/images/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400..700,0..1,0&display=swap"
          rel="stylesheet"
        />
        {/* KaTeX CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        {/* Tailwind CSS CDN */}
        <script src="https://cdn.tailwindcss.com"></script>
        {/* App Design Tokens & Tailwind Configuration */}
        <script src="/assets/js/config.js"></script>

      </head>
      <body className="bg-background font-body-md text-on-surface antialiased select-auto min-h-screen">
        {children}
      </body>
    </html>
  );
}
