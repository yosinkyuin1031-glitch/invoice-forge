"use client";

import dynamic from "next/dynamic";

const InvoiceApp = dynamic(() => import("@/components/InvoiceApp"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex md:flex-col md:w-56 bg-white border-r min-h-screen">
        <div className="px-4 py-4 border-b">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <nav className="flex-1 px-2 py-3 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </nav>
      </aside>
      {/* Main content skeleton */}
      <div className="flex-1 px-4 py-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-24 bg-blue-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border">
              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return <InvoiceApp />;
}
