import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ACTION_KINDS } from "./create/actionCatalog";

export const metadata: Metadata = {
  title: "한번만 | 도움을 다시 쓰는 버튼으로",
  description: `날씨·버스·사진부터 QR·길찾기·생활 계산까지, ${ACTION_KINDS.length}가지 작업을 말로 만들고 다시 쓰는 개인용 버튼.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f8f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
