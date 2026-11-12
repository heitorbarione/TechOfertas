import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Download,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Link2,
  Lock,
  LogOut,
  Mail,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AdminDashboardStats,
  Article,
  Category,
  ContactMessage,
  ImportedOfferDraft,
  Product,
  SiteSettings,
} from '../types';
import { apiFetch, formatBRL, formatDateBR, setStoredAdminToken } from '../lib/format';
import { BrandLogo } from '../components/BrandLogo';
import { BulkImportPanel } from '../components/admin/BulkImportPanel';
import { ProductFormEditor, type ProductFormValues } from '../components/admin/ProductFormEditor';

type AdminTab =
  | 'dashboard'
  | 'import-link'
  | 'import-bulk'
  | 'products'
  | 'categories'
  | 'articles'
  | 'settings'
  | 'messages';

interface AdminPageProps {
  onNavigate: (path: string) => void;
  onCatalogMutated: () => void;
}

const EMPTY_PRODUCT_FORM: ProductFormValues = {
  ml_id: '',
  title: '',
  brand: '',
  short_description: '',
  description: '',
  specs: [],
  image_url: '',
  gallery: [],
  current_price: '',
  original_price: '',
  is_promo: false,
  is_featured: false,
  is_bestseller: false,
  is_active: true,
  category_id: '',
  affiliate_url: '',
  original_url: '',
  source: 'manual',
};

function productToFormValues(p: Product): ProductFormValues {
  return {
    id: p.id,
    ml_id: p.ml_id || '',
    title: p.title,
    brand: p.brand,
    short_description: p.short_description,
    description: p.description,
    specs: p.specs || [],
    image_url: p.image_url,
    gallery: p.gallery || [],
    current_price: String(p.current_price),
    original_price: p.original_price ? String(p.original_price) : '',
    is_promo: p.is_promo,
    is_featured: p.is_featured,
    is_bestseller: p.is_bestseller,
    is_active: p.is_active,
    category_id: p.category_id ? String(p.category_id) : '',
    affiliate_url: p.affiliate_url,
    original_url: p.original_url,
    source: p.source,
  };
}

