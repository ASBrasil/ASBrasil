import "./globals.css";

export const metadata = {
  title: "Sistema de Sorteios",
  description: "Sorteios para eventos e campanhas promocionais",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
