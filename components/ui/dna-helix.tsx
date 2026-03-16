const helixRows = Array.from({ length: 14 }, (_, index) => index);

type DnaHelixProps = {
  compact?: boolean;
};

export function DnaHelix({ compact = false }: DnaHelixProps) {
  return (
    <div className={`dna-helix ${compact ? "dna-helix--compact" : ""}`.trim()} aria-hidden="true">
      {helixRows.map((row) => (
        <div
          className="dna-helix__row"
          key={row}
          style={{ animationDelay: `${row * 120}ms` }}
        >
          <span className="dna-helix__node dna-helix__node--left" />
          <span className="dna-helix__bridge" />
          <span className="dna-helix__node dna-helix__node--right" />
        </div>
      ))}
    </div>
  );
}
