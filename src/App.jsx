import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = 'https://customer.api.delever.uz'
const API_HEADERS = {
  platform: '3429e492-5faa-4e17-a19e-b32a4d01b267',
  shipper: 'a93a4f86-b38b-404c-b1d2-7dda06aa6755',
}
const MENU_ID = '6cc4d49e-fd96-45d6-b952-ea85b960d031'
const PRODUCT_FIELDS = 'image,description,barcode,product_type,ikpu,package_code,tags,type,slug,has_modifier,weight,measurement,categories'
const PAGE_SIZE = 100

async function fetchApiJson(url, signal) {
  const response = await fetch(url, { headers: API_HEADERS, signal })
  if (!response.ok) {
    throw new Error(`API request failed (${response.status} ${response.statusText})`)
  }
  return response.json()
}

function getLocalized(value, language) {
  if (typeof value === 'string') return value
  return value?.[language] || value?.uz || value?.ru || value?.en || ''
}

function getProductImage(image) {
  if (!image) return ''
  return image.startsWith('http') ? image : `https://cdn.delever.uz/delever/${image}`
}

async function fetchCategoryProducts(categoryId, signal) {
  const params = new URLSearchParams({
    page: '1',
    limit: String(PAGE_SIZE),
    fields: PRODUCT_FIELDS,
    product_types: 'origin,simple,combo',
    category_id: categoryId,
    menu_id: MENU_ID,
    delivery_type: 'delivery',
  })
  const firstPage = await fetchApiJson(`${API_BASE_URL}/v2/product?${params}`, signal)
  if (!Array.isArray(firstPage.products)) {
    throw new Error('The product API returned an invalid products list')
  }

  const totalProducts = Number(firstPage.count)
  if (!Number.isInteger(totalProducts) || totalProducts < 0) {
    throw new Error('The product API returned an invalid product count')
  }

  const pageCount = Math.ceil(totalProducts / PAGE_SIZE)
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, async (_, index) => {
      const pageParams = new URLSearchParams(params)
      pageParams.set('page', String(index + 2))
      const result = await fetchApiJson(`${API_BASE_URL}/v2/product?${pageParams}`, signal)
      if (!Array.isArray(result.products)) {
        throw new Error('The product API returned an invalid products list')
      }
      return result.products
    }),
  )

  return [...firstPage.products, ...remainingPages.flat()].map((product) => {
    const price = Number(product.out_price)
    if (!product.id || !product.title || !Number.isFinite(price) || price < 0) {
      throw new Error('The product API returned a product with invalid required fields')
    }
    return {
      ...product,
      price,
      image: getProductImage(product.image),
    }
  })
}

async function fetchMenu(signal) {
  const response = await fetchApiJson(`${API_BASE_URL}/v2/mika/main-page/category`, signal)
  if (!Array.isArray(response.categories)) {
    throw new Error('The category API returned an invalid categories list')
  }

  const categories = response.categories.filter((category) => category.active)
  if (categories.length === 0) {
    throw new Error('The category API returned no active menu categories')
  }
  return Promise.all(categories.map(async (category) => ({
    ...category,
    products: await fetchCategoryProducts(category.id, signal),
  })))
}