export function AdminPage({ onNavigate, onCatalogMutated }: AdminPageProps) {
  const [authState, setAuthState] = useState<{
    loading: boolean;
    needsSetup: boolean;
    authenticated: boolean;
    username: string | null;
  }>({ loading: true, needsSetup: false, authenticated: false, username: null });

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [toast, setToast] = useState<string>('');

  // Single link import state
  const [linkInput, setLinkInput] = useState('');
  const [importingLink, setImportingLink] = useState(false);
  const [importDraft, setImportDraft] = useState<ImportedOfferDraft | null>(null);
  const [importFormInitial, setImportFormInitial] = useState<ProductFormValues | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Manual/edit product modal state
  const [editingForm, setEditingForm] = useState<ProductFormValues | null>(null);
  const [productFilter, setProductFilter] = useState('');

  // Category state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('cpu');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Article state
  const [editingArticle, setEditingArticle] = useState<{
    id?: number;
    title: string;
    subtitle: string;
    cover_image: string;
    content: string;
    related_product_ids: number[];
    is_published: boolean;
    seo_title: string;
    seo_description: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const loadAllAdminData = useCallback(async () => {
    try {
      const [s, p, c, a, st, m] = await Promise.all([
        apiFetch<AdminDashboardStats>('/api/admin/stats'),
        apiFetch<Product[]>('/api/admin/products'),
        apiFetch<Category[]>('/api/admin/categories'),
        apiFetch<Article[]>('/api/admin/articles'),
        apiFetch<SiteSettings>('/api/settings'),
        apiFetch<ContactMessage[]>('/api/admin/messages'),
      ]);
      setStats(s);
      setProducts(p);
      setCategories(c);
      setArticles(a);
      setSettings(st);
      setMessages(m);
    } catch {
      // ignore if session expired
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetch<{ needsSetup: boolean; authenticated: boolean; username: string | null }>(
        '/api/admin/auth/status'
      );
      setAuthState({ loading: false, ...res });
      if (res.authenticated) {
        await loadAllAdminData();
      }
    } catch {
      setAuthState({ loading: false, needsSetup: false, authenticated: false, username: null });
    }
  }, [loadAllAdminData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const endpoint = authState.needsSetup ? '/api/admin/auth/setup' : '/api/admin/auth/login';
      const res = await apiFetch<{ token: string; username: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      setStoredAdminToken(res.token);
      setAuthState({ loading: false, needsSetup: false, authenticated: true, username: res.username });
      await loadAllAdminData();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredAdminToken(null);
    setAuthState({ loading: false, needsSetup: false, authenticated: false, username: null });
  };

  const handleImportSingleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;
    setImportingLink(true);
    setImportDraft(null);
    setImportFormInitial(null);
    try {
      const draft = await apiFetch<ImportedOfferDraft>('/api/admin/import-link', {
        method: 'POST',
        body: JSON.stringify({ url: linkInput.trim() }),
      });
      setImportDraft(draft);
      if (draft.import_status !== 'error') {
        setImportFormInitial({
          ml_id: draft.ml_id || '',
          title: draft.title || '',
          brand: draft.brand || '',
          short_description: draft.short_description || '',
          description: draft.description || '',
          specs: draft.specs || [],
          image_url: draft.image_url || '',
          gallery: draft.gallery || [],
          current_price: draft.current_price ? String(draft.current_price) : '',
          original_price: draft.original_price ? String(draft.original_price) : '',
          is_promo: Boolean(draft.discount_percent),
          is_featured: false,
          is_bestseller: false,
          is_active: true,
          category_id: draft.suggested_category_id ? String(draft.suggested_category_id) : '',
          affiliate_url: draft.affiliate_url,
          original_url: draft.original_url || '',
          source: draft.source,
        });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao importar link.');
    } finally {
      setImportingLink(false);
    }
  };

  const handleSaveProductForm = async (values: ProductFormValues, isFromImport = false) => {
    setSavingProduct(true);
    try {
      const payload = {
        ...values,
        current_price: Number(values.current_price),
        original_price: values.original_price ? Number(values.original_price) : null,
        category_id: values.category_id ? Number(values.category_id) : null,
        allow_duplicate: false,
      };
      if (values.id) {
        await apiFetch(`/api/admin/products/${values.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Produto atualizado com sucesso!');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Oferta publicada no portal com sucesso!');
      }
      if (isFromImport) {
        setLinkInput('');
        setImportDraft(null);
        setImportFormInitial(null);
      }
      setEditingForm(null);
      await loadAllAdminData();
      onCatalogMutated();
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductField = async (p: Product, field: 'is_active' | 'is_featured' | 'is_bestseller') => {
    await apiFetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({ [field]: !p[field] }),
    });
    await loadAllAdminData();
    onCatalogMutated();
  };

  const handleQuickPriceUpdate = async (p: Product, newPriceStr: string) => {
    const val = Number(newPriceStr);
    if (!Number.isFinite(val) || val <= 0 || val === p.current_price) return;
    await apiFetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({ current_price: val }),
    });
    showToast(`Preço atualizado para ${formatBRL(val)}`);
    await loadAllAdminData();
    onCatalogMutated();
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Excluir permanentemente a oferta "${p.title}"?`)) return;
    await apiFetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
    showToast('Anúncio excluído.');
    await loadAllAdminData();
    onCatalogMutated();
  };

  const handleDownloadExport = async (format: 'json' | 'csv') => {
    const token = sessionStorage.getItem('techoferta_admin_token');
    const res = await fetch(`/api/admin/export?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'csv' ? 'tech-oferta-catalogo.csv' : 'tech-oferta-catalogo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Category actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (editingCat) {
      await apiFetch(`/api/admin/categories/${editingCat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: catName, description: catDesc, icon: catIcon }),
      });
      showToast('Categoria atualizada.');
    } else {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: catDesc, icon: catIcon }),
      });
      showToast('Categoria criada.');
    }
    setCatName('');
    setCatDesc('');
    setCatIcon('cpu');
    setEditingCat(null);
    await loadAllAdminData();
    onCatalogMutated();
  };

  const handleMoveCategory = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setCategories(next);
    await apiFetch('/api/admin/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds: next.map((c) => c.id) }),
    });
    onCatalogMutated();
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Excluir a categoria "${cat.name}"? Os produtos permanecerão no catálogo sem categoria.`)) return;
    await apiFetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    showToast('Categoria excluída.');
    await loadAllAdminData();
    onCatalogMutated();
  };

  // Article actions
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    if (editingArticle.id) {
      await apiFetch(`/api/admin/articles/${editingArticle.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingArticle),
      });
      showToast('Artigo atualizado.');
    } else {
      await apiFetch('/api/admin/articles', {
        method: 'POST',
        body: JSON.stringify(editingArticle),
      });
      showToast('Artigo salvo!');
    }
    setEditingArticle(null);
    await loadAllAdminData();
  };

  const handleToggleArticlePublish = async (art: Article) => {
    await apiFetch(`/api/admin/articles/${art.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: !art.is_published }),
    });
    showToast(art.is_published ? 'Artigo movido para rascunho.' : 'Artigo publicado no site!');
    await loadAllAdminData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    showToast('Configurações da página inicial salvas!');
    onCatalogMutated();
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Verificando sessão administrativa...
      </div>
    );
  }

  if (!authState.authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex justify-center">
              <BrandLogo />
            </div>
            <h1 className="font-display text-2xl font-bold text-zinc-50 pt-2">
              {authState.needsSetup ? 'Configuração Inicial do Admin' : 'Painel Administrativo'}
            </h1>
            <p className="text-xs text-zinc-400">
              {authState.needsSetup
                ? 'Crie o usuário e a senha do administrador para proteger o gerenciamento do Tech Oferta.'
                : 'Entre com suas credenciais administrativas para gerenciar ofertas e importações.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Usuário administrativo</label>
              <input
                type="text"
                required
                minLength={3}
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Ex: admin"
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full h-11 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>
                {authSubmitting
                  ? 'Processando...'
                  : authState.needsSetup
                    ? 'Criar Administrador e Entrar'
                    : 'Entrar no Painel'}
              </span>
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-xs text-zinc-400 hover:text-yellow-400"
            >
              Voltar para a loja pública
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const q = productFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.category_name || '').toLowerCase().includes(q) ||
      (p.ml_id || '').toLowerCase().includes(q)
    );
  });

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'import-link', label: 'Importar por Link', icon: <Link2 className="w-4 h-4" /> },
    { id: 'import-bulk', label: 'Importação em Massa', icon: <Upload className="w-4 h-4" /> },
    { id: 'products', label: 'Produtos', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categorias', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'articles', label: 'Artigos', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'settings', label: 'Banners & Home', icon: <Settings className="w-4 h-4" /> },
    { id: 'messages', label: `Mensagens (${messages.length})`, icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row">
      {/* SIDEBAR ADMIN */}
      <aside className="w-full lg:w-64 bg-zinc-900/90 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 flex flex-col justify-between gap-4 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => onNavigate('/')}>
              <BrandLogo />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              className="lg:hidden p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
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

        <div className="hidden lg:block space-y-2 pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 px-2">
            Conectado como <strong className="text-zinc-200">{authState.username}</strong>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver site público</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do painel</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full space-y-6">
        {toast && (
          <div className="p-3.5 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-200 text-xs font-medium">
            {toast}
          </div>
        )}

        {/* TAB: DASHBOARD */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50">Dashboard Administrativo</h1>
                <p className="text-xs text-zinc-400 mt-1">Visão geral em tempo real do catálogo Tech Oferta.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab('import-link')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs"
                >
                  <Link2 className="w-4 h-4" />
                  <span>Importar por Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('import-bulk')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-yellow-400 text-zinc-100 font-semibold text-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importação em Massa</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingForm({ ...EMPTY_PRODUCT_FORM });
                    setTab('products');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-yellow-400 text-zinc-100 font-semibold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Produto</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total de produtos', value: stats.total_products },
                { label: 'Ofertas ativas', value: stats.active_offers },
                { label: 'Categorias', value: stats.total_categories },
                { label: 'Em destaque', value: stats.featured_products },
                { label: 'Mais vendidos', value: stats.bestseller_products },
                { label: 'Cliques em ofertas', value: stats.total_clicks },
              ].map((kpi) => (
                <div key={kpi.label} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="text-xs text-zinc-400">{kpi.label}</div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-yellow-400">{kpi.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
              <h2 className="font-display text-lg font-bold text-zinc-100">Últimos Produtos Adicionados</h2>
              {stats.latest_products.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  Nenhum produto cadastrado ainda. Use &ldquo;Importar por Link&rdquo; ou &ldquo;Importação em
                  Massa&rdquo; para começar rapidamente.
                </p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {stats.latest_products.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-100 truncate">{p.title}</div>
                        <div className="text-xs text-zinc-400">
                          {p.category_name || 'Sem categoria'} · {formatDateBR(p.created_at)}
                        </div>
                      </div>
                      <div className="text-sm font-mono font-bold tabular-nums text-yellow-400 shrink-0">
                        {formatBRL(p.current_price)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: IMPORTAR POR LINK */}
        {tab === 'import-link' && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-zinc-50">IMPORTAR OFERTA POR LINK</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Cole seu link de afiliado do Mercado Livre. O sistema busca os dados públicos disponíveis, preserva o
                  link original com todos os parâmetros de rastreamento e exibe uma prévia editável antes da publicação.
                </p>
              </div>

              <form onSubmit={handleImportSingleLink} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  required
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://mercadolivre.com/sec/... ou https://www.mercadolivre.com.br/..."
                  className="flex-1 h-11 px-4 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-100 focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="submit"
                  disabled={importingLink}
                  className="h-11 px-6 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs tracking-wide whitespace-nowrap disabled:opacity-60"
                >
                  {importingLink ? 'BUSCANDO DADOS...' : 'IMPORTAR PRODUTO'}
                </button>
              </form>
            </div>

            {importDraft && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  importDraft.import_status === 'imported'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : importDraft.import_status === 'error'
                      ? 'bg-red-950/40 border-red-500/40 text-red-200'
                      : 'bg-yellow-950/30 border-yellow-500/40 text-yellow-200'
                }`}
              >
                <strong>Status da importação:</strong> {importDraft.message}
              </div>
            )}

            {importFormInitial && (
              <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h2 className="font-display text-lg font-bold text-zinc-100">
                  Prévia da Oferta — Confira e Edite Antes de Publicar
                </h2>
                <ProductFormEditor
                  key={importFormInitial.affiliate_url + importFormInitial.title}
                  initial={importFormInitial}
                  categories={categories}
                  submitLabel="PUBLICAR OFERTA"
                  saving={savingProduct}
                  onCancel={() => {
                    setImportDraft(null);
                    setImportFormInitial(null);
                  }}
                  onSubmit={(vals) => handleSaveProductForm(vals, true)}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB: IMPORTAÇÃO EM MASSA */}
        {tab === 'import-bulk' && (
          <BulkImportPanel
            categories={categories}
            onPublished={() => {
              loadAllAdminData();
              onCatalogMutated();
            }}
          />
        )}

        {/* TAB: PRODUTOS */}
        {tab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-zinc-50">
                  Gerenciamento de Produtos ({products.length})
                </h1>
                <p className="text-xs text-zinc-400">Edite preços, ative/desative ofertas e organize destaques.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadExport('json')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:border-yellow-400"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadExport('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:border-yellow-400"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingForm({ ...EMPTY_PRODUCT_FORM })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Produto Manual</span>
                </button>
              </div>
            </div>

            {editingForm ? (
              <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h2 className="font-display text-lg font-bold text-zinc-100">
                  {editingForm.id ? 'Editar Oferta' : 'Cadastrar Produto Manualmente'}
                </h2>
                <ProductFormEditor
                  key={editingForm.id || 'new'}
                  initial={editingForm}
                  categories={categories}
                  submitLabel={editingForm.id ? 'Salvar Alterações' : 'PUBLICAR OFERTA'}
                  saving={savingProduct}
                  onCancel={() => setEditingForm(null)}
                  onSubmit={(vals) => handleSaveProductForm(vals, false)}
                />
              </div>
            ) : (
              <>
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    placeholder="Filtrar produtos por nome, marca ou MLB..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400">
                      <tr>
                        <th className="p-3.5 font-semibold">Produto</th>
                        <th className="p-3.5 font-semibold">Categoria</th>
                        <th className="p-3.5 font-semibold">Preço Atual</th>
                        <th className="p-3.5 font-semibold">Status</th>
                        <th className="p-3.5 font-semibold">Destaques</th>
                        <th className="p-3.5 font-semibold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-400">
                            Nenhum produto cadastrado neste filtro.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-800/30">
                            <td className="p-3.5 max-w-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-white p-1 shrink-0 overflow-hidden">
                                  {p.image_url && (
                                    <img
                                      src={p.image_url}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-zinc-100 truncate">{p.title}</div>
                                  <div className="text-[11px] text-zinc-500 truncate">
                                    {p.brand || 'Sem marca'} · {p.clicks_count} cliques
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-zinc-300">{p.category_name || '—'}</td>
                            <td className="p-3.5">
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={p.current_price}
                                onBlur={(e) => handleQuickPriceUpdate(p, e.target.value)}
                                aria-label={`Atualizar preço de ${p.title}`}
                                className="w-28 h-8 px-2 rounded bg-zinc-950 border border-zinc-800 font-mono tabular-nums text-yellow-400 font-semibold"
                              />
                            </td>
                            <td className="p-3.5">
                              <button
                                type="button"
                                onClick={() => handleToggleProductField(p, 'is_active')}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                                  p.is_active
                                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {p.is_active ? 'Ativa' : 'Pausada'}
                              </button>
                            </td>
                            <td className="p-3.5 space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleProductField(p, 'is_featured')}
                                className={`px-2 py-1 rounded text-[11px] border ${
                                  p.is_featured
                                    ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300'
                                    : 'border-zinc-700 text-zinc-400'
                                }`}
                              >
                                Destaque
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleProductField(p, 'is_bestseller')}
                                className={`px-2 py-1 rounded text-[11px] border ${
                                  p.is_bestseller
                                    ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300'
                                    : 'border-zinc-700 text-zinc-400'
                                }`}
                              >
                                Mais Vendido
                              </button>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => setEditingForm(productToFormValues(p))}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-700 text-zinc-200 hover:border-yellow-400"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p)}
                                className="inline-flex items-center justify-center p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-red-400"
                                aria-label="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: CATEGORIAS */}
        {tab === 'categories' && (
          <div className="space-y-6">
            <h1 className="font-display text-2xl font-bold text-zinc-50">Gerenciamento de Categorias</h1>

            <form
              onSubmit={handleSaveCategory}
              className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
            >
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs text-zinc-300">Nome da categoria *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Monitores Ultrawide"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs text-zinc-300">Descrição</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Descrição exibida na página da categoria"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-zinc-300">Ícone</label>
                <select
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                >
                  <option value="cpu">Processador</option>
                  <option value="smartphone">Smartphone</option>
                  <option value="laptop">Notebook</option>
                  <option value="headphones">Áudio / Fone</option>
                  <option value="tv">TV / Tela</option>
                  <option value="gamepad-2">Gamer</option>
                  <option value="watch">Smartwatch</option>
                  <option value="cable">Cabos / Carregadores</option>
                  <option value="keyboard">Periféricos</option>
                  <option value="hard-drive">Informática</option>
                  <option value="home">Eletrodomésticos</option>
                  <option value="battery-charging">Acessórios Celular</option>
                  <option value="zap">Gadgets</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs"
                >
                  {editingCat ? 'Salvar' : 'Criar'}
                </button>
                {editingCat && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCat(null);
                      setCatName('');
                      setCatDesc('');
                      setCatIcon('cpu');
                    }}
                    className="px-3 h-10 rounded-lg border border-zinc-700 text-xs text-zinc-300"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-zinc-100">{cat.name}</div>
                    <div className="text-xs text-zinc-400 truncate">
                      /{cat.slug} · {cat.product_count ?? 0} ofertas
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(idx, -1)}
                      className="p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                      aria-label="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMoveCategory(idx, 1)}
                      className="p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCat(cat);
                        setCatName(cat.name);
                        setCatDesc(cat.description);
                        setCatIcon(cat.icon);
                      }}
                      className="p-1.5 rounded border border-zinc-800 text-zinc-300 hover:border-yellow-400"
                      aria-label="Editar categoria"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-red-400"
                      aria-label="Excluir categoria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ARTIGOS */}
        {tab === 'articles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-zinc-50">Artigos e Dicas de Tecnologia</h1>
                <p className="text-xs text-zinc-400">
                  Novos artigos iniciam como rascunho e só vão ao ar quando você marcar como publicado.
                </p>
              </div>
              {!editingArticle && (
                <button
                  type="button"
                  onClick={() =>
                    setEditingArticle({
                      title: '',
                      subtitle: '',
                      cover_image: '',
                      content: '',
                      related_product_ids: [],
                      is_published: false,
                      seo_title: '',
                      seo_description: '',
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-yellow-400 text-zinc-950 font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Artigo</span>
                </button>
              )}
            </div>

            {editingArticle ? (
              <form
                onSubmit={handleSaveArticle}
                className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300">Título *</label>
                    <input
                      type="text"
                      required
                      value={editingArticle.title}
                      onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300">Subtítulo</label>
                    <input
                      type="text"
                      value={editingArticle.subtitle}
                      onChange={(e) => setEditingArticle({ ...editingArticle, subtitle: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300">URL da imagem de capa</label>
                  <input
                    type="url"
                    value={editingArticle.cover_image}
                    onChange={(e) => setEditingArticle({ ...editingArticle, cover_image: e.target.value })}
                    placeholder="Opcional (usa imagem padrão se vazio)"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300">Conteúdo do artigo *</label>
                  <textarea
                    rows={8}
                    required
                    value={editingArticle.content}
                    onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                    className="w-full p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                  />
                </div>

                {products.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-300">Inserir links de produtos recomendados</label>
                    <div className="max-h-40 overflow-y-auto p-3 rounded-lg bg-zinc-950 border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {products.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingArticle.related_product_ids.includes(p.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...editingArticle.related_product_ids, p.id]
                                : editingArticle.related_product_ids.filter((id) => id !== p.id);
                              setEditingArticle({ ...editingArticle, related_product_ids: next });
                            }}
                            className="accent-yellow-400"
                          />
                          <span className="truncate">{p.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingArticle.is_published}
                    onChange={(e) => setEditingArticle({ ...editingArticle, is_published: e.target.checked })}
                    className="w-4 h-4 accent-yellow-400"
                  />
                  <span>Publicar este artigo no portal agora</span>
                </label>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingArticle(null)}
                    className="px-4 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-lg bg-yellow-400 text-zinc-950 font-bold text-xs">
                    Salvar Artigo
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
                {articles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400">Nenhum artigo criado ainda.</div>
                ) : (
                  articles.map((art) => (
                    <div key={art.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-zinc-100 truncate">{art.title}</div>
                        <div className="text-xs text-zinc-400">
                          {art.is_published ? 'Publicado' : 'Rascunho'} · {formatDateBR(art.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleArticlePublish(art)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold ${
                            art.is_published
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {art.is_published ? 'Despublicar' : 'Publicar'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingArticle({
                              id: art.id,
                              title: art.title,
                              subtitle: art.subtitle,
                              cover_image: art.cover_image,
                              content: art.content,
                              related_product_ids: art.related_product_ids,
                              is_published: art.is_published,
                              seo_title: art.seo_title,
                              seo_description: art.seo_description,
                            })
                          }
                          className="p-1.5 rounded border border-zinc-700 text-zinc-300"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Excluir o artigo "${art.title}"?`)) return;
                            await apiFetch(`/api/admin/articles/${art.id}`, { method: 'DELETE' });
                            loadAllAdminData();
                          }}
                          className="p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: BANNERS E PÁGINA INICIAL */}
        {tab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <h1 className="font-display text-2xl font-bold text-zinc-50">Banners, Campanhas e Página Inicial</h1>

            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
              <h2 className="font-display text-lg font-bold text-zinc-100">Banner Principal</h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300">Título</label>
                  <input
                    type="text"
                    value={settings.hero_banner.title}
                    onChange={(e) =>
                      setSettings({ ...settings, hero_banner: { ...settings.hero_banner, title: e.target.value } })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300">Subtítulo</label>
                  <input
                    type="text"
                    value={settings.hero_banner.subtitle}
                    onChange={(e) =>
                      setSettings({ ...settings, hero_banner: { ...settings.hero_banner, subtitle: e.target.value } })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300">Texto do botão</label>
                    <input
                      type="text"
                      value={settings.hero_banner.ctaText}
                      onChange={(e) =>
                        setSettings({ ...settings, hero_banner: { ...settings.hero_banner, ctaText: e.target.value } })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300">URL da imagem de fundo</label>
                    <input
                      type="text"
                      value={settings.hero_banner.imageUrl}
                      onChange={(e) =>
                        setSettings({ ...settings, hero_banner: { ...settings.hero_banner, imageUrl: e.target.value } })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-zinc-100">Campanha Promocional</h2>
                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.promo_campaign.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        promo_campaign: { ...settings.promo_campaign, enabled: e.target.checked },
                      })
                    }
                    className="accent-yellow-400"
                  />
                  <span>Exibir campanha</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300">Título da campanha</label>
                  <input
                    type="text"
                    value={settings.promo_campaign.title}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        promo_campaign: { ...settings.promo_campaign, title: e.target.value },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300">Categoria de destino (opcional)</label>
                  <select
                    value={settings.promo_campaign.highlightCategorySlug}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        promo_campaign: { ...settings.promo_campaign, highlightCategorySlug: e.target.value },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                  >
                    <option value="">Todas as promoções</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-300">Subtítulo da campanha</label>
                <input
                  type="text"
                  value={settings.promo_campaign.subtitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      promo_campaign: { ...settings.promo_campaign, subtitle: e.target.value },
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"
                />
              </div>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <h2 className="font-display text-lg font-bold text-zinc-100">Seções Visíveis na Página Inicial</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'showFeatured', label: 'Ofertas em destaque' },
                  { key: 'showCategories', label: 'Categorias' },
                  { key: 'showCampaigns', label: 'Grandes promoções' },
                  { key: 'showBestsellers', label: 'Mais vendidos' },
                  { key: 'showLatest', label: 'Últimas ofertas adicionadas' },
                  { key: 'showArticles', label: 'Artigos e dicas de tecnologia' },
                ].map((sec) => (
                  <label key={sec.key} className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        settings.homepage_sections[sec.key as keyof typeof settings.homepage_sections]
                      )}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          homepage_sections: {
                            ...settings.homepage_sections,
                            [sec.key]: e.target.checked,
                          },
                        })
                      }
                      className="accent-yellow-400"
                    />
                    <span>{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-3 rounded-lg bg-yellow-400 text-zinc-950 font-bold text-sm">
                Salvar Configurações
              </button>
            </div>
          </form>
        )}

        {/* TAB: MENSAGENS */}
        {tab === 'messages' && (
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-bold text-zinc-50">Mensagens Recebidas</h1>
            {messages.length === 0 ? (
              <div className="p-8 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400">
                Nenhuma mensagem enviada pelo formulário de contato ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-sm text-zinc-100">
                          {m.name} <span className="text-zinc-400 font-normal">({m.email})</span>
                        </div>
                        {m.subject && <div className="text-xs text-yellow-400 mt-0.5">{m.subject}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/messages/${m.id}`, { method: 'DELETE' });
                          loadAllAdminData();
                        }}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-300 whitespace-pre-line">{m.message}</p>
                    <div className="text-[11px] text-zinc-500">{formatDateBR(m.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
