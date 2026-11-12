import React, { useState, useEffect } from 'react';

export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Verifica se já está logado ao abrir a página
  useEffect(() => {
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Defina aqui o e-mail e a senha de acesso do painel administrativo
    if (email === 'admin@techofertas.com' && password === '123456') {
      localStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('E-mail ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Painel Administrativo</h2>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="admin@techofertas.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg transition-colors"
            >
              Entrar no Painel
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Acesso configurado para modo estático (GitHub Pages).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">Painel TechOfertas</h1>
          <p className="text-gray-400 text-sm mt-1">Bem-vindo à área administrativa.</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
        >
          Sair / Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Gerenciamento do Site</h2>
        <p className="text-gray-300">
          Você está logado com sucesso no painel administrativo do TechOfertas! Aqui você pode gerenciar os dados salvos localmente.
        </p>
      </div>
    </div>
  );
}
