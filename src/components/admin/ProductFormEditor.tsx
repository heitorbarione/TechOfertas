import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Category, ProductSpec } from '../../types';
import { computeDiscountPercent } from '../../lib/format';

export interface ProductFormValues {
  id?: number;
  ml_id: string;
  title: string;
  brand: string;
  short_description: string;
  description: string;
  specs: ProductSpec[];
  image_url: string;
  gallery: string[];
  current_price: string;
  original_price: string;
  is_promo: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_active: boolean;
  category_id: string;
  affiliate_url: string;
  original_url: string;
  source: string;
}

interface ProductFormEditorProps {
  initial: ProductFormValues;
  categories: Category[];
  submitLabel: string;
  saving?: boolean;
  onCancel?: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
}

export function ProductFormEditor({
  initial,
  categories,
  submitLabel,
  saving = false,
  onCancel,
  onSubmit,
}: ProductFormEditorProps) {
  const [form, setForm] = useState<ProductFormValues>(initial);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [error, setError] = useState('');

  const curNum = Number(form.current_price);
  const origNum = form.original_price ? Number(form.original_price) : null;
  const computedDiscount = Number.isFinite(curNum) ? computeDiscountPercent(curNum, origNum) : null;

  const handleAddGallery = () => {
    const trimmed = newGalleryUrl.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, gallery: [...prev.gallery, trimmed] }));
    setNewGalleryUrl('');
  };

  const handleAddSpec = () => {
    setForm((prev) => ({ ...prev, specs: [...prev.specs, { name: '', value: '' }] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Informe o nome completo do produto.');
      return;
    }
    if (!form.affiliate_url.trim()) {
      setError('Informe o link de afiliado do Mercado Livre.');
      return;
    }
    if (!Number.isFinite(curNum) || curNum <= 0) {
      setError('Informe um preço atual válido maior que zero.');
      return;
    }
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar oferta.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200">{error}</div>
      )}

      {/* LINK DE AFILIADO PRESERVADO */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-yellow-400/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-yellow-400">
            Link de Afiliado do Mercado Livre (preservado exatamente como inserido) *
          </label>
          {form.ml_id && (
            <span className="text-[11px] font-mono text-zinc-400">ID: {form.ml_id}</span>
          )}
        </div>
        <input
          type="url"
          required
          value={form.affiliate_url}
          onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })}
          placeholder="https://mercadolivre.com/sec/..."
          className="w-full h-11 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-yellow-400"
        />
        {form.original_url && (
          <div className="text-[11px] text-zinc-500 truncate">
            Destino original identificado: <span className="font-mono">{form.original_url}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Nome completo do produto *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Fone de Ouvido Bluetooth JBL Tune 520BT Preto"
              className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Marca</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Ex: Samsung, Apple, JBL, Logitech"
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Categoria</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              >
                <option value="">Sem categoria definida</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Preço atual (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.current_price}
                onChange={(e) => setForm({ ...form, current_price: e.target.value })}
                placeholder="299.90"
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Preço anterior (opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.original_price}
                onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                placeholder="Deixe vazio se não houver"
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Desconto confirmado</label>
              <div className="h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center text-sm font-mono tabular-nums">
                {computedDiscount ? (
                  <span className="text-yellow-400 font-bold">{computedDiscount}% OFF (automático)</span>
                ) : (
                  <span className="text-zinc-500 text-xs">Sem desconto confirmado</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Descrição resumida (para o card)</label>
            <input
              type="text"
              value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              placeholder="Resumo objetivo dos principais destaques do produto"
              className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Descrição completa</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes completos do produto exibidos na página individual..."
              className="w-full p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* IMAGENS E OPÇÕES */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <label className="text-xs font-medium text-zinc-300">Imagem principal (URL)</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://http2.mlstatic.com/..."
              className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-yellow-400"
            />
            {form.image_url && (
              <div className="aspect-[4/3] rounded-lg bg-white p-2 overflow-hidden flex items-center justify-center">
                <img
                  src={form.image_url}
                  alt="Prévia principal"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="pt-2 space-y-2">
              <label className="text-xs font-medium text-zinc-400">Imagens adicionais ({form.gallery.length})</label>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={newGalleryUrl}
                  onChange={(e) => setNewGalleryUrl(e.target.value)}
                  placeholder="URL da foto extra"
                  className="flex-1 h-9 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={handleAddGallery}
                  className="px-2.5 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {form.gallery.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {form.gallery.map((gUrl, idx) => (
                    <div key={idx} className="relative group aspect-square rounded bg-white p-1 overflow-hidden">
                      <img src={gUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            gallery: prev.gallery.filter((_, i) => i !== idx),
                          }))
                        }
                        className="absolute inset-0 bg-black/70 text-red-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        aria-label="Remover imagem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="text-xs font-semibold text-zinc-300">Visibilidade e Destaques</div>
            <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-yellow-400"
              />
              <span>Oferta ativa no site</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="w-4 h-4 accent-yellow-400"
              />
              <span>Exibir em Ofertas em Destaque</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_bestseller}
                onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })}
                className="w-4 h-4 accent-yellow-400"
              />
              <span>Marcar como Mais Vendido</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_promo}
                onChange={(e) => setForm({ ...form, is_promo: e.target.checked })}
                className="w-4 h-4 accent-yellow-400"
              />
              <span>Exibir na seção de Promoções</span>
            </label>
          </div>
        </div>
      </div>

      {/* CARACTERÍSTICAS TÉCNICAS */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">Características Técnicas</span>
          <button
            type="button"
            onClick={handleAddSpec}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar especificação</span>
          </button>
        </div>

        {form.specs.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhuma característica técnica adicionada.</p>
        ) : (
          <div className="space-y-2">
            {form.specs.map((spec, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => {
                    const next = [...form.specs];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setForm({ ...form, specs: next });
                  }}
                  placeholder="Atributo (ex: Memória RAM)"
                  className="col-span-5 h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => {
                    const next = [...form.specs];
                    next[idx] = { ...next[idx], value: e.target.value };
                    setForm({ ...form, specs: next });
                  }}
                  placeholder="Valor (ex: 16 GB)"
                  className="col-span-6 h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      specs: prev.specs.filter((_, i) => i !== idx),
                    }))
                  }
                  className="col-span-1 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 text-sm font-medium hover:border-zinc-500"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
