import type { Metadata } from "next";
import "./globals.css";

/** GitHub Pages では /info1_ddl_public が前につく */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "情報I Digital & Data Lab",
  description: "情報Iのデジタル分野とデータ活用分野を、実験と確認問題で学ぶ教材サイトです。",
  // 指定しないとブラウザが /favicon.ico を探しにいって404になる
  icons: { icon: `${basePath}/favicon.svg` }
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
