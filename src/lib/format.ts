import type { Product } from '../types';

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function computeDiscountPercent(currentPrice: number, originalPrice: number | null | undefined): number | null {
  if (!originalPrice || !Number.isFinite(originalPrice) || !Number.isFinite(currentPrice)) return null;
  if (originalPrice <= currentPrice || currentPrice <= 0) return null;
  const pct = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  return pct >= 1 && pct <= 99 ? pct : null;
}

export function buildWhatsAppProductShareUrl(product: Product, pageUrl: string): string {
  const parts: string[] = [
    `*${product.title}*`,
    `Preço: *${formatBRL(product.current_price)}*`,
  ];
  if (product.discount_percent && product.original_price) {
    parts.push(`Desconto confirmado: *${product.discount_percent}% OFF* (de ${formatBRL(product.original_price)})`);
  }
  parts.push(`Confira no Tech Oferta: ${pageUrl}`);
  return `https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`;
}

export function buildWhatsAppPageShareUrl(title: string, pageUrl: string): string {
  const text = `${title}\nVeja as melhores ofertas de tecnologia no Tech Oferta:\n${pageUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const TOKEN_KEY = 'techoferta_admin_token';

export function getStoredAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAdminToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `Erro na requisição (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore non-json error
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}
