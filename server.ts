import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import {
  calculateDiscount,
  db,
  getAllCategoriesWithCounts,
  getSiteSettings,
  hashPassword,
  initDatabase,
  mapArticleRow,
  mapProductRow,
  uniqueSlug,
  verifyPassword,
} from './server/db.ts';
import { importSingleMercadoLivreLink, isValidMercadoLivreUrl } from './server/mlImporter.ts';
import type { ImportedOfferDraft } from './src/types.ts';

dotenv.config();
initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE = 'techoferta_admin_session';

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

interface AuthedRequest extends Request {
  admin?: { id: number; username: string };
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  return typeof cookieToken === 'string' && cookieToken ? cookieToken : null;
}

function getAuthenticatedAdmin(req: Request): { id: number; username: string } | null {
  const token = extractSessionToken(req);
  if (!token) return null;
  const now = new Date().toISOString();
  const row = db
    .prepare(
      `SELECT a.id, a.username
       FROM sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, now) as { id: number; username: string } | undefined;
  return row || null;
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Acesso não autorizado. Faça login no painel administrativo.' });
    return;
  }
  req.admin = admin;
  next();
}

function createSession(adminId: number, res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    adminId,
    expiresAt,
    now.toISOString()
  );
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

// ---------- PUBLIC ENDPOINTS ----------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tech-oferta' });
});

app.get('/api/settings', (_req, res) => {
  res.json(getSiteSettings());
});

app.get('/api/categories', (_req, res) => {
  res.json(getAllCategoriesWithCounts(false));
});

app.get('/api/products', (req, res) => {
  const q = String(req.query.q || '').trim();
  const categorySlug = String(req.query.category || '').trim();
  const sort = String(req.query.sort || 'recent');
  const featured = req.query.featured === '1' || req.query.featured === 'true';
  const bestseller = req.query.bestseller === '1' || req.query.bestseller === 'true';
  const promo = req.query.promo === '1' || req.query.promo === 'true';
  const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 200);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const where: string[] = ['p.is_active = 1'];
  const params: Array<string | number> = [];

  if (q) {
    where.push('(p.title LIKE ? OR p.brand LIKE ? OR p.short_description LIKE ? OR c.name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (categorySlug && categorySlug !== 'all' && categorySlug !== 'todos-os-eletronicos') {
    where.push('c.slug = ?');
    params.push(categorySlug);
  }
  if (featured) where.push('p.is_featured = 1');
  if (bestseller) where.push('p.is_bestseller = 1');
  if (promo) where.push('(p.is_promo = 1 OR p.discount_percent IS NOT NULL)');

  let orderBy = 'p.created_at DESC, p.id DESC';
  if (sort === 'price_asc') orderBy = 'p.current_price ASC, p.id DESC';
  else if (sort === 'price_desc') orderBy = 'p.current_price DESC, p.id DESC';
  else if (sort === 'discount_desc') orderBy = 'COALESCE(p.discount_percent, 0) DESC, p.created_at DESC';
  else if (sort === 'bestsellers') orderBy = 'p.is_bestseller DESC, p.clicks_count DESC, p.created_at DESC';
  else if (sort === 'featured') orderBy = 'p.is_featured DESC, p.created_at DESC';

  const whereSql = where.join(' AND ');
  const countRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}`
    )
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Array<Record<string, unknown>>;

  res.json({
    total: countRow.total,
    items: rows.map(mapProductRow),
  });
});

