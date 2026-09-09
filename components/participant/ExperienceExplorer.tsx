"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EventsCarousel } from "@/components/participant/EventsCarousel";
import { STATUS_DOT, STATUS_LABEL, type EventStatus } from "@/lib/event-status";

export interface ExperienceWithProgress {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  theme: unknown;
  totalEventos: number;
  meusEventos: number;
  status: EventStatus;
}

const FILTERS: { key: EventStatus | "todas"; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "ativa", label: "Ativas" },
  { key: "em-breve", label: "Em breve" },
  { key: "encerrada", label: "Encerradas" },
];

/**
 * Seção "Experiências" da home - busca por nome + filtro por estado, além
 * do carrossel de cards. Client Component porque precisa filtrar sem round
 * trip; os dados (já com progresso/estado calculados no servidor) chegam
 * prontos via prop. Só existe filtro/busca aqui (não nas outras seções da
 * home) porque é a lista que deve crescer com o tempo - com 2 sorteios
 * avulsos não faz diferença nenhuma ainda.
 */
export function ExperienceExplorer({ experiences }: { experiences: ExperienceWithProgress[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EventStatus | "todas">("todas");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experiences.filter((exp) => {
      if (filter !== "todas" && exp.status !== filter) return false;
      if (q && !exp.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [experiences, query, filter]);

  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">Explore por experiência</span>
        <h2>Experiências</h2>
        <p className="subtitle small">
          Todos os sorteios de um mesmo evento reunidos aqui, com o Universo AS e o ranking daquele
          evento.
        </p>
      </div>

      <div className="explorer-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar experiência..."
          className="explorer-search"
        />
        <div className="explorer-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`explorer-tab ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">Nenhuma experiência encontrada com esse filtro.</p>
      ) : (
        <EventsCarousel>
          {filtered.map((exp) => (
            <ExperienceCard key={exp.id} experience={exp} />
          ))}
        </EventsCarousel>
      )}

      <style jsx>{`
        .explorer-bar {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .explorer-search {
          flex: 1 1 14rem;
          min-width: 10rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          padding: 0.55rem 1.1rem;
          color: #f5f6fa;
          font-size: 0.85rem;
        }
        .explorer-search::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .explorer-search:focus {
          outline: none;
          border-color: #4f5fff;
        }
        .explorer-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .explorer-tab {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.75);
          border-radius: 999px;
          padding: 0.42rem 0.95rem;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .explorer-tab:hover {
          border-color: rgba(255, 255, 255, 0.35);
        }
        .explorer-tab.active {
          background: #4f5fff;
          border-color: #4f5fff;
          color: #fff;
        }
      `}</style>
    </>
  );
}

function ExperienceCard({ experience }: { experience: ExperienceWithProgress }) {
  const theme = experience.theme as any;
  const primary = theme?.primaryColor || "#3B55E6";
  const secondary = theme?.secondaryColor || "#0c2a5b";
  const bannerUrl = theme?.backgroundImageUrl as string | undefined;

  return (
    <Link href={`/eventos/${experience.slug}`} className="card exp-card">
      <span className="exp-badge">Experiência</span>
      <span className="status-badge status-badge-tr">
        {STATUS_DOT[experience.status]} {STATUS_LABEL[experience.status]}
      </span>
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="banner-img" />
      ) : (
        <div className="banner" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
      )}
      <div className="info">
        <h3>{experience.name}</h3>
        <p className="exp-subtitle">{experience.subtitle ?? ""}</p>
        <div className="exp-progress">
          <span className="exp-dots">
            {Array.from({ length: experience.totalEventos }).map((_, i) => (
              <span key={i} className={`dot ${i < experience.meusEventos ? "filled" : ""}`} />
            ))}
          </span>
          <span className="exp-progress-label">
            {experience.meusEventos > 0
              ? `Você participou de ${experience.meusEventos}`
              : `${experience.totalEventos} ${experience.totalEventos === 1 ? "sorteio" : "sorteios"}`}
          </span>
        </div>
        <span className="cta-btn">Ver experiência →</span>
      </div>
    </Link>
  );
}
