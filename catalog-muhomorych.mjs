import { readFileSync } from 'node:fs';

// Reviewed product facts and retail prices. This is deliberately a curated
// import, rather than an automatic mirror of the supplier's entire catalog.
export function applyMuhomorychCatalog(products) {
  const entries = JSON.parse(readFileSync(new URL('./data/muhomorych-catalog.json', import.meta.url), 'utf8'));
  for (const entry of entries) {
    const existing = products.find(product => product.id === entry.id);
    const { source, image, imageSha256, ...facts } = entry;
    const product = existing || {
      id: entry.id, color: '#e2e4df', ink: '#748274', art: 'bag',
      artLabel: 'МухоморыЧ', code: String(products.length + 1).padStart(2, '0')
    };
    Object.assign(product, facts, {
      priceSource: source,
      priceSourceLabel: 'Карточка производителя ↗',
      priceCheckedAt: '2026-11-26',
      priceStatus: 'published',
      sourceNote: 'Фасовки и розничные цены сверены 26 ноября 2026 года с сайтом производителя МухоморыЧ. Итоговую стоимость и наличие подтвердит продавец.'
    });
    // The product page has a check date, but no known publication date.
    delete product.priceSourceDate;
    if (image) Object.assign(product, {
      image: '/assets/muhomorych/' + entry.id + '.jpg',
      imageSource: image,
      imageAlt: entry.name + ' — упаковка производителя МухоморыЧ',
      imageLabel: 'МухоморыЧ', imageFit: 'contain',
      imageNote: 'Фото с официального сайта производителя. Упаковку и маркировку выбранной фасовки уточните у продавца.',
      imageGallery: []
    });
    if (!existing) products.push(product);
  }
  return products;
}
