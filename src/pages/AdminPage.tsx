import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Package,
  Trash2,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'products' | 'categories';

interface AdminPageProps {
  onNavigate: (path: string) => void;
  onCatalogMutated: () => void;
}

export function AdminPage({ onNavigate, onCatalogMutated }: AdminPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [toast, setToast] = useState<string>('');

  const [products, setProducts] = useState<any[]>(() => {
    const saved = localStorage.getItem('techofertas_products');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        title: 'Teclado Mecânico Gamer RGB',
        brand: 'Redragon',
        current_price: 249.99,
        original_price: 350.00,
        category_name: 'Periféricos',
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
      }
    ];
  });

  const [categories] = useState<any[]>([
    { id: 1, name: 'Periféricos', description: 'Teclados, mouses e headsets' },
    { id: 2, name: 'Hardware', description: 'Placas de vídeo e processadores' }
  ]);

  const [newProduct, setNewProduct] = useState({
    title: '',
    brand: '',
    current_price: '',
    original_price: '',
    category_name: 'Periféricos',
    image_url: '',
    affiliate_url: ''
  });

  useEffect(() => {
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@techofertas.com' && password === '123456') {
      localStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      showToast('Login realizado com sucesso!');
    } else {
      setAuthError('E-mail ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.current_price) {
      showToast('Preencha os campos obrigatórios.');
      return;
    }

    const productToAdd = {
      id: Date.now(),
      title: newProduct.title,
      brand: newProduct.brand || 'Genérico',
      current_price: Number(newProduct.current_price),
      original_price: newProduct.original_price ? Number(newProduct.original_price) : null,
      category_name: newProduct.category_name,
      image_url: newProduct.image_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500',
      affiliate_url: newProduct.affiliate_url || '#'
    };

    const updated = [productToAdd, ...products];
    setProducts(updated);
    localStorage.setItem('techofertas_products', JSON.stringify(updated));
    
    setNewProduct({
      title: '',
      brand: '',
      current_price: '',
      original_price: '',
      category_name: 'Periféricos',
      image_url: '',
      affiliate_url: ''
    });

    showToast('Produto cadastrado com sucesso!');
    onCatalogMutated();
  };

  const handleDeleteProduct = (id: number) => {
    if (!window.confirm('Deseja realmente excluir este produto?')) return;
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    localStorage.setItem('techofertas_products', JSON.stringify(updated));
    showToast('Produto excluído.');
    onCatalogMutated();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 space-y-6 shadow-2xl">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-2xl font-bold text-zinc-50">Painel Administrativo</h1>
            <p className="text-xs text-zinc-400">Entre com suas credenciais para gerenciar o TechOfertas.</p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@techofertas.com"
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Entrar no Painel</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-xs text-zinc-400 hover:text-yellow-400 cursor-pointer"
            >
              Voltar para a loja pública
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row">
      <aside className="w-full lg:w-64 bg-zinc-900/90 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 flex flex-col justify-between gap-4 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg text-yellow-400">TechOfertas Admin</span>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'products', label: 'Produtos', icon: <Package className="w-4 h-4" /> },
              { id: 'categories', label: 'Categorias', icon: <FolderTree className="w-4 h-4" /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as AdminTab)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  tab === item.id
                    ? 'bg-yellow-400 text-zinc-950'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver site público</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-950/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do painel</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full space-y-6">
        {toast && (
          <div className="p-3.5 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-200 text-xs font-medium">
            {toast}
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Dashboard Administrativo</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-xs text-zinc-400">Total de Produtos</div>
                <div className="text-2xl font-bold text-yellow-400">{products.length}</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-xs text-zinc-400">Categorias</div>
                <div className="text-2xl font-bold text-yellow-400">{categories.length}</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-xs text-zinc-400">Modo de Operação</div>
                <div className="text-sm font-semibold text-emerald-400">GitHub Pages (Estático)</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Cadastrar e Gerenciar Produtos</h1>

            <form onSubmit={handleSaveProduct} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-yellow-400">Novo Produto</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Título do Produto *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                    placeholder="Ex: Teclado Mecânico RGB"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Marca</label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    placeholder="Ex: Redragon"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Preço Atual (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.current_price}
                    onChange={(e) => setNewProduct({ ...newProduct, current_price: e.target.value })}
                    placeholder="249.99"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Preço Antigo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.original_price}
                    onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value })}
                    placeholder="350.00"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Link da Imagem</label>
                  <input
                    type="url"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Link de Afiliado</label>
                  <input
                    type="url"
                    value={newProduct.affiliate_url}
                    onChange={(e) => setNewProduct({ ...newProduct, affiliate_url: e.target.value })}
                    placeholder="https://mercadolivre.com/..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Publicar Produto
              </button>
            </form>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white">Produtos Cadastrados ({products.length})</h2>
              
              <div className="divide-y divide-zinc-800">
                {products.map((p: any) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image_url} alt="" className="w-10 h-10 object-cover rounded-lg border border-zinc-800" />
                      <div>
                        <div className="text-sm font-semibold text-white">{p.title}</div>
                        <div className="text-xs text-zinc-400">R$ {p.current_price} • {p.brand}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-2 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Categorias</h1>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-3">
              {categories.map((c: any) => (
                <div key={c.id} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-xs text-zinc-400">{c.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
