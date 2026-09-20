import { siteConfig } from "@/lib/site-config";

export function StatsSection({ compact = false }: { compact?: boolean }) {
  return <section className={`stats-section${compact ? " stats-section--compact" : ""}`} aria-label="إحصائيات SSPS">
    <div className="stats-grid mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
      {siteConfig.stats.map((stat, index) => <div className="stat-card" key={stat.label} style={{ "--stat-delay": `${index * 90}ms` } as React.CSSProperties}>
        <strong>{stat.value}</strong><span>{stat.label}</span>
      </div>)}
    </div>
  </section>;
}
