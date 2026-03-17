"use client";

import { memo, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getAminoAcidFromRnaCodon, transcribeDna } from "@/lib/dna";

type Base = "A" | "C" | "G" | "T";
type BaseSide = "left" | "right";

export type BaseDetail = {
  id: string;
  side: BaseSide;
  base: Base;
  baseName: string;
  complement: Base;
  position: number;
  codon: string;
  aminoAcid: string;
  isMutated: boolean;
  color: string;
};

type DNAHelixVisualizerProps = {
  sequence: string;
  mutationPositions?: number[];
  highlightedPosition?: number | null;
  activeBaseId?: string | null;
  onSelect?: (detail: BaseDetail | null) => void;
  className?: string;
  compact?: boolean;
};

const BASE_COLORS: Record<Base, string> = {
  A: "#2bb673",
  T: "#ef4444",
  C: "#3b82f6",
  G: "#f4c542",
};

const BASE_NAMES: Record<Base, string> = {
  A: "Adenina",
  T: "Timina",
  C: "Citosina",
  G: "Guanina",
};

const COMPLEMENTS: Record<Base, Base> = {
  A: "T",
  T: "A",
  C: "G",
  G: "C",
};

const FALLBACK_SEQUENCE = "ATGCGTACGT";

export function DNAHelixVisualizer({
  sequence,
  mutationPositions = [],
  highlightedPosition = null,
  activeBaseId = null,
  onSelect,
  className = "",
  compact = false,
}: DNAHelixVisualizerProps) {
  const cleanedSequence = useMemo(() => {
    if (!sequence) return FALLBACK_SEQUENCE;
    const normalized = sequence.toUpperCase().replace(/[^ACGT]/g, "");
    return normalized || FALLBACK_SEQUENCE;
  }, [sequence]);

  const mutationSet = useMemo(() => new Set(mutationPositions), [mutationPositions]);

  const pairs = useMemo(() => {
    const radius = compact ? 1.15 : 1.3;
    const step = compact ? 0.34 : 0.4;
    const twist = Math.PI / 3;

    return cleanedSequence.split("").map((value, index) => {
      const base = value as Base;
      const complement = COMPLEMENTS[base] || "A";
      const angle = index * twist;
      const y = (cleanedSequence.length - 1) * step * 0.5 - index * step;

      const left = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const right = new THREE.Vector3(
        Math.cos(angle + Math.PI) * radius,
        y,
        Math.sin(angle + Math.PI) * radius
      );

      const codonStart = Math.floor(index / 3) * 3;
      const dnaCodon = cleanedSequence.slice(codonStart, codonStart + 3);
      const rnaCodon = transcribeDna(dnaCodon);
      const aminoAcid =
        dnaCodon.length === 3 ? getAminoAcidFromRnaCodon(rnaCodon) : "Codon incompleto";
      const isMutated = mutationSet.has(index + 1);

      return {
        index,
        left,
        right,
        isMutated,
        leftDetail: {
          id: `${index}-left`,
          side: "left" as const,
          base,
          baseName: BASE_NAMES[base] || "Base",
          complement,
          position: index + 1,
          codon: dnaCodon || "--",
          aminoAcid,
          isMutated,
          color: BASE_COLORS[base] || "#ccc",
        },
        rightDetail: {
          id: `${index}-right`,
          side: "right" as const,
          base: complement,
          baseName: BASE_NAMES[complement] || "Base",
          complement: base,
          position: index + 1,
          codon: dnaCodon || "--",
          aminoAcid,
          isMutated,
          color: BASE_COLORS[complement] || "#ccc",
        },
      };
    });
  }, [cleanedSequence, compact, mutationSet]);

  const helixScale = useMemo(() => {
    const step = compact ? 0.34 : 0.4;
    const naturalHeight = Math.max(1, (cleanedSequence.length - 1) * step);
    const targetHeight = compact ? 4.5 : 6.5;
    return Math.min(1.2, targetHeight / naturalHeight);
  }, [cleanedSequence.length, compact]);

  return (
    <div className={`dna-visualizer-shell ${className}`.trim()}>
      <div className={`dna-visualizer ${compact ? "dna-visualizer--compact" : ""}`.trim()}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, compact ? 8 : 10], fov: 45 }}
          onPointerMissed={() => {
            onSelect?.(null);
            document.body.style.cursor = "default";
          }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 10, 10]} intensity={2.0} color="#ffffff" />
          <pointLight position={[-5, 5, 5]} intensity={1.2} color="#8de7c9" />
          <HelixScene
            pairs={pairs}
            compact={compact}
            scale={helixScale}
            activeBaseId={activeBaseId}
            highlightedPosition={highlightedPosition}
            onSelect={onSelect}
          />
        </Canvas>

        <div className="dna-visualizer__legend">
          <span><i style={{ background: BASE_COLORS.A }} />A</span>
          <span><i style={{ background: BASE_COLORS.T }} />T</span>
          <span><i style={{ background: BASE_COLORS.C }} />C</span>
          <span><i style={{ background: BASE_COLORS.G }} />G</span>
        </div>
      </div>
    </div>
  );
}

