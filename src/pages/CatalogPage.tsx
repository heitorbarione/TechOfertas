import { useEffect, useState } from 'react';
import { Cpu, Search, Share2, SlidersHorizontal, X } from 'lucide-react';
import type { Category, Product } from '../types';
import { buildWhatsAppPageShareUrl } from '../lib/format';
import { CategoryIcon } from '../components/BrandLogo';
import { ProductCard } from '../components/ProductCard';

interface CatalogPageProps {
  categories: Category[];
  initialCategorySlug?: string;
  initialQuery?: string;
  initialSort?: string;
  initialPromo?: boolean;
  onNavigate: (path: string) => void;
}

export function CatalogPage({
  categories,
  initialCategorySlug = '',
  initialQuery = '',
  initialSort = 'recent',
  initialPromo = false,
  onNavigate,
}: CatalogPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug);
  const [sort, setSort] = useState(initialSort);
  const [promoOnly, setPromoOnly] = useState(initialPromo);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(24);

  useEffect(() => {
    setSelectedCategory(initialCategorySlug);
  }, [initialCategorySlug]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  useEffect(() => {
    setPromoOnly(initialPromo);
  }, [initialPromo]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (selectedCategory) params.set('category', selectedCategory);
        if (sort) params.set('sort', sort);
        if (promoOnly) params.set('promo', '1');
        params.set('limit', String(limit));

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = (await res.json()) as { total: number; items: Product[] };
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [query, selectedCategory, sort, promoOnly, limit]);

  const activeCategory = categories.find((c) => c.slug === selectedCategory);
  const pageTitle = activeCategory ? activeCategory.name : promoOnly ? 'Grandes Promoções' : 'Todas as Ofertas';
  const pageSubtitle = activeCategory
    ? activeCategory.description
    : 'Pesquise por nome, marca ou categoria e encontre ofertas verificadas no Mercado Livre.';

  const shareUrl = buildWhatsAppPageShareUrl(
    `${pageTitle} — Tech Oferta`,
    window.location.href
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-yellow-400">
            {activeCategory ? (
              <CategoryIcon name={activeCategory.icon} className="w-5 h-5" />
            ) : (
              <SlidersHorizontal className="w-5 h-5" />
            )}
            <span className="text-xs font-semibold tracking-wide">Catálogo Tech Oferta</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-50">{pageTitle}</h1>
          <p className="text-sm text-zinc-400 max-w-2xl">{pageSubtitle}</p>
        </div>

        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-yellow-400/60 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Share2 className="w-4 h-4 text-yellow-400" />
          <span>Compartilhar categoria no WhatsApp</span>
        </a>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por produto, marca ou categoria..."
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => {
              const nextSlug = e.target.value;
              setSelectedCategory(nextSlug);
              onNavigate(nextSlug ? `/categoria/${nextSlug}` : '/ofertas');
            }}
            aria-label="Filtrar por categoria"
            className="w-full h-11 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Ordenar ofertas"
            className="w-full h-11 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
          >
            <option value="recent">Mais recentes</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="discount_desc">Maior desconto</option>
            <option value="bestsellers">Mais vendidos</option>
          </select>
        </div>

        <div className="lg:col-span-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPromoOnly((v) => !v)}
            className={`flex-1 h-11 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
              promoOnly
                ? 'bg-yellow-400 text-zinc-950 border-yellow-400'
                : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Só Promoções
          </button>
          {(query || selectedCategory || promoOnly) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedCategory('');
                setPromoOnly(false);
                setSort('recent');
                onNavigate('/ofertas');
              }}
              aria-label="Limpar filtros"
              className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="font-mono tabular-nums">
          {total} {total === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-zinc-900/70 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
            ))}
          </div>

          {items.length < total && (
            <div className="flex justify-center pt-6">
              <button
                type="button"
                onClick={() => setLimit((prev) => prev + 24)}
                className="px-6 py-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-yellow-400 text-sm font-semibold text-zinc-100 transition-colors"
              >
                Carregar mais ofertas ({items.length} de {total})
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-4">
          <Cpu className="w-10 h-10 text-yellow-400/70 mx-auto" />
          <h2 className="font-display text-xl font-bold text-zinc-100">
            Nenhuma oferta encontrada neste filtro
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Novas ofertas de tecnologia serão adicionadas em breve. Experimente limpar os filtros ou explorar outras
            categorias.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedCategory('');
                setPromoOnly(false);
                onNavigate('/ofertas');
              }}
              className="px-4 py-2.5 rounded-lg bg-yellow-400 text-zinc-950 font-semibold text-xs"
            >
              Ver catálogo completo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
