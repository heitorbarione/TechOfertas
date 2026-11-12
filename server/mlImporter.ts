import * as cheerio from 'cheerio';
import type { ImportedOfferDraft, ProductSpec } from '../src/types.ts';
import { calculateDiscount, db } from './db.ts';

const ALLOWED_ML_HOSTS = [
  'mercadolivre.com.br',
  'mercadolivre.com',
  'mercadolibre.com',
  'mercadolibre.com.ar',
  'mercadolibre.com.mx',
  'meli.la',
  'mercado.livre',
];

export function isValidMercadoLivreUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_ML_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function extractMlIdsFromUrl(urlStr: string): { itemId: string | null; catalogId: string | null } {
  let itemId: string | null = null;
  let catalogId: string | null = null;

  try {
    const u = new URL(urlStr);
    const full = decodeURIComponent(urlStr);

    // Query params like wid=MLB123456 or item_id=MLB123456
    const wid = u.searchParams.get('wid') || u.searchParams.get('item_id');
    if (wid && /^MLB\d{6,14}$/i.test(wid.replace('-', ''))) {
      itemId = wid.replace('-', '').toUpperCase();
    }

    const pdpFilters = u.searchParams.get('pdp_filters');
    if (!itemId && pdpFilters) {
      const m = pdpFilters.match(/item_id:(MLB-?\d{6,14})/i);
      if (m) itemId = m[1].replace('-', '').toUpperCase();
    }

    // Catalog URL pattern: /p/MLB12345678
    const catalogMatch = full.match(/\/p\/(MLB\d{6,14})/i);
    if (catalogMatch) {
      catalogId = catalogMatch[1].toUpperCase();
    }

    // Item URL pattern: /MLB-1234567890-title or MLB1234567890
    if (!itemId) {
      const itemMatch = full.match(/(MLB-?\d{7,14})/i);
      if (itemMatch) {
        const normalized = itemMatch[1].replace('-', '').toUpperCase();
        if (normalized !== catalogId) {
          itemId = normalized;
        }
      }
    }
  } catch {
    // ignore malformed URL
  }

  return { itemId, catalogId };
}

function suggestCategoryForText(text: string): { id: number | null; name: string | null } {
  const lower = text.toLowerCase();
  const categories = db.prepare('SELECT id, name, slug FROM categories ORDER BY sort_order ASC').all() as Array<{
    id: number;
    name: string;
    slug: string;
  }>;

  const rules: Array<{ slug: string; keywords: string[] }> = [
    {
      slug: 'caixas-de-som-e-fones-de-ouvido',
      keywords: ['fone', 'headphone', 'headset', 'earbud', 'airpods', 'caixa de som', 'jbl', 'soundbar', 'bluetooth speaker', 'tws', 'buds'],
    },
    {
      slug: 'celulares-e-smartphones',
      keywords: ['smartphone', 'celular', 'iphone', 'galaxy a', 'galaxy s', 'galaxy z', 'redmi', 'poco', 'motorola', 'moto g', 'moto edge', 'xiaomi'],
    },
    {
      slug: 'acessorios-para-celular',
      keywords: ['capa ', 'capinha', 'película', 'pelicula', 'power bank', 'suporte veicular', 'tripé', 'tripe', 'ring light', 'magsafe'],
    },
    {
      slug: 'tvs-e-smart-tvs',
      keywords: ['smart tv', 'televisor', 'televisão', 'qled', 'oled', 'uhd 4k', 'fire tv', 'chromecast', 'roku', 'tv box'],
    },
    {
      slug: 'notebooks-e-computadores',
      keywords: ['notebook', 'laptop', 'macbook', 'ultrabook', 'chromebook', 'all in one', 'pc desktop', 'imac', 'mac mini'],
    },
    {
      slug: 'produtos-gamer',
      keywords: ['gamer', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'controle', 'dualsense', 'rtx ', 'cadeira gamer', 'volante'],
    },
    {
      slug: 'smartwatches-e-relogios-inteligentes',
      keywords: ['smartwatch', 'relógio inteligente', 'relogio inteligente', 'apple watch', 'galaxy watch', 'mi band', 'amazfit', 'garmin'],
    },
    {
      slug: 'carregadores-e-cabos',
      keywords: ['carregador', 'cabo usb', 'usb-c', 'lightning', 'hdmi', 'displayport', 'fonte gan', 'adaptador de tomada', 'extensão', 'filtro de linha'],
    },
    {
      slug: 'eletrodomesticos',
      keywords: ['air fryer', 'fritadeira', 'aspirador', 'robô aspirador', 'cafeteira', 'geladeira', 'micro-ondas', 'ventilador', 'ar condicionado', 'alexa', 'echo dot'],
    },
    {
      slug: 'informatica',
      keywords: ['ssd', 'nvme', 'hd externo', 'memória ram', 'memoria ram', 'roteador', 'wi-fi', 'mesh', 'impressora', 'placa mãe', 'processador', 'ryzen', 'intel core'],
    },
    {
      slug: 'perifericos',
      keywords: ['teclado', 'mouse', 'monitor ', 'webcam', 'microfone', 'mousepad', 'mesa digitalizadora'],
    },
    {
      slug: 'acessorios-tecnologicos',
      keywords: ['hub usb', 'dock', 'suporte notebook', 'luminária', 'lampada inteligente', 'tomada inteligente', 'pendrive', 'cartão microsd'],
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      const found = categories.find((c) => c.slug === rule.slug);
      if (found) return { id: found.id, name: found.name };
    }
  }

  const fallback = categories.find((c) => c.slug === 'todos-os-eletronicos') || categories[0];
  return fallback ? { id: fallback.id, name: fallback.name } : { id: null, name: null };
}

