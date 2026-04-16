document.addEventListener('DOMContentLoaded', () => {

    // 1. Lenis Smooth Scroll
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // 2. Sidebar Toggle
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('category-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    };
    if (openSidebarBtn) openSidebarBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // 3. Cart
    let cart = JSON.parse(localStorage.getItem('vaishnavi_cart')) || [];
    let allProducts = [];

    function updateCartUI() {
        if (window.updateCartGlobal) window.updateCartGlobal();
    }
    window.updateShopUI = updateHeaderCounts; // If needed for external triggers
    function updateHeaderCounts() {
        if (window.updateCartGlobal) window.updateCartGlobal();
    }

    // 4. Load & Render Products
    async function loadProducts() {
        try {
            const response = await fetch('/api/products');
            allProducts = await response.json();
            
            // Check for search or category query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('search');
            const catQuery = urlParams.get('category');
            
            let filteredProducts = [...allProducts];
            
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                filteredProducts = filteredProducts.filter(p => 
                    p.name.toLowerCase().includes(q) || 
                    p.category.toLowerCase().includes(q)
                );
            }
            if (catQuery) {
                // If it explicitly matched a category from dropdown
                filteredProducts = filteredProducts.filter(p => p.category === catQuery);
            }
            
            renderProducts(filteredProducts);
            updateCartUI();
        } catch (err) {
            console.error("Failed to load products:", err);
        }
    }

    function renderProducts(products) {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        
        document.getElementById('product-count').textContent = `Showing ${products.length} products`;

        grid.innerHTML = products.map(product => {
            let unitOptions = '';
            if (product.unit_label === 'kg' || product.unit_label === 'L') {
                unitOptions = `
                    <select class="unit-selector" id="unit-${product.id}">
                        <option value="0.5">500 ${product.unit_label === 'L' ? 'ml' : 'g'}</option>
                        <option value="1" selected>1 ${product.unit_label}</option>
                        <option value="2">2 ${product.unit_label}</option>
                        <option value="3">3 ${product.unit_label}</option>
                        <option value="5">5 ${product.unit_label}</option>
                    </select>
                `;
            } else if (product.unit_label === 'piece') {
                unitOptions = `
                    <select class="unit-selector" id="unit-${product.id}">
                        <option value="1">1 piece</option>
                        <option value="6">6 pieces</option>
                        <option value="12">12 pieces</option>
                    </select>
                `;
            }

            return `
                <div class="product-card reveal">
                    <div class="product-thumb">
                        ${product.badge ? `<span class="badge ${product.badge.toLowerCase().includes('vedic') || product.badge.toLowerCase().includes('premium') || product.badge.toLowerCase().includes('best') || product.badge.toLowerCase().includes('traditional') ? 'new' : 'sale'}">${product.badge}</span>` : ''}
                        <img src="${product.image}" alt="${product.name}">
                        <div class="product-actions">
                            <button><i class="far fa-heart"></i></button>
                            <button><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="rating"><i class="fas fa-star"></i> ${product.rating}</div>
                        <h3>${product.name}</h3>
                        <div class="price">
                            <span class="current-price">₹${product.price}/${product.unit_label}</span>
                        </div>
                        <div class="qty-control">${unitOptions}</div>
                        <button class="add-to-cart" 
                            data-id="${product.id}" 
                            data-name="${product.name}" 
                            data-price="${product.price}" 
                            data-category="${product.category}"
                            data-unit="${product.unit_label}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        attachCartListeners();
        initRevealAnimations();
    }

    function attachCartListeners() {
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const price = parseFloat(btn.getAttribute('data-price'));
                const category = btn.getAttribute('data-category');
                const unit_label = btn.getAttribute('data-unit');
                const unitSelector = document.getElementById(`unit-${id}`);
                const selectedQty = unitSelector ? parseFloat(unitSelector.value) : 1;

                const existingItem = cart.find(item => item.id === id);
                if (existingItem) {
                    existingItem.quantity += selectedQty;
                } else {
                    cart.push({ id, name, price, category, unit_label, quantity: selectedQty });
                }

                localStorage.setItem('vaishnavi_cart', JSON.stringify(cart));
                updateCartUI();

                const originalText = btn.textContent;
                btn.textContent = 'Added! ✓';
                btn.classList.add('btn-success');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('btn-success');
                }, 1500);
            });
        });
    }

    // 5. Category Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.getAttribute('data-cat');
            if (cat === 'all') {
                renderProducts(allProducts);
            } else {
                renderProducts(allProducts.filter(p => p.category === cat));
            }
        });
    });

    // 6. Sort
    document.getElementById('sort-select').addEventListener('change', (e) => {
        let sorted = [...allProducts];
        const activeCat = document.querySelector('.filter-btn.active')?.getAttribute('data-cat');
        if (activeCat && activeCat !== 'all') {
            sorted = sorted.filter(p => p.category === activeCat);
        }
        switch(e.target.value) {
            case 'low-high': sorted.sort((a, b) => a.price - b.price); break;
            case 'high-low': sorted.sort((a, b) => b.price - a.price); break;
            case 'rating': sorted.sort((a, b) => b.rating - a.rating); break;
        }
        renderProducts(sorted);
    });

    // 7. Checkout logic is now in cart-manager.js for all pages

    // 8. Reveal Animations
    function initRevealAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.product-card, .filter-block').forEach((el, i) => {
            el.classList.add('reveal');
            el.style.transitionDelay = `${(i % 5) * 0.1}s`;
            observer.observe(el);
        });
    }

    loadProducts();
});
