export interface ProductSpec {
  name: string;
  value: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  product_count?: number;
  created_at: string;
}

export interface Product {
  id: number;
  slug: string;
  ml_id: string | null;
  title: string;
  brand: string;
  short_description: string;
  description: string;
  specs: ProductSpec[];
  image_url: string;
  gallery: string[];
  current_price: number;
  original_price: number | null;
  discount_percent: number | null;
  is_promo: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_active: boolean;
  category_id: number | null;
  category_name?: string | null;
  category_slug?: string | null;
  affiliate_url: string;
  original_url: string;
  source: string;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  cover_image: string;
  content: string;
  related_product_ids: number[];
  related_products?: Product[];
  is_published: boolean;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

export interface HeroBannerSettings {
  title: string;
  subtitle: string;
  ctaText: string;
  imageUrl: string;
}

export interface PromoCampaignSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  ctaText: string;
  imageUrl: string;
  highlightCategorySlug: string;
}

export interface HomepageSectionsSettings {
  showFeatured: boolean;
  showAllProducts: boolean;
  showBestsellers: boolean;
  showLatest: boolean;
  showCategories: boolean;
  showCampaigns: boolean;
  showArticles: boolean;
}

export interface SiteSettings {
  hero_banner: HeroBannerSettings;
  promo_campaign: PromoCampaignSettings;
  homepage_sections: HomepageSectionsSettings;
}

export interface ImportedOfferDraft {
  affiliate_url: string;
  original_url: string;
  ml_id: string | null;
  title: string;
  brand: string;
  short_description: string;
  description: string;
  specs: ProductSpec[];
  image_url: string;
  gallery: string[];
  current_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  suggested_category_id: number | null;
  suggested_category_name: string | null;
  source: 'mercadolivre_api' | 'mercadolivre_meta' | 'manual';
  import_status: 'imported' | 'partial' | 'blocked' | 'duplicate' | 'error';
  message: string;
  duplicate_product_id?: number | null;
  duplicate_product_title?: string | null;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface AdminDashboardStats {
  total_products: number;
  active_offers: number;
  total_categories: number;
  featured_products: number;
  bestseller_products: number;
  published_articles: number;
  total_clicks: number;
  latest_products: Product[];
}
