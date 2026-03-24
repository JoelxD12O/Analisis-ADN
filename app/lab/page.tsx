"use client";

import { useState, useCallback, useEffect } from "react";

type Miss = {
    id: string;
    codon_original: string;
    codon_mutated: string;
    mutation_type: string;
    aa_from: string;
    aa_to: string;
    submitted_at: string;
    notes?: string;
    disease_hint?: string;
};

type DbEntry = {
    id: string;
    codon_original: string;
    codon_mutated: string;
    mutation_type?: string;
    aa_original?: string;
    aa_mutated?: string;
    disease?: string;
    clinical_significance?: string;
    effect?: string;
    gene?: string;
};

type PagedResponse<T> = { items: T[]; count: number; next_key: string | null };

const MUTATION_TYPES = ["", "missense", "nonsense", "silent", "frameshift", "expansion"];
const SIGNIFICANCE_OPTS = ["pathogenic", "likely_pathogenic", "benign", "uncertain", "risk_factor"];
const EFFECTS = ["amino_acid_change", "protein_truncated", "no_effect", "protein_disrupted"];

const TYPE_BADGE: Record<string, string> = {
    missense: "bg-amber-100 text-amber-700 border border-amber-200",
    nonsense: "bg-rose-100 text-rose-700 border border-rose-200",
    silent: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    frameshift: "bg-purple-100 text-purple-700 border border-purple-200",
    expansion: "bg-sky-100 text-sky-700 border border-sky-200",
};

