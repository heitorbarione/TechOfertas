/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import type { Category, SiteSettings } from './types';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { AdminPage } from './pages/AdminPage';
import { ArticleDetailPage, ArticlesPage } from './pages/ArticlesPage';
import { CatalogPage } from './pages/CatalogPage';
import { HomePage } from './pages/HomePage';
import { AboutPage, ContactPage, PrivacyPage, TermsPage } from './pages/InstitutionalPages';
import { ProductDetailPage } from './pages/ProductDetailPage';

const DEFAULT_SETTINGS: SiteSettings = {
  hero_banner: {
    title: 'AS MELHORES OFERTAS DE TECNOLOGIA ESTÃO AQUI!',
    subtitle: 'Encontre produtos incríveis, descubra oportunidades e aproveite as melhores ofertas.',
    ctaText: 'EXPLORAR OFERTAS',
    imageUrl: '/src/assets/images/hero_tech_oferta_banner_1794515015321.jpg',
  },
  promo_campaign: {
    enabled: true,
    title: 'Grandes Promoções em Tecnologia',
    subtitle: 'Seleção atualizada com descontos confirmados e envio direto pelo Mercado Livre.',
    ctaText: 'Ver Promoções',
    imageUrl: '/src/assets/images/promo_campaign_backdrop_1794515014322.jpg',
    highlightCategorySlug: '',
  },
  homepage_sections: {
    showFeatured: true,
    showAllProducts: true,
    showBestsellers: true,
    showLatest: true,
    showCategories: true,
    showCampaigns: true,
    showArticles: true,
  },
};

export default function App() {
  const [locationPath, setLocationPath] = useState<string>(
    () => window.location.pathname + window.location.search
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  const loadGlobals = useCallback(async () => {
    try {
      const [catsRes, settingsRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);
      if (Array.isArray(catsRes)) setCategories(catsRes);
      if (settingsRes?.hero_banner) setSettings(settingsRes);
    } catch {
      // keep defaults on transient error
    }
  }, []);

  useEffect(() => {
    loadGlobals();
  }, [loadGlobals]);

  useEffect(() => {
    const onPopState = () => {
      setLocationPath(window.location.pathname + window.location.search);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    const target = path.startsWith('/') ? path : `/${path}`;
    if (window.location.pathname + window.location.search !== target) {
      window.history.pushState({}, '', target);
    }
    setLocationPath(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const urlObj = new URL(locationPath, window.location.origin);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  const handleSearchSubmit = (q: string) => {
    if (!q) {
      navigate('/ofertas');
      return;
    }
    navigate(`/ofertas?q=${encodeURIComponent(q)}`);
  };

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminPage onNavigate={navigate} onCatalogMutated={loadGlobals} />;
  }

  let pageNode: React.ReactNode;

  if (pathname === '/' || pathname === '') {
    pageNode = <HomePage categories={categories} settings={settings} onNavigate={navigate} />;
  } else if (pathname === '/ofertas') {
    pageNode = (
      <CatalogPage
        categories={categories}
        initialQuery={searchParams.get('q') || ''}
        initialSort={searchParams.get('sort') || 'recent'}
        initialPromo={searchParams.get('promo') === '1'}
        onNavigate={navigate}
      />
    );
  } else if (pathname.startsWith('/categoria/')) {
    const slug = decodeURIComponent(pathname.replace('/categoria/', '').split('/')[0] || '');
    pageNode = <CatalogPage categories={categories} initialCategorySlug={slug} onNavigate={navigate} />;
  } else if (pathname.startsWith('/produto/')) {
    const slug = decodeURIComponent(pathname.replace('/produto/', '').split('/')[0] || '');
    pageNode = <ProductDetailPage slug={slug} onNavigate={navigate} />;
  } else if (pathname === '/artigos') {
    pageNode = <ArticlesPage onNavigate={navigate} />;
  } else if (pathname.startsWith('/artigo/')) {
    const slug = decodeURIComponent(pathname.replace('/artigo/', '').split('/')[0] || '');
    pageNode = <ArticleDetailPage slug={slug} onNavigate={navigate} />;
  } else if (pathname === '/sobre') {
    pageNode = <AboutPage onNavigate={navigate} />;
  } else if (pathname === '/contato') {
    pageNode = <ContactPage />;
  } else if (pathname === '/privacidade') {
    pageNode = <PrivacyPage />;
  } else if (pathname === '/termos') {
    pageNode = <TermsPage />;
  } else {
    pageNode = <HomePage categories={categories} settings={settings} onNavigate={navigate} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50">
      <Header
        categories={categories}
        currentPath={pathname}
        searchQuery={searchParams.get('q') || ''}
        onSearchSubmit={handleSearchSubmit}
        onNavigate={navigate}
      />
      <main className="flex-1">{pageNode}</main>
      <Footer categories={categories} onNavigate={navigate} />
    </div>
  );
}
