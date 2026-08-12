import "./globals.css";

export const metadata = {
  title: "Sistema de Sorteios",
  description: "Sorteios para eventos e campanhas promocionais",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
