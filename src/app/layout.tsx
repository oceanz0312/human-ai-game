import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUMAN / AI · 你比 AI 更快吗？",
  description: "大家来找茬：找出唯一不同，和真实 AI 同场比快。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="one-screen-app">
      <body className="one-screen-app">{children}</body>
    </html>
  );
}
