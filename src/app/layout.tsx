import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ملك التوقعات - فيفا٢٦",
  description: "توقعات كأس العالم فيفا ٢٠٢٦ لموظفي مجموعة المرشد القابضة",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --wc-red: #8B0000;
            --wc-blue: #0A1628;
            --wc-sky: #4FC3F7;
            --wc-gold: #FFD700;
            --wc-green: #2E7D32;
            --wc-dark: #0D1B2A;
            --bg-primary: #0A1628;
            --bg-card: #0F2137;
            --bg-card-hover: #152D4A;
            --text-primary: #FFFFFF;
            --text-secondary: #94A3B8;
            --text-muted: #64748B;
            --border-color: #1E3A5F;
            --gradient-hero: linear-gradient(135deg, #8B0000 0%, #0A1628 50%, #4FC3F7 100%);
            --gradient-header: linear-gradient(90deg, #8B0000 0%, #0A1628 100%);
            --gradient-card: linear-gradient(180deg, #0F2137 0%, #0A1628 100%);
            --pts-exact: #4CAF50;
            --pts-correct: #FFC107;
            --pts-wrong: #F44336;
            --pts-pending: #64748B;
          }
          body {
            background: var(--bg-primary) !important;
            color: var(--text-primary) !important;
            font-family: 'Tajawal', sans-serif !important;
            margin: 0;
          }
          .font-bebas { font-family: 'Bebas Neue', sans-serif; }
          .font-inter { font-family: 'Inter', sans-serif; }
          .gold-shimmer {
            background: linear-gradient(90deg, #FFD700, #FFA000, #FFD700);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 2s linear infinite;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fadeIn 0.3s ease-out; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: var(--bg-primary); }
          ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
        ` }} />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
