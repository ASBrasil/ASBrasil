import Link from "next/link";

const TABS = [
  { key: "jogos", href: "/admin/jogos", label: "Jogos" },
  { key: "cards", href: "/admin/jogos/cards", label: "Álbum de figurinhas" },
  { key: "testadores", href: "/admin/jogos/testadores", label: "Testadores" },
] as const;

export function GamesSubNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="tabs">
      {TABS.map((tab) => (
        <Link key={tab.key} href={tab.href} className={`tab ${active === tab.key ? "active" : ""}`}>
          {tab.label}
        </Link>
      ))}
      <style>{`
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .tab {
          text-decoration: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.6rem 0.9rem;
          border-bottom: 2px solid transparent;
        }
        .tab.active {
          color: var(--indigo-600);
          border-bottom-color: var(--indigo-600);
        }
      `}</style>
    </div>
  );
}
