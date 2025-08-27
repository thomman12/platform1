// app/components/LayoutWrapper.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebarRoutes = ['/login', '/signup', '/signup/avatar'];
  const shouldHideSidebar = hideSidebarRoutes.includes(pathname);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!shouldHideSidebar && <Sidebar />}
      {/* Remove page padding when sidebar is hidden (auth pages) */}
      <main className={shouldHideSidebar ? 'flex-1 p-0' : 'flex-1 p-6'}>
        {children}
      </main>
    </div>
  );
}
