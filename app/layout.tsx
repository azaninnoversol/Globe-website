import "./globals.css";

export const metadata = {
  title: "Global Payments — One Network, No Middlemen",
  description: "Move money across 30+ countries in seconds, not days.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
