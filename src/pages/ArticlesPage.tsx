import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Article } from '../types';
import { formatDateBR } from '../lib/format';
import { ProductCard } from '../components/ProductCard';

export function ArticlesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => r.json())
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="space-y-2 border-b border-zinc-800 pb-6">
        <span className="text-xs font-semibold text-yellow-400">Conteúdo Editorial</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-50">
          Artigos e Dicas de Tecnologia
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl">
          Guias práticos para escolher smartphones, notebooks, periféricos e eletrônicos pelo melhor custo-benefício.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((art) => (
            <article
              key={art.id}
              onClick={() => onNavigate(`/artigo/${art.slug}`)}
              className="cursor-pointer group rounded-xl border border-zinc-800 bg-zinc-900/90 overflow-hidden hover:border-yellow-400/60 transition-colors"
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
                  <span>Guia Tech Oferta</span>
                  <span aria-hidden="true"> · </span>
                  <span>{formatDateBR(art.created_at)}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-zinc-50 group-hover:text-yellow-400 transition-colors">
                  {art.title}
                </h2>
                {art.subtitle && <p className="text-sm text-zinc-400 line-clamp-2">{art.subtitle}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-3">
          <BookOpen className="w-9 h-9 text-yellow-400/70 mx-auto" />
          <h2 className="font-display text-xl font-bold text-zinc-100">Nenhum artigo publicado ainda</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Os artigos e comparativos publicados pelo administrador aparecerão aqui com links para os produtos recomendados.
          </p>
        </div>
      )}
    </div>
  );
}

export function ArticleDetailPage({ slug, onNavigate }: { slug: string; onNavigate: (path: string) => void }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/articles/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: Article) => {
        setArticle(data);
        document.title = `${data.seo_title || data.title} — Tech Oferta`;
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-4">
        <BookOpen className="w-10 h-10 text-yellow-400 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-zinc-50">Artigo não encontrado</h1>
        <button
          type="button"
          onClick={() => onNavigate('/artigos')}
          className="px-5 py-2.5 rounded-lg bg-yellow-400 text-zinc-950 font-semibold text-sm"
        >
          Voltar para artigos
        </button>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <button
        type="button"
        onClick={() => onNavigate('/artigos')}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-yellow-400"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Todos os artigos</span>
      </button>

      <header className="space-y-4">
        <div className="text-xs text-zinc-400">
          <span>Tech Oferta Editorial</span>
          <span aria-hidden="true"> · </span>
          <span>Publicado em {formatDateBR(article.created_at)}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-50 leading-tight">
          {article.title}
        </h1>
        {article.subtitle && <p className="text-lg text-zinc-300 leading-relaxed">{article.subtitle}</p>}
      </header>

      <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
        <img
          src={article.cover_image || '/src/assets/images/article_tech_guide_cover_1794515016652.jpg'}
          alt={article.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="prose prose-invert prose-zinc max-w-none space-y-4 text-zinc-200 leading-relaxed whitespace-pre-line text-base">
        {article.content}
      </div>

      {article.related_products && article.related_products.length > 0 && (
        <section className="pt-10 border-t border-zinc-800 space-y-6">
          <h2 className="font-display text-2xl font-bold text-zinc-50">Produtos Recomendados Neste Artigo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {article.related_products.map((p) => (
              <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