type PairData = {
  index: number;
  left: THREE.Vector3;
  right: THREE.Vector3;
  leftDetail: BaseDetail;
  rightDetail: BaseDetail;
  isMutated: boolean;
};

function HelixScene({
  pairs,
  compact,
  scale,
  activeBaseId,
  highlightedPosition,
  onSelect,
}: {
  pairs: PairData[];
  compact: boolean;
  scale: number;
  activeBaseId: string | null;
  highlightedPosition: number | null;
  onSelect?: (detail: BaseDetail | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  const leftCurve = useMemo(() => {
    if (pairs.length < 2) return null;
    return new THREE.CatmullRomCurve3(pairs.map((p) => p.left));
  }, [pairs]);

  const rightCurve = useMemo(() => {
    if (pairs.length < 2) return null;
    return new THREE.CatmullRomCurve3(pairs.map((p) => p.right));
  }, [pairs]);

  return (
    <group ref={groupRef} scale={scale}>
      {leftCurve && (
        <mesh>
          <tubeGeometry args={[leftCurve, 120, compact ? 0.05 : 0.06, 12, false]} />
          <meshStandardMaterial color="#d2fff1" metalness={0.2} roughness={0.3} />
        </mesh>
      )}
      {rightCurve && (
        <mesh>
          <tubeGeometry args={[rightCurve, 120, compact ? 0.05 : 0.06, 12, false]} />
          <meshStandardMaterial color="#fff0cf" metalness={0.2} roughness={0.3} />
        </mesh>
      )}

      {pairs.map((pair) => (
        <MemoBasePair
          key={pair.index}
          pair={pair}
          compact={compact}
          isActive={
            activeBaseId === pair.leftDetail.id || activeBaseId === pair.rightDetail.id
          }
          isHighlighted={highlightedPosition === pair.leftDetail.position}
          activeBaseId={activeBaseId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

const MemoBasePair = memo(BasePair);

function BasePair({
  pair,
  compact,
  isActive,
  isHighlighted,
  activeBaseId,
  onSelect,
}: {
  pair: PairData;
  compact: boolean;
  isActive: boolean;
  isHighlighted: boolean;
  activeBaseId: string | null;
  onSelect?: (detail: BaseDetail | null) => void;
}) {
  const rungRef = useRef<THREE.Group>(null);
  const center = useMemo(() => {
    return new THREE.Vector3().addVectors(pair.left, pair.right).multiplyScalar(0.5);
  }, [pair.left, pair.right]);

  const distance = useMemo(() => pair.left.distanceTo(pair.right), [pair.left, pair.right]);
  const quaternion = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(pair.right, pair.left).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }, [pair.left, pair.right]);

  useFrame((state) => {
    if (rungRef.current) {
      const pulse = pair.isMutated ? 1 + Math.sin(state.clock.elapsedTime * 4 + pair.index) * 0.05 : 1;
      const hover = isActive || isHighlighted ? 1.15 : 1;
      rungRef.current.scale.setScalar(pulse * hover);
    }
  });

  return (
    <group ref={rungRef} position={center} quaternion={quaternion}>
      <mesh>
        <cylinderGeometry args={[compact ? 0.04 : 0.045, compact ? 0.04 : 0.045, distance, 12]} />
        <meshStandardMaterial
          color={
            pair.isMutated ? "#fb923c" : isHighlighted ? "#8de7c9" : isActive ? "#f8fafc" : "#d9e6f2"
          }
          emissive={isHighlighted ? "#167c63" : isActive ? "#94a3b8" : "#000000"}
          emissiveIntensity={isHighlighted ? 0.4 : isActive ? 0.3 : 0}
        />
      </mesh>

      <BaseSphere
        detail={pair.rightDetail}
        compact={compact}
        offset={distance / 2}
        activeBaseId={activeBaseId}
        isHighlighted={isHighlighted}
        onSelect={onSelect}
      />
      <BaseSphere
        detail={pair.leftDetail}
        compact={compact}
        offset={-distance / 2}
        activeBaseId={activeBaseId}
        isHighlighted={isHighlighted}
        onSelect={onSelect}
      />
    </group>
  );
}

function BaseSphere({
  detail,
  compact,
  offset,
  activeBaseId,
  isHighlighted,
  onSelect,
}: {
  detail: BaseDetail;
  compact: boolean;
  offset: number;
  activeBaseId: string | null;
  isHighlighted: boolean;
  onSelect?: (detail: BaseDetail | null) => void;
}) {
  const active = activeBaseId === detail.id;

  return (
    <mesh
      position={[0, offset, 0]}
      scale={active ? 1.2 : isHighlighted ? 1.1 : 1}
      onPointerEnter={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        onSelect?.(detail);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(detail);
      }}
    >
      <sphereGeometry args={[compact ? 0.16 : 0.18, 16, 16]} />
      <meshStandardMaterial
        color={detail.isMutated ? "#fb923c" : isHighlighted ? "#7ff1cd" : detail.color}
        emissive={detail.isMutated ? "#9a3412" : isHighlighted ? "#167c63" : detail.color}
        emissiveIntensity={detail.isMutated ? 0.8 : isHighlighted ? 0.5 : active ? 0.4 : 0.2}
        metalness={0.2}
        roughness={0.3}
      />
    </mesh>
  );
}
