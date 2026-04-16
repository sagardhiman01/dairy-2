// mock-sqlite3.js
class Database {
    constructor(path) {
        this.data = {
            products: [
                { id: 1, name: 'Artisan Whole Milk (1L)', price: 75.00, category: 'Milk', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', rating: 5.0, badge: '-20%' },
                { id: 2, name: 'Premium Brie Cheese', price: 450.00, category: 'Cheese', image: 'premium_brie_cheese.png', rating: 4.8, badge: '' },
                { id: 3, name: 'Salted Gold Butter', price: 210.00, category: 'Butter', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80', rating: 4.9, badge: 'New' },
                { id: 4, name: 'Greek Probiotic Yogurt', price: 180.00, category: 'Yogurt', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80', rating: 5.0, badge: '' },
                { id: 5, name: 'Fresh Organic Eggs', price: 120.00, category: 'Eggs', image: 'https://images.unsplash.com/photo-1569427018095-f4435837a4b3?auto=format&fit=crop&w=600&q=80', rating: 4.7, badge: '' }
            ],
            orders: []
        };
    }

    serialize(callback) {
        callback();
    }

    run(query, params, callback) {
        if (typeof params === 'function') callback = params;
        if (callback) callback(null);
        return this;
    }

    get(query, params, callback) {
        if (typeof params === 'function') callback = params;
        if (query.includes("count FROM products")) {
            callback(null, { count: this.data.products.length });
        } else {
            callback(null, null);
        }
    }

    all(query, params, callback) {
        if (typeof params === 'function') callback = params;
        if (query.includes("SELECT * FROM products")) {
            callback(null, this.data.products);
        } else {
            callback(null, []);
        }
    }

    prepare(query) {
        return {
            run: () => {},
            finalize: () => {}
        };
    }
}

module.exports = {
    Database: Database,
    verbose: () => ({ Database: Database })
};
