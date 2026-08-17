import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "情報I Digital & Data Lab",
  description: "情報Iのデジタル分野とデータ活用分野を、実験と確認問題で学ぶ教材サイトです。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
