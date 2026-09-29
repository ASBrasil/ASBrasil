import { db } from "@/lib/db";
import { EntrarForm } from "@/components/EntrarForm";
import { LoginEventsBanner } from "@/components/LoginEventsBanner";

export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  const featured = await db.event.findMany({
    where: { featuredOnLogin: true, active: true, archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, campaign: true, slug: true, loginBannerText: true },
  });

  return (
    <div className="as-shell page">
      <div className="brand">
        {/* espaço reservado para logo em imagem, a ser definida depois */}
        <strong>AS BRASIL</strong>
        <span>UNIVERSO AS</span>
      </div>

      <div className="as-card card">
        <div className="as-eyebrow">Bem-vindo de volta</div>
        <h1>Acompanhe seus sorteios em um só lugar</h1>
        <p className="as-subtitle">
          Digite o e-mail que você usou nas suas compras com a AS Brasil e veja seu número, os
          prêmios em disputa e os resultados de cada sorteio.
        </p>

        {featured.length > 0 && (
          <div className="banner-slot">
            <LoginEventsBanner events={featured} />
          </div>
        )}

        <EntrarForm />
      </div>

      <footer className="footer">
        © {new Date().getFullYear()} AS Brasil. Todos os direitos reservados.
      </footer>

      <style>{`
        .page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
        }
        .brand {
          text-align: center;
          margin-bottom: 2rem;
        }
        .brand strong {
          display: block;
          font-size: 1.05rem;
          letter-spacing: 0.1em;
          font-family: var(--font-display);
          font-weight: 800;
        }
        .brand span {
          display: block;
          font-size: 0.68rem;
          opacity: 0.55;
          letter-spacing: 0.2em;
          margin-top: 0.2rem;
          color: var(--as-cyan);
        }
        .card {
          width: 100%;
          max-width: 28rem;
          padding: 2.25rem 2rem;
        }
        .card h1 {
          font-size: 1.5rem;
          line-height: 1.25;
          margin: 0 0 0.6rem;
          letter-spacing: -0.02em;
        }
        .banner-slot {
          margin-top: 1.4rem;
        }
        .footer {
          margin-top: 2rem;
          font-size: 0.76rem;
          color: #5c6b8f;
          text-align: center;
        }
        @media (max-width: 26rem) {
          .card {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
