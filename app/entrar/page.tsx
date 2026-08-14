import { db } from "@/lib/db";
import { EntrarForm } from "@/components/EntrarForm";
import { LoginEventsBanner } from "@/components/LoginEventsBanner";

export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  const featured = await db.event.findMany({
    where: { featuredOnLogin: true, active: true, archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, campaign: true, slug: true },
  });

  return (
    <div className="split">
      <section className="panel-dark">
        <div className="brand">
          {/* espaço reservado para a logo / imagem da campanha, a ser definida depois */}
          <strong>AS BRASIL</strong>
          <span>SORTEIOS</span>
        </div>
        <div className="pitch">
          <h1>Acompanhe seus sorteios em um só lugar</h1>
          <p>
            Digite o e-mail que você usou nas suas compras com a AS Brasil e veja seu número, os
            prêmios em disputa e os resultados de cada sorteio.
          </p>
          <LoginEventsBanner events={featured} />
        </div>
      </section>

      <section className="panel-light">
        <EntrarForm />
      </section>

      <style>{`
        .split {
          display: grid;
          grid-template-columns: 26rem 1fr;
          min-height: 100vh;
          font-family: system-ui, sans-serif;
        }
        @media (max-width: 48rem) {
          .split {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .panel-dark {
            padding: 2.5rem 1.5rem 2rem;
          }
          .panel-light {
            padding: 2.5rem 1.5rem 3rem;
          }
        }
        .panel-dark {
          background: linear-gradient(160deg, #0a1330, #1b2a5c);
          color: white;
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .brand strong { display: block; letter-spacing: 0.05em; }
        .brand span { font-size: 0.7rem; opacity: 0.6; }
        .pitch h1 { font-size: 1.7rem; line-height: 1.3; margin-bottom: 0.75rem; }
        .pitch p { opacity: 0.75; font-size: 0.95rem; }
        .panel-light {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f8fb;
        }
      `}</style>
    </div>
  );
}
