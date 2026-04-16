document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject Cart Sidebar HTML
    const cartDrawerHTML = `
        <aside class="cart-sidebar" id="cart-sidebar">
            <div class="sidebar-header">
                <h3>Your Shopping Cart</h3>
                <button class="close-sidebar" id="close-cart"><i class="fas fa-times"></i></button>
            </div>
            <div class="cart-sidebar-content" id="cart-items-container">
                <!-- Items will be injected here -->
            </div>
            <div class="cart-sidebar-footer">
                <div class="cart-total-row">
                    <span>Total:</span>
                    <span id="cart-drawer-total">₹0.00</span>
                </div>
                <button class="btn-checkout" id="checkout-btn">Proceed to Checkout</button>
                <p style="font-size: 12px; text-align: center; margin-top: 10px; opacity: 0.7;">Min. Order ₹1000 | Free Delivery</p>
            </div>
        </aside>
    `;
    document.body.insertAdjacentHTML('beforeend', cartDrawerHTML);

    const cartSidebar = document.getElementById('cart-sidebar');
    const closeCartBtn = document.getElementById('close-cart');
    const cartOverlay = document.getElementById('sidebar-overlay'); // Reusing existing overlay
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartDrawerTotal = document.getElementById('cart-drawer-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    // 2. State & Functions
    let cart = JSON.parse(localStorage.getItem('vaishnavi_cart')) || [];

    const toggleCart = (show = null) => {
        const shouldShow = show !== null ? show : !cartSidebar.classList.contains('active');
        cartSidebar.classList.toggle('active', shouldShow);
        if (cartOverlay) cartOverlay.classList.toggle('active', shouldShow);
        document.body.style.overflow = shouldShow ? 'hidden' : '';
        if (shouldShow) renderCartDrawer();
    };

    window.updateCartGlobal = () => {
        cart = JSON.parse(localStorage.getItem('vaishnavi_cart')) || [];
        updateHeaderCounts();
    };

    const updateHeaderCounts = () => {
        const count = cart.length;
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        document.querySelectorAll('.cart .badge').forEach(b => b.textContent = count);
        const totalStrong = document.querySelector('.cart-total strong');
        if (totalStrong) totalStrong.textContent = `₹${total.toFixed(2)}`;
    };

    const renderCartDrawer = () => {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 0;">
                    <i class="fas fa-shopping-basket" style="font-size: 48px; color: #eee; margin-bottom: 20px;"></i>
                    <p>Your cart is empty</p>
                    <a href="shop.html" style="color: var(--primary); font-weight: 600; text-decoration: underline;">Go Shopping</a>
                </div>
            `;
            cartDrawerTotal.textContent = '₹0.00';
            return;
        }

        let total = 0;
        cartItemsContainer.innerHTML = cart.map((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.quantity}${item.unit_label} × ₹${item.price}</p>
                        <strong>₹${itemTotal.toFixed(2)}</strong>
                    </div>
                    <button class="cart-item-remove" onclick="removeGlobal(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }).join('');
        cartDrawerTotal.textContent = `₹${total.toFixed(2)}`;
    };

    window.removeGlobal = (index) => {
        cart.splice(index, 1);
        localStorage.setItem('vaishnavi_cart', JSON.stringify(cart));
        renderCartDrawer();
        updateHeaderCounts();
        if (window.updateShopUI) window.updateShopUI(); // Notify shop page if active
    };

    // 3. Listeners
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCart(false));
    if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCart(false));

    // Intercept header cart clicks
    document.querySelectorAll('.action-item.cart').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCart(true);
        });
    });

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            const milkQty = cart.filter(i => i.category === 'Milk').reduce((s, i) => s + i.quantity, 0);
            const otherQty = cart.filter(i => i.category !== 'Milk' && i.unit_label === 'kg').reduce((s, i) => s + i.quantity, 0);
            const totalAmount = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

            let errors = [];
            if (milkQty > 0 && milkQty < 2) errors.push("Milk order must be at least 2 Liters.");
            if (otherQty > 0 && otherQty < 3) errors.push("Other items (kg) total must be at least 3kg.");
            if (totalAmount < 1000) errors.push("Minimum order amount is ₹1000.");

            if (errors.length > 0) {
                alert("Cannot Checkout:\n\n" + errors.join('\n'));
                return;
            }

            window.location.href = 'checkout.html';
        });
    }

    updateHeaderCounts();
});
