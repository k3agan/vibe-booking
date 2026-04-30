"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

/**
 * Conditionally renders Header and Footer based on the current route.
 * Kiosk routes (starting with /kiosk) are rendered without the site chrome.
 */
export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isKiosk = pathname?.startsWith("/kiosk") ?? false;

  if (isKiosk) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
