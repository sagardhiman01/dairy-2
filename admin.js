// admin.js - Logic for Vaishnavi Dairy Admin Panel

let authToken = localStorage.getItem('admin_token') || '';
let activeProductId = null;

// --- Authentication ---
const attemptLogin = () => {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123') { // Simple password for demo
        authToken = 'admin-secret-token';
        localStorage.setItem('admin_token', authToken);
        document.getElementById('login-screen').style.display = 'none';
        loadAllData();
    } else {
        const err = document.getElementById('login-error');
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 3000);
    }
};

const logout = () => {
    localStorage.removeItem('admin_token');
    window.location.reload();
};

const checkAuth = () => {
    if (authToken === 'admin-secret-token') {
        document.getElementById('login-screen').style.display = 'none';
        loadAllData();
    }
};

// --- API Helpers ---
const apiFetch = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': authToken
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) logout();
    return response.json();
};

// --- Tab Switching ---
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const target = link.getAttribute('data-target');
        
        // UI Update
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        
        document.getElementById('page-title').textContent = link.textContent.trim() + ' Management';

        // Close sidebar on mobile after clicking
        if (window.innerWidth <= 992) {
            toggleMobileSidebar();
        }
    });
});

// --- Data Loading ---
const loadAllData = () => {
    loadOrders();
    loadUsers();
    loadProducts();
    loadHero();
    loadSettings();
};

const loadUsers = async () => {
    const users = await apiFetch('/api/admin/users');
    const tableBody = document.querySelector('#users-table tbody');
    if(tableBody) {
        tableBody.innerHTML = users.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td>${u.phone}</td>
                <td>${u.address}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }
};

const loadOrders = async () => {
    const orders = await apiFetch('/api/admin/orders');
    const tableBody = document.querySelector('#orders-table tbody');
    tableBody.innerHTML = orders.map(order => {
        const items = JSON.parse(order.items);
        return `
            <tr>
                <td>#${order.id}</td>
                <td>
                    <strong>${order.customer_name}</strong><br>
                    <small>${order.customer_phone}</small>
                </td>
                <td>${items.map(i => `${i.name} (${i.quantity})`).join(', ')}</td>
                <td>₹${order.total.toFixed(2)}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td><span class="badge badge-${order.status}">${order.status}</span></td>
            </tr>
        `;
    }).join('');

    // Stats
    document.getElementById('total-orders-count').textContent = orders.length;
    document.getElementById('total-sales').textContent = '₹' + orders.reduce((s, o) => s + o.total, 0).toFixed(0);
    document.getElementById('pending-orders').textContent = orders.filter(o => o.status === 'pending').length;
};

const loadProducts = async () => {
    const products = await apiFetch('/api/products');
    const tableBody = document.querySelector('#products-table tbody');
    tableBody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;"></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>₹${p.price}</td>
            <td><span class="badge" style="background: rgba(255,255,255,0.1)">${p.badge || 'None'}</span></td>
            <td>
                <button class="btn btn-ghost btn-icon" onclick='editProduct(${JSON.stringify(p)})'><i class="fas fa-edit"></i></button>
                <button class="btn btn-ghost btn-icon btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
};

const loadHero = async () => {
    const slides = await apiFetch('/api/hero');
    const container = document.getElementById('hero-slides-container');
    container.innerHTML = slides.map(s => `
        <div class="card" style="display: flex; gap: 2rem; align-items: center;">
            <img src="${s.image}" style="width: 200px; height: 120px; border-radius: 12px; object-fit: cover;">
            <div style="flex-grow: 1;">
                <h3>${s.title} <span>${s.subtitle}</span></h3>
                <p style="color: var(--text-dim); font-size: 0.9rem; margin-top: 0.5rem;">${s.description}</p>
            </div>
            <button class="btn btn-ghost btn-delete" onclick="deleteHero(${s.id})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
};

const loadSettings = async () => {
    const settings = await apiFetch('/api/settings');
    Object.entries(settings).forEach(([key, value]) => {
        const input = document.getElementById(`set-${key}`);
        if (input) input.value = value;
    });
};

// --- CRUD Operations ---

// Products
const showProductModal = (prod = null) => {
    activeProductId = prod ? prod.id : null;
    document.getElementById('modal-title').textContent = prod ? 'Edit Product' : 'Add New Product';
    document.getElementById('prod-name').value = prod ? prod.name : '';
    document.getElementById('prod-price').value = prod ? prod.price : '';
    document.getElementById('prod-cat').value = prod ? prod.category : 'Dairy';
    document.getElementById('prod-img').value = prod ? prod.image : '';
    document.getElementById('prod-badge').value = prod ? prod.badge : '';
    document.getElementById('product-modal').style.display = 'flex';
};

window.editProduct = (p) => showProductModal(p);

const saveProduct = async () => {
    const data = {
        name: document.getElementById('prod-name').value,
        price: parseFloat(document.getElementById('prod-price').value),
        category: document.getElementById('prod-cat').value,
        image: document.getElementById('prod-img').value,
        badge: document.getElementById('prod-badge').value,
        unit_label: 'kg', // Default for now
        min_qty: 1
    };

    if (activeProductId) {
        await apiFetch(`/api/admin/products/${activeProductId}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
        await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(data) });
    }
    closeModal('product-modal');
    loadProducts();
};

const deleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
        await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
        loadProducts();
    }
};

// Hero
const deleteHero = async (id) => {
    if (confirm('Remove this slide?')) {
        await apiFetch(`/api/admin/hero/${id}`, { method: 'DELETE' });
        loadHero();
    }
};

// Settings
const saveSettings = async () => {
    const settings = {
        site_name: document.getElementById('set-site_name').value,
        contact_phone: document.getElementById('set-contact_phone').value,
        contact_email: document.getElementById('set-contact_email').value,
        contact_address: document.getElementById('set-contact_address').value,
        min_order: document.getElementById('set-min_order').value,
        delivery_rate: document.getElementById('set-delivery_rate').value,
        fallback_delivery_fee: document.getElementById('set-fallback_delivery_fee').value,
        store_lat: document.getElementById('set-store_lat').value,
        store_lng: document.getElementById('set-store_lng').value,
    };
    await apiFetch('/api/admin/settings', { method: 'POST', body: JSON.stringify(settings) });
    alert('Settings saved successfully!');
};

// --- UI Helpers ---
const closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
};

const toggleMobileSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
};

// Init
checkAuth();