const translations = {
  uz: {
    language: 'O‘zbekcha', address: 'Yetkazib berish manzili', enterAddress: 'Manzilni kiriting', menu: 'Menyu', offers: 'Aksiyalar', delivery: 'Yetkazib berish', about: 'Biz haqimizda', deliveryTime: 'Yetkazish vaqti manzilga bog‘liq', heroImage: 'Lososli sushi va rollardan dasturxon',
    announcement: 'Menyu va narxlar Yaponamama katalogidan olinmoqda.', menuLink: 'Menyuni ko‘rish', eyebrow: 'Mazali lahzalar shu yerdan boshlanadi', heroLead: <>Yaxshi kayfiyatga<br />bir <em>roll</em> qoldi.</>, heroDescription: 'Yaponamama menyusidagi taomlarni ko‘ring, tilni tanlang va narxlarni bevosita katalogdan tekshiring.', averageTime: 'Yetkazish vaqti manzilga bog‘liq', freshIngredients: 'Sushi va rollar', madeWithCare: 'Yaponamama menyusidan', preparedFresh: 'Jonli narxlar', eachOrder: 'Katalogdan yangilanadi',
    recommendation: 'Bugungi tavsiya', freshTaste: <>Mazali<br />tanlov!</>, alwaysFresh: 'Menyu bo‘limlari', preparedToOrder: 'Taomlarni oson toping', fastDelivery: 'Qulay tanlov', atYourDoor: 'Kategoriyalar bo‘yicha menyu', withCare: 'Savatni boshqaring', qualityIngredients: 'Miqdor va jami narxni ko‘ring', freeDelivery: 'Tilni tanlang', fromThreshold: 'O‘zbekcha yoki ruscha',
    menuKicker: 'Rasmiy menyu', menuTitle: 'Bugun nima tanlaymiz?', searchPlaceholder: 'Taomni qidiring', searchLabel: 'Menyudan taom qidirish', sampleMenu: 'Menyu, mahsulot nomlari va narxlari Yaponamama katalogidan yuklanadi.', officialMenu: 'Yaponamama rasmiy sayti', loadingMenu: 'Yaponamama menyusi yuklanmoqda…', menuLoadFailed: 'Menyuni yuklab bo‘lmadi.', retry: 'Qayta urinish', unavailable: 'Hozir mavjud emas', chooseOnSite: 'Rasmiy saytda tanlash', noItems: 'Bu bo‘limda hozircha mahsulot yo‘q.', notFound: 'Hech narsa topilmadi', tryDifferentSearch: 'Boshqa nom bilan qidirib ko‘ring.',
    goodNews: 'Rasmiy ma’lumotlar', offerTitle: <>Yaponamama menyusini<br />rasmiy saytdan ko‘ring.</>, offerDescription: 'Mahsulotlar, narxlar va nomlar jonli katalogdan olinadi.', orderNow: 'Rasmiy saytga o‘tish', aboutKicker: 'Sushi Market haqida', aboutTitle: <>Har bir luqmada<br />e’tibor va sifat.</>, aboutDescription: 'Menyudagi mahsulotlar va narxlar Yaponamama’ning Delever katalogidan olinadi. Buyurtmani yakuniy rasmiylashtirish rasmiy saytda amalga oshiriladi.', footerTagline: 'Yaxshi sushi, yaxshi kayfiyat.', onlineOrder: 'Rasmiy Yaponamama sayti', selectFavorite: 'Menyu va buyurtmalar uchun', copyright: '© 2026 Sushi Market. Barcha huquqlar himoyalangan.',
    deliveryQuestion: 'Qayerga yetkazamiz?', enterDeliveryAddress: 'Buyurtmangizni olib borishimiz uchun manzilingizni kiriting.', saveAddress: 'Manzilni saqlash', cart: 'Savat', yourOrder: 'Buyurtmangiz', emptyCart: 'Savatingiz hozircha bo‘sh', chooseProduct: 'Menyudan o‘zingizga yoqqan taomni tanlang.', addForFree: 'Yetkazib berish narxi manzil va rasmiy shartlarga ko‘ra belgilanadi.', items: 'Mahsulotlar', deliveryCost: 'Yetkazib berish', free: 'Aniqlanadi', total: 'Jami', checkout: 'Rasmiy saytda buyurtma qilish', orderNotConnected: 'Bu savat Yaponamama rasmiy saytiga o‘tmaydi. Buyurtmani rasmiy saytda qaytadan tanlang.', paymentNote: 'To‘lov va yetkazib berish rasmiy saytda tasdiqlanadi.', closeCart: 'Savatni yopish', closeAddress: 'Manzil oynasini yopish', favorite: 'yoqtirganlarga qo‘shish', addToCart: 'savatga qo‘shish', quantity: 'miqdori', decrease: 'Kamaytirish', increase: 'Ko‘paytirish', cartAria: 'Savat, {count} ta mahsulot',
  },
  ru: {
    language: 'Русский', address: 'Адрес доставки', enterAddress: 'Укажите адрес', menu: 'Меню', offers: 'Акции', delivery: 'Доставка', about: 'О нас', deliveryTime: 'Время доставки зависит от адреса', heroImage: 'Суши и роллы с лососем',
    announcement: 'Меню и цены загружаются из каталога Yaponamama.', menuLink: 'Смотреть меню', eyebrow: 'Вкусные моменты начинаются здесь', heroLead: <>До хорошего настроения<br />остался один <em>ролл</em>.</>, heroDescription: 'Просматривайте меню Yaponamama, выбирайте язык и проверяйте цены в актуальном каталоге.', averageTime: 'Срок доставки зависит от адреса', freshIngredients: 'Суши и роллы', madeWithCare: 'Из меню Yaponamama', preparedFresh: 'Актуальные цены', eachOrder: 'Обновляются из каталога',
    recommendation: 'Советуем сегодня', freshTaste: <>Вкусный<br />выбор!</>, alwaysFresh: 'Разделы меню', preparedToOrder: 'Легко найти блюдо', fastDelivery: 'Удобный выбор', atYourDoor: 'Меню по категориям', withCare: 'Управление корзиной', qualityIngredients: 'Количество и сумма заказа', freeDelivery: 'Выбор языка', fromThreshold: 'Узбекский или русский',
    menuKicker: 'Официальное меню', menuTitle: 'Что выберем сегодня?', searchPlaceholder: 'Найти блюдо', searchLabel: 'Поиск по меню', sampleMenu: 'Меню, названия и цены загружаются из каталога Yaponamama.', officialMenu: 'Официальный сайт Yaponamama', loadingMenu: 'Загружаем меню Yaponamama…', menuLoadFailed: 'Не удалось загрузить меню.', retry: 'Повторить', unavailable: 'Сейчас недоступно', chooseOnSite: 'Выбрать на сайте', noItems: 'В этом разделе пока нет товаров.', notFound: 'Ничего не найдено', tryDifferentSearch: 'Попробуйте изменить поисковый запрос.',
    goodNews: 'Официальная информация', offerTitle: <>Меню Yaponamama<br />на официальном сайте.</>, offerDescription: 'Товары, цены и названия загружаются из каталога.', orderNow: 'Перейти на сайт', aboutKicker: 'О Sushi Market', aboutTitle: <>В каждом кусочке —<br />внимание и качество.</>, aboutDescription: 'Блюда и цены загружаются из каталога Delever Yaponamama. Оформить заказ можно на официальном сайте.', footerTagline: 'Вкусные суши — хорошее настроение.', onlineOrder: 'Официальный сайт Yaponamama', selectFavorite: 'Меню и заказ', copyright: '© 2026 Sushi Market. Все права защищены.',
    deliveryQuestion: 'Куда доставить?', enterDeliveryAddress: 'Укажите адрес, чтобы мы привезли ваш заказ.', saveAddress: 'Сохранить адрес', cart: 'Корзина', yourOrder: 'Ваш заказ', emptyCart: 'Корзина пока пуста', chooseProduct: 'Выберите блюдо из меню.', addForFree: 'Стоимость доставки зависит от адреса и официальных условий.', items: 'Товары', deliveryCost: 'Доставка', free: 'Уточняется', total: 'Итого', checkout: 'Оформить на официальном сайте', orderNotConnected: 'Корзина не переносится на официальный сайт Yaponamama. Для заказа выберите товары на официальном сайте.', paymentNote: 'Оплата и доставка подтверждаются на официальном сайте.', closeCart: 'Закрыть корзину', closeAddress: 'Закрыть окно адреса', favorite: 'добавить в избранное', addToCart: 'добавить в корзину', quantity: 'количество', decrease: 'Уменьшить', increase: 'Увеличить', cartAria: 'Корзина, товаров: {count}',
  },
  en: {
    language: 'English', address: 'Delivery address', enterAddress: 'Enter your address', menu: 'Menu', offers: 'Offers', delivery: 'Delivery', about: 'About us', deliveryTime: 'Delivery time depends on your location', heroImage: 'Salmon sushi and rolls',
    announcement: 'Menu and prices are loaded from the Yaponamama catalog.', menuLink: 'View menu', eyebrow: 'Delicious moments start here', heroLead: <>One roll<br />away from a <em>good mood</em>.</>, heroDescription: 'Explore Yaponamama dishes, choose your language, and see prices from the live catalog.', averageTime: 'Delivery time depends on your location', freshIngredients: 'Sushi and rolls', madeWithCare: 'From Yaponamama menu', preparedFresh: 'Live prices', eachOrder: 'Updated from the catalog',
    recommendation: 'Featured today', freshTaste: <>A tasty<br />choice!</>, alwaysFresh: 'Menu sections', preparedToOrder: 'Find dishes easily', fastDelivery: 'Easy browsing', atYourDoor: 'Explore dishes by category', withCare: 'Manage your basket', qualityIngredients: 'See quantities and totals', freeDelivery: 'Choose your language', fromThreshold: 'Uzbek, Russian, or English',
    menuKicker: 'Official menu', menuTitle: 'What shall we choose today?', searchPlaceholder: 'Search dishes', searchLabel: 'Search the menu', sampleMenu: 'Menu items, names, and prices are loaded from the Yaponamama catalog.', officialMenu: 'Official Yaponamama website', loadingMenu: 'Loading the Yaponamama menu…', menuLoadFailed: 'Could not load the menu.', retry: 'Try again', unavailable: 'Currently unavailable', chooseOnSite: 'Choose on official site', noItems: 'There are no items in this section yet.', notFound: 'No results found', tryDifferentSearch: 'Try a different search.',
    goodNews: 'Official information', offerTitle: <>Browse the Yaponamama<br />menu on its official website.</>, offerDescription: 'Live products, prices, and names are loaded from the catalog.', orderNow: 'Visit official website', aboutKicker: 'About Sushi Market', aboutTitle: <>Quality and care<br />in every bite.</>, aboutDescription: 'Menu items and prices are loaded from Yaponamama’s Delever catalog. Complete your order on the official website.', footerTagline: 'Great sushi, great mood.', onlineOrder: 'Official Yaponamama website', selectFavorite: 'Browse the menu and order', copyright: '© 2026 Sushi Market. All rights reserved.',
    deliveryQuestion: 'Where should we deliver?', enterDeliveryAddress: 'Enter your address so we know where to deliver your order.', saveAddress: 'Save address', cart: 'Basket', yourOrder: 'Your order', emptyCart: 'Your basket is empty for now', chooseProduct: 'Choose something you like from the menu.', addForFree: 'Delivery cost depends on your address and the official terms.', items: 'Items', deliveryCost: 'Delivery', free: 'To be confirmed', total: 'Total', checkout: 'Order on the official website', orderNotConnected: 'Your basket is not transferred to Yaponamama’s official website. Select the items again on the official site to place your order.', paymentNote: 'Payment and delivery are confirmed on the official website.', closeCart: 'Close basket', closeAddress: 'Close address dialog', favorite: 'add to favorites', addToCart: 'add to basket', quantity: 'quantity', decrease: 'Decrease', increase: 'Increase', cartAria: 'Basket, {count} items',
  },
}

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'bag') return <svg {...common}><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
  if (name === 'search') return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>
  if (name === 'pin') return <svg {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'minus') return <svg {...common}><path d="M5 12h14" /></svg>
  if (name === 'close') return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>
  if (name === 'clock') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  if (name === 'globe') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
  if (name === 'chevron') return <svg {...common}><path d="m7 10 5 5 5-5" /></svg>
  return null
}

