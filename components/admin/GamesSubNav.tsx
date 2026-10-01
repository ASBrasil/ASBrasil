import Link from "next/link";

const TABS = [
  { key: "jogos", href: "/admin/jogos", label: "Jogos" },
  { key: "cards", href: "/admin/jogos/cards", label: "Álbum de figurinhas" },
    { key: "testadores", href: "/admin/jogos/testadores", label: "Testadores" },
  { key: "arcade", href: "/admin/jogos/arcade", label: "🕹️ Universo AS (arcade)" },
  { key: "ranking", href: "/admin/jogos/ranking", label: "🏆 Ranking" },
] as const;

export function GamesSubNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="as-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`as-tab ${active === tab.key ? "as-tab-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
