import { readFileSync } from 'node:fs';

// Prices and illustrations checked against the owner's public Telegram channel
// on 2026-10-28. This records published prices, not confirmed stock availability.
export function enrichCatalog(products) {
  const general = 'https://t.me/MycoMarket_URAL/131';
  const capsules = 'https://t.me/MycoMarket_URAL/130';
  const setImage = (p, file, post, alt, note) => Object.assign(p, {
    image: '/assets/' + file,
    imageSource: 'https://t.me/MycoMarket_URAL/' + post,
    imageAlt: alt,
    imageNote: note || 'Изображение из канала лавки. Вид и маркировку выбранной фасовки уточните у продавца.'
  });
  for (const p of products) {
    if (p.category !== 'archive') {
      Object.assign(p, {priceSource:general,priceSourceDate:'2026-10-21',priceCheckedAt:'2026-10-28',priceStatus:'published',sourceNote:'Цены сверены 28 октября с общим прайсом Telegram канала от 21 октября 2026 года. Наличие подтверждает продавец.'});
    }
    if (p.category === 'soma') setImage(p,'soma-channel.jpg',132,'Грибные Сомы на иллюстрации из Telegram канала лавки');
    if (p.id === 'lions-fruit' || p.id === 'mycelium-lions') setImage(p,'lions-mane-channel.jpg',39,'Плодовое тело ежовика гребенчатого и мицелий на иллюстрации из канала','Иллюстрация вида гриба из канала лавки. Это не фотография готовой фасовки.');
    if (p.id === 'fungal-soma-maitake' || p.id === 'mycelium-maitake') setImage(p,'maitake-channel.jpg',123,'Мейтаке на фотографии, опубликованной в канале лавки','Изображение гриба из канала лавки. Это не фотография готовой фасовки.');
    if (p.id === 'honey-sweet-clover' || p.id === 'honey-herbs') setImage(p,'honey-channel.jpg',103,'Мёд и соты на иллюстрации из канала лавки');
    if (p.id === 'ivan-tea') setImage(p,'tea-channel.jpg',42,'Чайная композиция из публикации канала лавки','Чайная иллюстрация из канала. Состав и внешний вид конкретного чая уточните у продавца.');
  }
  const oil = products.find(p=>p.id==='mace-oil');
  oil.sourceNote='Цены из общего прайса Telegram канала от 21 октября; они также опубликованы в записи о мацисе от 17 октября.';
  Object.assign(oil,{imageSource:'https://t.me/MycoMarket_URAL/125',imageAlt:'Масло мацис на иллюстрации из канала лавки',imageNote:'Изображение из канала лавки. Вид и маркировку выбранной фасовки уточните у продавца.'});
  for (const p of products.filter(p=>p.category==='capsules')) {
    Object.assign(p,{details:p.description+' Наименование, фасовка и цена сверены с ассортиментной публикацией канала от 21 октября. Полный состав, производителя, назначение и наличие уточните у продавца.',priceSource:capsules,priceSourceDate:'2026-10-21',priceCheckedAt:'2026-10-28',priceStatus:'published',sourceNote:'Цена и фасовка опубликованы в ассортиментной записи Telegram канала от 21 октября 2026 года.'});
    setImage(p,'assortment-channel.jpg',113,'Ассортимент продукции МухоморыЧ в публикации канала','Фото ассортимента из канала лавки. Точная упаковка выбранного продукта может отличаться.');
  }
  const lions=products.find(p=>p.id==='lions-fruit');
  lions.variants[1].priceNote='В общем прайсе 2700 ₽, в отдельном посте о ежовике 2100 ₽. Уточните цену 300 г у продавца.';
  lions.priceStatus='conflict';
  lions.sourceNote+=' Для 300 г есть расхождение: общий прайс — 2700 ₽, отдельный пост о ежовике — 2100 ₽. Перед оплатой уточните цену.';
  lions.alternativePriceSource='https://t.me/MycoMarket_URAL/121';
  // Supplier images are stored locally; only matched products receive them.
  // Keep the seller's catalog, descriptions and prices independent of the supplier.
  const supplierImages=JSON.parse(readFileSync(new URL('./public/assets/image-sources.json',import.meta.url),'utf8'));
  for (const source of supplierImages.filter(source=>source.supplier==='shamanchik.ru')) {
    const product=products.find(product=>product.id===source.productId);
    if (!product) throw new Error('Unknown product for supplier image: '+source.productId);
    Object.assign(product,{
      image:'/assets/'+source.file,
      imageSource:source.source,
      imageLabel:'Лавка Шамана',
      imageAlt:source.alt||product.name+' — изображение из каталога Лавки Шамана',
      imageNote:source.note||'Изображение из каталога Лавки Шамана, предоставленное для этой витрины. Оформление и фасовка на изображении могут отличаться от выбранных. Точную упаковку уточните у продавца.',
      ...(source.gallery?{imageGallery:source.gallery}:{}),
      ...(source.variantImages?{variantImages:source.variantImages}:{})
    });
  }
  for (const source of supplierImages.filter(source=>source.collection==='brand-materials-20261028')) {
    const product=products.find(product=>product.id===source.productId);
    if (!product) throw new Error('Unknown product for brand image: '+source.productId);
    Object.assign(product,{
      image:'/assets/'+source.file,
      imageSource:source.source,
      imageLabel:source.label,
      imageAlt:source.alt,
      imageNote:source.note,
      imageFit:source.fit||'cover',
      imageGallery:source.gallery||[]
    });
  }
  for (const id of ['lions-capsules','cordyceps-capsules']) {
    products.find(product=>product.id===id).declaration={href:'/documents/muhomorych-capsules-declaration.pdf',title:'Декларация производителя на грибные капсулы'};
  }
  for (const id of ['lions-extract','cordyceps-extract']) {
    products.find(product=>product.id===id).declaration={href:'/documents/muhomorych-liquid-declaration.pdf',title:'Декларация производителя на жидкие концентраты'};
  }
  return products;
}
