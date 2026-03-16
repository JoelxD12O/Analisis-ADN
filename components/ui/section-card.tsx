import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <div className="section-card__header">
        {eyebrow ? <span className="section-card__eyebrow">{eyebrow}</span> : null}
        <div>
          <h2 className="section-card__title">{title}</h2>
          {description ? (
            <p className="section-card__description">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
