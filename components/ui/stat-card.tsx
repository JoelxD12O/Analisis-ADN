type StatCardProps = {
  label: string;
  value: string;
  tone?: "default" | "accent";
};

export function StatCard({
  label,
  value,
  tone = "default",
}: StatCardProps) {
  return (
    <article
      className={`stat-card ${tone === "accent" ? "stat-card--accent" : ""}`.trim()}
    >
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
    </article>
  );
}
