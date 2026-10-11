import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "百闻牌图鉴 · 卡牌数据与卡组模拟器",
  description:
    "《阴阳师：百闻牌》卡牌数据图鉴、式神评测与卡组模拟器，基于 Next.js + Supabase 构建。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
