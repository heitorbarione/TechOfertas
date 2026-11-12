import type { Category } from '../types';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  categories: Category[];
  onNavigate: (path: string) => void;
}

export function Footer({ categories, onNavigate }: FooterProps) {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/90 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <BrandLogo />
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
              A tecnologia que você quer, pelo preço que você procura. Curadoria de ofertas e promoções no Mercado Livre.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">Navegação</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <button type="button" onClick={() => onNavigate('/')} className="hover:text-yellow-400 transition-colors">
                  Página Inicial
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/ofertas')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Todas as Ofertas
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/ofertas?promo=1')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Grandes Promoções
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/artigos')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Artigos e Dicas
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">Principais Categorias</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/categoria/${cat.slug}`)}
                    className="hover:text-yellow-400 transition-colors text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">Institucional</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/sobre')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Sobre Nós
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/contato')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Contato
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/privacidade')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Política de Privacidade
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/termos')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Termos de Uso
                </button>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/admin')}
                  className="text-xs text-zinc-500 hover:text-yellow-400 transition-colors"
                >
                  Painel Administrativo
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          O Tech Oferta participa de programas de afiliados. Podemos receber comissões por compras realizadas através
          dos links divulgados em nosso site, sem custo adicional para o consumidor.
        </div>

        <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} Tech Oferta. Todos os direitos reservados.</span>
          <span>Compras finalizadas com segurança diretamente no Mercado Livre.</span>
        </div>
      </div>
    </footer>
  );
}
