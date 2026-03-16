"use client";

import { memo, useMemo, useRef } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
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
      const complement = COMPLEMENTS[base];
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
          baseName: BASE_NAMES[base],
          complement,
          position: index + 1,
          codon: dnaCodon || "--",
          aminoAcid,
          isMutated,
          color: BASE_COLORS[base],
        },
        rightDetail: {
          id: `${index}-right`,
          side: "right" as const,
          base: complement,
          baseName: BASE_NAMES[complement],
          complement: base,
          position: index + 1,
          codon: dnaCodon || "--",
          aminoAcid,
          isMutated,
          color: BASE_COLORS[complement],
        },
      };
    });
  }, [cleanedSequence, compact, mutationSet]);

  const helixScale = useMemo(() => {
    const step = compact ? 0.34 : 0.4;
    const naturalHeight = Math.max(1, (cleanedSequence.length - 1) * step);
    const targetHeight = compact ? 4.4 : 6.2;
    return Math.min(1, targetHeight / naturalHeight);
  }, [cleanedSequence.length, compact]);

  return (
    <div className={`dna-visualizer-shell ${className}`.trim()}>
      <div className={`dna-visualizer ${compact ? "dna-visualizer--compact" : ""}`.trim()}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, compact ? 7.5 : 9.5], fov: compact ? 48 : 46 }}
          onPointerMissed={() => {
            onSelect?.(null);
            document.body.style.cursor = "default";
          }}
        >
          <fog attach="fog" args={["#f6fbf8", 9, 18]} />
          <ambientLight intensity={1.8} />
          <directionalLight position={[6, 8, 6]} intensity={2.4} color="#ffffff" />
          <pointLight position={[-4, 0, 4]} intensity={1.4} color="#8de7c9" />
          <pointLight position={[4, -2, -4]} intensity={1.1} color="#ffd89a" />
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
    const group = groupRef.current;
    if (!group) {
      return;
    }

    group.rotation.y = state.clock.elapsedTime * 0.28;
    group.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.12;
  });

  const leftCurve = useMemo(
    () => new THREE.CatmullRomCurve3(pairs.map((pair) => pair.left)),
    [pairs]
  );
  const rightCurve = useMemo(
    () => new THREE.CatmullRomCurve3(pairs.map((pair) => pair.right)),
    [pairs]
  );

  return (
    <group ref={groupRef} scale={scale}>
      <mesh>
        <tubeGeometry args={[leftCurve, 160, compact ? 0.055 : 0.07, 14, false]} />
        <meshStandardMaterial color="#d2fff1" metalness={0.25} roughness={0.22} />
      </mesh>
      <mesh>
        <tubeGeometry args={[rightCurve, 160, compact ? 0.055 : 0.07, 14, false]} />
        <meshStandardMaterial color="#fff0cf" metalness={0.25} roughness={0.22} />
      </mesh>

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
  const center = useMemo(
    () =>
      new THREE.Vector3(
        (pair.left.x + pair.right.x) / 2,
        (pair.left.y + pair.right.y) / 2,
        (pair.left.z + pair.right.z) / 2
      ),
    [pair.left, pair.right]
  );
  const distance = pair.left.distanceTo(pair.right);
  const quaternion = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(pair.right, pair.left).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  }, [pair.left, pair.right]);

  useFrame((state) => {
    const rung = rungRef.current;
    if (!rung) {
      return;
    }

    rung.position.y = center.y + Math.sin(state.clock.elapsedTime * 2 + pair.index * 0.35) * 0.045;
    const mutationPulse = pair.isMutated ? 1 + Math.sin(state.clock.elapsedTime * 4 + pair.index) * 0.08 : 1;
    const hoverBoost = isActive ? 1.12 : 1;
    const focusBoost = isHighlighted ? 1.18 : 1;
    rung.scale.setScalar(mutationPulse * hoverBoost * focusBoost);
  });

  return (
    <group ref={rungRef} position={center} quaternion={quaternion}>
      <mesh>
        <cylinderGeometry args={[compact ? 0.04 : 0.05, compact ? 0.04 : 0.05, distance, 14]} />
        <meshStandardMaterial
          color={
            pair.isMutated ? "#fb923c" : isHighlighted ? "#8de7c9" : isActive ? "#f8fafc" : "#d9e6f2"
          }
          metalness={0.35}
          roughness={0.18}
          emissive={isHighlighted ? "#167c63" : isActive ? "#94a3b8" : "#000000"}
          emissiveIntensity={isHighlighted ? 0.35 : isActive ? 0.25 : 0}
        />
      </mesh>

      {pair.isMutated ? (
        <mesh position={[0, 0.34, 0]} renderOrder={10}>
          <sphereGeometry args={[compact ? 0.08 : 0.1, 12, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.95} depthTest={false} />
        </mesh>
      ) : null}

      <BaseSphere
        detail={pair.rightDetail}
        compact={compact}
        distance={distance / 2}
        activeBaseId={activeBaseId}
        isHighlighted={isHighlighted}
        onSelect={onSelect}
      />
      <BaseSphere
        detail={pair.leftDetail}
        compact={compact}
        distance={-distance / 2}
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
  distance,
  activeBaseId,
  isHighlighted,
  onSelect,
}: {
  detail: BaseDetail;
  compact: boolean;
  distance: number;
  activeBaseId: string | null;
  isHighlighted: boolean;
  onSelect?: (detail: BaseDetail | null) => void;
}) {
  const active = activeBaseId === detail.id;

  const handlePointerEnter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onSelect?.(detail);
  };

  const handlePointerLeave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "default";
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect?.(detail);
  };

  return (
    <mesh
      position={[0, distance, 0]}
      scale={active ? 1.16 : isHighlighted ? 1.1 : 1}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <sphereGeometry args={[compact ? 0.16 : 0.19, 14, 14]} />
      {detail.isMutated ? (
        <mesh scale={1.55} renderOrder={10}>
          <sphereGeometry args={[compact ? 0.16 : 0.19, 12, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.28} depthTest={false} />
        </mesh>
      ) : null}
      <meshStandardMaterial
        color={detail.isMutated ? "#fb923c" : isHighlighted ? "#7ff1cd" : detail.color}
        emissive={detail.isMutated ? "#9a3412" : isHighlighted ? "#167c63" : detail.color}
        emissiveIntensity={detail.isMutated ? 0.85 : isHighlighted ? 0.45 : active ? 0.35 : 0.18}
        metalness={0.18}
        roughness={0.24}
      />
    </mesh>
  );
}