app.get('/api/products/:slug', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.is_active = 1`
    )
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Oferta não encontrada.' });
    return;
  }

  const product = mapProductRow(row);

  let relatedRows: Array<Record<string, unknown>> = [];
  if (product.category_id) {
    relatedRows = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 AND p.category_id = ? AND p.id != ?
         ORDER BY p.is_featured DESC, p.created_at DESC
         LIMIT 4`
      )
      .all(product.category_id, product.id) as Array<Record<string, unknown>>;
  }

  if (relatedRows.length < 4) {
    const existingIds = [product.id, ...relatedRows.map((r) => Number(r.id))];
    const placeholders = existingIds.map(() => '?').join(',');
    const extra = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 AND p.id NOT IN (${placeholders})
         ORDER BY p.created_at DESC
         LIMIT ?`
      )
      .all(...existingIds, 4 - relatedRows.length) as Array<Record<string, unknown>>;
    relatedRows = [...relatedRows, ...extra];
  }

  res.json({
    product,
    related: relatedRows.map(mapProductRow),
  });
});

app.post('/api/products/:id/click', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id, affiliate_url FROM products WHERE id = ? AND is_active = 1').get(id) as
    | { id: number; affiliate_url: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Oferta não encontrada.' });
    return;
  }
  db.prepare('UPDATE products SET clicks_count = clicks_count + 1 WHERE id = ?').run(id);
  res.json({ affiliate_url: row.affiliate_url });
});

app.get('/api/articles', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM articles WHERE is_published = 1 ORDER BY created_at DESC, id DESC')
    .all() as Array<Record<string, unknown>>;
  res.json(rows.map(mapArticleRow));
});

app.get('/api/articles/:slug', (req, res) => {
  const row = db
    .prepare('SELECT * FROM articles WHERE slug = ? AND is_published = 1')
    .get(req.params.slug) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Artigo não encontrado.' });
    return;
  }
  const article = mapArticleRow(row);
  if (article.related_product_ids.length > 0) {
    const placeholders = article.related_product_ids.map(() => '?').join(',');
    const prodRows = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 AND p.id IN (${placeholders})`
      )
      .all(...article.related_product_ids) as Array<Record<string, unknown>>;
    article.related_products = prodRows.map(mapProductRow);
  } else {
    article.related_products = [];
  }
  res.json(article);
});

app.post('/api/contact', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  const subject = String(req.body?.subject || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!name || !email || !message) {
    res.status(400).json({ error: 'Preencha nome, e-mail e mensagem.' });
    return;
  }
  db.prepare(
    'INSERT INTO contact_messages (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(name.slice(0, 120), email.slice(0, 160), subject.slice(0, 200), message.slice(0, 4000), new Date().toISOString());

  res.status(201).json({ ok: true });
});

// ---------- ADMIN AUTH ----------

app.get('/api/admin/auth/status', (req, res) => {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  const admin = getAuthenticatedAdmin(req);
  res.json({
    needsSetup: countRow.count === 0,
    authenticated: Boolean(admin),
    username: admin?.username || null,
  });
});

app.post('/api/admin/auth/setup', (req, res) => {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  if (countRow.count > 0) {
    res.status(403).json({ error: 'O administrador já foi configurado. Faça login.' });
    return;
  }
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (username.length < 3 || password.length < 6) {
    res.status(400).json({ error: 'O usuário deve ter ao menos 3 caracteres e a senha ao menos 6 caracteres.' });
    return;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)')
    .run(username, hashPassword(password), now);
  const token = createSession(Number(result.lastInsertRowid), res);
  res.status(201).json({ token, username });
});

app.post('/api/admin/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const admin = db.prepare('SELECT id, username, password_hash FROM admins WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined;

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    return;
  }

  const token = createSession(admin.id, res);
  res.json({ token, username: admin.username });
});

