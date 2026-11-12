import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Cpu, Share2, ShieldCheck } from 'lucide-react';
import type { Product } from '../types';
import { buildWhatsAppProductShareUrl, formatBRL, formatDateBR } from '../lib/format';
import { ProductCard } from '../components/ProductCard';

interface ProductDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export function ProductDetailPage({ slug, onNavigate }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = (await res.json()) as { product: Product; related: Product[] };
        if (cancelled) return;
        setProduct(data.product);
        setRelated(Array.isArray(data.related) ? data.related : []);
        setActiveImage(data.product.image_url || data.product.gallery[0] || '');
        document.title = `${data.product.title} — Tech Oferta`;
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-4">
        <Cpu className="w-10 h-10 text-yellow-400 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-zinc-50">Oferta não encontrada</h1>
        <p className="text-sm text-zinc-400">Este anúncio pode ter sido pausado ou removido do catálogo.</p>
        <button
          type="button"
          onClick={() => onNavigate('/ofertas')}
          className="px-5 py-2.5 rounded-lg bg-yellow-400 text-zinc-950 font-semibold text-sm"
        >
          Explorar todas as ofertas
        </button>
      </div>
    );
  }

  const allImages = [product.image_url, ...product.gallery].filter((u, idx, arr) => Boolean(u) && arr.indexOf(u) === idx);
  const hasConfirmedDiscount =
    Boolean(product.discount_percent && product.discount_percent > 0) &&
    Boolean(product.original_price && product.original_price > product.current_price);
  const whatsappUrl = buildWhatsAppProductShareUrl(product, window.location.href);

  const trackClick = async () => {
    try {
      await fetch(`/api/products/${product.id}/click`, { method: 'POST' });
    } catch {
      // non-blocking
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-16">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <button
          type="button"
          onClick={() => onNavigate('/ofertas')}
          className="inline-flex items-center gap-1.5 hover:text-yellow-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ofertas</span>
        </button>
        {product.category_name && product.category_slug && (
          <>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => onNavigate(`/categoria/${product.category_slug}`)}
              className="hover:text-yellow-400 transition-colors"
            >
              {product.category_name}
            </button>
          </>
        )}
      </div>

      {/* MÓDULO PRINCIPAL DO PRODUTO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* GALERIA ESQUERDA */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="aspect-[4/3] rounded-2xl border border-zinc-800 bg-white overflow-hidden flex items-center justify-center p-6">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.title}
                referrerPolicy="no-referrer"
                onError={() => setActiveImage('')}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Cpu className="w-12 h-12 text-zinc-400" />
                <span className="text-xs">Imagem não disponível</span>
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-lg border bg-white p-1.5 shrink-0 overflow-hidden transition-colors ${
                    activeImage === img ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <img src={img} alt={`${product.title} - foto ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MÓDULO DE COMPRA DIREITA */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {product.brand && (
                <>
                  <span className="font-semibold text-yellow-400">{product.brand}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{product.category_name || 'Tecnologia'}</span>
              {product.ml_id && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-zinc-500">{product.ml_id}</span>
                </>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50 leading-snug">
              {product.title}
            </h1>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            {hasConfirmedDiscount && product.original_price && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono tabular-nums text-zinc-500 line-through">
                  {formatBRL(product.original_price)}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold tabular-nums rounded bg-yellow-400 text-zinc-950">
                  {product.discount_percent}% OFF
                </span>
              </div>
            )}

            <div className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-yellow-400">
              {formatBRL(product.current_price)}
            </div>

            <p className="text-xs text-zinc-400">
              Atualizado em {formatDateBR(product.updated_at)}. Valores e disponibilidade sujeitos à página do vendedor no
              Mercado Livre.
            </p>
          </div>

          {product.short_description && (
            <p className="text-sm text-zinc-300 leading-relaxed">{product.short_description}</p>
          )}

          <div className="space-y-3">
            <a
              href={product.affiliate_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={trackClick}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-extrabold text-sm tracking-wide transition-colors min-h-[48px]"
            >
              <span>COMPRAR NO MERCADO LIVRE</span>
              <ArrowUpRight className="w-5 h-5" />
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-700 bg-zinc-950 hover:border-yellow-400/60 text-zinc-100 font-semibold text-sm transition-colors min-h-[44px]"
            >
              <Share2 className="w-4 h-4 text-yellow-400" />
              <span>Compartilhar no WhatsApp</span>
            </a>
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>Compra finalizada diretamente no ambiente seguro do Mercado Livre.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>Link de afiliado verificado sem custo adicional para o consumidor.</span>
            </div>
          </div>
        </div>
      </div>

      {/* DESCRIÇÃO E CARACTERÍSTICAS TÉCNICAS */}
      {(product.description || product.specs.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-zinc-800 pt-12">
          {product.description && (
            <div className="lg:col-span-7 space-y-4">
              <h2 className="font-display text-2xl font-bold text-zinc-50">Descrição do Produto</h2>
              <div className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {product.specs.length > 0 && (
            <div className={product.description ? 'lg:col-span-5 space-y-4' : 'lg:col-span-12 space-y-4'}>
              <h2 className="font-display text-2xl font-bold text-zinc-50">Características Técnicas</h2>
              <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/70">
                <table className="w-full text-sm">
                  <tbody>
                    {product.specs.map((spec, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/80 last:border-b-0">
                        <th className="text-left font-medium text-zinc-400 px-4 py-3 bg-zinc-950/50 w-2/5">
                          {spec.name}
                        </th>
                        <td className="text-zinc-100 px-4 py-3">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRODUTOS RELACIONADOS */}
      {related.length > 0 && (
        <section className="space-y-6 border-t border-zinc-800 pt-12">
          <h2 className="font-display text-2xl font-bold text-zinc-50">Produtos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
