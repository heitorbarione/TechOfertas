import { useState } from 'react';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import type { Category } from '../types';
import { BrandLogo, CategoryIcon } from './BrandLogo';

interface HeaderProps {
  categories: Category[];
  currentPath: string;
  searchQuery: string;
  onSearchSubmit: (q: string) => void;
  onNavigate: (path: string) => void;
}

export function Header({ categories, currentPath, searchQuery, onSearchSubmit, onNavigate }: HeaderProps) {
  const [query, setQuery] = useState(searchQuery);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(query.trim());
    setMobileOpen(false);
  };

  const go = (path: string) => {
    setMobileOpen(false);
    setCatMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4 lg:gap-8">
          <button
            type="button"
            onClick={() => go('/')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-lg"
            aria-label="Ir para a página inicial do Tech Oferta"
          >
            <BrandLogo />
          </button>

          <form onSubmit={handleSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar celulares, notebooks, fones..."
              aria-label="Pesquisar produtos no Tech Oferta"
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors"
            />
          </form>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-300" aria-label="Principal">
            <button
              type="button"
              onClick={() => go('/')}
              className={`hover:text-yellow-400 transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/' ? 'text-yellow-400' : ''
              }`}
            >
              Início
            </button>

            <div
              className="relative"
              onMouseEnter={() => setCatMenuOpen(true)}
              onMouseLeave={() => setCatMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCatMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-yellow-400 transition-colors whitespace-nowrap shrink-0 py-2"
                aria-expanded={catMenuOpen}
              >
                <span>Categorias</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {catMenuOpen && (
                <div className="absolute left-0 top-full pt-1 w-80 z-50">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 max-h-[70vh] overflow-y-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => go(`/categoria/${cat.slug}`)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-zinc-800 hover:text-yellow-400 transition-colors"
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <CategoryIcon name={cat.icon} className="w-4 h-4 text-yellow-400 shrink-0" />
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className="font-mono tabular-nums text-zinc-500 text-[11px] shrink-0">
                          {cat.product_count ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => go('/ofertas?promo=1')}
              className="hover:text-yellow-400 transition-colors whitespace-nowrap shrink-0"
            >
              Promoções
            </button>

            <button
              type="button"
              onClick={() => go('/artigos')}
              className={`hover:text-yellow-400 transition-colors whitespace-nowrap shrink-0 ${
                currentPath.startsWith('/artigo') ? 'text-yellow-400' : ''
              }`}
            >
              Artigos
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => go('/ofertas')}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-semibold text-xs tracking-wide transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Todas as Ofertas
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:text-yellow-400"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4 max-h-[82vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar ofertas de tecnologia..."
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
            />
          </form>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => go('/')}
              className="px-3 py-2.5 rounded-lg bg-zinc-900 text-left text-sm font-medium text-zinc-100"
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => go('/ofertas')}
              className="px-3 py-2.5 rounded-lg bg-yellow-400 text-left text-sm font-semibold text-zinc-950"
            >
              Todas as Ofertas
            </button>
            <button
              type="button"
              onClick={() => go('/ofertas?promo=1')}
              className="px-3 py-2.5 rounded-lg bg-zinc-900 text-left text-sm font-medium text-zinc-100"
            >
              Promoções
            </button>
            <button
              type="button"
              onClick={() => go('/artigos')}
              className="px-3 py-2.5 rounded-lg bg-zinc-900 text-left text-sm font-medium text-zinc-100"
            >
              Artigos e Dicas
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <div className="text-xs font-semibold text-zinc-400 mb-2">Categorias de Tecnologia</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => go(`/categoria/${cat.slug}`)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs text-zinc-200 hover:bg-zinc-900"
                >
                  <CategoryIcon name={cat.icon} className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
