import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Cpu, Share2, Tag } from 'lucide-react';
import type { Article, Category, Product, SiteSettings } from '../types';
import { buildWhatsAppPageShareUrl, formatDateBR } from '../lib/format';
import { CategoryIcon } from '../components/BrandLogo';
import { ProductCard } from '../components/ProductCard';

interface HomePageProps {
  categories: Category[];
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}

function EmptySectionNotice({ message, onNavigate }: { message: string; onNavigate: (path: string) => void }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-3">
      <Cpu className="w-8 h-8 text-yellow-400/70 mx-auto" />
      <p className="text-sm text-zinc-300 max-w-lg mx-auto">{message}</p>
      <div>
        <button
          type="button"
          onClick={() => onNavigate('/admin')}
          className="text-xs font-medium text-yellow-400 hover:underline"
        >
          Acessar painel administrativo para cadastrar ofertas
        </button>
      </div>
    </div>
  );
}

export function HomePage({ categories, settings, onNavigate }: HomePageProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestsellerProducts, setBestsellerProducts] = useState<Product[]>([]);
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [allRes, featRes, bestRes, promoRes, artRes] = await Promise.all([
          fetch('/api/products?sort=recent&limit=12').then((r) => r.json()),
          fetch('/api/products?featured=1&limit=8').then((r) => r.json()),
          fetch('/api/products?bestseller=1&limit=8').then((r) => r.json()),
          fetch('/api/products?promo=1&sort=discount_desc&limit=8').then((r) => r.json()),
          fetch('/api/articles').then((r) => r.json()),
        ]);
        if (cancelled) return;
        setAllProducts(Array.isArray(allRes.items) ? allRes.items : []);
        setFeaturedProducts(Array.isArray(featRes.items) ? featRes.items : []);
        setBestsellerProducts(Array.isArray(bestRes.items) ? bestRes.items : []);
        setPromoProducts(Array.isArray(promoRes.items) ? promoRes.items : []);
        setArticles(Array.isArray(artRes) ? artRes : []);
      } catch {
        // fail gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = settings.hero_banner;
  const campaign = settings.promo_campaign;
  const sections = settings.homepage_sections;
  const shareHomeUrl = buildWhatsAppPageShareUrl('Tech Oferta — As melhores ofertas de tecnologia', window.location.origin);

  return (
    <div className="space-y-16">
      {/* BANNER PRINCIPAL */}
      <section className="relative overflow-hidden border-b border-zinc-800/80 bg-zinc-950">
        <div className="absolute inset-0">
          <img
            src={hero.imageUrl || '/src/assets/images/hero_tech_oferta_banner_1794515015321.jpg'}
            alt="Produtos de tecnologia em destaque no Tech Oferta"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <p className="text-xs sm:text-sm font-medium text-yellow-400 tracking-wide">
              Tech Oferta · A tecnologia que você quer, pelo preço que você procura.
            </p>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-50 leading-[1.08] [text-wrap:balance]">
              {hero.title}
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
              {hero.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/ofertas')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm tracking-wide transition-colors min-h-[44px]"
              >
                <span>{hero.ctaText || 'EXPLORAR OFERTAS'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href={shareHomeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-zinc-700 bg-zinc-900/80 hover:border-yellow-400/60 text-zinc-100 font-medium text-sm transition-colors min-h-[44px]"
              >
                <Share2 className="w-4 h-4 text-yellow-400" />
                <span>Compartilhar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
        {/* 1. OFERTAS EM DESTAQUE */}
        {sections.showFeatured && (
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50">Ofertas em Destaque</h2>
                <p className="text-sm text-zinc-400 mt-1">Produtos selecionados com excelente custo-benefício.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/ofertas?sort=featured')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-400 hover:text-yellow-300 whitespace-nowrap shrink-0"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-80 rounded-xl bg-zinc-900/70 border border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
                ))}
              </div>
            ) : (
              <EmptySectionNotice
                message="Novas ofertas em destaque serão adicionadas em breve. Acompanhe o portal para conferir os lançamentos."
                onNavigate={onNavigate}
              />
            )}
          </section>
        )}

        {/* 5. CATEGORIAS */}
        {sections.showCategories && (
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50">Navegue por Categorias</h2>
                <p className="text-sm text-zinc-400 mt-1">Encontre exatamente a tecnologia que você procura.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onNavigate(`/categoria/${cat.slug}`)}
                  className="group flex items-center gap-3.5 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90 hover:border-yellow-400/70 hover:bg-zinc-900 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-yellow-400 shrink-0 group-hover:border-yellow-400/40">
                    <CategoryIcon name={cat.icon} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-100 group-hover:text-yellow-400 transition-colors truncate">
                      {cat.name}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-zinc-500 mt-0.5">
                      {cat.product_count ?? 0} {cat.product_count === 1 ? 'oferta' : 'ofertas'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 6. GRANDES PROMOÇÕES */}
        {sections.showCampaigns && (
          <section className="space-y-6">
            {campaign.enabled && (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <img
                  src={campaign.imageUrl || '/src/assets/images/promo_campaign_backdrop_1794515014322.jpg'}
                  alt={campaign.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/45" />
                <div className="relative p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-yellow-400">
                      <Tag className="w-4 h-4" />
                      <span>Campanha Promocional</span>
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50">{campaign.title}</h2>
                    <p className="text-sm text-zinc-300 leading-relaxed">{campaign.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(
                        campaign.highlightCategorySlug
                          ? `/categoria/${campaign.highlightCategorySlug}`
                          : '/ofertas?promo=1'
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    <span>{campaign.ctaText || 'Ver Promoções'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {promoProducts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {promoProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 3. MAIS VENDIDOS */}
        {sections.showBestsellers && (
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50">Mais Vendidos</h2>
                <p className="text-sm text-zinc-400 mt-1">Os eletrônicos mais procurados pelos visitantes.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/ofertas?sort=bestsellers')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-400 hover:text-yellow-300 whitespace-nowrap shrink-0"
              >
                <span>Ver ranking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {!loading && bestsellerProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {bestsellerProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
                ))}
              </div>
            ) : !loading ? (
              <EmptySectionNotice
                message="Os produtos mais vendidos aparecerão aqui conforme as ofertas forem marcadas no catálogo."
                onNavigate={onNavigate}
              />
            ) : null}
          </section>
        )}

        {/* 4. ÚLTIMAS OFERTAS ADICIONADAS & 2. TODOS OS PRODUTOS */}
        {(sections.showLatest || sections.showAllProducts) && (
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50">
                  Últimas Ofertas Adicionadas
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Catálogo atualizado diretamente pelo Mercado Livre.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/ofertas')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-400 hover:text-yellow-300 whitespace-nowrap shrink-0"
              >
                <span>Ver todos os produtos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {!loading && allProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
                ))}
              </div>
            ) : !loading ? (
              <EmptySectionNotice
                message="Ainda não há ofertas cadastradas no portal. Novas oportunidades de tecnologia serão adicionadas em breve."
                onNavigate={onNavigate}
              />
            ) : null}
          </section>
        )}

        {/* 7. ARTIGOS E DICAS DE TECNOLOGIA */}
        {sections.showArticles && (
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50">
                  Artigos e Dicas de Tecnologia
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Guias de compra, comparativos e recomendações para escolher melhor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/artigos')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-400 hover:text-yellow-300 whitespace-nowrap shrink-0"
              >
                <span>Todos os artigos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {articles.slice(0, 3).map((art) => (
                  <article
                    key={art.id}
                    onClick={() => onNavigate(`/artigo/${art.slug}`)}
                    className="cursor-pointer group rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden hover:border-yellow-400/60 transition-colors"
                  >
                    <div className="aspect-[16/10] bg-zinc-950 overflow-hidden">
                      <img
                        src={art.cover_image || '/src/assets/images/article_tech_guide_cover_1794515016652.jpg'}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="text-xs text-zinc-400">
                        <span>Artigo</span>
                        <span aria-hidden="true"> · </span>
                        <span>{formatDateBR(art.created_at)}</span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-zinc-50 group-hover:text-yellow-400 transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                      {art.subtitle && <p className="text-sm text-zinc-400 line-clamp-2">{art.subtitle}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-2">
                <BookOpen className="w-7 h-7 text-yellow-400/70 mx-auto" />
                <p className="text-sm text-zinc-300">
                  Novos guias de compra e dicas de tecnologia serão publicados em breve.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
