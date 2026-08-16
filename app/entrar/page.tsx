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
    <div className="page">
      <div className="glow glow-1" />
      <div className="glow glow-2" />

      <div className="brand">
        {/* espaço reservado para logo em imagem, a ser definida depois */}
        <strong>AS BRASIL</strong>
        <span>SORTEIOS</span>
      </div>

      <div className="card-wrap">
        <div className="card">
          <h1>Acompanhe seus sorteios em um só lugar</h1>
          <p className="subtitle">
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
      </div>

      <footer className="footer">
        © {new Date().getFullYear()} AS Brasil. Todos os direitos reservados.
      </footer>

      <style>{`
        .page {
          position: relative;
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, #1b2a5c 0%, #0a1330 55%, #05070f 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          font-family: system-ui, sans-serif;
          overflow: hidden;
        }
        .glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          pointer-events: none;
        }
        .glow-1 {
          width: 26rem;
          height: 26rem;
          background: #4f5fff;
          top: -8rem;
          left: -6rem;
        }
        .glow-2 {
          width: 22rem;
          height: 22rem;
          background: #a855f7;
          bottom: -6rem;
          right: -6rem;
        }
        .brand {
          position: relative;
          z-index: 1;
          text-align: center;
          margin-bottom: 2rem;
          color: white;
        }
        .brand strong {
          display: block;
          font-size: 1.15rem;
          letter-spacing: 0.08em;
        }
        .brand span {
          display: block;
          font-size: 0.7rem;
          opacity: 0.55;
          letter-spacing: 0.15em;
          margin-top: 0.15rem;
        }
        .card-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 30rem;
          border-radius: 1.5rem;
          padding: 1.5px;
          background: linear-gradient(
            135deg,
            rgba(79, 95, 255, 0.7),
            rgba(168, 85, 247, 0.5),
            rgba(236, 72, 153, 0.4)
          );
          box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.45);
        }
        .card {
          background: #0d1230;
          border-radius: calc(1.5rem - 1.5px);
          padding: 2.5rem 2rem;
        }
        .card h1 {
          color: white;
          font-size: 1.5rem;
          line-height: 1.3;
          margin: 0 0 0.6rem;
          font-family: "Sora", system-ui, sans-serif;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0;
        }
        .banner-slot {
          margin-top: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .footer {
          position: relative;
          z-index: 1;
          margin-top: 2rem;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.4);
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
