import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Article,
  Category,
  HomepageSectionsSettings,
  HeroBannerSettings,
  Product,
  ProductSpec,
  PromoCampaignSettings,
  SiteSettings,
} from '../src/types.ts';

const dbPath = path.resolve(process.env.DATABASE_PATH || './data/tech-oferta.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function uniqueSlug(table: 'products' | 'categories' | 'articles', baseTitle: string, excludeId?: number): string {
  const base = slugify(baseTitle) || 'item';
  let candidate = base;
  let counter = 1;
  while (true) {
    const row = excludeId
      ? db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(candidate, excludeId)
      : db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(candidate);
    if (!row) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function calculateDiscount(currentPrice: number, originalPrice: number | null | undefined): number | null {
  if (!originalPrice || !Number.isFinite(originalPrice) || !Number.isFinite(currentPrice)) {
    return null;
  }
  if (originalPrice <= currentPrice || currentPrice <= 0) {
    return null;
  }
  const pct = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  return pct >= 1 && pct <= 99 ? pct : null;
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'cpu',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      ml_id TEXT DEFAULT NULL,
      title TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      short_description TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      specs_json TEXT NOT NULL DEFAULT '[]',
      image_url TEXT NOT NULL DEFAULT '',
      gallery_json TEXT NOT NULL DEFAULT '[]',
      current_price REAL NOT NULL,
      original_price REAL DEFAULT NULL,
      discount_percent INTEGER DEFAULT NULL,
      is_promo INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      affiliate_url TEXT NOT NULL,
      original_url TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      clicks_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_ml_id ON products(ml_id);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      cover_image TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      related_product_ids_json TEXT NOT NULL DEFAULT '[]',
      is_published INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();

  // Seed initial admin if provided via environment variables and no admin exists yet
  const adminCountRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  if (adminCountRow.count === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    db.prepare('INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)').run(
      process.env.ADMIN_USERNAME.trim(),
      hashPassword(process.env.ADMIN_PASSWORD),
      now
    );
  }

  // Seed the 13 requested structural categories if table is empty
  const catCountRow = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCountRow.count === 0) {
    const initialCategories: Array<{ name: string; slug: string; description: string; icon: string }> = [
      {
        name: 'Caixas de som e fones de ouvido',
        slug: 'caixas-de-som-e-fones-de-ouvido',
        description: 'Fones Bluetooth, headsets, soundbars e caixas de som portáteis.',
        icon: 'headphones',
      },
      {
        name: 'Celulares e smartphones',
        slug: 'celulares-e-smartphones',
        description: 'Smartphones Android, iPhones e lançamentos em promoção.',
        icon: 'smartphone',
      },
      {
        name: 'Acessórios para celular',
        slug: 'acessorios-para-celular',
        description: 'Capas, películas, suportes veiculares, power banks e tripés.',
        icon: 'battery-charging',
      },
      {
        name: 'TVs e Smart TVs',
        slug: 'tvs-e-smart-tvs',
        description: 'Smart TVs 4K, OLED, QLED e dispositivos de streaming.',
        icon: 'tv',
      },
      {
        name: 'Notebooks e computadores',
        slug: 'notebooks-e-computadores',
        description: 'Notebooks para trabalho, estudo, criação e desktops completos.',
        icon: 'laptop',
      },
      {
        name: 'Produtos gamer',
        slug: 'produtos-gamer',
        description: 'Consoles, controles, cadeiras, monitores e hardware gamer.',
        icon: 'gamepad-2',
      },
      {
        name: 'Smartwatches e relógios inteligentes',
        slug: 'smartwatches-e-relogios-inteligentes',
        description: 'Relógios inteligentes, pulseiras fitness e monitoramento de saúde.',
        icon: 'watch',
      },
      {
        name: 'Carregadores e cabos',
        slug: 'carregadores-e-cabos',
        description: 'Carregadores turbo USB-C, fontes GaN, cabos reforçados e hubs.',
        icon: 'cable',
      },
      {
        name: 'Eletrodomésticos',
        slug: 'eletrodomesticos',
        description: 'Eletroportáteis inteligentes, aspiradores robô e casa conectada.',
        icon: 'home',
      },
      {
        name: 'Informática',
        slug: 'informatica',
        description: 'SSDs, memórias, roteadores Wi-Fi, impressoras e componentes.',
        icon: 'hard-drive',
      },
      {
        name: 'Periféricos',
        slug: 'perifericos',
        description: 'Teclados mecânicos, mouses, webcams, microfones e monitores.',
        icon: 'keyboard',
      },
      {
        name: 'Acessórios tecnológicos',
        slug: 'acessorios-tecnologicos',
        description: 'Adaptadores, suportes ergonômicos, iluminação e gadgets.',
        icon: 'zap',
      },
      {
        name: 'Todos os eletrônicos',
        slug: 'todos-os-eletronicos',
        description: 'Ofertas gerais de eletrônicos e tecnologia selecionados.',
        icon: 'cpu',
      },
    ];

    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, description, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const seedCats = db.transaction(() => {
      initialCategories.forEach((c, idx) => {
        insertCat.run(c.name, c.slug, c.description, c.icon, idx + 1, now);
      });
    });
    seedCats();
  }

  // Seed site settings if missing
  const defaultHero: HeroBannerSettings = {
    title: 'AS MELHORES OFERTAS DE TECNOLOGIA ESTÃO AQUI!',
    subtitle: 'Encontre produtos incríveis, descubra oportunidades e aproveite as melhores ofertas.',
    ctaText: 'EXPLORAR OFERTAS',
    imageUrl: '/src/assets/images/hero_tech_oferta_banner_1794515015321.jpg',
  };

  const defaultCampaign: PromoCampaignSettings = {
    enabled: true,
    title: 'Grandes Promoções em Tecnologia',
    subtitle: 'Seleção atualizada com descontos confirmados e envio direto pelo Mercado Livre.',
    ctaText: 'Ver Promoções',
    imageUrl: '/src/assets/images/promo_campaign_backdrop_1794515014322.jpg',
    highlightCategorySlug: '',
  };

  const defaultSections: HomepageSectionsSettings = {
    showFeatured: true,
    showAllProducts: true,
    showBestsellers: true,
    showLatest: true,
    showCategories: true,
    showCampaigns: true,
    showArticles: true,
  };

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO site_settings (key, value_json, updated_at) VALUES (?, ?, ?)'
  );
  insertSetting.run('hero_banner', JSON.stringify(defaultHero), now);
  insertSetting.run('promo_campaign', JSON.stringify(defaultCampaign), now);
  insertSetting.run('homepage_sections', JSON.stringify(defaultSections), now);
}

