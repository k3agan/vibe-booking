import type { Metadata, Viewport } from "next";
import "./kiosk.css";

export const metadata: Metadata = {
  title: "AV Control — Capitol Hill Community Hall",
  description: "Projector control kiosk",
  manifest: "/manifest-kiosk.json",
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(145deg, #0a0a0f 0%, #111827 50%, #0a0a0f 100%)",
        color: "#ffffff",
        fontFamily:
          'var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {children}
    </div>
  );
}