app.post('/api/admin/auth/logout', (req, res) => {
  const token = extractSessionToken(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

// ---------- ADMIN PROTECTED ROUTES ----------

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const totals = db
    .prepare(
      `SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_offers,
        SUM(CASE WHEN is_featured = 1 AND is_active = 1 THEN 1 ELSE 0 END) as featured_products,
        SUM(CASE WHEN is_bestseller = 1 AND is_active = 1 THEN 1 ELSE 0 END) as bestseller_products,
        COALESCE(SUM(clicks_count), 0) as total_clicks
       FROM products`
    )
    .get() as Record<string, number>;
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number };
  const artCount = db.prepare('SELECT COUNT(*) as c FROM articles WHERE is_published = 1').get() as { c: number };
  const latestRows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT 6`
    )
    .all() as Array<Record<string, unknown>>;

  res.json({
    total_products: Number(totals.total_products || 0),
    active_offers: Number(totals.active_offers || 0),
    total_categories: Number(catCount.c || 0),
    featured_products: Number(totals.featured_products || 0),
    bestseller_products: Number(totals.bestseller_products || 0),
    published_articles: Number(artCount.c || 0),
    total_clicks: Number(totals.total_clicks || 0),
    latest_products: latestRows.map(mapProductRow),
  });
});

app.post('/api/admin/import-link', requireAdmin, async (req, res) => {
  const url = String(req.body?.url || '').trim();
  if (!url) {
    res.status(400).json({ error: 'Cole o link de afiliado do Mercado Livre.' });
    return;
  }
  const draft = await importSingleMercadoLivreLink(url);
  res.json(draft);
});

app.post('/api/admin/import-bulk', requireAdmin, async (req, res) => {
  const rawLinks = Array.isArray(req.body?.links) ? (req.body.links as unknown[]) : [];
  const links = rawLinks
    .map((l) => String(l || '').trim())
    .filter(Boolean)
    .slice(0, 100);

  if (links.length === 0) {
    res.status(400).json({ error: 'Envie ao menos um link de afiliado para importar.' });
    return;
  }

  // Deduplicate exact same URLs within batch while flagging
  const seenInBatch = new Set<string>();
  const results: ImportedOfferDraft[] = new Array(links.length);

  // Process with concurrency 3 to respect free-tier rate limits cleanly
  let cursor = 0;
  const worker = async () => {
    while (cursor < links.length) {
      const idx = cursor++;
      const url = links[idx];
      if (seenInBatch.has(url)) {
        results[idx] = {
          affiliate_url: url,
          original_url: '',
          ml_id: null,
          title: '',
          brand: '',
          short_description: '',
          description: '',
          specs: [],
          image_url: '',
          gallery: [],
          current_price: null,
          original_price: null,
          discount_percent: null,
          suggested_category_id: null,
          suggested_category_name: null,
          source: 'manual',
          import_status: 'duplicate',
          message: 'Link repetido dentro deste mesmo lote.',
        };
        continue;
      }
      seenInBatch.add(url);
      results[idx] = await importSingleMercadoLivreLink(url);
    }
  };

  await Promise.all([worker(), worker(), worker()]);
  res.json({ total: results.length, items: results });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  const q = String(req.query.q || '').trim();
  const where = q ? 'WHERE (p.title LIKE ? OR p.brand LIKE ? OR p.ml_id LIKE ?)' : '';
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .all(...params) as Array<Record<string, unknown>>;
  res.json(rows.map(mapProductRow));
});

function validateAndInsertProduct(body: Record<string, unknown>): { id: number; slug: string } {
  const title = String(body.title || '').trim();
  const affiliateUrl = String(body.affiliate_url || '').trim();
  const currentPrice = Number(body.current_price);

  if (!title) throw new Error('O nome do produto é obrigatório.');
  if (!affiliateUrl || !isValidMercadoLivreUrl(affiliateUrl)) {
    throw new Error('Link de afiliado inválido. Informe a URL completa do Mercado Livre.');
  }
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error('Informe um preço atual válido maior que zero.');
  }

  const originalPriceRaw =
    body.original_price !== null && body.original_price !== undefined && body.original_price !== ''
      ? Number(body.original_price)
      : null;
  const discountPercent = calculateDiscount(currentPrice, originalPriceRaw);
  const originalPrice = discountPercent ? originalPriceRaw : null;

  const mlId = body.ml_id ? String(body.ml_id).trim() : null;
  const dup = db.prepare('SELECT id, title FROM products WHERE affiliate_url = ?').get(affiliateUrl) as
    | { id: number; title: string }
    | undefined;
  if (dup && !body.allow_duplicate) {
    throw new Error(`Este link de afiliado já está cadastrado no produto "${dup.title}".`);
  }

  const now = new Date().toISOString();
  const slug = uniqueSlug('products', title);
  const specs = Array.isArray(body.specs) ? body.specs : [];
  const gallery = Array.isArray(body.gallery) ? body.gallery.filter((u) => typeof u === 'string' && u.trim()) : [];

  const result = db
    .prepare(
      `INSERT INTO products (
        slug, ml_id, title, brand, short_description, description, specs_json,
        image_url, gallery_json, current_price, original_price, discount_percent,
        is_promo, is_featured, is_bestseller, is_active, category_id,
        affiliate_url, original_url, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      mlId,
      title,
      String(body.brand || '').trim(),
      String(body.short_description || '').trim(),
      String(body.description || '').trim(),
      JSON.stringify(specs),
      String(body.image_url || '').trim(),
      JSON.stringify(gallery),
      currentPrice,
      originalPrice,
      discountPercent,
      body.is_promo || discountPercent ? 1 : 0,
      body.is_featured ? 1 : 0,
      body.is_bestseller ? 1 : 0,
      body.is_active === false ? 0 : 1,
      body.category_id ? Number(body.category_id) : null,
      affiliateUrl, // stored verbatim!
      String(body.original_url || '').trim(),
      String(body.source || 'manual'),
      now,
      now
    );

  return { id: Number(result.lastInsertRowid), slug };
}

app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const created = validateAndInsertProduct(req.body || {});
    const row = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id = ?`
      )
      .get(created.id) as Record<string, unknown>;
    res.status(201).json(mapProductRow(row));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao salvar produto.' });
  }
});

app.post('/api/admin/products/bulk-publish', requireAdmin, (req, res) => {
  const items = Array.isArray(req.body?.items) ? (req.body.items as Array<Record<string, unknown>>) : [];
  if (items.length === 0) {
    res.status(400).json({ error: 'Nenhum produto selecionado para publicação.' });
    return;
  }

  const published: number[] = [];
  const errors: Array<{ index: number; affiliate_url: string; error: string }> = [];

  const runBatch = db.transaction(() => {
    items.forEach((item, index) => {
      try {
        const created = validateAndInsertProduct(item);
        published.push(created.id);
      } catch (err) {
        errors.push({
          index,
          affiliate_url: String(item.affiliate_url || ''),
          error: err instanceof Error ? err.message : 'Erro de validação.',
        });
      }
    });
  });

  runBatch();
  res.status(201).json({ publishedCount: published.length, errors });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Produto não encontrado.' });
    return;
  }

  const body = req.body || {};
  const title = body.title !== undefined ? String(body.title).trim() : String(existing.title);
  const affiliateUrl =
    body.affiliate_url !== undefined ? String(body.affiliate_url).trim() : String(existing.affiliate_url);
  const currentPrice = body.current_price !== undefined ? Number(body.current_price) : Number(existing.current_price);

  if (!title) {
    res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    return;
  }
  if (!affiliateUrl || !isValidMercadoLivreUrl(affiliateUrl)) {
    res.status(400).json({ error: 'Link de afiliado inválido.' });
    return;
  }
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    res.status(400).json({ error: 'Preço atual inválido.' });
    return;
  }

  const originalPriceRaw =
    body.original_price !== undefined
      ? body.original_price === null || body.original_price === ''
        ? null
        : Number(body.original_price)
      : (existing.original_price as number | null);

  const discountPercent = calculateDiscount(currentPrice, originalPriceRaw);
  const originalPrice = discountPercent ? originalPriceRaw : null;

  const slug = title !== String(existing.title) ? uniqueSlug('products', title, id) : String(existing.slug);
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE products SET
      slug = ?, ml_id = ?, title = ?, brand = ?, short_description = ?, description = ?,
      specs_json = ?, image_url = ?, gallery_json = ?, current_price = ?, original_price = ?,
      discount_percent = ?, is_promo = ?, is_featured = ?, is_bestseller = ?, is_active = ?,
      category_id = ?, affiliate_url = ?, original_url = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    slug,
    body.ml_id !== undefined ? (body.ml_id ? String(body.ml_id).trim() : null) : existing.ml_id,
    title,
    body.brand !== undefined ? String(body.brand).trim() : existing.brand,
    body.short_description !== undefined ? String(body.short_description).trim() : existing.short_description,
    body.description !== undefined ? String(body.description).trim() : existing.description,
    body.specs !== undefined ? JSON.stringify(body.specs) : existing.specs_json,
    body.image_url !== undefined ? String(body.image_url).trim() : existing.image_url,
    body.gallery !== undefined ? JSON.stringify(body.gallery) : existing.gallery_json,
    currentPrice,
    originalPrice,
    discountPercent,
    body.is_promo !== undefined ? (body.is_promo ? 1 : 0) : discountPercent ? 1 : existing.is_promo,
    body.is_featured !== undefined ? (body.is_featured ? 1 : 0) : existing.is_featured,
    body.is_bestseller !== undefined ? (body.is_bestseller ? 1 : 0) : existing.is_bestseller,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
    body.category_id !== undefined ? (body.category_id ? Number(body.category_id) : null) : existing.category_id,
    affiliateUrl,
    body.original_url !== undefined ? String(body.original_url).trim() : existing.original_url,
    now,
    id
  );

  const updated = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`
    )
    .get(id) as Record<string, unknown>;
  res.json(mapProductRow(updated));
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/export', requireAdmin, (req, res) => {
  const format = String(req.query.format || 'json').toLowerCase();
  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.id ASC`
    )
    .all() as Array<Record<string, unknown>>;
  const products = rows.map(mapProductRow);

  if (format === 'csv') {
    const header = [
      'id',
      'ml_id',
      'title',
      'brand',
      'category_name',
      'current_price',
      'original_price',
      'discount_percent',
      'is_active',
      'is_featured',
      'is_bestseller',
      'affiliate_url',
      'image_url',
      'created_at',
    ];
    const escape = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...products.map((p) =>
        [
          p.id,
          p.ml_id,
          p.title,
          p.brand,
          p.category_name,
          p.current_price,
          p.original_price,
          p.discount_percent,
          p.is_active ? 1 : 0,
          p.is_featured ? 1 : 0,
          p.is_bestseller ? 1 : 0,
          p.affiliate_url,
          p.image_url,
          p.created_at,
        ]
          .map(escape)
          .join(',')
      ),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tech-oferta-catalogo.csv"');
    res.send('\uFEFF' + lines.join('\n'));
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tech-oferta-catalogo.json"');
  res.send(JSON.stringify({ exported_at: new Date().toISOString(), total: products.length, products }, null, 2));
});

// ---------- ADMIN CATEGORIES ----------

app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  res.json(getAllCategoriesWithCounts(true));
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const icon = String(req.body?.icon || 'cpu').trim();
  if (!name) {
    res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
    return;
  }
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM categories').get() as { m: number };
  const slug = uniqueSlug('categories', name);
  const now = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO categories (name, slug, description, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, slug, description, icon, maxOrder.m + 1, now);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Categoria não encontrada.' });
    return;
  }
  const name = req.body?.name !== undefined ? String(req.body.name).trim() : String(existing.name);
  if (!name) {
    res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
    return;
  }
  const slug = name !== String(existing.name) ? uniqueSlug('categories', name, id) : String(existing.slug);
  const description =
    req.body?.description !== undefined ? String(req.body.description).trim() : String(existing.description || '');
  const icon = req.body?.icon !== undefined ? String(req.body.icon).trim() : String(existing.icon || 'cpu');
  db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, icon = ? WHERE id = ?').run(
    name,
    slug,
    description,
    icon,
    id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

app.post('/api/admin/categories/reorder', requireAdmin, (req, res) => {
  const ids = Array.isArray(req.body?.orderedIds) ? (req.body.orderedIds as number[]) : [];
  const stmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  const tx = db.transaction(() => {
    ids.forEach((catId, idx) => stmt.run(idx + 1, Number(catId)));
  });
  tx();
  res.json(getAllCategoriesWithCounts(true));
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- ADMIN ARTICLES ----------

app.get('/api/admin/articles', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM articles ORDER BY created_at DESC, id DESC').all() as Array<
    Record<string, unknown>
  >;
  res.json(rows.map(mapArticleRow));
});

app.post('/api/admin/articles', requireAdmin, (req, res) => {
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();
  if (!title || !content) {
    res.status(400).json({ error: 'Título e conteúdo do artigo são obrigatórios.' });
    return;
  }
  const slug = uniqueSlug('articles', title);
  const now = new Date().toISOString();
  const relatedIds = Array.isArray(req.body?.related_product_ids)
    ? req.body.related_product_ids.map(Number).filter(Number.isFinite)
    : [];
  const result = db
    .prepare(
      `INSERT INTO articles (
        slug, title, subtitle, cover_image, content, related_product_ids_json,
        is_published, seo_title, seo_description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      title,
      String(req.body?.subtitle || '').trim(),
      String(req.body?.cover_image || '').trim(),
      content,
      JSON.stringify(relatedIds),
      req.body?.is_published ? 1 : 0, // Never auto-published unless explicitly requested by admin
      String(req.body?.seo_title || title).trim(),
      String(req.body?.seo_description || req.body?.subtitle || '').trim(),
      now,
      now
    );
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  res.status(201).json(mapArticleRow(row));
});