function findDuplicateProduct(affiliateUrl: string, originalUrl: string, mlId: string | null) {
  const byAffiliate = db
    .prepare('SELECT id, title FROM products WHERE affiliate_url = ?')
    .get(affiliateUrl) as { id: number; title: string } | undefined;
  if (byAffiliate) return byAffiliate;

  if (mlId) {
    const byMlId = db
      .prepare('SELECT id, title FROM products WHERE ml_id = ?')
      .get(mlId) as { id: number; title: string } | undefined;
    if (byMlId) return byMlId;
  }

  if (originalUrl && originalUrl !== affiliateUrl) {
    const cleanOrig = originalUrl.split('?')[0];
    const byOrig = db
      .prepare('SELECT id, title FROM products WHERE original_url = ? OR original_url LIKE ?')
      .get(originalUrl, `${cleanOrig}%`) as { id: number; title: string } | undefined;
    if (byOrig) return byOrig;
  }

  return null;
}

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function resolveRedirectAndFetchHtml(inputUrl: string): Promise<{
  finalUrl: string;
  html: string | null;
  httpStatus: number;
}> {
  let currentUrl = inputUrl;
  let html: string | null = null;
  let httpStatus = 0;

  for (let hop = 0; hop < 8; hop += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(currentUrl, {
        method: 'GET',
        headers: REQUEST_HEADERS,
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      httpStatus = res.status;

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        currentUrl = new URL(loc, currentUrl).toString();
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
        const text = await res.text();
        html = text;
        // Check for Mercado Livre /social/ redirect meta or JS canonical link
        if (currentUrl.includes('/sec/') || currentUrl.includes('meli.la') || currentUrl.includes('/social/')) {
          const $ = cheerio.load(text);
          const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
          const refreshMatch = metaRefresh?.match(/url=([^;]+)/i);
          if (refreshMatch && refreshMatch[1]) {
            currentUrl = new URL(refreshMatch[1].trim(), currentUrl).toString();
            continue;
          }
        }
      }
      break;
    } catch {
      clearTimeout(timeout);
      break;
    }
  }

  return { finalUrl: currentUrl, html, httpStatus };
}

