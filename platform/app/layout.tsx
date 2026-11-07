import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Roomsure — A little more peace of mind",
  description:
    "Your Roomsure account, identity and payments, together in one place.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
