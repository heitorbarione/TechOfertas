import { useState } from 'react';
import { ArrowUpRight, Cpu, Share2 } from 'lucide-react';
import type { Product } from '../types';
import { buildWhatsAppProductShareUrl, formatBRL } from '../lib/format';

interface ProductCardProps {
  product: Product;
  onNavigate: (path: string) => void;
}

export function ProductCard({ product, onNavigate }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  const productPath = `/produto/${product.slug}`;
  const fullShareUrl = `${window.location.origin}${productPath}`;
  const whatsappUrl = buildWhatsAppProductShareUrl(product, fullShareUrl);

  const hasConfirmedDiscount =
    Boolean(product.discount_percent && product.discount_percent > 0) &&
    Boolean(product.original_price && product.original_price > product.current_price);

  const handleAffiliateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/products/${product.id}/click`, { method: 'POST' });
    } catch {
      // non-blocking click tracking
    }
  };

  return (
    <article className="group flex flex-col justify-between bg-zinc-900/90 border border-zinc-800/90 rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-zinc-700">
      <div>
        <button
          type="button"
          onClick={() => onNavigate(productPath)}
          className="relative block w-full aspect-[4/3] bg-zinc-950 overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
        >
          {product.image_url && !imgError ? (
            <img
              src={product.image_url}
              alt={product.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain p-4 bg-white/[0.97] transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-6 text-center">
              <Cpu className="w-10 h-10 text-yellow-400/70" />
              <span className="text-xs font-medium text-zinc-400 line-clamp-2 max-w-[180px]">{product.title}</span>
            </div>
          )}

          {(hasConfirmedDiscount || product.is_promo) && (
            <span className="absolute top-3 left-3 px-2 py-1 text-xs font-mono font-bold tabular-nums rounded bg-yellow-400 text-zinc-950">
              {hasConfirmedDiscount ? `-${product.discount_percent}%` : 'OFERTA'}
            </span>
          )}
        </button>

        <div className="p-4 pb-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
            {product.brand && (
              <>
                <span className="font-semibold text-zinc-300 truncate">{product.brand}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="truncate">{product.category_name || 'Tecnologia'}</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(productPath)}
            className="block text-left w-full focus-visible:outline-none focus-visible:text-yellow-400"
          >
            <h3 className="text-base font-semibold text-zinc-50 leading-snug line-clamp-2 group-hover:text-yellow-400 transition-colors">
              {product.title}
            </h3>
          </button>

          {product.short_description && (
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{product.short_description}</p>
          )}
        </div>
      </div>

      <div className="p-4 pt-2 border-t border-zinc-800/70 space-y-3">
        <div>
          {hasConfirmedDiscount && product.original_price && (
            <div className="text-xs font-mono tabular-nums text-zinc-500 line-through">
              {formatBRL(product.original_price)}
            </div>
          )}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-mono font-bold tabular-nums text-yellow-400">
              {formatBRL(product.current_price)}
            </span>
            {product.is_bestseller && (
              <span className="text-[11px] font-medium text-zinc-400 whitespace-nowrap">Mais vendido</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={product.affiliate_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleAffiliateClick}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-semibold text-xs tracking-wide transition-colors whitespace-nowrap min-h-[40px]"
          >
            <span>CONFERIR OFERTA</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Compartilhar ${product.title} no WhatsApp`}
            title="Compartilhar no WhatsApp"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-950 hover:border-yellow-400/60 hover:text-yellow-400 text-zinc-300 transition-colors shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