async function fetchMlOfficialApi(mlId: string, isCatalog: boolean): Promise<{
  title?: string;
  brand?: string;
  description?: string;
  short_description?: string;
  image_url?: string;
  gallery?: string[];
  current_price?: number | null;
  original_price?: number | null;
  specs?: ProductSpec[];
  category_name?: string;
  permalink?: string;
  resolved_ml_id?: string;
} | null> {
  const token = process.env.MELI_ACCESS_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'TechOfertaPortal/1.0',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    if (isCatalog) {
      const prodRes = await fetch(`https://api.mercadolibre.com/products/${mlId}`, {
        headers,
        signal: AbortSignal.timeout(9000),
      });
      if (!prodRes.ok) return null;
      const prod = (await prodRes.json()) as Record<string, unknown>;

      const pictures = Array.isArray(prod.pictures)
        ? (prod.pictures as Array<{ url?: string }>).map((p) => p.url).filter((u): u is string => Boolean(u))
        : [];
      const attributes = Array.isArray(prod.attributes)
        ? (prod.attributes as Array<{ name?: string; value_name?: string }>)
            .filter((a) => a.name && a.value_name)
            .slice(0, 14)
            .map((a) => ({ name: String(a.name), value: String(a.value_name) }))
        : [];

      const brandAttr = attributes.find((a) => a.name.toLowerCase() === 'marca');
      const shortDescObj = prod.short_description as { content?: string } | undefined;
      const buyBox = prod.buy_box_winner as {
        price?: number;
        original_price?: number | null;
        item_id?: string;
      } | null;

      let categoryName = '';
      if (prod.domain_id) {
        categoryName = String(prod.domain_id);
      }

      return {
        title: prod.name ? String(prod.name) : undefined,
        brand: brandAttr?.value || '',
        short_description: shortDescObj?.content ? String(shortDescObj.content).slice(0, 260) : '',
        description: shortDescObj?.content ? String(shortDescObj.content) : '',
        image_url: pictures[0] || '',
        gallery: pictures.slice(1, 8),
        current_price: buyBox?.price ? Number(buyBox.price) : null,
        original_price: buyBox?.original_price ? Number(buyBox.original_price) : null,
        specs: attributes,
        category_name: categoryName,
        permalink: prod.permalink ? String(prod.permalink) : undefined,
        resolved_ml_id: String(prod.id || mlId),
      };
    }

    // Standard Item endpoint
    const itemRes = await fetch(`https://api.mercadolibre.com/items/${mlId}`, {
      headers,
      signal: AbortSignal.timeout(9000),
    });
    if (!itemRes.ok) return null;
    const item = (await itemRes.json()) as Record<string, unknown>;

    let descText = '';
    try {
      const descRes = await fetch(`https://api.mercadolibre.com/items/${mlId}/description`, {
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (descRes.ok) {
        const descJson = (await descRes.json()) as { plain_text?: string };
        descText = descJson.plain_text || '';
      }
    } catch {
      // optional
    }

    let categoryName = '';
    if (item.category_id) {
      try {
        const catRes = await fetch(`https://api.mercadolibre.com/categories/${String(item.category_id)}`, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
        if (catRes.ok) {
          const catJson = (await catRes.json()) as { name?: string };
          categoryName = catJson.name || '';
        }
      } catch {
        // optional
      }
    }

    const pictures = Array.isArray(item.pictures)
      ? (item.pictures as Array<{ secure_url?: string; url?: string }>)
          .map((p) => p.secure_url || p.url)
          .filter((u): u is string => Boolean(u))
      : item.thumbnail
        ? [String(item.thumbnail).replace(/^http:/, 'https:')]
        : [];

    const attributes = Array.isArray(item.attributes)
      ? (item.attributes as Array<{ name?: string; value_name?: string }>)
          .filter((a) => a.name && a.value_name)
          .slice(0, 14)
          .map((a) => ({ name: String(a.name), value: String(a.value_name) }))
      : [];

    const brandAttr = attributes.find((a) => a.name.toLowerCase() === 'marca');

    return {
      title: item.title ? String(item.title) : undefined,
      brand: brandAttr?.value || '',
      short_description: descText ? descText.slice(0, 220) : '',
      description: descText,
      image_url: pictures[0] || '',
      gallery: pictures.slice(1, 8),
      current_price: item.price ? Number(item.price) : null,
      original_price: item.original_price ? Number(item.original_price) : null,
      specs: attributes,
      category_name: categoryName,
      permalink: item.permalink ? String(item.permalink) : undefined,
      resolved_ml_id: String(item.id || mlId),
    };
  } catch {
    return null;
  }
}

function parseMetadataFromHtml(html: string): {
  title?: string;
  brand?: string;
  description?: string;
  image_url?: string;
  gallery?: string[];
  current_price?: number | null;
  original_price?: number | null;
  canonical_url?: string;
} {
  const $ = cheerio.load(html);
  const canonical = $('link[rel="canonical"]').attr('href') || undefined;

  let title = $('meta[property="og:title"]').attr('content')?.trim() || $('title').text().trim();
  if (title) {
    title = title.replace(/\s*\|\s*MercadoLivre.*$/i, '').replace(/\s*-\s*R\$\s*[\d.,]+$/i, '').trim();
  }
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || '';
  const ogDesc =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    '';

  let currentPrice: number | null = null;
  let originalPrice: number | null = null;
  let brand = '';
  const gallery: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      const items = Array.isArray(json) ? json : [json];
      for (const obj of items) {
        if (!obj || typeof obj !== 'object') continue;
        if (obj['@type'] === 'Product') {
          if (obj.name && !title) title = String(obj.name);
          if (obj.brand) {
            brand = typeof obj.brand === 'string' ? obj.brand : String(obj.brand.name || '');
          }
          if (Array.isArray(obj.image)) {
            for (const img of obj.image) {
              if (typeof img === 'string') gallery.push(img);
            }
          } else if (typeof obj.image === 'string') {
            gallery.push(obj.image);
          }
          const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
          if (offers && offers.price) {
            const parsed = Number(offers.price);
            if (Number.isFinite(parsed) && parsed > 0) currentPrice = parsed;
          }
        }
      }
    } catch {
      // ignore invalid ld+json
    }
  });

  // Fallback price meta tags used in Mercado Livre product pages
  if (!currentPrice) {
    const metaPrice = $('meta[itemprop="price"]').attr('content');
    if (metaPrice) {
      const p = Number(metaPrice.replace(',', '.'));
      if (Number.isFinite(p) && p > 0) currentPrice = p;
    }
  }

  // Extract previous price if explicitly present in ML strike-through price element
  const prevFraction = $('.ui-pdp-price__original-value .andes-money-amount__fraction').first().text().replace(/\./g, '').trim();
  const prevCents = $('.ui-pdp-price__original-value .andes-money-amount__cents').first().text().trim();
  if (prevFraction) {
    const parsedPrev = Number(`${prevFraction}.${prevCents || '00'}`);
    if (Number.isFinite(parsedPrev) && currentPrice && parsedPrev > currentPrice) {
      originalPrice = parsedPrev;
    }
  }

  const mainImg = gallery[0] || ogImage;
  const extraGallery = gallery.filter((u) => u && u !== mainImg).slice(0, 7);

  const isGenericBlockedTitle =
    !title ||
    /^(mercado\s*(libre|livre)|captcha|security check|access denied|just a moment)/i.test(title.trim());

  return {
    title: isGenericBlockedTitle ? undefined : title,
    brand,
    description: ogDesc,
    image_url: mainImg,
    gallery: extraGallery,
    current_price: currentPrice,
    original_price: originalPrice,
    canonical_url: canonical,
  };
}

function extractTitleHintFromUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const segments = u.pathname.split('/').filter(Boolean);
    for (const seg of segments) {
      if (/^(p|sec|social|mlb-?\d+)$/i.test(seg)) continue;
      if (seg.includes('-') && seg.length > 8) {
        const cleaned = seg
          .replace(/^MLB-?\d+-/i, '')
          .replace(/-_JM$/i, '')
          .replace(/-/g, ' ')
          .trim();
        if (cleaned.length > 4) {
          return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
        }
      }
    }
  } catch {
    // ignore
  }
  return '';
}

export async function importSingleMercadoLivreLink(rawAffiliateUrl: string): Promise<ImportedOfferDraft> {
  const affiliateUrl = rawAffiliateUrl.trim();

  if (!isValidMercadoLivreUrl(affiliateUrl)) {
    return {
      affiliate_url: affiliateUrl,
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
      import_status: 'error',
      message: 'URL inválida. Insira um link válido do Mercado Livre (ex: mercadolivre.com/sec/... ou mercadolivre.com.br/...).',
    };
  }

  const { finalUrl, html, httpStatus } = await resolveRedirectAndFetchHtml(affiliateUrl);
  const htmlMeta = html ? parseMetadataFromHtml(html) : {};
  const resolvedUrl = htmlMeta.canonical_url || finalUrl || affiliateUrl;

  const idsFromInput = extractMlIdsFromUrl(affiliateUrl);
  const idsFromResolved = extractMlIdsFromUrl(resolvedUrl);

  const itemId = idsFromResolved.itemId || idsFromInput.itemId;
  const catalogId = idsFromResolved.catalogId || idsFromInput.catalogId;
  const primaryMlId = itemId || catalogId || null;

  // Check duplicates right away
  const dup = findDuplicateProduct(affiliateUrl, resolvedUrl, primaryMlId);

  // Try official Mercado Livre API first
  let apiData: Awaited<ReturnType<typeof fetchMlOfficialApi>> = null;
  if (itemId) {
    apiData = await fetchMlOfficialApi(itemId, false);
  }
  if (!apiData && catalogId) {
    apiData = await fetchMlOfficialApi(catalogId, true);
  }

  const urlSlugHint = extractTitleHintFromUrl(resolvedUrl) || extractTitleHintFromUrl(affiliateUrl);
  const title = apiData?.title || htmlMeta.title || urlSlugHint || '';
  const brand = apiData?.brand || htmlMeta.brand || '';
  const description = apiData?.description || htmlMeta.description || '';
  const shortDescription = apiData?.short_description || (description ? description.slice(0, 220) : '');
  const imageUrl = apiData?.image_url || htmlMeta.image_url || '';
  const gallery = (apiData?.gallery && apiData.gallery.length > 0 ? apiData.gallery : htmlMeta.gallery) || [];
  const currentPrice = apiData?.current_price ?? htmlMeta.current_price ?? null;
  const originalPrice = apiData?.original_price ?? htmlMeta.original_price ?? null;
  const discountPercent = currentPrice ? calculateDiscount(currentPrice, originalPrice) : null;
  const specs = apiData?.specs || [];

  const categoryHint = `${title} ${apiData?.category_name || ''}`.trim();
  const suggestedCat = categoryHint ? suggestCategoryForText(categoryHint) : { id: null, name: null };

  const hasApiOrMeta = Boolean(apiData || htmlMeta.title || htmlMeta.image_url || htmlMeta.current_price);
  const source: ImportedOfferDraft['source'] = apiData
    ? 'mercadolivre_api'
    : hasApiOrMeta
      ? 'mercadolivre_meta'
      : 'manual';

  let importStatus: ImportedOfferDraft['import_status'] = 'imported';
  let message = 'Dados recuperados automaticamente. Confira as informações antes de publicar.';

  if (dup) {
    importStatus = 'duplicate';
    message = `Produto já cadastrado no catálogo ("${dup.title}"). Revise antes de publicar para evitar duplicidade.`;
  } else if (!hasApiOrMeta) {
    importStatus = 'blocked';
    message =
      httpStatus === 403 || httpStatus === 429
        ? 'O Mercado Livre restringiu a consulta automática a partir do servidor (HTTP ' +
          httpStatus +
          '). Seu link de afiliado foi preservado integralmente — complete os dados na prévia (ou configure MELI_ACCESS_TOKEN) para publicar.'
        : 'O Mercado Livre não retornou os dados completos via consulta pública para este link. Seu link de afiliado foi preservado — confira/preencha os campos na prévia para publicar.';
  } else if (!title || !currentPrice || !imageUrl) {
    importStatus = 'partial';
    message =
      'Alguns campos não estavam disponíveis na resposta pública do Mercado Livre. Complete os dados faltantes abaixo antes de publicar.';
  }

  return {
    affiliate_url: affiliateUrl, // ALWAYS preserved verbatim!
    original_url: apiData?.permalink || resolvedUrl,
    ml_id: apiData?.resolved_ml_id || primaryMlId,
    title,
    brand,
    short_description: shortDescription,
    description,
    specs,
    image_url: imageUrl,
    gallery,
    current_price: currentPrice,
    original_price: discountPercent ? originalPrice : null,
    discount_percent: discountPercent,
    suggested_category_id: suggestedCat.id,
    suggested_category_name: suggestedCat.name,
    source,
    import_status: importStatus,
    message,
    duplicate_product_id: dup?.id || null,
    duplicate_product_title: dup?.title || null,
  };
}
