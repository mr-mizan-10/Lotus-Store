// Lotus Store - working frontend
(function () {
  "use strict";

  const initialStaticProducts = [
    {id:1,numericId:1,name:"Premium Floral Shirt",price:2499,rating:5,category:"Shirts",image:"img/products/f1.jpg",description:"A premium floral shirt made with soft, breathable fabric. A clean modern fit for casual and smart-casual looks."},
    {id:2,numericId:2,name:"Tropical Printed Shirt",price:2199,rating:4,category:"Shirts",image:"img/products/f2.jpg",description:"A relaxed tropical printed shirt designed for comfortable everyday wear and summer styling."},
    {id:3,numericId:3,name:"Vintage Floral Shirt",price:2699,rating:5,category:"Shirts",image:"img/products/f3.jpg",description:"A vintage-inspired floral shirt with a stylish print and comfortable fit for weekend outfits."},
    {id:4,numericId:4,name:"Casual Summer Shirt",price:2399,rating:4,category:"Shirts",image:"img/products/f4.jpg",description:"A lightweight casual shirt made for warm days, easy layering and everyday comfort."},
    {id:5,numericId:5,name:"Classic Cotton Shirt",price:1899,rating:4,category:"Shirts",image:"img/products/f5.jpg",description:"A classic cotton shirt with a clean look, soft feel and versatile styling."},
    {id:6,numericId:6,name:"Modern Blue Shirt",price:2599,rating:5,category:"Shirts",image:"img/products/f6.jpg",description:"A modern blue shirt with a smart silhouette for casual and semi-formal outfits."},
    {id:7,numericId:7,name:"Luxury Printed Shirt",price:2899,rating:5,category:"Shirts",image:"img/products/f7.jpg",description:"A premium printed shirt with a bold design, comfortable fabric and polished finish."},
    {id:8,numericId:8,name:"Stylish Black Shirt",price:2799,rating:4,category:"Shirts",image:"img/products/f8.jpg",description:"A stylish black shirt with a minimal modern look that pairs easily with jeans or trousers."},
    {id:9,numericId:9,name:"Urban Print Shirt",price:2499,rating:5,category:"Shirts",image:"img/products/n1.jpg",description:"A contemporary printed shirt designed for relaxed streetwear and everyday styling."},
    {id:10,numericId:10,name:"Navy Casual Shirt",price:1999,rating:4,category:"Shirts",image:"img/products/n2.jpg",description:"A versatile navy shirt with a comfortable fit and timeless everyday appeal."},
    {id:11,numericId:11,name:"Premium Pattern Shirt",price:2999,rating:5,category:"Shirts",image:"img/products/n3.jpg",description:"A premium pattern shirt featuring a distinctive design and comfortable modern cut."},
    {id:12,numericId:12,name:"Classic White Pattern Shirt",price:2299,rating:4,category:"Shirts",image:"img/products/n4.jpg",description:"A clean classic shirt with a subtle pattern, ideal for smart-casual occasions."},
    {id:13,numericId:13,name:"Everyday Comfort Shirt",price:2099,rating:5,category:"Shirts",image:"img/products/n5.jpg",description:"A soft everyday shirt built for comfort, easy movement and effortless styling."},
    {id:14,numericId:14,name:"Minimal Casual Shirt",price:2399,rating:4,category:"Shirts",image:"img/products/n6.jpg",description:"A minimalist casual shirt with a refined look for everyday outfits."},
    {id:15,numericId:15,name:"Premium Street Shirt",price:3199,rating:5,category:"Shirts",image:"img/products/n7.jpg",description:"A premium streetwear-inspired shirt with a bold visual style and modern fit."},
    {id:16,numericId:16,name:"Signature Lotus Shirt",price:2799,rating:4,category:"Shirts",image:"img/products/n8.jpg",description:"A signature Lotus Store shirt combining contemporary design with comfortable everyday wear."},
    {id:17,numericId:17,name:"Men's Casual Ripped Denim Shorts",price:1200,rating:5,category:"Shorts",image:"img/products/n9.jpg",description:"Upgrade your casual summer style with these classic ripped denim shorts. Made from high-quality stretch denim, they offer maximum comfort and a modern street-style look."},
    {id:18,numericId:18,name:"Premium Black Slim-Fit Chino Pant",price:1999,rating:5,category:"Pants",image:"img/products/n10.jpg",description:"Classic black chino pants designed for everyday comfort and a clean, stylish look. The soft cotton-blend fabric is breathable and durable."},
    {id:19,numericId:19,name:"Men's Premium Maroon Embroidered Panjabi",price:2999,rating:5,category:"Panjabi",image:"img/products/n11.jpg",description:"Fabric: High-quality Premium Cotton / Cotton-Linen blend. Design: Intricate neckline and cuff embroidery with a modern band collar (Mandarin collar). Perfect for Eid & festivities."}
  ];

  let products = initialStaticProducts.map(p => ({ ...p }));

  const isSubpage = window.location.pathname.includes("/subpages/");
  const root = isSubpage ? "../" : "./";
  const API_ROOT =
    (typeof window !== 'undefined' && (window.API_BASE_URL || window.API_ROOT)) ||
    (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://lotus-store.onrender.com');
  const money = n => "৳" + Number(n || 0).toLocaleString("en-BD");
  const resolve = path => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('../') || path.startsWith('./')) return path;
    return root + path;
  };
  const productUrl = idOrProduct => {
    let targetId = '';
    if (idOrProduct && typeof idOrProduct === 'object') {
      targetId = idOrProduct.dbId || idOrProduct._id || idOrProduct.id || '';
    } else if (idOrProduct !== undefined && idOrProduct !== null && idOrProduct !== '') {
      const p = getProduct(idOrProduct);
      if (p) {
        targetId = p.dbId || p._id || p.id || idOrProduct;
      } else {
        targetId = idOrProduct;
      }
    }
    return root + "subpages/sproduct.html?id=" + encodeURIComponent(targetId);
  };
  const cartUrl = root + "subpages/cart.html";

  // Flexible and resilient product lookup supporting MongoDB ObjectId, numeric ID, image filename, or name
  function getProduct(query) {
    if (query === undefined || query === null || query === "") return products[0] || null;
    if (typeof query === 'object') {
      if (query._id || query.dbId || query.id) {
        const found = getProduct(query.dbId || query._id || query.id);
        return found || query;
      }
      return query;
    }

    const qStr = String(query).trim();
    const qLower = qStr.toLowerCase();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(qStr);

    // 1. Match MongoDB _id / dbId
    if (isObjectId) {
      const match = products.find(p =>
        (p._id && String(p._id).toLowerCase() === qLower) ||
        (p.dbId && String(p.dbId).toLowerCase() === qLower) ||
        (p.id && String(p.id).toLowerCase() === qLower)
      );
      if (match) return match;
    }

    // 2. Exact match on _id, dbId, or id
    let found = products.find(p =>
      (p._id && String(p._id).toLowerCase() === qLower) ||
      (p.dbId && String(p.dbId).toLowerCase() === qLower) ||
      (p.id && String(p.id).toLowerCase() === qLower)
    );
    if (found) return found;

    // 3. Match numeric ID (numericId or fallback numeric id)
    if (/^\d+$/.test(qStr)) {
      const qNum = parseInt(qStr, 10);
      found = products.find(p => p.numericId === qNum || p.id === qNum);
      if (found) return found;

      const staticMatch = initialStaticProducts.find(p => p.numericId === qNum || p.id === qNum);
      if (staticMatch) {
        found = products.find(p => p.image === staticMatch.image || p.name.toLowerCase() === staticMatch.name.toLowerCase());
        if (found) return found;
        return staticMatch;
      }
    }

    // 4. Match image key/path (e.g. "n11", "f1", "img/products/n11.jpg", "n11.jpg")
    found = products.find(p => {
      if (!p.image) return false;
      const imgLower = p.image.toLowerCase();
      const filename = imgLower.split("/").pop();
      const basename = filename.replace(/\.[^.]+$/, "");
      return imgLower === qLower || filename === qLower || basename === qLower;
    });
    if (found) return found;

    // 5. Match exact or partial name
    found = products.find(p => p.name && (p.name.toLowerCase() === qLower || p.name.toLowerCase().includes(qLower)));
    if (found) return found;

    return null;
  }

  // Load catalog from backend API if available, preserving stable product mapping
  async function loadCatalog(){
    try{
      const res = await fetch(API_ROOT + '/api/products');
      if(!res.ok) return;
      const data = await res.json();
      if(Array.isArray(data) && data.length){
        products = data.map((p, i) => {
          const fallback = initialStaticProducts.find(f => f.image === p.image || f.name.toLowerCase() === p.name.toLowerCase());
          const numId = fallback ? (fallback.numericId || fallback.id) : (i + 1);
          return {
            _id: String(p._id),
            dbId: String(p._id),
            id: String(p._id), // MongoDB Product._id is the primary identity
            numericId: numId,
            name: p.name,
            price: p.price,
            rating: p.rating || 5,
            image: p.image,
            category: p.category || (fallback ? fallback.category : 'General'),
            stock: p.stock !== undefined ? p.stock : 100,
            description: p.description || (fallback ? fallback.description : '')
          };
        });
        setupShopCards();
        setupProduct();
        setupRelated();
        if (document.querySelector("#cart tbody")) setupCart();
        if (document.getElementById("checkout-items-list")) setupCheckout();
      }
    } catch(e){ /* offline / no backend: keep fallback catalog */ }
  }

  function getAppliedCoupon() {
    try {
      const raw = localStorage.getItem("lotusCoupon");
      if (!raw) return null;
      if (raw === "LOTUS10") {
        return { code: "LOTUS10", discountType: "percentage", discountValue: 10, title: "Lotus 10% Discount" };
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed && parsed.code) {
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function calculateCouponDiscount(subtotal) {
    const coupon = getAppliedCoupon();
    if (!coupon || !subtotal || subtotal <= 0) return 0;
    if (coupon.discountType === 'fixed') {
      return Math.min(subtotal, Number(coupon.discountValue) || 0);
    }
    const pct = Number(coupon.discountValue) || 0;
    return Math.round((subtotal * pct) / 100);
  }

  let activeOffersCache = [];
  let offerRotateTimer = null;
  let currentOfferIndex = 0;

  async function loadActiveOffers() {
    const banner = document.getElementById("banner");
    if (!banner) return;

    const bannerTitle = document.getElementById("offer-banner-title");
    const bannerDiscount = document.getElementById("offer-banner-discount");
    const bannerDesc = document.getElementById("offer-banner-desc");
    const couponWrap = document.getElementById("offer-banner-coupon-wrap");
    const couponCodeEl = document.getElementById("offer-banner-coupon-code");
    const subtitleEl = document.getElementById("offer-banner-subtitle");

    function renderOffer(offer) {
      if (!offer) return;

      const discountLabel = offer.discountType === 'percentage'
        ? `${offer.discountValue}% OFF`
        : `৳${Number(offer.discountValue).toLocaleString('en-BD')} OFF`;

      if (bannerTitle) bannerTitle.textContent = offer.title;
      if (bannerDiscount) bannerDiscount.textContent = discountLabel;
      if (bannerDesc) bannerDesc.textContent = offer.description || 'Special limited time promotion at Lotus Store.';
      if (subtitleEl) subtitleEl.textContent = 'Featured Promotion';

      if (offer.bannerImage) {
        const bgUrl = offer.bannerImage.startsWith('http') ? offer.bannerImage : resolve(offer.bannerImage);
        banner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${bgUrl}')`;
      }

      if (couponWrap && couponCodeEl) {
        if (offer.couponCode) {
          couponCodeEl.textContent = offer.couponCode;
          couponWrap.style.display = 'inline-flex';
          couponWrap.onclick = (e) => {
            e.preventDefault();
            try {
              navigator.clipboard.writeText(offer.couponCode);
              notice(`Coupon "${offer.couponCode}" copied to clipboard!`);
            } catch (err) {
              notice(`Coupon code: ${offer.couponCode}`);
            }
          };
        } else {
          couponWrap.style.display = 'none';
        }
      }
    }

    try {
      const res = await fetch(API_ROOT + '/api/offers');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        activeOffersCache = data;
        currentOfferIndex = 0;
        renderOffer(activeOffersCache[0]);

        if (activeOffersCache.length > 1) {
          if (offerRotateTimer) clearInterval(offerRotateTimer);
          offerRotateTimer = setInterval(() => {
            currentOfferIndex = (currentOfferIndex + 1) % activeOffersCache.length;
            renderOffer(activeOffersCache[currentOfferIndex]);
          }, 7000);
        }
      }
    } catch (e) {
      /* offline fallback */
    }
  }

  function stars(r){ return '<i class="fa-solid fa-star"></i>'.repeat(Math.max(1, Math.min(5, Number(r) || 5))); }

  function getCart(){
    try { return JSON.parse(localStorage.getItem("lotusCart")) || []; }
    catch(e){ return []; }
  }
  function saveCart(cart){ localStorage.setItem("lotusCart", JSON.stringify(cart)); }

  function notice(msg){
    let n=document.getElementById("lotus-notice");
    if(!n){
      n=document.createElement("div"); n.id="lotus-notice";
      Object.assign(n.style,{position:"fixed",right:"20px",bottom:"20px",zIndex:"99999",padding:"14px 20px",background:"#2563EB",color:"#fff",borderRadius:"8px",boxShadow:"0 10px 25px rgba(0,0,0,.25)",fontWeight:"600",fontSize:"14px"});
      document.body.appendChild(n);
    }
    n.textContent=msg; n.style.display="block";
    clearTimeout(window._lotusNotice);
    window._lotusNotice=setTimeout(()=>n.style.display="none",2400);
  }

  function updateCount(){
    const count=getCart().reduce((s,i)=>s+Number(i.quantity||0),0);
    document.querySelectorAll(".head-Cart").forEach(i=>i.setAttribute("data-count",count));
  }

  function addToCart(id, qty=1, size="Default"){
    const p=getProduct(id); if(!p) return;
    const cart=getCart();
    const primaryId = p.dbId || p._id || p.id;
    const item=cart.find(i => {
      const matchId = String(i.id) === String(primaryId) ||
        (p.dbId && String(i.id) === String(p.dbId)) ||
        (p._id && String(i.id) === String(p._id)) ||
        (p.numericId && String(i.id) === String(p.numericId)) ||
        String(i.id) === String(p.id);
      return matchId && (i.size || "Default") === size;
    });

    if(item) {
      item.quantity += Math.max(1, Number(qty) || 1);
      item.id = primaryId;
    } else {
      cart.push({ id: primaryId, quantity: Math.max(1, Number(qty) || 1), size: size });
    }
    saveCart(cart); updateCount(); notice(p.name+" added to cart.");
  }

  function setupMobile(){
    const bar=document.getElementById("bar"), nav=document.getElementById("navbar"), close=document.getElementById("Close");
    if(bar&&nav) bar.onclick=e=>{e.preventDefault();nav.classList.add("active");};
    if(close&&nav) close.onclick=e=>{e.preventDefault();nav.classList.remove("active");};
  }

  let currentShopCategory = 'all';
  let currentShopSearch = '';

  function renderProductGrid(){
    const container = document.querySelector("#product1 .pro-container");
    if(!container || container.id === "relatedProducts") return;

    if(!products.length){
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:30px;color:#6b7280;">No products available right now.</p>';
      return;
    }

    const isShopPage = window.location.pathname.includes("shop.html");
    let list = products;

    if (isShopPage) {
      if (currentShopCategory !== 'all') {
        list = list.filter(p => {
          const cat = (p.category || '').toLowerCase();
          if (currentShopCategory === 'shirts') return cat.includes('shirt');
          if (currentShopCategory === 'pants') return cat.includes('pant');
          if (currentShopCategory === 'shorts') return cat.includes('short');
          if (currentShopCategory === 'panjabi') return cat.includes('panjabi') || cat.includes('punjabi');
          return cat === currentShopCategory;
        });
      }
      if (currentShopSearch) {
        const q = currentShopSearch.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
      }
    } else {
      // Home page: Showcase 8 distinct items
      list = products.slice(0, 8);
    }

    if (!list.length) {
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#6b7280;font-size:15px;">No products found matching your criteria.</p>';
      return;
    }

    container.innerHTML = list.map(p => `
      <div class="pro" data-product-id="${p.numericId || p.id}" data-db-id="${p.dbId || p._id || ''}">
        <img src="${resolve(p.image)}" alt="${p.name}">
        <div class="des">
          <span>${p.category || 'Lotus Store'}</span>
          <h5>${p.name}</h5>
          <div class="star">${stars(p.rating)}</div>
          <h4>${money(p.price)}</h4>
        </div>
        <a href="#" class="cart" aria-label="Add to cart"><i class="fa-solid fa-cart-shopping"></i></a>
      </div>`).join('');

    container.querySelectorAll(".pro").forEach(card => {
      const id = card.dataset.dbId || card.dataset.productId;
      const p = getProduct(id);
      if (!p) return;
      const targetId = p.dbId || p._id || p.id;
      card.onclick = () => location.href = productUrl(targetId);
      const cart = card.querySelector(".cart");
      if (cart) {
        cart.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          addToCart(targetId, 1);
        };
      }
    });
  }

  function setupShopCards(){
    renderProductGrid();

    // Hook up category filter tabs on shop.html
    const filterBtns = document.querySelectorAll(".shop-cat-btn");
    filterBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentShopCategory = btn.dataset.category || 'all';
        renderProductGrid();
      };
    });

    // Hook up real-time search input on shop.html
    const searchInput = document.getElementById("shop-search-input");
    if (searchInput && !searchInput._wired) {
      searchInput._wired = true;
      searchInput.oninput = (e) => {
        currentShopSearch = e.target.value.trim();
        renderProductGrid();
      };
    }
  }

  async function setupProduct(){
    const name = document.getElementById("product-name");
    const main = document.getElementById("mainImg");
    if(!name || !main) return;

    const paramId = new URLSearchParams(location.search).get("id");
    let p = getProduct(paramId);

    // If paramId is a valid 24-hex MongoDB ObjectId and not resolved in memory catalog yet, fetch directly from API
    if ((!p || !p.dbId) && paramId && /^[0-9a-fA-F]{24}$/.test(paramId.trim())) {
      try {
        const res = await fetch(API_ROOT + '/api/products/' + encodeURIComponent(paramId.trim()));
        if (res.ok) {
          const doc = await res.json();
          if (doc && doc._id) {
            const fallback = initialStaticProducts.find(f => f.image === doc.image || f.name.toLowerCase() === doc.name.toLowerCase());
            const resolvedDoc = {
              _id: String(doc._id),
              dbId: String(doc._id),
              id: String(doc._id),
              numericId: fallback ? (fallback.numericId || fallback.id) : undefined,
              name: doc.name,
              price: doc.price,
              rating: doc.rating || 5,
              image: doc.image,
              category: doc.category || (fallback ? fallback.category : 'General'),
              stock: doc.stock !== undefined ? doc.stock : 100,
              description: doc.description || (fallback ? fallback.description : '')
            };
            const existingIdx = products.findIndex(item => (item.dbId && item.dbId === resolvedDoc.dbId) || item._id === resolvedDoc._id);
            if (existingIdx >= 0) {
              products[existingIdx] = resolvedDoc;
            } else {
              products.push(resolvedDoc);
            }
            p = resolvedDoc;
          }
        }
      } catch (err) { /* network offline */ }
    }

    if(!p) p = products[0];
    if(!p) return;

    name.textContent = p.name;
    const price = document.getElementById("product-price"); 
    if(price) price.textContent = money(p.price);
    
    const desc = document.getElementById("product-description"); 
    if(desc) desc.textContent = p.description;

    const catBreadcrumb = document.getElementById("product-category-breadcrumb") || document.querySelector(".single-pro-details h5");
    if(catBreadcrumb) {
      catBreadcrumb.innerHTML = `<a href="../index.html" style="text-decoration:none;color:#64748b;">Home</a> / <a href="shop.html" style="text-decoration:none;color:#64748b;">${p.category || 'Apparel'}</a> / <span style="color:#0f172a;font-weight:600;">${p.name}</span>`;
    }

    main.src = resolve(p.image); 
    main.alt = p.name;

    // Interactive thumbnails & angled view gallery for this specific product
    const thumbs = Array.from(document.querySelectorAll(".small-img"));
    const thumbLabels = ["Front View", "Angle View", "Side View", "Detail View"];
    let zoomLevel = 1;
    const zoomLevelEl = document.getElementById("zoom-level");
    const zoomIn = document.getElementById("zoom-in");
    const zoomOut = document.getElementById("zoom-out");
    
    const viewTransforms = [
      "none",
      "perspective(700px) rotateY(-8deg) scale(0.98)",
      "perspective(700px) rotateY(8deg) scale(0.98)",
      "scale(1.08)"
    ];
    let currentTransform = "none";

    const updateZoom = () => {
      const transform = currentTransform === "none" ? `scale(${zoomLevel})` : `${currentTransform} scale(${zoomLevel})`;
      main.style.transform = transform;
      main.style.transition = "transform 0.25s ease-out";
      if(zoomLevelEl) zoomLevelEl.textContent = Math.round(zoomLevel * 100) + "%";
    };

    thumbs.forEach((img, index) => {
      img.src = resolve(p.image);
      img.alt = `${p.name} - ${thumbLabels[index] || 'View ' + (index+1)}`;
      img.dataset.angle = thumbLabels[index] || ("View " + (index+1));
      
      const labelSpan = img.parentElement ? img.parentElement.querySelector(".angle-label") : null;
      if (labelSpan) labelSpan.textContent = thumbLabels[index] || ("View " + (index+1));

      img.style.cursor = "pointer";
      img.onclick = (event) => {
        event.preventDefault();
        main.src = resolve(p.image);
        main.alt = `${p.name} - ${thumbLabels[index] || 'View ' + (index+1)}`;
        currentTransform = viewTransforms[index] || "none";
        zoomLevel = 1;
        updateZoom();
        thumbs.forEach(t => t.classList.remove("active-thumb"));
        img.classList.add("active-thumb");
      };
    });

    if(thumbs[0]) {
      thumbs[0].classList.add("active-thumb");
      currentTransform = viewTransforms[0];
    }
    updateZoom();

    if(zoomIn) zoomIn.onclick = (e) => { e.preventDefault(); zoomLevel = Math.min(2.5, Number((zoomLevel + 0.15).toFixed(2))); updateZoom(); };
    if(zoomOut) zoomOut.onclick = (e) => { e.preventDefault(); zoomLevel = Math.max(1, Number((zoomLevel - 0.15).toFixed(2))); updateZoom(); };

    const add = document.getElementById("add-to-cart");
    const qty = document.getElementById("product-qty");
    const size = document.getElementById("product-size");
    if(add) {
      add.onclick = (e) => {
        e.preventDefault();
        const selectedSize = (size && size.value && size.value !== "Select Size") ? size.value : "Default";
        const targetId = p.dbId || p._id || p.id;
        addToCart(targetId, qty ? qty.value : 1, selectedSize);
      };
    }
  }

  function setupRelated(){
    const container = document.getElementById("relatedProducts"); 
    if(!container) return;
    const currentParam = new URLSearchParams(location.search).get("id");
    const currentProd = getProduct(currentParam) || products[0];
    
    // Pick other products for the related section
    const currentKey = currentProd ? (currentProd.dbId || currentProd._id || currentProd.id) : null;
    const currentNum = currentProd ? currentProd.numericId : null;

    const related = products.filter(p => {
      const pKey = p.dbId || p._id || p.id;
      if (currentKey && pKey === currentKey) return false;
      if (currentNum && p.numericId === currentNum) return false;
      return true;
    }).slice(0, 4);
    
    container.innerHTML = related.map(p => `
      <div class="pro" data-product-id="${p.numericId || p.id}" data-db-id="${p.dbId || p._id || ''}">
        <img src="${resolve(p.image)}" alt="${p.name}">
        <div class="des">
          <span>${p.category || 'Lotus Store'}</span>
          <h5>${p.name}</h5>
          <div class="star">${stars(p.rating)}</div>
          <h4>${money(p.price)}</h4>
        </div>
        <a href="#" class="cart" aria-label="Add to cart"><i class="fa-solid fa-cart-shopping"></i></a>
      </div>`).join("");

    container.querySelectorAll(".pro").forEach(card => {
      const id = card.dataset.dbId || card.dataset.productId;
      const p = getProduct(id);
      if (!p) return;
      const targetId = p.dbId || p._id || p.id;
      card.onclick = () => location.href = productUrl(targetId);
      const cart = card.querySelector(".cart");
      if (cart) {
        cart.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          addToCart(targetId, 1);
        };
      }
    });
  }

  function setupCart(){
    const tbody=document.querySelector("#cart tbody");
    const subtotalEl=document.getElementById("cart-subtotal");
    const discountEl=document.getElementById("cart-discount");
    const totalEl=document.getElementById("cart-total");
    if(!tbody) return;

    function render(){
      const cart=getCart();
      if(!cart.length){
        tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:40px;">Your cart is empty. <a href="shop.html">Continue shopping</a></td></tr>';
        updateTotals(0); return;
      }
      tbody.innerHTML=cart.map(item=>{
        const p=getProduct(item.id); if(!p)return "";
        const q=Math.max(1,Number(item.quantity)||1);
        const rowId = p.dbId || p._id || p.id;
        return `<tr data-id="${rowId}" data-size="${item.size||"Default"}">
          <td><a href="#" class="remove-item" aria-label="Remove"><i class="fa-regular fa-circle-xmark"></i></a></td>
          <td><img src="${resolve(p.image)}" alt="${p.name}"></td>
          <td>${p.name}${item.size&&item.size!=="Default"?" ("+item.size+")":""}</td>
          <td>${money(p.price)}</td>
          <td><input class="cart-qty" type="number" min="1" value="${q}"></td>
          <td>${money(p.price*q)}</td>
        </tr>`;
      }).join("");
      tbody.querySelectorAll(".remove-item").forEach(btn=>btn.onclick=e=>{
        e.preventDefault(); const r=btn.closest("tr"); const id=r.dataset.id, size=r.dataset.size;
        saveCart(getCart().filter(i=>{
          const p = getProduct(i.id);
          const iKey = p ? (p.dbId || p._id || p.id) : i.id;
          return !(String(iKey) === String(id) && (i.size||"Default")===size);
        })); render(); updateCount();
      });
      tbody.querySelectorAll(".cart-qty").forEach(input=>input.onchange=()=>{
        const r=input.closest("tr"), id=r.dataset.id, size=r.dataset.size;
        const item=getCart().find(i=>{
          const p = getProduct(i.id);
          const iKey = p ? (p.dbId || p._id || p.id) : i.id;
          return String(iKey) === String(id) && (i.size||"Default")===size;
        });
        if(item)item.quantity=Math.max(1,Number(input.value)||1);
        saveCart(getCart()); render(); updateCount();
      });
      updateTotals(cart.reduce((s,i)=>{const p=getProduct(i.id);return s+(p?p.price*Number(i.quantity||0):0)},0));
    }
    function updateTotals(subtotal){
      const coupon = getAppliedCoupon();
      const discount = calculateCouponDiscount(subtotal);
      if(subtotalEl) subtotalEl.textContent = money(subtotal);
      if(discountEl){
        discountEl.textContent = discount ? ("- " + money(discount)) : "৳0";
        if(discountEl.parentElement) discountEl.parentElement.style.display = discount ? "" : "none";
      }
      if(totalEl) totalEl.textContent = money(Math.max(0, subtotal - discount));
    }
    const apply=document.querySelector("#coupon button"), input=document.querySelector("#coupon input");
    if(apply&&input){
      apply.onclick = async () => {
        const code = input.value.trim().toUpperCase();
        if(!code){
          notice("Please enter a coupon code.");
          return;
        }
        if(code === "LOTUS10"){
          localStorage.setItem("lotusCoupon", JSON.stringify({ code: "LOTUS10", discountType: "percentage", discountValue: 10, title: "Lotus 10% Discount" }));
          notice("LOTUS10 applied — 10% off.");
          render();
          return;
        }
        try {
          const res = await fetch(API_ROOT + '/api/offers/validate-coupon/' + encodeURIComponent(code));
          const data = await res.json();
          if(res.ok && data.valid){
            localStorage.setItem("lotusCoupon", JSON.stringify({
              code: data.couponCode,
              discountType: data.discountType,
              discountValue: data.discountValue,
              title: data.title
            }));
            const label = data.discountType === 'percentage' ? `${data.discountValue}% off` : `৳${data.discountValue} discount`;
            notice(`${data.couponCode} applied — ${label}!`);
            render();
          } else {
            localStorage.removeItem("lotusCoupon");
            notice(data.message || "Invalid coupon code.");
            render();
          }
        } catch(e){
          localStorage.removeItem("lotusCoupon");
          notice("Invalid coupon code.");
          render();
        }
      };
    }
    const checkoutUrl = root + "subpages/checkout.html";
    const checkout=document.querySelector("#sub-total .normal");
    if(checkout)checkout.onclick=()=>{
      if(!getCart().length) notice("Your cart is empty.");
      else location.href = checkoutUrl;
    };
    render();
  }

  function setupNewsletter(){
    function handleSubscribe(e){
      if(e && e.preventDefault) e.preventDefault();
      const input = document.querySelector("#newsletter input");
      const email = input ? input.value.trim() : "";
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        notice("Please enter a valid email address.");
        return false;
      }
      if(input) input.value = "";
      notice("Thank you for subscribing to Lotus Store newsletters!");
      return true;
    }

    // Expose globally for inline onclick="subscribe()" on any page
    window.subscribe = handleSubscribe;

    const form = document.querySelector("#newsletter form");
    if(form) form.onsubmit = handleSubscribe;

    const btn = document.querySelector("#newsletter button");
    if(btn && (!btn.getAttribute("onclick") || !btn.getAttribute("onclick").includes("subscribe"))){
      btn.onclick = handleSubscribe;
    }
  }

  function setupCheckout(){
    const confirm = document.getElementById("confirm-order");
    const cancel = document.getElementById("cancel-order");
    const itemsList = document.getElementById("checkout-items-list");
    const subtotalEl = document.getElementById("checkout-subtotal");
    const discountRow = document.getElementById("checkout-discount-row");
    const discountEl = document.getElementById("checkout-discount");
    const shippingEl = document.getElementById("checkout-shipping");
    const totalEl = document.getElementById("checkout-total");
    const checkoutError = document.getElementById("checkout-error");

    if(!confirm && !itemsList) return;

    const cart = getCart();

    if(!cart.length){
      if(itemsList){
        itemsList.innerHTML = '<div style="text-align:center;padding:25px 10px;color:#666;"><p>Your cart is empty.</p><a href="' + resolve('subpages/shop.html') + '" class="normal" style="display:inline-block;margin-top:10px;text-decoration:none;padding:8px 18px;font-size:13px;background:#2563EB;color:#fff;border-radius:4px;">Return to Shop</a></div>';
      }
      if(subtotalEl) subtotalEl.textContent = money(0);
      if(discountRow) discountRow.style.display = 'none';
      if(totalEl) totalEl.textContent = money(0);
    } else {
      let subtotal = 0;
      if(itemsList){
        itemsList.innerHTML = cart.map(item => {
          const p = getProduct(item.id);
          if(!p) return '';
          const q = Math.max(1, Number(item.quantity) || 1);
          const itemTotal = p.price * q;
          subtotal += itemTotal;
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
              <img src="${resolve(p.image)}" alt="${p.name}" style="width:45px;height:45px;object-fit:cover;border-radius:4px;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                <div style="font-size:12px;color:#6b7280;">Qty: ${q}${item.size && item.size !== 'Default' ? ' | Size: ' + item.size : ''}</div>
              </div>
              <div style="font-weight:700;font-size:13px;white-space:nowrap;">${money(itemTotal)}</div>
            </div>`;
        }).join('');
      } else {
        subtotal = cart.reduce((s, i) => {
          const p = getProduct(i.id);
          return s + (p ? p.price * (Number(i.quantity) || 1) : 0);
        }, 0);
      }

      const coupon = getAppliedCoupon();
      const discount = calculateCouponDiscount(subtotal);
      const total = Math.max(0, subtotal - discount);

      if(subtotalEl) subtotalEl.textContent = money(subtotal);
      if(discountRow) discountRow.style.display = discount > 0 ? '' : 'none';
      if(discountEl) discountEl.textContent = '- ' + money(discount);
      if(shippingEl) shippingEl.textContent = 'Free';
      if(totalEl) totalEl.textContent = money(total);
    }

    if(confirm){
      confirm.onclick = async () => {
        const activeCart = getCart();
        if(!activeCart.length){
          notice("Your cart is empty. Add items before placing order.");
          if(checkoutError){
            checkoutError.textContent = "Your cart is empty. Please add items to your cart first.";
            checkoutError.style.display = "block";
          }
          return;
        }

        const nameInput = document.getElementById("billing-name");
        const emailInput = document.getElementById("billing-email");
        const phoneInput = document.getElementById("billing-phone");
        const addressInput = document.getElementById("billing-address");
        const method = document.querySelector('input[name="payment-method"]:checked');

        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const phone = phoneInput ? phoneInput.value.trim() : "";
        const address = addressInput ? addressInput.value.trim() : "";

        if(checkoutError) checkoutError.style.display = "none";

        if(!name || name.length < 2){
          if(checkoutError){
            checkoutError.textContent = "Please enter your full name.";
            checkoutError.style.display = "block";
          }
          if(nameInput) nameInput.focus();
          return;
        }

        if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          if(checkoutError){
            checkoutError.textContent = "Please enter a valid email address.";
            checkoutError.style.display = "block";
          }
          if(emailInput) emailInput.focus();
          return;
        }

        if(!phone || phone.length < 6){
          if(checkoutError){
            checkoutError.textContent = "Please enter a valid phone number.";
            checkoutError.style.display = "block";
          }
          if(phoneInput) phoneInput.focus();
          return;
        }

        if(!address || address.length < 5){
          if(checkoutError){
            checkoutError.textContent = "Please enter your complete delivery address.";
            checkoutError.style.display = "block";
          }
          if(addressInput) addressInput.focus();
          return;
        }

        if(method && method.value !== "cod"){
          notice("Online payment is not available yet. Please select Cash on Delivery.");
          return;
        }

        confirm.disabled = true;
        confirm.textContent = "Placing Order...";
        confirm.style.opacity = "0.75";
        confirm.style.cursor = "default";

        let subtotal = 0;
        const orderItems = activeCart.map(item => {
          const p = getProduct(item.id);
          const q = Math.max(1, Number(item.quantity) || 1);
          const itemTotal = p ? p.price * q : 0;
          subtotal += itemTotal;
          return {
            productId: p ? (p.dbId || p.id) : item.id,
            name: p ? p.name : "Item",
            price: p ? p.price : 0,
            quantity: q,
            size: item.size || "Default",
            image: p ? p.image : ""
          };
        });
        const coupon = getAppliedCoupon();
        const discount = calculateCouponDiscount(subtotal);
        const total = Math.max(0, subtotal - discount);

        let orderId = "LOTUS-" + Math.floor(100000 + Math.random() * 900000);
        try {
          const res = await fetch(API_ROOT + '/api/orders', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: orderItems,
              customer: { name, email, phone, address },
              paymentMethod: (method && method.value) || 'cod',
              subtotal, discount, shipping: 0, total
            })
          });
          const data = await res.json();
          if(res.ok && data.order && data.order.orderNumber){
            orderId = data.order.orderNumber;
          }
        } catch(e){ /* backend unreachable: order still confirmed locally */ }

        localStorage.removeItem("lotusCart");
        updateCount();

        confirm.textContent = "Order Placed";
        if(cancel) cancel.style.display = "none";

        const orderRef = document.getElementById("order-ref-text");
        if(orderRef){
          orderRef.textContent = `Order #${orderId} placed for ${name}!`;
        }
        const message = document.getElementById("thankyou-message");
        if(message) message.style.display = "block";

        notice(`Order #${orderId} Confirmed! Thank you for choosing Lotus Store.`);
      };
    }

    if(cancel){
      cancel.onclick = () => {
        notice("Checkout canceled.");
        location.href = cartUrl;
      };
    }
  }

  function setupAuth(){
    const dashboardUrl = isSubpage ? 'dashboard.html' : 'subpages/dashboard.html';
    const adminUrl = isSubpage ? 'admin.html' : 'subpages/admin.html';
    const storeHomeUrl = isSubpage ? '../index.html' : 'index.html';

    // Ensure auth area exists in header
    let header = document.getElementById("Header");
    let authArea = document.getElementById("auth-area");
    if(!authArea && header){
      authArea = document.createElement("div");
      authArea.id = "auth-area";
      authArea.innerHTML = `
        <button id="login-btn" class="signin-gradient-btn">
          <i class="fa-solid fa-arrow-right-to-bracket"></i>
          <span>Sign In</span>
        </button>
      `;
      const mobile = document.getElementById("mobile");
      if(mobile) header.insertBefore(authArea, mobile);
      else header.appendChild(authArea);
    }

    // Ensure modern login modal exists in DOM
    let loginModal = document.getElementById("login-modal");
    if(!loginModal){
      loginModal = document.createElement("div");
      loginModal.id = "login-modal";
      loginModal.style.cssText = "display:none;position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(15,23,42,0.6);align-items:center;justify-content:center;z-index:99999;";
      loginModal.innerHTML = `
        <div class="login-card-box">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${resolve('img/logo/logo.png')}" alt="Lotus" style="height:28px;">
              <h3 id="login-modal-title" style="margin:0;color:#0f172a;font-size:1.3rem;font-weight:700;">Welcome to Lotus</h3>
            </div>
            <button id="login-close-x" style="background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;padding:4px;"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p id="login-modal-subtitle" style="margin:0 0 18px 0;font-size:13px;color:#64748b;">Sign in to manage orders, wishlist & rewards</p>
          
          <div class="login-input-group">
            <i class="fa-solid fa-user"></i>
            <input id="login-username" placeholder="Username (e.g. mizan)" autocomplete="username">
          </div>
          
          <div class="login-input-group">
            <i class="fa-solid fa-lock"></i>
            <input id="login-password" type="password" placeholder="Password" autocomplete="current-password">
          </div>

          <div class="login-input-group" id="confirm-group" style="display:none;">
            <i class="fa-solid fa-shield-check"></i>
            <input id="login-password-confirm" type="password" placeholder="Confirm password" autocomplete="new-password">
          </div>

          <div style="margin-top:14px;">
            <button id="login-submit" class="modal-submit-btn">
              <i class="fa-solid fa-arrow-right-to-bracket"></i>
              <span id="login-submit-text">Sign In</span>
            </button>
          </div>

          <div style="margin-top:16px;font-size:13.5px;text-align:center;">
            <a href="#" id="toggle-register" style="color:#4F46E5;text-decoration:none;font-weight:600;">Don't have an account? Create one</a>
          </div>

          <div id="login-error" style="color:#b91c1c;margin-top:14px;font-size:13px;display:none;background:#fef2f2;border:1px solid #fecaca;padding:10px 12px;border-radius:8px;line-height:1.4;"></div>
        </div>
      `;
      document.body.appendChild(loginModal);
    }

    const loginSubmit = document.getElementById('login-submit');
    const loginSubmitText = document.getElementById('login-submit-text');
    const loginCancel = document.getElementById('login-cancel');
    const loginCloseX = document.getElementById('login-close-x');
    const loginError = document.getElementById('login-error');
    const toggleRegister = document.getElementById('toggle-register');
    const modalTitle = document.getElementById('login-modal-title');
    const modalSubtitle = document.getElementById('login-modal-subtitle');
    const confirmGroup = document.getElementById('confirm-group');

    let registerMode = false;
    function openLogin(){
      if(loginModal) loginModal.style.display = 'flex';
      if(loginError) { loginError.style.display = 'none'; loginError.textContent = ''; }
      const uEl = document.getElementById('login-username');
      if(uEl) setTimeout(() => uEl.focus(), 100);
    }
    function closeLogin(){
      if(loginModal) loginModal.style.display = 'none';
    }
    function setRegisterMode(on){
      registerMode = !!on;
      const submitText = document.getElementById('login-submit-text');
      const toggle = document.getElementById('toggle-register');
      const confGroup = document.getElementById('confirm-group');
      if(modalTitle) modalTitle.textContent = registerMode ? 'Create Account' : 'Welcome to Lotus';
      if(modalSubtitle) modalSubtitle.textContent = registerMode ? 'Join Lotus Store for exclusive perks & discounts' : 'Sign in to manage orders, wishlist & rewards';
      if(submitText) submitText.textContent = registerMode ? 'Create Account' : 'Sign In';
      if(toggle) toggle.textContent = registerMode ? 'Already have an account? Sign In' : "Don't have an account? Create one";
      if(confGroup) confGroup.style.display = registerMode ? 'block' : 'none';
    }

    if(loginCancel) loginCancel.onclick = (e) => { e.preventDefault(); closeLogin(); };
    if(loginCloseX) loginCloseX.onclick = (e) => { e.preventDefault(); closeLogin(); };
    if(toggleRegister) toggleRegister.onclick = (e) => { e.preventDefault(); setRegisterMode(!registerMode); };

    function setLoading(on){
      if(!loginSubmit) return;
      loginSubmit.disabled = !!on;
      if(on){
        loginSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Processing...</span>`;
      } else {
        loginSubmit.innerHTML = registerMode ? `<i class="fa-solid fa-user-plus"></i> <span>Create Account</span>` : `<i class="fa-solid fa-arrow-right-to-bracket"></i> <span>Sign In</span>`;
      }
    }

    function updateAuthUI(user){
      const authArea = document.getElementById('auth-area');
      const homeWelcomeBar = document.getElementById('home-user-welcome');
      const homeUsername = document.getElementById('home-username');
      const dashAvatarLetter = document.getElementById('dash-avatar-letter');
      const dashUsernameDisplay = document.getElementById('dash-username-display');
      const welcomeUserName = document.getElementById('welcome-user-name');
      const dashAddressName = document.getElementById('dash-address-name');

      if(user && user.username){
        const initial = user.username.charAt(0).toUpperCase();
        if(dashAvatarLetter) dashAvatarLetter.textContent = initial;
        if(dashUsernameDisplay) dashUsernameDisplay.textContent = user.username;
        if(welcomeUserName) welcomeUserName.textContent = user.username;
        if(dashAddressName) dashAddressName.textContent = user.username;

        // Show and update personalized home banner
        if(homeWelcomeBar){
          homeWelcomeBar.style.display = 'flex';
          if(homeUsername) homeUsername.textContent = user.username;
        }

        // Render clean Profile Dropdown in navbar (no standalone Logout button)
        if(authArea){
          authArea.innerHTML = `
            <div class="profile-dropdown-wrapper">
              <button class="profile-trigger-btn" id="profile-trigger-btn" aria-haspopup="true" aria-expanded="false" title="Account Menu">
                <div class="user-avatar-badge">${initial}</div>
                <span class="user-chip-name">${user.username}</span>
                <i class="fa-solid fa-chevron-down profile-chevron"></i>
              </button>
              <div class="profile-dropdown-menu" id="profile-dropdown-menu" style="display:none;">
                <div class="profile-menu-header">
                  <div class="profile-menu-avatar">${initial}</div>
                  <div class="profile-menu-info">
                    <strong class="profile-menu-name">${user.username}</strong>
                    <span class="profile-menu-status"><span class="status-indicator"></span> Active Member</span>
                  </div>
                </div>
                <div class="profile-menu-divider"></div>
                <ul class="profile-menu-links">
                  ${user.role === 'admin' ? `
                  <li>
                    <a href="${adminUrl}" class="profile-menu-link">
                      <i class="fa-solid fa-shield-halved"></i>
                      <span>Admin Panel</span>
                    </a>
                  </li>` : ''}
                  <li>
                    <a href="${dashboardUrl}" class="profile-menu-link">
                      <i class="fa-solid fa-user-gear"></i>
                      <span>My Profile</span>
                    </a>
                  </li>
                  <li>
                    <a href="${dashboardUrl}#orders" class="profile-menu-link">
                      <i class="fa-solid fa-box-archive"></i>
                      <span>My Orders</span>
                    </a>
                  </li>
                  <li>
                    <a href="${dashboardUrl}#wishlist" class="profile-menu-link">
                      <i class="fa-solid fa-heart"></i>
                      <span>Wishlist</span>
                    </a>
                  </li>
                  <li>
                    <a href="${dashboardUrl}#settings" class="profile-menu-link">
                      <i class="fa-solid fa-sliders"></i>
                      <span>Account Settings</span>
                    </a>
                  </li>
                </ul>
                <div class="profile-menu-divider"></div>
                <div class="profile-menu-footer">
                  <button id="profile-logout-btn" class="profile-logout-item">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          `;

          const trigger = authArea.querySelector('#profile-trigger-btn');
          const menu = authArea.querySelector('#profile-dropdown-menu');
          const logoutItem = authArea.querySelector('#profile-logout-btn');

          if(trigger && menu){
            trigger.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const isShown = menu.style.display === 'block';
              menu.style.display = isShown ? 'none' : 'block';
              trigger.classList.toggle('active', !isShown);
            };

            document.addEventListener('click', (e) => {
              if(!authArea.contains(e.target)){
                menu.style.display = 'none';
                trigger.classList.remove('active');
              }
            });
          }

          if(logoutItem){
            logoutItem.onclick = (e) => {
              e.preventDefault();
              if(menu) menu.style.display = 'none';
              handleLogout();
            };
          }
        }
      } else {
        if(homeWelcomeBar) homeWelcomeBar.style.display = 'none';
        if(authArea){
          authArea.innerHTML = `
            <button id="login-btn" class="signin-gradient-btn">
              <i class="fa-solid fa-arrow-right-to-bracket"></i>
              <span>Sign In</span>
            </button>
          `;
          const newLogin = authArea.querySelector('#login-btn');
          if(newLogin) newLogin.onclick = (e) => { e.preventDefault(); openLogin(); };
        }
      }
    }

    let isLoginProcessing = false;
    let lockoutCountdownTimer = null;
    let lockoutSecondsRemaining = 0;

    function startLockoutCountdown(seconds){
      if(lockoutCountdownTimer) clearInterval(lockoutCountdownTimer);
      lockoutSecondsRemaining = seconds || 120;
      if(loginSubmit) loginSubmit.disabled = true;
      if(loginError){
        loginError.style.display = 'block';
        loginError.textContent = `Too many failed login attempts. Please try again in ${lockoutSecondsRemaining}s.`;
      }
      lockoutCountdownTimer = setInterval(() => {
        lockoutSecondsRemaining -= 1;
        if(lockoutSecondsRemaining <= 0){
          clearInterval(lockoutCountdownTimer);
          lockoutCountdownTimer = null;
          if(loginError){
            loginError.style.display = 'none';
            loginError.textContent = '';
          }
          if(loginSubmit) loginSubmit.disabled = false;
        } else {
          if(loginError){
            loginError.textContent = `Too many failed login attempts. Please try again in ${lockoutSecondsRemaining}s.`;
          }
        }
      }, 1000);
    }

    async function handleLogin(){
      if(isLoginProcessing) return false;
      if(lockoutSecondsRemaining > 0){
        if(loginError){
          loginError.style.display = 'block';
          loginError.textContent = `Too many failed login attempts. Please try again in ${lockoutSecondsRemaining}s.`;
        }
        return false;
      }

      const uEl = document.getElementById('login-username');
      const pEl = document.getElementById('login-password');
      const u = uEl ? uEl.value.trim() : '';
      const p = pEl ? pEl.value : '';
      if(!u || !p){
        if(loginError){ loginError.style.display = 'block'; loginError.textContent = 'Please enter your username and password'; }
        return false;
      }

      isLoginProcessing = true;
      setLoading(true);

      try {
        const res = await fetch(API_ROOT + '/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if(!res.ok){
          if(res.status === 429 || data.locked){
            startLockoutCountdown(data.remainingSeconds || 120);
          } else {
            if(loginError){
              loginError.style.display = 'block';
              loginError.textContent = data.message || 'Invalid username or password';
            }
          }
          return false;
        }

        // Login Succeeded
        if(lockoutCountdownTimer){
          clearInterval(lockoutCountdownTimer);
          lockoutCountdownTimer = null;
          lockoutSecondsRemaining = 0;
        }
        closeLogin();
        updateAuthUI(data.user || { username: u });
        notice('Welcome back, ' + (data.user && data.user.username ? data.user.username : u) + '!');

        if(data.user && data.user.role === 'admin'){
          setTimeout(() => {
            window.location.href = adminUrl;
          }, 400);
        } else if(isSubpage){
          setTimeout(() => {
            window.location.href = storeHomeUrl;
          }, 400);
        }

        return true;
      } catch(err){
        if(loginError){ loginError.style.display = 'block'; loginError.textContent = 'Unable to connect to authentication server.'; }
        return false;
      } finally {
        isLoginProcessing = false;
        if(lockoutSecondsRemaining <= 0){
          setLoading(false);
        }
      }
    }

    async function handleRegister(){
      const uEl = document.getElementById('login-username');
      const pEl = document.getElementById('login-password');
      const pcEl = document.getElementById('login-password-confirm');
      const u = uEl ? uEl.value.trim() : '';
      const p = pEl ? pEl.value : '';
      const pc = pcEl ? pcEl.value : '';

      if(!u || !p){
        if(loginError){ loginError.style.display = 'block'; loginError.textContent = 'Please provide username and password'; }
        return;
      }
      if(p.length < 6){
        if(loginError){ loginError.style.display = 'block'; loginError.textContent = 'Password must be at least 6 characters'; }
        return;
      }
      if(p !== pc){
        if(loginError){ loginError.style.display = 'block'; loginError.textContent = 'Passwords do not match'; }
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(API_ROOT + '/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if(!res.ok){
          if(loginError){ loginError.style.display = 'block'; loginError.textContent = data.message || 'Registration failed'; }
          return;
        }
        // Auto login on successful register
        await handleLogin();
      } catch(err){
        if(loginError){ loginError.style.display = 'block'; loginError.textContent = 'Unable to connect to authentication server.'; }
      } finally {
        setLoading(false);
      }
    }

    if(loginSubmit) loginSubmit.onclick = (e) => { e.preventDefault(); if(registerMode) handleRegister(); else handleLogin(); };

    async function handleLogout(){
      try {
        await fetch(API_ROOT + '/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch(e){ /* ignore network error on logout */ }
      updateAuthUI(null);
      notice('Signed out successfully.');
      if(window.location.pathname.includes('dashboard.html')){
        setTimeout(() => {
          window.location.href = storeHomeUrl;
        }, 400);
      }
    }

    const dashLogoutBtn = document.getElementById('dash-logout-btn');
    if(dashLogoutBtn) dashLogoutBtn.onclick = (e) => { e.preventDefault(); handleLogout(); };

    // Initial auth button handler
    const initLoginBtn = document.getElementById('login-btn');
    if(initLoginBtn) initLoginBtn.onclick = (e) => { e.preventDefault(); openLogin(); };

    async function checkAuth(){
      try {
        const res = await fetch(API_ROOT + '/api/auth/me', { credentials: 'include' });
        if(!res.ok){
          updateAuthUI(null);
          return false;
        }
        const user = await res.json();
        if(user && user.username){
          updateAuthUI(user);
          return true;
        }
        updateAuthUI(null);
        return false;
      } catch(err){
        updateAuthUI(null);
        return false;
      }
    }

    // Check auth status on load
    checkAuth();

    // If page opened with ?login=1, open login modal
    try {
      const params = new URLSearchParams(window.location.search);
      if(params.get('login') === '1') openLogin();
    } catch(e){}
  }

  function setupContact(){
    const form = document.getElementById("contact-form") || document.querySelector("#form-details form");
    if(!form) return;

    form.onsubmit = (e) => {
      if(e && e.preventDefault) e.preventDefault();
      const nameInput = document.getElementById("contact-name") || form.querySelector('input[type="text"]');
      const emailInput = document.getElementById("contact-email") || form.querySelector('input[type="email"]');
      const subjectInput = document.getElementById("contact-subject");
      const messageInput = document.getElementById("contact-message") || form.querySelector("textarea");

      const name = nameInput ? nameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const message = messageInput ? messageInput.value.trim() : "";

      if(!name || name.length < 2){
        notice("Please enter your name.");
        if(nameInput) nameInput.focus();
        return;
      }
      if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        notice("Please enter a valid email address.");
        if(emailInput) emailInput.focus();
        return;
      }
      if(!message || message.length < 5){
        notice("Please enter a message (at least 5 characters).");
        if(messageInput) messageInput.focus();
        return;
      }

      if(nameInput) nameInput.value = "";
      if(emailInput) emailInput.value = "";
      if(subjectInput) subjectInput.value = "";
      if(messageInput) messageInput.value = "";

      notice(`Thank you, ${name}! Your message has been sent successfully.`);
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupMobile();
    setupShopCards();
    setupProduct();
    setupRelated();
    setupCart();
    setupNewsletter();
    setupCheckout();
    setupContact();
    setupAuth();
    updateCount();
    loadCatalog();
    loadActiveOffers();
  });
})();