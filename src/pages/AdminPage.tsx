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
                className="
