import { useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { Category, ImportedOfferDraft } from '../../types';
import { apiFetch, computeDiscountPercent } from '../../lib/format';

interface BulkRow extends ImportedOfferDraft {
  uid: string;
  selected: boolean;
  category_id: string;
  price_input: string;
  original_price_input: string;
}

interface BulkImportPanelProps {
  categories: Category[];
  onPublished: () => void;
}

export function BulkImportPanel({ categories, onPublished }: BulkImportPanelProps) {
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const handleImportAll = async () => {
    const targetLinks = lines.slice(0, 100);
    if (targetLinks.length === 0) return;

    setProcessing(true);
    setFeedback(null);
    setRows([]);
    setProgress({ done: 0, total: targetLinks.length });

    const accumulated: BulkRow[] = [];
    const chunkSize = 10;

    try {
      for (let i = 0; i < targetLinks.length; i += chunkSize) {
        const chunk = targetLinks.slice(i, i + chunkSize);
        const res = await apiFetch<{ total: number; items: ImportedOfferDraft[] }>('/api/admin/import-bulk', {
          method: 'POST',
          body: JSON.stringify({ links: chunk }),
        });

        res.items.forEach((item, idx) => {
          const canSelect =
            item.import_status !== 'duplicate' &&
            item.import_status !== 'error' &&
            Boolean(item.title) &&
            Boolean(item.current_price && item.current_price > 0);
          accumulated.push({
            ...item,
            uid: `${Date.now()}-${i + idx}-${Math.random().toString(36).slice(2, 7)}`,
            selected: canSelect,
            category_id: item.suggested_category_id ? String(item.suggested_category_id) : '',
            price_input: item.current_price ? String(item.current_price) : '',
            original_price_input: item.original_price ? String(item.original_price) : '',
          });
        });

        setRows([...accumulated]);
        setProgress({ done: Math.min(i + chunk.length, targetLinks.length), total: targetLinks.length });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro durante a importação em massa.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRetryErrors = async () => {
    const errorRows = rows.filter((r) => r.import_status === 'error' || r.import_status === 'blocked');
    if (errorRows.length === 0) return;

    setProcessing(true);
    setFeedback(null);
    setProgress({ done: 0, total: errorRows.length });

    try {
      const res = await apiFetch<{ items: ImportedOfferDraft[] }>('/api/admin/import-bulk', {
        method: 'POST',
        body: JSON.stringify({ links: errorRows.map((r) => r.affiliate_url) }),
      });

      const updatedMap = new Map<string, ImportedOfferDraft>();
      res.items.forEach((item) => updatedMap.set(item.affiliate_url, item));

      setRows((prev) =>
        prev.map((row) => {
          const fresh = updatedMap.get(row.affiliate_url);
          if (!fresh) return row;
          const canSelect =
            fresh.import_status !== 'duplicate' &&
            fresh.import_status !== 'error' &&
            Boolean(fresh.title) &&
            Boolean(fresh.current_price && fresh.current_price > 0);
          return {
            ...fresh,
            uid: row.uid,
            selected: canSelect,
            category_id: fresh.suggested_category_id ? String(fresh.suggested_category_id) : row.category_id,
            price_input: fresh.current_price ? String(fresh.current_price) : row.price_input,
            original_price_input: fresh.original_price ? String(fresh.original_price) : row.original_price_input,
          };
        })
      );
      setProgress({ done: errorRows.length, total: errorRows.length });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao reprocessar links.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: checked && r.import_status !== 'error',
      }))
    );
  };

  const handlePublishSelected = async () => {
    const chosen = rows.filter((r) => r.selected);
    if (chosen.length === 0) {
      setFeedback({ type: 'error', text: 'Selecione ao menos um produto válido para publicar.' });
      return;
    }

    const invalid = chosen.find((r) => !r.title.trim() || !Number(r.price_input) || Number(r.price_input) <= 0);
    if (invalid) {
      setFeedback({
        type: 'error',
        text: `Preencha nome e preço atual válido para o link: ${invalid.affiliate_url}`,
      });
      return;
    }

    setPublishing(true);
    setFeedback(null);
    try {
      const payload = chosen.map((r) => ({
        ml_id: r.ml_id,
        title: r.title.trim(),
        brand: r.brand.trim(),
        short_description: r.short_description.trim(),
        description: r.description.trim(),
        specs: r.specs,
        image_url: r.image_url.trim(),
        gallery: r.gallery,
        current_price: Number(r.price_input),
        original_price: r.original_price_input ? Number(r.original_price_input) : null,
        category_id: r.category_id ? Number(r.category_id) : null,
        affiliate_url: r.affiliate_url,
        original_url: r.original_url,
        source: r.source,
        is_active: true,
        allow_duplicate: r.import_status === 'duplicate',
      }));

      const res = await apiFetch<{
        publishedCount: number;
        errors: Array<{ index: number; affiliate_url: string; error: string }>;
      }>('/api/admin/products/bulk-publish', {
        method: 'POST',
        body: JSON.stringify({ items: payload }),
      });

      const publishedUrls = new Set(
        chosen
          .filter((_, idx) => !res.errors.some((e) => e.index === idx))
          .map((item) => item.uid)
      );

      setRows((prev) => prev.filter((r) => !publishedUrls.has(r.uid)));
      onPublished();

      if (res.errors.length > 0) {
        setFeedback({
          type: 'error',
          text: `${res.publishedCount} ofertas publicadas, mas ${res.errors.length} apresentaram erro: ${res.errors[0].error}`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `${res.publishedCount} ofertas publicadas com sucesso no catálogo do Tech Oferta!`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao publicar ofertas selecionadas.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const errorOrBlockedCount = rows.filter((r) => r.import_status === 'error' || r.import_status === 'blocked').length;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-50">IMPORTAÇÃO EM MASSA DE OFERTAS</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cole até 100 links de afiliados do Mercado Livre por lote (um link por linha). Os links são preservados
              integralmente.
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-yellow-400">
            {Math.min(lines.length, 100)} / 100 links
          </span>
        </div>

        <textarea
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={
            'https://mercadolivre.com/sec/...\nhttps://mercadolivre.com/sec/...\nhttps://www.mercadolivre.com.br/...'
          }
          className="w-full p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400"
        />

        {lines.length > 100 && (
          <p className="text-xs text-amber-400">
            Limite técnico de 100 links por lote: apenas os 100 primeiros links serão processados nesta operação.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            disabled={processing || lines.length === 0}
            onClick={handleImportAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs tracking-wide disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{processing ? 'PROCESSANDO LINKS...' : 'IMPORTAR TODOS'}</span>
          </button>

          {progress.total > 0 && (
            <div className="flex-1 max-w-md space-y-1">
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                <span>Progresso</span>
                <span>
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-yellow-400 transition-all duration-200"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer text-zinc-200 font-medium">
                <input
                  type="checkbox"
                  checked={selectedCount > 0 && selectedCount === rows.filter((r) => r.import_status !== 'error').length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 accent-yellow-400"
                />
                <span>Selecionar todos ({rows.length})</span>
              </label>

              {errorOrBlockedCount > 0 && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleRetryErrors}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-yellow-400"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar erros/bloqueados ({errorOrBlockedCount})</span>
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={publishing || selectedCount === 0}
              onClick={handlePublishSelected}
              className="px-5 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs disabled:opacity-50"
            >
              {publishing ? 'Publicando...' : `PUBLICAR SELECIONADOS (${selectedCount})`}
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => {
              const disc = computeDiscountPercent(
                Number(row.price_input),
                row.original_price_input ? Number(row.original_price_input) : null
              );
              return (
                <div
                  key={row.uid}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={row.import_status === 'error'}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.uid === row.uid ? { ...r, selected: e.target.checked } : r))
                          )
                        }
                        className="w-4 h-4 accent-yellow-400"
                      />
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          row.import_status === 'imported'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                            : row.import_status === 'duplicate'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
                              : row.import_status === 'partial' || row.import_status === 'blocked'
                                ? 'bg-yellow-950/60 text-yellow-300 border border-yellow-700/50'
                                : 'bg-red-950/60 text-red-300 border border-red-700/50'
                        }`}
                      >
                        {row.import_status === 'imported'
                          ? 'Dados recuperados'
                          : row.import_status === 'partial'
                            ? 'Parcial (complete os dados)'
                            : row.import_status === 'blocked'
                              ? 'Manual necessário'
                              : row.import_status === 'duplicate'
                                ? 'Duplicado detectado'
                                : 'Link inválido'}
                      </span>
                      <span className="text-xs font-mono text-zinc-400 truncate max-w-xs sm:max-w-md">
                        {row.affiliate_url}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((r) => r.uid !== row.uid))}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400">{row.message}</p>

                  {row.import_status !== 'error' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                      <div className="md:col-span-1 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-lg bg-white p-1 overflow-hidden border border-zinc-800 shrink-0">
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-[10px] text-zinc-500">
                              Sem foto
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[11px] text-zinc-400">Nome do produto *</label>
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.uid === row.uid ? { ...r, title: e.target.value } : r))
                            )
                          }
                          placeholder="Nome do produto"
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] text-zinc-400">Marca</label>
                        <input
                          type="text"
                          value={row.brand}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.uid === row.uid ? { ...r, brand: e.target.value } : r))
                            )
                          }
                          placeholder="Marca"
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] text-zinc-400">Preço atual (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.price_input}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.uid === row.uid ? { ...r, price_input: e.target.value } : r))
                            )
                          }
                          placeholder="0.00"
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[11px] text-zinc-400">
                          Categoria {disc ? `· ${disc}% OFF` : ''}
                        </label>
                        <select
                          value={row.category_id}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.uid === row.uid ? { ...r, category_id: e.target.value } : r))
                            )
                          }
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                        >
                          <option value="">Sem categoria</option>
                          {categories.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[11px] text-zinc-400">URL da imagem principal</label>
                        <input
                          type="url"
                          value={row.image_url}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.uid === row.uid ? { ...r, image_url: e.target.value } : r))
                            )
                          }
                          placeholder="https://..."
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[11px] text-zinc-400">Preço anterior (opcional)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.original_price_input}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.uid === row.uid ? { ...r, original_price_input: e.target.value } : r))
                            )
                          }
                          placeholder="Opcional"
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[11px] text-zinc-400">Descrição resumida</label>
                        <input
                          type="text"
                          value={row.short_description}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.uid === row.uid ? { ...r, short_description: e.target.value } : r))
                            )
                          }
                          placeholder="Resumo do produto"
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
