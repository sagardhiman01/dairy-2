require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const { db, executeQuery, runQuery, isPostgres } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vaishnavi-secret';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, './')));

// --- Razorpay Setup ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- Middlewares ---
const adminAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === 'admin-secret-token') { // Admin panel uses simple token for now
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const userAuth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// --- AUTH ROUTES ---

app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, phone, address } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const placeholder = isPostgres ? '$1, $2, $3, $4, $5' : '?, ?, ?, ?, ?';
        await runQuery(`INSERT INTO users (name, email, password, phone, address) VALUES (${placeholder})`, [name, email, hashedPassword, phone, address]);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const placeholder = isPostgres ? '$1' : '?';
        const users = await executeQuery(`SELECT * FROM users WHERE email = ${placeholder}`, [email]);
        if (users.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PUBLIC APIs ---

app.get('/api/products', async (req, res) => {
    try {
        const rows = await executeQuery("SELECT * FROM products");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const rows = await executeQuery("SELECT * FROM site_settings");
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/hero', async (req, res) => {
    try {
        const rows = await executeQuery("SELECT * FROM hero_slides ORDER BY order_index ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/testimonials', async (req, res) => {
    try {
        const rows = await executeQuery("SELECT * FROM testimonials");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PAYMENT ROUTES (Razorpay) ---

app.post('/api/payment/create-order', async (req, res) => {
    const { amount, currency } = req.body;
    try {
        const options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency: currency || "INR",
            receipt: "order_rcptid_" + Date.now(),
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/payment/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, customer, delivery_fee } = req.body;
    try {
        const cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = cartTotal + (delivery_fee || 0);
        const placeholder = isPostgres ? '$1, $2, $3, $4, $5, $6, $7, $8, $9' : '?, ?, ?, ?, ?, ?, ?, ?, ?';
        await runQuery(`INSERT INTO orders (items, total, status, customer_name, customer_phone, customer_address, payment_status, razorpay_order_id, delivery_fee) VALUES (${placeholder})`,
            [JSON.stringify(items), total, 'pending', customer.name, customer.phone, customer.address, 'paid', razorpay_order_id, delivery_fee || 0]);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/manual', async (req, res) => {
    const { items, customer, delivery_fee, payment_method, transaction_id } = req.body;
    try {
        const cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = cartTotal + (delivery_fee || 0);
        const placeholder = isPostgres ? '$1, $2, $3, $4, $5, $6, $7, $8, $9' : '?, ?, ?, ?, ?, ?, ?, ?, ?';
        await runQuery(`INSERT INTO orders (items, total, status, customer_name, customer_phone, customer_address, payment_status, razorpay_order_id, delivery_fee) VALUES (${placeholder})`,
            [JSON.stringify(items), total, 'pending', customer.name, customer.phone, customer.address, payment_method === 'cod' ? 'cod' : 'pending_verification', transaction_id || '', delivery_fee || 0]);
        
        // --- Send Email Notification ---
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'vaishnavimavabhandarindia@gmail.com', // fallback fake email
                    pass: process.env.EMAIL_PASS || 'dummypassword'
                }
            });
            const itemList = items.map(i => `${i.name} (x${i.quantity}) - ₹${i.price * i.quantity}`).join('<br>');
            await transporter.sendMail({
                from: process.env.EMAIL_USER || 'vaishnavimavabhandarindia@gmail.com',
                to: 'vaishnavidairyindia@gmail.com', // Admin's actual email
                subject: `New Order Received - ${customer.name}`,
                html: `
                    <h2>New Order Alert</h2>
                    <p><strong>Customer:</strong> ${customer.name}</p>
                    <p><strong>Phone:</strong> ${customer.phone}</p>
                    <p><strong>Address:</strong> ${customer.address}</p>
                    <p><strong>Payment Method:</strong> ${payment_method.toUpperCase()}</p>
                    ${transaction_id ? `<p><strong>Transaction ID:</strong> ${transaction_id}</p>` : ''}
                    <h3>Order Items:</h3>
                    <p>${itemList}</p>
                    <p><strong>Delivery Fee:</strong> ₹${delivery_fee || 0}</p>
                    <h3><strong>Total: ₹${total}</strong></h3>
                `
            });
        } catch (mailErr) {
            console.error("Nodemailer failed to send email (likely missing config):", mailErr.message);
        }

        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN APIs ---

app.get('/api/admin/orders', adminAuth, async (req, res) => {
    try {
        const rows = await executeQuery("SELECT * FROM orders ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Users Route
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const rows = await executeQuery("SELECT id, name, email, phone, address, created_at FROM users ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Site Settings
app.post('/api/admin/settings', adminAuth, async (req, res) => {
    const settings = req.body;
    try {
        for (const [key, value] of Object.entries(settings)) {
            const placeholder = isPostgres ? '$1, $2' : '?, ?';
            // Use INSERT OR REPLACE / ON CONFLICT to handle settings updates
            if (isPostgres) {
                await runQuery(`INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key, value]);
            } else {
                await runQuery(`INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)`, [key, value]);
            }
        }
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manage Products
app.post('/api/admin/products', adminAuth, async (req, res) => {
    const { name, price, category, image, badge, unit_label, min_qty } = req.body;
    try {
        const placeholder = isPostgres ? '$1, $2, $3, $4, $5, $6, $7' : '?, ?, ?, ?, ?, ?, ?';
        const result = await runQuery(`INSERT INTO products (name, price, category, image, badge, unit_label, min_qty) VALUES (${placeholder})`,
            [name, price, category, image, badge, unit_label, min_qty]);
        res.json({ id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/products/:id', adminAuth, async (req, res) => {
    const { name, price, category, image, badge, unit_label, min_qty } = req.body;
    try {
        const placeholder = isPostgres ? '$1, $2, $3, $4, $5, $6, $7, $8' : '?, ?, ?, ?, ?, ?, ?, ?';
        await runQuery(`UPDATE products SET name=${isPostgres?'$1':'?'}, price=${isPostgres?'$2':'?'}, category=${isPostgres?'$3':'?'}, image=${isPostgres?'$4':'?'}, badge=${isPostgres?'$5':'?'}, unit_label=${isPostgres?'$6':'?'}, min_qty=${isPostgres?'$7':'?'} WHERE id=${isPostgres?'$8':'?'}`,
            [name, price, category, image, badge, unit_label, min_qty, req.params.id]);
        res.json({ status: 'updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
    try {
        const placeholder = isPostgres ? '$1' : '?';
        await runQuery(`DELETE FROM products WHERE id = ${placeholder}`, [req.params.id]);
        res.json({ status: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manage Hero Slides
app.post('/api/admin/hero', adminAuth, async (req, res) => {
    const { title, subtitle, description, image, button_text, button_link, order_index } = req.body;
    try {
        const placeholder = isPostgres ? '$1, $2, $3, $4, $5, $6, $7' : '?, ?, ?, ?, ?, ?, ?';
        const result = await runQuery(`INSERT INTO hero_slides (title, subtitle, description, image, button_text, button_link, order_index) VALUES (${placeholder})`,
            [title, subtitle, description, image, button_text, button_link, order_index || 0]);
        res.json({ id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/hero/:id', adminAuth, async (req, res) => {
    try {
        const placeholder = isPostgres ? '$1' : '?';
        await runQuery(`DELETE FROM hero_slides WHERE id = ${placeholder}`, [req.params.id]);
        res.json({ status: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const https = require('https');
const RENDER_URL = process.env.APP_URL || 'https://dairy-2-ndj5.onrender.com/';

setInterval(() => {
    https.get(RENDER_URL, (res) => {
        console.log(`[Self-Ping] Pinged ${RENDER_URL} successfully to keep server awake. Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error(`[Self-Ping] Error pinging ${RENDER_URL}:`, err.message);
    });
}, 10 * 60 * 1000); // 10 minutes

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
