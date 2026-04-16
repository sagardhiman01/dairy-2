require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

// Choose database type based on environment
const isPostgres = process.env.DATABASE_URL ? true : false;
let db;

if (isPostgres) {
    const isInternal = process.env.DATABASE_URL.includes('internal');
    const connectionConfig = { connectionString: process.env.DATABASE_URL };
    if (!isInternal) {
        connectionConfig.ssl = { rejectUnauthorized: false };
    }
    db = new Pool(connectionConfig);
    console.log("Using PostgreSQL Database (Internal: " + isInternal + ")");
} else {
    db = new sqlite3.Database('./farmas.db');
    console.log("Using SQLite Database");
}

// Wrapper to make query execution consistent between pg and sqlite
const executeQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            db.query(query, params, (err, res) => {
                if (err) reject(err);
                else resolve(res.rows);
            });
        } else {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }
    });
};

const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            db.query(query, params, (err, res) => {
                if (err) reject(err);
                else resolve({ lastID: res?.rows?.[0]?.id });
            });
        } else {
            db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID });
            });
        }
    });
};

// Initialize Tables
const initDB = async () => {
    const queries = [
        // 1. Products
        `CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT,
            image TEXT,
            rating REAL DEFAULT 5.0,
            badge TEXT,
            unit_label TEXT DEFAULT 'kg',
            min_qty REAL DEFAULT 1
        )`,
        // 2. Users (New for Full Stack)
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            role TEXT DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        // 3. Orders
        `CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            customer_name TEXT,
            customer_phone TEXT,
            customer_address TEXT,
            payment_status TEXT DEFAULT 'pending',
            razorpay_order_id TEXT,
            delivery_fee REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        // 4. Site Settings
        `CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`,
        // 5. Hero Slides
        `CREATE TABLE IF NOT EXISTS hero_slides (
            id SERIAL PRIMARY KEY,
            title TEXT,
            subtitle TEXT,
            description TEXT,
            image TEXT,
            button_text TEXT,
            button_link TEXT,
            order_index INTEGER DEFAULT 0
        )`,
        // 6. Testimonials
        `CREATE TABLE IF NOT EXISTS testimonials (
            id SERIAL PRIMARY KEY,
            name TEXT,
            location TEXT,
            text TEXT,
            rating INTEGER DEFAULT 5,
            image TEXT
        )`
    ];

    // For SQLite, replace SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT
    const finalQueries = isPostgres ? queries : queries.map(q => q.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP', 'DATETIME'));

    for (let q of finalQueries) {
        await runQuery(q);
    }

    // Seed Data if empty
    const productCount = await executeQuery("SELECT count(*) as count FROM products");
    if (parseInt(productCount[0].count) === 0) {
        const products = [
            ['Premium Cow Ghee', 750, 'Dairy', 'desi_ghee.png', 5.0, 'Premium', 'kg', 1],
            ['Fresh Malai Paneer', 450, 'Dairy', 'malai_paneer.png', 5.0, 'Best Seller', 'kg', 0.5],
            ['Full Cream Fresh Milk', 68, 'Milk', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', 4.9, 'Fresh', 'L', 2],
            ['Khoya (Mawa)', 380, 'Dairy', 'khoya.png', 4.7, '', 'kg', 0.5],
            ['Fresh Thick Curd', 120, 'Dairy', 'curd.png', 4.8, '', 'kg', 1],
            ['Fresh Soy Chaap', 150, 'Dairy', 'chaap.png', 4.6, 'Fresh', 'kg', 1],
            ['Masala Buttermilk', 35, 'Beverage', 'masala_buttermilk.png', 4.8, 'Cooling', 'L', 1],
            ['Frozen Green Peas', 90, 'Dairy', 'peas.png', 4.7, '', 'kg', 1],
            ['Artisan Cheese', 650, 'Dairy', 'artisan_cheese_cat.png', 4.9, 'Premium', 'kg', 0.25],
            ['Fresh Pav Bread', 45, 'Bakery', 'pav.png', 4.6, 'Fresh', 'pack', 1]
        ];
        for (let p of products) {
            const placeholder = isPostgres ? '$1, $2, $3, $4, $5, $6, $7, $8' : '?, ?, ?, ?, ?, ?, ?, ?';
            await runQuery(`INSERT INTO products (name, price, category, image, rating, badge, unit_label, min_qty) VALUES (${placeholder})`, p);
        }
        // Simplified seeding for demo; in production use proper param binding helper
    }

    // Seed Settings if empty
    const settingsCount = await executeQuery("SELECT count(*) as count FROM site_settings");
    if (parseInt(settingsCount[0].count) === 0) {
        const settings = [
            ['site_name', 'Vaishnavi Mava Bhandar'],
            ['contact_phone', '+91 88818 56426'],
            ['contact_email', 'vaishnavidairyindia@gmail.com'],
            ['contact_address', 'Tyodhi Baraut (Baghpat)'],
            ['min_order', '100'],
            ['instagram_url', 'https://www.instagram.com/vaishnavi.dairy?igsh=MWhveXdpempwcmI2bw=='],
            ['facebook_url', 'https://www.facebook.com/share/18fFbD3Nhe/'],
            ['whatsapp_url', 'https://wa.me/qr/FESS3WGWCS47G1'],
            ['delivery_rate', '10'],
            ['store_lat', '28.6139'],
            ['store_lng', '77.2090'],
            ['fallback_delivery_fee', '50']
        ];
        for (let s of settings) {
            const placeholder = isPostgres ? '$1, $2' : '?, ?';
            await runQuery(`INSERT INTO site_settings (key, value) VALUES (${placeholder})`, s);
        }
    }
};

if (!isPostgres) {
    db.serialize(() => {
        // SQLite specific init if needed
    });
}
initDB();

module.exports = { db, executeQuery, runQuery, isPostgres };