app.put('/api/admin/articles/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Artigo não encontrado.' });
    return;
  }
  const body = req.body || {};
  const title = body.title !== undefined ? String(body.title).trim() : String(existing.title);
  if (!title) {
    res.status(400).json({ error: 'Título é obrigatório.' });
    return;
  }
  const slug = title !== String(existing.title) ? uniqueSlug('articles', title, id) : String(existing.slug);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE articles SET
      slug = ?, title = ?, subtitle = ?, cover_image = ?, content = ?,
      related_product_ids_json = ?, is_published = ?, seo_title = ?, seo_description = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    slug,
    title,
    body.subtitle !== undefined ? String(body.subtitle).trim() : existing.subtitle,
    body.cover_image !== undefined ? String(body.cover_image).trim() : existing.cover_image,
    body.content !== undefined ? String(body.content).trim() : existing.content,
    body.related_product_ids !== undefined
      ? JSON.stringify(body.related_product_ids)
      : existing.related_product_ids_json,
    body.is_published !== undefined ? (body.is_published ? 1 : 0) : existing.is_published,
    body.seo_title !== undefined ? String(body.seo_title).trim() : existing.seo_title,
    body.seo_description !== undefined ? String(body.seo_description).trim() : existing.seo_description,
    now,
    id
  );
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Record<string, unknown>;
  res.json(mapArticleRow(row));
});

app.delete('/api/admin/articles/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- ADMIN SETTINGS & MESSAGES ----------

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const now = new Date().toISOString();
  const upsert = db.prepare(
    `INSERT INTO site_settings (key, value_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  );
  const body = req.body || {};
  if (body.hero_banner) upsert.run('hero_banner', JSON.stringify(body.hero_banner), now);
  if (body.promo_campaign) upsert.run('promo_campaign', JSON.stringify(body.promo_campaign), now);
  if (body.homepage_sections) upsert.run('homepage_sections', JSON.stringify(body.homepage_sections), now);
  res.json(getSiteSettings());
});

app.get('/api/admin/messages', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC, id DESC').all();
  res.json(rows);
});

app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- VITE / STATIC FRONTEND ----------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve('dist/index.html'));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (isProd) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tech Oferta server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