export function mapProductRow(row: Record<string, unknown>): Product {
  let specs: ProductSpec[] = [];
  let gallery: string[] = [];
  try {
    specs = JSON.parse(String(row.specs_json || '[]'));
  } catch {
    specs = [];
  }
  try {
    gallery = JSON.parse(String(row.gallery_json || '[]'));
  } catch {
    gallery = [];
  }
  return {
    id: Number(row.id),
    slug: String(row.slug),
    ml_id: row.ml_id ? String(row.ml_id) : null,
    title: String(row.title),
    brand: String(row.brand || ''),
    short_description: String(row.short_description || ''),
    description: String(row.description || ''),
    specs: Array.isArray(specs) ? specs : [],
    image_url: String(row.image_url || ''),
    gallery: Array.isArray(gallery) ? gallery : [],
    current_price: Number(row.current_price),
    original_price: row.original_price !== null && row.original_price !== undefined ? Number(row.original_price) : null,
    discount_percent:
      row.discount_percent !== null && row.discount_percent !== undefined ? Number(row.discount_percent) : null,
    is_promo: Boolean(row.is_promo),
    is_featured: Boolean(row.is_featured),
    is_bestseller: Boolean(row.is_bestseller),
    is_active: Boolean(row.is_active),
    category_id: row.category_id !== null && row.category_id !== undefined ? Number(row.category_id) : null,
    category_name: row.category_name ? String(row.category_name) : null,
    category_slug: row.category_slug ? String(row.category_slug) : null,
    affiliate_url: String(row.affiliate_url),
    original_url: String(row.original_url || ''),
    source: String(row.source || 'manual'),
    clicks_count: Number(row.clicks_count || 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapArticleRow(row: Record<string, unknown>): Article {
  let relatedIds: number[] = [];
  try {
    relatedIds = JSON.parse(String(row.related_product_ids_json || '[]'));
  } catch {
    relatedIds = [];
  }
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    subtitle: String(row.subtitle || ''),
    cover_image: String(row.cover_image || ''),
    content: String(row.content || ''),
    related_product_ids: Array.isArray(relatedIds) ? relatedIds.map(Number).filter(Number.isFinite) : [],
    is_published: Boolean(row.is_published),
    seo_title: String(row.seo_title || ''),
    seo_description: String(row.seo_description || ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function getSiteSettings(): SiteSettings {
  const rows = db.prepare('SELECT key, value_json FROM site_settings').all() as Array<{
    key: string;
    value_json: string;
  }>;
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      map[r.key] = JSON.parse(r.value_json);
    } catch {
      map[r.key] = {};
    }
  }
  return {
    hero_banner: map.hero_banner as HeroBannerSettings,
    promo_campaign: map.promo_campaign as PromoCampaignSettings,
    homepage_sections: map.homepage_sections as HomepageSectionsSettings,
  };
}

export function getAllCategoriesWithCounts(includeInactive = false): Category[] {
  const activeFilter = includeInactive ? '' : 'AND p.is_active = 1';
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id ${activeFilter}
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.id ASC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    description: String(r.description || ''),
    icon: String(r.icon || 'cpu'),
    sort_order: Number(r.sort_order || 0),
    product_count: Number(r.product_count || 0),
    created_at: String(r.created_at),
  }));
}
