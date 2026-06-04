import './globals.css';
import React from 'react';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'A 股实时行情看板',
  description: 'YMM Financial Manage realtime A share dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
