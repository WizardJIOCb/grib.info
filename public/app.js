(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories = [{id:'all',label:'Всё'},{id:'soma',label:'Сома'},{id:'dry',label:'Сушёные грибы'},{id:'mycelium',label:'Зерномицелий'},{id:'natural',label:'Мёд и другое'},{id:'capsules',label:'Капсулы и экстракты'},{id:'archive',label:'По запросу'}];
  let products = [], category = 'all', cart = [], toastTimer;
  const productDialog = $('#product-dialog'), cartDialog = $('#cart-dialog');
  const art = type => {
    const mushroom = '<path d="M30 92C30 51 59 29 90 29s60 22 60 63H30Z"/><path d="M75 92h30l9 59H66Z"/><path d="M54 72c11-15 24-22 36-22M119 62h1M59 123c-10 4-15 10-17 17M124 130c12-3 20 0 24 8"/>';
    const bottle = '<path d="M75 25h30v24H75zM71 49h38l3 20 15 16v70H53V85l15-16 3-20Z"/><path d="M53 96h74M53 139h74M78 110c-8 3-11 8-11 13h27c0-6-6-13-13-13ZM80 123v8"/>';
    const bag = '<path d="M51 32h78l9 122H42L51 32Z"/><path d="M50 44h80M58 83h65v51H56Z"/><path d="M70 112c0-12 9-21 19-21s20 9 20 21H70ZM86 112v13M94 112v13"/>';
    const honey = '<path d="M60 39h60v16H60zM56 55h68l8 17v81H48V72l8-17Z"/><path d="M48 86h84M48 135h84M75 105l15-9 15 9v18l-15 9-15-9Z"/>';
    return '<svg viewBox="0 0 180 180" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ({bottle,bag,honey,mushroom}[type] || bag) + '</svg>';
  };
  function notify(message) { clearTimeout(toastTimer); $('.toast').textContent = message; $('.toast').hidden=false; toastTimer=setTimeout(()=>$('.toast').hidden=true,3200); }
  function saveCart(){try{localStorage.setItem('grib-cart-v1',JSON.stringify(cart));}catch{} updateCount();}
  function updateCount(){document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=cart.reduce((n,r)=>n+r.qty,0));}
  function validRow(row){const p=products.find(p=>p.id===row?.id); return p && Number.isInteger(row.variant) && p.variants[row.variant] && Number.isInteger(row.qty) && row.qty>0 && row.qty<=99;}
  function priceMarkup(p,v){return (v.price===null?'По запросу':money(v.price))+`<small>${v.price===null?'Цена и фасовка уточняются':'за выбранную фасовку'}</small>`+(v.priceNote?`<small class="price-discrepancy">${esc(v.priceNote)}</small>`:'');}
  function renderCatalog() {
    const q=$('#search').value.toLocaleLowerCase('ru').trim();
    const visible=products.filter(p=>(category==='all'||p.category===category)&&(!q||`${p.name} ${p.description} ${p.tags||''}`.toLocaleLowerCase('ru').includes(q)));
    $('#products').innerHTML=visible.map(p=>{
      const v=p.variants[0];
      return `<article class="product-card" data-product="${esc(p.id)}"><div class="product-art${p.image?' is-photo':''}${p.imageFit==='contain'?' is-packshot':''}" style="--art-bg:${p.color};--art-ink:${p.ink}">${p.image?`<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.imageAlt||p.name)}" width="640" height="480">`:art(p.art)}<span class="art-number">${esc(p.code)}</span><span class="art-word">${p.image?esc(p.imageLabel||'Из канала'):esc(p.artLabel)}</span></div><div class="product-body"><p class="product-tag">${esc(p.label)}</p><h3>${esc(p.name)}</h3><p class="product-desc">${esc(p.description)}</p><button class="detail-link" data-details="${esc(p.id)}" aria-label="Подробнее: ${esc(p.name)}">Подробнее ↗</button><label class="variant-label">Фасовка<select aria-label="Фасовка: ${esc(p.name)}" data-variant="${esc(p.id)}">${p.variants.map((v,i)=>`<option value="${i}">${esc(v.label)}</option>`).join('')}</select></label><div class="product-bottom"><p class="product-price" data-price="${esc(p.id)}">${priceMarkup(p,v)}</p><button class="button primary add-cart" data-add="${esc(p.id)}">${v.price===null?'В запрос':'В корзину'} <span aria-hidden="true">+</span></button></div></div></article>`;
    }).join('');
    $('#products').setAttribute('aria-busy','false'); $('#catalog-empty').hidden=visible.length>0; $('#result-count').textContent=`${visible.length} из ${products.length} продуктов`;
  }
  function renderFilters(){ $('.filters').innerHTML=categories.map(c=>`<button class="filter" data-category="${c.id}" aria-pressed="${category===c.id}">${c.label}</button>`).join('');}
  function add(id,variant){const p=products.find(x=>x.id===id); if(!p||!p.variants[variant])return; const row=cart.find(r=>r.id===id&&r.variant===variant); if(row){if(row.qty>=99){notify('Максимум 99 упаковок одного продукта');return;}row.qty++;}else{if(cart.length>=30){notify('Для большого заказа свяжитесь с продавцом напрямую');return;}cart.push({id,variant,qty:1});}saveCart();notify(`${p.name} добавлен в корзину`);}
  function orderText(){
    const lines=['Здравствуйте! Хочу оформить заказ в grib.info:',''];let total=0,unknown=false;
    for(const r of cart){const p=products.find(p=>p.id===r.id),v=p.variants[r.variant]; if(v.price===null)unknown=true;else total+=v.price*r.qty;lines.push(`${p.name}, ${v.label} × ${r.qty} — ${v.price===null?'цена по запросу':money(v.price*r.qty)}${p.category==='archive'?' (уточнить наличие, фасовку и цену)':''}${v.priceNote?' (в публикациях есть расхождение цены; подтвердите стоимость)':''}`);}
    lines.push('',`Сумма по прайсу: ${money(total)}${unknown?' + товары с ценой по запросу':''}. Доставка отдельно.`);
    const city=$('#order-city').value.trim(),comment=$('#order-comment').value.trim(); if(city)lines.push(`Город: ${city}`);if(comment)lines.push(`Пожелания: ${comment}`);
    lines.push('Подтвердите, пожалуйста, наличие, актуальные цены, доставку и способ оплаты.');return lines.join('\n');
  }
  function updateOrder(){const text=orderText(); $('#order-text').value=text; $('#telegram-order').href='https://t.me/MuxomorURAL?text='+encodeURIComponent(text);}
  function renderCart(){
    if(!cart.length){$('#cart-items').innerHTML='<div class="cart-empty"><h3>Ваша корзина ждёт находок</h3><p>Выберите продукты и фасовки в каталоге.</p><button class="button primary" data-return-catalog>Перейти в каталог ↗</button></div>';$('#cart-checkout').hidden=true;return;}
    let total=0,unknown=false;
    $('#cart-items').innerHTML=cart.map((r,i)=>{const p=products.find(p=>p.id===r.id),v=p.variants[r.variant];if(v.price===null)unknown=true;else total+=v.price*r.qty;return `<article class="cart-item"><div><h3>${esc(p.name)}</h3><p>${esc(v.label)}${p.category==='archive'?' · уточнить наличие и цену':''}${v.priceNote?' · цена требует подтверждения':''}</p><div class="quantity"><button data-qty="${i}" data-delta="-1" aria-label="Уменьшить количество: ${esc(p.name)}">−</button><span aria-label="Количество">${r.qty}</span><button data-qty="${i}" data-delta="1" aria-label="Увеличить количество: ${esc(p.name)}" ${r.qty>=99?'disabled':''}>+</button><button class="remove-item" data-remove="${i}" aria-label="Удалить: ${esc(p.name)}">Удалить</button></div></div><span class="cart-item-price">${v.price===null?'По запросу':money(v.price*r.qty)}</span></article>`;}).join('');
    $('#cart-checkout').hidden=false;$('#cart-total').textContent=money(total)+(unknown?' + по запросу':'');updateOrder();
  }
  function showDetails(id){
    const p=products.find(p=>p.id===id);if(!p)return;
    const photo=p.image?`<figure class="product-gallery"><img src="${esc(p.image)}" alt="${esc(p.imageAlt||p.name)}"><figcaption>${esc(p.imageNote||'Изображение из канала лавки.')} ${p.imageSource?`<a href="${esc(p.imageSource)}" target="_blank" rel="noopener noreferrer">Источник ↗</a>`:''}</figcaption></figure>`:'';
    const gallery=(p.imageGallery||[]).length?`<div class="product-extra-images">${p.imageGallery.map(image=>`<a href="${esc(image.image)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть дополнительное фото: ${esc(p.name)}"><img src="${esc(image.image)}" alt="${esc(image.alt||p.name)}" loading="lazy"></a>`).join('')}</div>`:'';
    const declaration=p.declaration?`<p class="small"><a class="text-link" href="${esc(p.declaration.href)}" target="_blank" rel="noopener noreferrer">${esc(p.declaration.title)} · PDF ↗</a></p>`:'';
    const priceSource=p.priceSource?`<p class="small"><a class="text-link" href="${esc(p.priceSource)}" target="_blank" rel="noopener noreferrer">Прайс от 21 октября ↗</a>${p.alternativePriceSource?` · <a href="${esc(p.alternativePriceSource)}" target="_blank" rel="noopener noreferrer">Пост с другой ценой</a>`:''}</p>`:'';
    $('#product-detail').innerHTML=`<p class="eyebrow">${esc(p.label)}</p><h2 id="product-title">${esc(p.name)}</h2>${photo}${gallery}<p>${esc(p.details)}</p><ul>${p.variants.map(v=>`<li>${esc(v.label)} — ${v.price===null?'цена по запросу':money(v.price)}${v.priceNote?`<span class="price-discrepancy">${esc(v.priceNote)}</span>`:''}</li>`).join('')}</ul>${p.sourceNote?`<p class="small">${esc(p.sourceNote)}</p>`:''}${priceSource}${declaration}<p class="small">Точный состав, назначение, маркировку, наличие и ограничения конкретного товара уточните у продавца до покупки.</p><a class="button primary" href="https://t.me/MuxomorURAL?text=${encodeURIComponent('Здравствуйте! Подскажите подробнее о товаре: '+p.name)}" target="_blank" rel="noopener noreferrer">Уточнить у продавца ↗</a>`;
    productDialog.showModal();
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el)return;
    if(el.hasAttribute('data-category')){category=el.dataset.category;renderFilters();renderCatalog();}
    if(el.hasAttribute('data-add')){const id=el.dataset.add;add(id,Number(document.querySelector(`[data-variant="${id}"]`).value));}
    if(el.hasAttribute('data-details'))showDetails(el.dataset.details);
    if(el.hasAttribute('data-open-cart')){renderCart();cartDialog.showModal();}
    if(el.hasAttribute('data-close-cart'))cartDialog.close();
    if(el.hasAttribute('data-close-product'))productDialog.close();
    if(el.hasAttribute('data-return-catalog')){cartDialog.close();$('#catalog').scrollIntoView();}
    if(el.hasAttribute('data-qty')){const i=Number(el.dataset.qty);if(!cart[i])return;cart[i].qty+=Number(el.dataset.delta);cart=cart.filter(r=>r.qty>0);saveCart();renderCart();}
    if(el.hasAttribute('data-remove')){cart.splice(Number(el.dataset.remove),1);saveCart();renderCart();}
  });
  $('#products').addEventListener('change',e=>{
    if(!e.target.matches('[data-variant]'))return;
    const p=products.find(p=>p.id===e.target.dataset.variant),v=p.variants[Number(e.target.value)];
    document.querySelector(`[data-price="${p.id}"]`).innerHTML=priceMarkup(p,v);
    const selectedImage=p.variantImages?.[e.target.value],image=e.target.closest('.product-card').querySelector('.product-art img');
    if(selectedImage&&image){image.src=selectedImage.image;image.alt=selectedImage.alt||p.imageAlt||p.name;}
  });
  $('#search').addEventListener('input',renderCatalog);
  $('#reset-search').addEventListener('click',()=>{$('#search').value='';category='all';renderFilters();renderCatalog();});
  $('#order-city').addEventListener('input',updateOrder);$('#order-comment').addEventListener('input',updateOrder);
  $('#copy-order').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(orderText());notify('Заказ скопирован. Отправьте его продавцу в Telegram.');}catch{$('.order-fallback').open=true;$('#order-text').focus();$('#order-text').select();notify('Выделили заказ. Скопируйте текст вручную.');}});
  [cartDialog,productDialog].forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  const menu=$('.menu-toggle');function closeMenu(){document.body.classList.remove('menu-open');$('#mobile-menu').hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');}
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';if(open){$('#mobile-menu').hidden=false;document.body.classList.add('menu-open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Закрыть меню');}else closeMenu();});
  $('#mobile-menu').addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();if(e.key==='Tab'&&document.body.classList.contains('menu-open')){const links=[menu,...$('#mobile-menu').querySelectorAll('a')];const i=links.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();links.at(-1).focus();}else if(!e.shiftKey&&i===links.length-1){e.preventDefault();menu.focus();}}});
  window.addEventListener('resize',()=>{if(innerWidth>760)closeMenu();});
  function setupReveal(){if(!('IntersectionObserver'in window)||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('.section-head,.about-grid,.steps,.faq,.contact-grid').forEach(el=>{el.classList.add('reveal-ready');io.observe(el);});const tagline=$('.tagline');for(const node of [...tagline.childNodes]){if(node.nodeType===Node.TEXT_NODE){const frag=document.createDocumentFragment();node.textContent.split(/(\s+)/).forEach(w=>{if(w.trim()){const s=document.createElement('span');s.className='word';s.textContent=w;frag.append(s);}else frag.append(document.createTextNode(w));});node.replaceWith(frag);}}const wi=new IntersectionObserver(entries=>entries.filter(e=>e.isIntersecting).forEach((e,i)=>{e.target.style.transitionDelay=`${Math.min(i*60,400)}ms`;e.target.classList.add('active');wi.unobserve(e.target);}),{rootMargin:'0px 0px -12% 0px'});tagline.querySelectorAll('.word').forEach(w=>wi.observe(w));}
  async function init(){renderFilters();try{const res=await fetch('/catalog.json');if(!res.ok)throw new Error();products=await res.json();if(!Array.isArray(products))throw new Error();try{const saved=JSON.parse(localStorage.getItem('grib-cart-v1')||'[]');cart=Array.isArray(saved)?saved.filter(validRow).slice(0,30):[];}catch{cart=[];}updateCount();renderCatalog();}catch{$('#products').setAttribute('aria-busy','false');$('#products').innerHTML='<div class="empty"><h3>Каталог не загрузился</h3><p>Обновите страницу или напишите продавцу напрямую.</p><a class="button primary" href="https://t.me/MuxomorURAL">Написать в Telegram ↗</a></div>';$('#result-count').textContent='Нет соединения с каталогом';}setupReveal();}
  init();
})();
