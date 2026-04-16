import http.server
import socketserver
import json
import sqlite3
import os

PORT = 3006

# Database Initialization
def init_db():
    if os.path.exists('farmas.db'):
        os.remove('farmas.db')
    conn = sqlite3.connect('farmas.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT,
        image TEXT,
        rating REAL DEFAULT 5.0,
        badge TEXT,
        unit_label TEXT,
        min_qty REAL
    )''')
    
    products = [
        ('Premium Cow Ghee', 750.0, 'Dairy', 'desi_ghee.png', 5.0, 'Premium', 'kg', 1),
        ('Fresh Malai Paneer', 450.0, 'Dairy', 'malai_paneer.png', 5.0, 'Best Seller', 'kg', 0.5),
        ('Full Cream Fresh Milk', 68.0, 'Milk', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', 4.9, 'Fresh', 'L', 2),
        ('Buffalo Milk (High Fat)', 82.0, 'Milk', 'https://images.unsplash.com/photo-1563636619-e910ef2a844b?auto=format&fit=crop&w=600&q=80', 5.0, '', 'L', 2),
        ('Fresh Thick Curd', 120.0, 'Dairy', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80', 4.8, '', 'kg', 1),
        ('Desi White Butter', 650.0, 'Dairy', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80', 4.9, 'Pure', 'kg', 0.5),
        ('Khoya (Mawa)', 380.0, 'Dairy', 'https://images.unsplash.com/photo-1631454170756-3b76251b14a2?q=80&w=600&auto=format&fit=crop', 4.7, '', 'kg', 0.5),
        ('Fresh Sweet Lassi', 50.0, 'Beverage', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=600&auto=format&fit=crop', 4.8, 'Refreshing', 'piece', 1),
        ('Masala Buttermilk', 30.0, 'Beverage', 'masala_buttermilk.png', 4.6, '', 'piece', 1),
        ('Fresh Rabri', 550.0, 'Sweets', 'https://images.unsplash.com/photo-1589113155031-c6bc29fc846d?q=80&w=600&auto=format&fit=crop', 5.0, 'Traditional', 'kg', 0.5),
        ('A2 Vedic Ghee', 1200.0, 'Dairy', 'desi_ghee.png', 5.0, 'Vedic', 'kg', 0.5)
    ]
    cursor.executemany("INSERT INTO products (name, price, category, image, rating, badge, unit_label, min_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", products)
    conn.commit()
    conn.close()

init_db()

class VaishnaviHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/products':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            conn = sqlite3.connect('farmas.db')
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM products")
            rows = cursor.fetchall()
            products = []
            for r in rows:
                products.append({
                    "id": r[0], "name": r[1], "price": r[2], 
                    "category": r[3], "image": r[4], 
                    "rating": r[5], "badge": r[6],
                    "unit_label": r[7], "min_qty": r[8]
                })
            conn.close()
            self.wfile.write(json.dumps(products).encode())
        else:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path == '/api/create-checkout-session':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {"status": "success", "url": "/checkout.html"}
            self.wfile.write(json.dumps(response).encode())

with socketserver.TCPServer(("", PORT), VaishnaviHandler) as httpd:
    print(f"Vaishnavi Dairy Server running at http://localhost:{PORT}")
    httpd.serve_forever()