function formatPrice(price, language) {
  const locale = language === 'ru' ? 'ru-UZ' : language === 'en' ? 'en-UZ' : 'uz-UZ'
  const formatted = new Intl.NumberFormat(locale).format(price)
  return `${formatted} ${language === 'ru' ? 'сум' : language === 'en' ? 'UZS' : 'so‘m'}`
}

function App() {
  const [language, setLanguage] = useState('uz')
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [catalog, setCatalog] = useState([])
  const [catalogStatus, setCatalogStatus] = useState('loading')
  const [catalogError, setCatalogError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [addressDraft, setAddressDraft] = useState('')
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const t = translations[language]
  const officialSiteUrl = language === 'uz' ? 'https://yaponamama.uz/uz' : 'https://yaponamama.uz/'

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'ru'
      ? 'Sushi Market — свежие суши и роллы'
      : language === 'en'
        ? 'Sushi Market — fresh sushi and rolls'
        : 'Sushi Market — yangi sushi va rollar'
  }, [language])

  useEffect(() => {
    const controller = new AbortController()
    async function loadCatalog() {
      try {
        const nextCatalog = await fetchMenu(controller.signal)
        setCatalog(nextCatalog)
        setActiveCategoryId((currentId) => nextCatalog.some((category) => category.id === currentId)
          ? currentId
          : nextCatalog[0]?.id || '')
        setCatalogError('')
        setCatalogStatus('success')
      } catch (error) {
        if (controller.signal.aborted) return
        setCatalogError(error instanceof Error ? error.message : 'Unknown catalog error')
        setCatalogStatus('error')
      }
    }

    loadCatalog()
    return () => controller.abort()
  }, [retryCount])

  const activeCategory = catalog.find((category) => category.id === activeCategoryId)
    || catalog[0]
  const featuredProduct = catalog
    .flatMap((category) => category.products)
    .find((product) => product.active && product.active_in_menu)
    || catalog[0]?.products[0]

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(language)
    return (activeCategory?.products || []).filter((product) => {
      const searchableText = `${getLocalized(product.title, language)} ${getLocalized(product.description, language)}`.toLocaleLowerCase(language)
      return !query || searchableText.includes(query)
    })
  }, [activeCategory, language, search])

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const deliveryPrice = 0

  function changeQuantity(product, difference) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id)
      if (!existing && difference > 0) return [...currentCart, { ...product, quantity: 1 }]
      return currentCart
        .map((item) => item.id === product.id ? { ...item, quantity: item.quantity + difference } : item)
        .filter((item) => item.quantity > 0)
    })
  }

  return (
    <div className="site-shell">
      <div className="announcement">
        <span>🍣</span><p>{t.announcement}</p>
        <a href="#menu">{t.menuLink} <Icon name="arrow" size={15} /></a>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Sushi Market">
          <span className="brand-mark">S<span>M</span></span><span className="brand-name">sushi<span>market</span></span>
        </a>
        <button className="location-button" type="button" onClick={() => { setAddressDraft(deliveryAddress); setAddressModalOpen(true) }}>
          <span className="icon-wrap"><Icon name="pin" /></span>
          <span><small>{t.address}</small><strong>{deliveryAddress || t.enterAddress}</strong></span>
        </button>
        <div className="header-right">
          <div className="language-picker">
            <button className="language-trigger" type="button" aria-haspopup="listbox" aria-expanded={languageMenuOpen} onClick={() => setLanguageMenuOpen((open) => !open)}>
              <Icon name="globe" size={17} /><span>{language.toUpperCase()}</span><Icon name="chevron" size={15} />
            </button>
            {languageMenuOpen && (
              <div className="language-options" role="listbox" aria-label={t.language}>
                {['uz', 'ru', 'en'].map((option) => (
                  <button key={option} type="button" role="option" aria-selected={language === option} className={language === option ? 'language-option active' : 'language-option'} onClick={() => { setLanguage(option); setLanguageMenuOpen(false) }}>
                    <span>{option.toUpperCase()}</span>{translations[option].language}{language === option && <b>✓</b>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="cart-button" type="button" onClick={() => setCartOpen(true)} aria-label={t.cartAria.replace('{count}', String(cartCount))}>
            <Icon name="bag" size={21} /><span className="cart-label">{t.cart}</span>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        </div>
      </header>

      <nav className="main-nav" aria-label={t.menu}>
        <a className="nav-active" href="#menu">{t.menu}</a><a href="#offers">{t.offers}</a><a href="#delivery">{t.delivery}</a><a href="#about">{t.about}</a>
        <span className="nav-note"><Icon name="clock" size={16} /> {t.deliveryTime}</span>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> {t.eyebrow}</span>
            <h1>{t.heroLead}</h1>
            <p>{t.heroDescription}</p>
            <div className="hero-actions"><a className="button button-primary" href="#menu">{t.menuLink} <Icon name="arrow" size={18} /></a><span className="hero-delivery"><Icon name="clock" size={17} /> {t.averageTime}</span></div>
            <div className="hero-social-proof">
              <span className="proof-mark">✦</span>
              <span><strong>{t.freshIngredients}</strong><small>{t.madeWithCare}</small></span><span className="proof-divider" />
              <span><strong>{t.preparedFresh}</strong><small>{t.eachOrder}</small></span>
            </div>
          </div>
          <div className="hero-art" role="img" aria-label={t.heroImage}>
            <div className="hero-image" style={featuredProduct?.image ? { backgroundImage: `url("${featuredProduct.image}")` } : undefined} /><div className="hero-image-shadow" />
            <div className="hero-sticker"><span>✦</span><strong>{t.freshTaste}</strong></div>
            {featuredProduct && <div className="hero-price"><span>{t.recommendation}</span><strong>{getLocalized(featuredProduct.title, language)}</strong><small>{formatPrice(featuredProduct.price, language)}</small></div>}
          </div>
        </section>

        <section className="benefit-row" id="delivery" aria-label={t.delivery}>
          <div className="benefit"><span className="benefit-icon">♨</span><span><strong>{t.alwaysFresh}</strong><small>{t.preparedToOrder}</small></span></div>
          <div className="benefit"><span className="benefit-icon">⌁</span><span><strong>{t.fastDelivery}</strong><small>{t.atYourDoor}</small></span></div>
          <div className="benefit"><span className="benefit-icon">♡</span><span><strong>{t.withCare}</strong><small>{t.qualityIngredients}</small></span></div>
          <div className="benefit benefit-free"><span className="benefit-icon">✦</span><span><strong>{t.freeDelivery}</strong><small>{t.fromThreshold}</small></span></div>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div><span className="section-kicker">{t.menuKicker}</span><h2>{t.menuTitle}</h2></div>
            <label className="search-box"><Icon name="search" size={19} /><input type="search" placeholder={t.searchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} aria-label={t.searchLabel} /><kbd>⌕</kbd></label>
          </div>
          <div className="sample-menu-notice"><span>ⓘ</span><p>{t.sampleMenu}</p><a href={officialSiteUrl} target="_blank" rel="noreferrer">{t.officialMenu}<Icon name="arrow" size={15} /></a></div>
          {catalogStatus === 'success' && <div className="category-list" role="tablist" aria-label={t.menu}>
            {catalog.map((category) => (
              <button key={category.id} className={`category-chip ${activeCategory?.id === category.id ? 'selected' : ''}`} type="button" role="tab" aria-selected={activeCategory?.id === category.id} onClick={() => setActiveCategoryId(category.id)}>
                <span>◉</span>{getLocalized(category.title, language)}
              </button>
            ))}
          </div>}
          {catalogStatus === 'loading' ? (
            <div className="catalog-state" role="status">{t.loadingMenu}</div>
          ) : catalogStatus === 'error' ? (
            <div className="catalog-state catalog-error" role="alert">
              <strong>{t.menuLoadFailed}</strong><p>{catalogError}</p>
              <button className="button button-primary" type="button" onClick={() => { setCatalogStatus('loading'); setRetryCount((count) => count + 1) }}>{t.retry}</button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product) => {
                const itemInCart = cart.find((item) => item.id === product.id)
                const productName = getLocalized(product.title, language)
                const productDescription = getLocalized(product.description, language)
                const weight = Number(product.weight)
                const weightLocale = language === 'ru' ? 'ru-UZ' : language === 'en' ? 'en-UZ' : 'uz-UZ'
                const weightLabel = weight > 0
                  ? `${new Intl.NumberFormat(weightLocale).format(weight)} ${language === 'ru' ? 'г' : 'g'}`
                  : product.measurement
                const isAvailable = product.active && product.active_in_menu
                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image-wrap"><img src={product.image} alt={productName} loading="lazy" onError={(event) => { event.currentTarget.parentElement.classList.add('image-unavailable'); event.currentTarget.style.display = 'none' }} />
                      {!isAvailable && <span className="product-badge">{t.unavailable}</span>}
                      <span className="favorite-button" aria-hidden="true">♡</span>
                    </div>
                    <div className="product-info">
                      <div className="product-meta"><span>{getLocalized(activeCategory?.title, language)}</span><span>{weightLabel}</span></div>
                      <h3>{productName}</h3><p>{productDescription}</p>
                      <div className="product-bottom"><strong className="product-price">{formatPrice(product.price, language)}</strong>
                        {!isAvailable ? (
                          <span className="availability-label">{t.unavailable}</span>
                        ) : itemInCart ? (
                          <div className="quantity-control" aria-label={`${productName} ${t.quantity}`}>
                            <button type="button" onClick={() => changeQuantity(product, -1)} aria-label={t.decrease}><Icon name="minus" size={17} /></button><span>{itemInCart.quantity}</span><button type="button" onClick={() => changeQuantity(product, 1)} aria-label={t.increase}><Icon name="plus" size={17} /></button>
                          </div>
                        ) : product.has_modifier && product.slug ? (
                          <a className="modifier-link" href={`${officialSiteUrl}/product/${product.slug}`} target="_blank" rel="noreferrer">{t.chooseOnSite}</a>
                        ) : <button className="add-button" type="button" onClick={() => changeQuantity(product, 1)} aria-label={`${productName}: ${t.addToCart}`}><Icon name="plus" size={19} /></button>}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : <div className="empty-search"><span>⌕</span><strong>{search ? t.notFound : t.noItems}</strong>{search && <p>{t.tryDifferentSearch}</p>}</div>}
        </section>

        <section className="offer-banner" id="offers">
          <div className="offer-sparkle">✦</div>
          <div><span className="section-kicker">{t.goodNews}</span><h2>{t.offerTitle}</h2><p>{t.offerDescription}</p></div>
          <a className="button button-light" href={officialSiteUrl} target="_blank" rel="noreferrer">{t.orderNow} <Icon name="arrow" size={18} /></a>
          <div className="offer-circle offer-circle-one" /><div className="offer-circle offer-circle-two" />
        </section>

        <section className="about-strip" id="about">
          <div><span className="section-kicker">{t.aboutKicker}</span><h2>{t.aboutTitle}</h2></div>
          <p>{t.aboutDescription}</p>
          <a href="#menu" aria-label={t.menuLink}><Icon name="arrow" size={21} /></a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top"><span className="brand-mark">S<span>M</span></span><span className="brand-name">sushi<span>market</span></span></a>
        <p>{t.footerTagline}</p><div><a href={officialSiteUrl} target="_blank" rel="noreferrer">{t.onlineOrder}</a><span>{t.selectFavorite}</span></div>
        <small>{t.copyright}</small>
      </footer>

      {addressModalOpen && (
        <div className="address-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddressModalOpen(false) }}>
          <form className="address-modal" role="dialog" aria-modal="true" aria-labelledby="address-title" onSubmit={(event) => { event.preventDefault(); setDeliveryAddress(addressDraft.trim()); setAddressModalOpen(false) }}>
            <button className="close-button address-close" type="button" onClick={() => setAddressModalOpen(false)} aria-label={t.closeAddress}><Icon name="close" /></button>
            <span className="icon-wrap"><Icon name="pin" /></span>
            <h2 id="address-title">{t.deliveryQuestion}</h2>
            <p>{t.enterDeliveryAddress}</p>
            <label htmlFor="address-draft">{t.address}</label>
            <input id="address-draft" autoFocus value={addressDraft} onChange={(event) => setAddressDraft(event.target.value)} placeholder={t.addressPlaceholder} required />
            <button className="button button-primary" type="submit">{t.saveAddress} <Icon name="arrow" size={18} /></button>
          </form>
        </div>
      )}

      {cartOpen && (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}>
          <aside className="cart-drawer" aria-label={t.cart} aria-modal="true" role="dialog">
            <div className="drawer-header"><div><span className="section-kicker">{t.yourOrder}</span><h2>{t.cart}{cartCount > 0 && <span className="drawer-count">{cartCount}</span>}</h2></div><button className="close-button" type="button" onClick={() => setCartOpen(false)} aria-label={t.closeCart}><Icon name="close" /></button></div>
            {cart.length === 0 ? (
              <div className="cart-empty"><span><Icon name="bag" size={30} /></span><h3>{t.emptyCart}</h3><p>{t.chooseProduct}</p><button className="button button-primary" type="button" onClick={() => { setCartOpen(false); document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' }) }}>{t.menuLink}</button></div>
            ) : (
              <>
                <div className="cart-items">{cart.map((item) => (
                  <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div className="cart-item-info"><strong>{getLocalized(item.title, language)}</strong><small>{Number(item.weight) > 0 ? `${item.weight} ${language === 'ru' ? 'г' : 'g'}` : item.measurement}</small><b>{formatPrice(item.price * item.quantity, language)}</b></div>
                    <div className="quantity-control"><button type="button" onClick={() => changeQuantity(item, -1)} aria-label={t.decrease}><Icon name="minus" size={16} /></button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item, 1)} aria-label={t.increase}><Icon name="plus" size={16} /></button></div>
                  </div>
                ))}</div>
                <div className="cart-summary">
                  <div className="delivery-hint"><span>ⓘ</span>{t.addForFree}</div>
                  <div className="summary-line"><span>{t.items}</span><strong>{formatPrice(cartTotal, language)}</strong></div>
                  <div className="summary-line"><span>{t.deliveryCost}</span><strong>{t.free}</strong></div>
                  <div className="summary-line summary-total"><span>{t.total}</span><strong>{formatPrice(cartTotal + deliveryPrice, language)}</strong></div>
                  <div className="checkout-form">
                    <a className="button button-primary checkout-button" href={officialSiteUrl} target="_blank" rel="noreferrer">{t.checkout} <Icon name="arrow" size={18} /></a>
                  </div>
                  <p className="demo-notice" role="note">{t.orderNotConnected}</p>
                  <p className="secure-note">{t.paymentNote}</p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
      <button className={`mobile-cart ${cartCount > 0 ? 'mobile-cart-visible' : ''}`} type="button" onClick={() => setCartOpen(true)}>
        <span><Icon name="bag" size={19} /> {t.cart} ({cartCount})</span><strong>{formatPrice(cartTotal + deliveryPrice, language)}</strong>
      </button>
    </div>
  )
}

export default App