function badge(type: string) {
    return `rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_BADGE[type] ?? "bg-black/8 text-black/50"}`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

const inputCls = "rounded-xl border border-black/10 bg-white/80 px-3 py-1.5 text-sm placeholder:text-black/30 focus:outline-none focus:border-[var(--accent)]/50";
const inputFullCls = `${inputCls} w-full`;

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({
    filters,
    onChange,
    onSearch,
    loading,
    extra,
}: {
    filters: Record<string, string>;
    onChange: (k: string, v: string) => void;
    onSearch: () => void;
    loading: boolean;
    extra?: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap gap-2 mb-4 items-end">
            <input className={`${inputCls} font-mono uppercase`} placeholder="CODON REF" maxLength={3}
                value={filters.codon_original ?? ""}
                onChange={(e) => onChange("codon_original", e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && onSearch()} />
            <input className={`${inputCls} font-mono uppercase`} placeholder="CODON MUT" maxLength={3}
                value={filters.codon_mutated ?? ""}
                onChange={(e) => onChange("codon_mutated", e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && onSearch()} />
            <select className={inputCls}
                value={filters.mutation_type ?? ""}
                onChange={(e) => { onChange("mutation_type", e.target.value); }}>
                {MUTATION_TYPES.map((t) => <option key={t} value={t}>{t || "Todos los tipos"}</option>)}
            </select>
            {extra}
            <button onClick={onSearch} disabled={loading}
                className="rounded-full bg-[var(--accent)] text-white px-4 py-1.5 text-sm font-semibold disabled:opacity-50 hover:-translate-y-px transition">
                {loading ? "Buscando…" : "Buscar"}
            </button>
            <button onClick={() => { onChange("codon_original", ""); onChange("codon_mutated", ""); onChange("mutation_type", ""); onChange("disease", ""); setTimeout(onSearch, 0); }}
                className="rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-sm text-black/50 hover:bg-white transition">
                Limpiar
            </button>
        </div>
    );
}

// ── Tab: Misses ───────────────────────────────────────────────────────────────
function MissesTab() {
    const [data, setData] = useState<PagedResponse<Miss> | null>(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [nextKey, setNextKey] = useState<string | null>(null);
    const setFilter = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }));

    const [form, setForm] = useState({ codon_original: "", codon_mutated: "", notes: "", disease_hint: "" });
    const [submitting, setSubmitting] = useState(false);
    const [submitMsg, setSubmitMsg] = useState<string | null>(null);

    const load = useCallback(async (append = false, key: string | null = null, overrideFilters?: Record<string, string>) => {
        setLoading(true);
        const f = overrideFilters ?? filters;
        const params = new URLSearchParams({ limit: "15" });
        if (f.codon_original) params.set("codon_original", f.codon_original);
        if (f.codon_mutated) params.set("codon_mutated", f.codon_mutated);
        if (f.mutation_type) params.set("mutation_type", f.mutation_type);
        if (key) params.set("last_key", key);
        try {
            const res = await fetch(`/api/lab/misses?${params}`);
            const json = (await res.json()) as PagedResponse<Miss>;
            setData((prev) => append && prev ? { ...json, items: [...prev.items, ...json.items] } : json);
            setNextKey(json.next_key);
        } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true); setSubmitMsg(null);
        try {
            const res = await fetch("/api/lab/misses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (res.ok) {
                setSubmitMsg("✓ Guardado");
                setForm({ codon_original: "", codon_mutated: "", notes: "", disease_hint: "" });
                void load();
            } else {
                const err = (await res.json()) as { error?: string };
                setSubmitMsg(`Error: ${err.error ?? "desconocido"}`);
            }
        } finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-black/8 bg-white/70 p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4">Agregar comparación manual</h3>
                <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-3 sm:grid-cols-2">
                    <input className={`${inputFullCls} font-mono uppercase`} placeholder="Codón Original (p.ej. GAG)" maxLength={3}
                        value={form.codon_original} onChange={(e) => setForm((p) => ({ ...p, codon_original: e.target.value.toUpperCase() }))} required />
                    <input className={`${inputFullCls} font-mono uppercase`} placeholder="Codón Mutado (p.ej. GTG)" maxLength={3}
                        value={form.codon_mutated} onChange={(e) => setForm((p) => ({ ...p, codon_mutated: e.target.value.toUpperCase() }))} required />
                    <input className={inputFullCls} placeholder="Posible enfermedad (opcional)"
                        value={form.disease_hint} onChange={(e) => setForm((p) => ({ ...p, disease_hint: e.target.value }))} />
                    <input className={inputFullCls} placeholder="Notas (opcional)"
                        value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                    <div className="sm:col-span-2 flex items-center gap-3">
                        <button type="submit" disabled={submitting}
                            className="rounded-full bg-[var(--accent)] text-white px-5 py-2 text-sm font-semibold disabled:opacity-50 hover:-translate-y-px transition">
                            {submitting ? "Guardando…" : "Guardar miss"}
                        </button>
                        {submitMsg && <span className="text-sm text-[var(--accent-strong)]">{submitMsg}</span>}
                    </div>
                </form>
            </div>

            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-3">Registro de misses</h3>
                <FilterBar filters={filters} onChange={setFilter} onSearch={() => void load(false, null)} loading={loading} />

                {loading && !data && <p className="text-sm text-black/40 py-6 text-center">Cargando…</p>}
                {data && (
                    <>
                        <p className="text-xs text-black/30 mb-2">{data.count} resultado{data.count !== 1 ? "s" : ""}</p>
                        <div className="space-y-2">
                            {data.items.length === 0 && <p className="text-sm text-black/40 py-6 text-center">Sin resultados.</p>}
                            {data.items.map((m) => (
                                <div key={m.id} className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3 flex flex-wrap gap-x-5 gap-y-1 items-center text-sm">
                                    <code className="font-mono text-[var(--accent-strong)] font-bold">{m.codon_original} → {m.codon_mutated}</code>
                                    <span className="text-black/50">{m.aa_from} → {m.aa_to}</span>
                                    <span className={badge(m.mutation_type)}>{m.mutation_type}</span>
                                    {m.disease_hint && <span className="text-black/55 text-xs italic">{m.disease_hint}</span>}
                                    {m.notes && <span className="text-black/40 text-xs">{m.notes}</span>}
                                    <span className="ml-auto text-[11px] text-black/30">{fmtDate(m.submitted_at)}</span>
                                </div>
                            ))}
                        </div>
                        {nextKey && (
                            <button onClick={() => void load(true, nextKey)} disabled={loading}
                                className="mt-4 w-full rounded-2xl border border-black/8 bg-white/60 py-2 text-sm text-[var(--accent-strong)] font-semibold hover:bg-white transition disabled:opacity-40">
                                {loading ? "Cargando…" : "Cargar más"}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ── Tab: BD Entries ───────────────────────────────────────────────────────────
type AddToDbForm = {
    gene: string; disease: string; clinical_significance: string; effect: string;
};

function AddToDbModal({ entry, onClose, onSaved }: { entry: DbEntry; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<AddToDbForm>({
        gene: entry.gene ?? "",
        disease: entry.disease ?? "",
        clinical_significance: entry.clinical_significance ?? "uncertain",
        effect: entry.effect ?? "",
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true); setMsg(null);
        try {
            const res = await fetch("/api/lab/db-entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...entry, ...form }),
            });
            if (res.ok) { setMsg("✓ Subido a la BD"); onSaved(); setTimeout(onClose, 1200); }
            else { const e = (await res.json()) as { error?: string }; setMsg(`Error: ${e.error}`); }
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-[var(--accent-strong)] mb-1">Subir a la BD</h3>
                <p className="text-xs text-black/40 mb-4">
                    <code className="font-mono">{entry.codon_original} → {entry.codon_mutated}</code>
                    {" · "}{entry.aa_original} → {entry.aa_mutated}
                </p>
                <div className="grid gap-3">
                    <div>
                        <label className="block text-xs font-bold text-black/40 mb-1 uppercase tracking-wider">Gen</label>
                        <input className={inputFullCls} placeholder="Ej: HBB" value={form.gene}
                            onChange={(e) => setForm((p) => ({ ...p, gene: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-black/40 mb-1 uppercase tracking-wider">Enfermedad</label>
                        <input className={inputFullCls} placeholder="Ej: Anemia falciforme" value={form.disease}
                            onChange={(e) => setForm((p) => ({ ...p, disease: e.target.value }))} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-black/40 mb-1 uppercase tracking-wider">Significancia clínica</label>
                        <select className={inputFullCls} value={form.clinical_significance}
                            onChange={(e) => setForm((p) => ({ ...p, clinical_significance: e.target.value }))}>
                            {SIGNIFICANCE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-black/40 mb-1 uppercase tracking-wider">Efecto</label>
                        <select className={inputFullCls} value={form.effect}
                            onChange={(e) => setForm((p) => ({ ...p, effect: e.target.value }))}>
                            <option value="">— inferir automáticamente —</option>
                            {EFFECTS.map((ef) => <option key={ef} value={ef}>{ef}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-5">
                    <button onClick={() => void handleSave()} disabled={saving || !form.disease}
                        className="rounded-full bg-[var(--accent)] text-white px-5 py-2 text-sm font-semibold disabled:opacity-50 hover:-translate-y-px transition">
                        {saving ? "Guardando…" : "Subir a la BD"}
                    </button>
                    <button onClick={onClose} className="text-sm text-black/40 hover:text-black transition">Cancelar</button>
                    {msg && <span className="text-sm text-[var(--accent-strong)] ml-auto">{msg}</span>}
                </div>
            </div>
        </div>
    );
}

function DbEntriesTab() {
    const [data, setData] = useState<PagedResponse<DbEntry> | null>(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [nextKey, setNextKey] = useState<string | null>(null);
    const [modal, setModal] = useState<DbEntry | null>(null);
    const setFilter = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }));

    const load = useCallback(async (append = false, key: string | null = null, overrideFilters?: Record<string, string>) => {
        setLoading(true);
        const f = overrideFilters ?? filters;
        const params = new URLSearchParams({ limit: "15" });
        if (f.codon_original) params.set("codon_original", f.codon_original);
        if (f.codon_mutated) params.set("codon_mutated", f.codon_mutated);
        if (f.mutation_type) params.set("mutation_type", f.mutation_type);
        if (f.disease) params.set("disease", f.disease);
        if (key) params.set("last_key", key);
        try {
            const res = await fetch(`/api/lab/db-entries?${params}`);
            const json = (await res.json()) as PagedResponse<DbEntry>;
            setData((prev) => append && prev ? { ...json, items: [...prev.items, ...json.items] } : json);
            setNextKey(json.next_key);
        } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const diseaseInput = (
        <input className={inputCls} placeholder="Enfermedad" value={filters.disease ?? ""}
            onChange={(e) => setFilter("disease", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()} />
    );

    return (
        <div className="space-y-4">
            {modal && <AddToDbModal entry={modal} onClose={() => setModal(null)} onSaved={() => void load()} />}

            <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Entradas en la BD</h3>
            <FilterBar filters={filters} onChange={setFilter} onSearch={() => void load()} loading={loading} extra={diseaseInput} />

            {loading && !data && <p className="text-sm text-black/40 py-6 text-center">Cargando…</p>}
            {data && (
                <>
                    <p className="text-xs text-black/30 mb-2">{data.count} resultado{data.count !== 1 ? "s" : ""}</p>
                    <div className="space-y-2">
                        {data.items.length === 0 && <p className="text-sm text-black/40 py-6 text-center">Sin resultados.</p>}
                        {data.items.map((e) => (
                            <div key={e.id} className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3 text-sm">
                                <div className="flex flex-wrap gap-x-5 gap-y-1 items-center">
                                    <code className="font-mono font-bold text-[var(--accent-strong)]">{e.codon_original} → {e.codon_mutated}</code>
                                    {e.aa_original && <span className="text-black/50">{e.aa_original} → {e.aa_mutated}</span>}
                                    {e.gene && <span className="text-xs font-semibold text-black/40">{e.gene}</span>}
                                    {e.mutation_type && <span className={badge(e.mutation_type)}>{e.mutation_type}</span>}
                                    {e.clinical_significance && (
                                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-black/5 text-black/50 border border-black/8">
                                            {e.clinical_significance}
                                        </span>
                                    )}
                                    <button onClick={() => setModal(e)}
                                        className="ml-auto rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/8 px-3 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)] hover:bg-[var(--accent)]/15 transition">
                                        Subir a BD
                                    </button>
                                </div>
                                {e.disease && <p className="text-xs text-black/55 mt-1">{e.disease}</p>}
                            </div>
                        ))}
                    </div>
                    {nextKey && (
                        <button onClick={() => void load(true, nextKey)} disabled={loading}
                            className="w-full rounded-2xl border border-black/8 bg-white/60 py-2 text-sm text-[var(--accent-strong)] font-semibold hover:bg-white transition disabled:opacity-40">
                            {loading ? "Cargando…" : "Cargar más"}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
type Tab = "misses" | "db";

export default function LabPage() {
    const [tab, setTab] = useState<Tab>("misses");
    const tabBtn = (t: Tab, label: string) => (
        <button onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition ${tab === t ? "bg-[var(--accent)] text-white shadow-sm" : "border border-black/10 bg-white/60 text-[var(--accent-strong)] hover:bg-white"}`}>
            {label}
        </button>
    );

    return (
        <main className="dna-page">
            <header className="topbar">
                <a href="/" className="brand"><span className="brand__dot" />Genome View</a>
                <span className="text-xs font-bold uppercase tracking-widest text-black/30 px-3 py-1 rounded-full bg-black/5 border border-black/8">
                    Lab interno · <span className="text-[var(--accent-strong)]">privado</span>
                </span>
            </header>

            <section className="section-card mt-4">
                <div className="section-card__header">
                    <span className="section-card__eyebrow">Panel de revisión</span>
                    <h1 className="section-card__title">Lab</h1>
                    <p className="section-card__description">
                        Misses automáticos y entradas en la BD principal con opción de edición.
                    </p>
                </div>
                <div className="flex gap-2 mb-6">
                    {tabBtn("misses", "Misses sin match")}
                    {tabBtn("db", "BD actual")}
                </div>
                {tab === "misses" ? <MissesTab /> : <DbEntriesTab />}
            </section>
        </main>
    );
}
