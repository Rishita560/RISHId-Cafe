import random 
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
import os
from datetime import datetime
from flask_mail import Mail, Message
from dotenv import load_dotenv

load_dotenv() # load secret file

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) 

# --- Flask-Mail Configuration ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_DEFAULT_SENDER'] = ("RISHI'd Café", os.environ.get('MAIL_USERNAME'))
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')

mail = Mail(app)

def send_notification_email(recipient_email, subject, body_html):
    try:
        msg = Message(subject, recipients=[recipient_email]) # Just the recipient
        msg.html = body_html
        mail.send(msg)
    except Exception as e:
        print(f"Mail Error: {e}")

# --- MySQL Database Configuration ---
db_config = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),          
    'password': os.environ.get('DB_PASSWORD', 'root'),      
    'database': os.environ.get('DB_NAME', "RISHId_Café_db"),
    'port': int(os.environ.get('DB_PORT', 3306))
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# --- INITIALIZE DATABASE TABLES & DUMMY DATA ---
def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Staff Table
        cursor.execute('''CREATE TABLE IF NOT EXISTS staff (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            staff_id VARCHAR(50) UNIQUE NOT NULL,
                            password VARCHAR(255) NOT NULL
                        )''')
                        
        # Customers Table
        cursor.execute('''CREATE TABLE IF NOT EXISTS customers (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            full_name VARCHAR(100) NOT NULL,
                            email VARCHAR(100) UNIQUE NOT NULL,
                            password VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )''')
        
        # Menu Table
        cursor.execute('''CREATE TABLE IF NOT EXISTS menu_items (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            category VARCHAR(50) DEFAULT 'Custom Addition',
                            price DECIMAL(10,2) NOT NULL,
                            status VARCHAR(20) DEFAULT 'Available'
                        )''')
        
        # Orders Table
        cursor.execute('''CREATE TABLE IF NOT EXISTS orders (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            order_id VARCHAR(20) UNIQUE NOT NULL,
                            user_email VARCHAR(100), 
                            details TEXT NOT NULL,
                            total DECIMAL(10,2) NOT NULL,
                            status VARCHAR(20) DEFAULT 'pending',
                            time VARCHAR(20)
                        )''')
        
        # This will add the column to existing table safely
        try:
            cursor.execute("ALTER TABLE orders ADD COLUMN user_email VARCHAR(100)")
        except:
            pass # Column already exists, do nothing

        # Reservations Table
        cursor.execute('''CREATE TABLE IF NOT EXISTS reservations (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            customer_name VARCHAR(100) NOT NULL,
                            contact VARCHAR(50) NOT NULL,
                            guests VARCHAR(20) NOT NULL,
                            date_time VARCHAR(50) NOT NULL,
                            requests TEXT,
                            status VARCHAR(20) DEFAULT 'booked'
                        )''')
        
        # Insert Default Admin
        cursor.execute("INSERT IGNORE INTO staff (staff_id, password) VALUES ('admin', '1234')")
        
        # Insert Dummy Data if tables are empty
        cursor.execute("SELECT COUNT(*) FROM menu_items")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO menu_items (name, category, price, status) VALUES ('Signature Cold Brew', 'Cold Brew & Iced', 220, 'Available'), ('Butter Croissant', 'Pastries & Bites', 150, 'Sold Out'), ('Cappuccino', 'Espresso & Coffee', 180, 'Available')")
            
        cursor.execute("SELECT COUNT(*) FROM orders")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO orders (order_id, details, total, status, time) VALUES ('MB_8A9F21', '2x Cappuccino, 1x Croissant', 13.00, 'pending', '10:42 AM'), ('MB_3B4C5D', '1x Nitro Cold Brew, 1x Matcha Latte', 10.75, 'preparing', '10:35 AM')")

        cursor.execute("SELECT COUNT(*) FROM reservations")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO reservations (customer_name, contact, guests, date_time, requests, status) VALUES ('Sarah Jenkins', '(555) 123-4567', '2 People', 'Today, 12:30 PM', 'Window seat', 'booked')")

        conn.commit()
        cursor.close()
        conn.close()
        print("Database tables initialized successfully!")
    except Exception as e:
        print(f"Error initializing DB: {e}")

init_db()

# --- SERVE HTML PAGES ---
@app.route('/')
def home():
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:filename>')
def serve_files(filename):
    return send_from_directory(os.getcwd(), filename)

# --- AUTHENTICATION APIs ---
@app.route('/api/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM staff WHERE staff_id = %s AND password = %s", (data.get('staffId'), data.get('password')))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        if user: return jsonify({"success": True})
        else: return jsonify({"success": False, "message": "User not found or incorrect password."})
    except Exception as e: return jsonify({"success": False, "message": str(e)})

@app.route('/api/customer-login', methods=['POST'])
def customer_login():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM customers WHERE email = %s AND password = %s", (data.get('email'), data.get('password')))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        if user: return jsonify({"success": True, "message": "Login successful!"})
        else: return jsonify({"success": False, "message": "Customer not found or incorrect password."})
    except Exception as e: return jsonify({"success": False, "message": str(e)})

@app.route('/api/customer-signup', methods=['POST'])
def customer_signup():
    data = request.get_json()
    email = data.get('email')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Check if exists
        cursor.execute("SELECT * FROM customers WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "Email is already registered. Please log in."})
        # Insert
        cursor.execute("INSERT INTO customers (full_name, email, password) VALUES (%s, %s, %s)", (data.get('fullName'), email, data.get('password')))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e: return jsonify({"success": False, "message": str(e)})

@app.route('/api/orders/add', methods=['POST'])
def create_order():
    data = request.get_json()
    order_id = f"MB_{random.randint(100000, 999999)}"
    time_now = datetime.now().strftime("%I:%M %p")
    
    details = data.get('details')
    total = data.get('total')
    user_email = data.get('email') 
    payment_mode = data.get('payment_mode') 

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # saving user_email to the database
        cursor.execute("INSERT INTO orders (order_id, user_email, details, total, status, time) VALUES (%s, %s, %s, %s, %s, %s)",
                       (order_id, user_email, details, total, 'pending', time_now))
        conn.commit()

        # SEND EMAIL TO CUSTOMER
        customer_html = f"""
        <html><body>
            <h2> Order Confirmation - RISHI'd Café</h2>
            <p>Thank you for your order! We are preparing it now.</p>
            <p><b>Order ID:</b> {order_id}</p>
            <p><b>Items:</b> {details}</p>
            <p><b>Total Amount:</b> ₹{total}</p>
            <p>See you soon!</p>
        </body></html>
        """
        send_notification_email(user_email, "Your RISHI'd Café Order Receipt", customer_html)

        # SEND EMAIL TO ADMIN (Company Mail)
        admin_html = f"""
        <html><body>
            <h2 style="color: #BA5A3A;"> New Order Alert!</h2>
            <p><b>Customer Email:</b> {user_email}</p>
            <p><b>Order ID:</b> {order_id}</p>
            <p><b>Time:</b> {time_now}</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin-top: 15px;">
                <h3>Menu Items Ordered:</h3>
                <p style="font-size: 16px;">{details}</p>
                <p><b>Total Value:</b> ₹{total}</p>
                <p><b>Payment Mode:</b> {payment_mode}</p>
            </div>
            <p><i>Check the Admin Dashboard to start preparation.</i></p>
        </body></html>
        """
        # Send to the company email explicitly
        send_notification_email(os.environ.get('MAIL_USERNAME'), f"New Order from {user_email}", admin_html)

        return jsonify({"success": True, "order_id": order_id})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    
@app.route('/api/reservations/add', methods=['POST'])
def create_reservation():
    data = request.get_json()
    user_email = data.get('email') # Capture email for notification
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO reservations (customer_name, contact, guests, date_time, requests, status) VALUES (%s, %s, %s, %s, %s, %s)",
            (data.get('name'), data.get('contact'), data.get('guests', '2 People'), data.get('date_time'), data.get('requests', 'None'), 'booked')
        )
        conn.commit()

        # Send Reservation Confirmation
        email_body = f"""
        <html>
            <body>
                <h2> Table Reserved! </h2>
                <p>Hello {data.get('name')}, your table at RISHI'd Café is confirmed.</p>
                <p><b>Date & Time:</b> {data.get('date_time')}</p>
                <p><b>Guests:</b> {data.get('guests')}</p>
                <p>We look forward to serving you!</p>
            </body>
        </html>
        """
        send_notification_email(user_email, "Reservation Confirmed - RISHI'd Café", email_body)

        cursor.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e: 
        return jsonify({"success": False, "message": str(e)})
    

# --- DASHBOARD APIs ---
@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), SUM(total) FROM orders WHERE status != 'completed'")
        orders_data = cursor.fetchone()
        orders_count = orders_data[0] if orders_data[0] else 0
        revenue = float(orders_data[1]) if orders_data[1] else 0.0
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE status = 'booked'")
        res_count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return jsonify(
            {
                "success": True, 
                "data": {
                    "orders_today": orders_count, 
                    "revenue": revenue, 
                    "bookings": res_count
                }
            }
        )
    except Exception as e: return jsonify({"success": False, "message": str(e)})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM orders WHERE status != 'completed' ORDER BY id DESC")
    orders = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "data": orders})

# --- Admin Order Status Update ---
@app.route('/api/orders/update', methods=['POST'])
def update_order():
    data = request.get_json()
    new_status = data.get('status')
    order_db_id = data.get('id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Get the order details (which now includes the user_email)
    cursor.execute("SELECT * FROM orders WHERE id = %s", (order_db_id,))
    order = cursor.fetchone()
    
    # Update the status in the database
    cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, order_db_id))
    conn.commit()
    
    # Send the Status Update Email
    user_email = order.get('user_email')
    order_id = order.get('order_id')
    
    # Only send emails if we have the user's email and the status is one we want to notify them about
    if user_email and new_status in ['preparing', 'ready']:
        if new_status == 'preparing':
            subject = " Your Order is in the Kitchen!"
            body = f"""
            <html><body>
                <h2>Great news!</h2>
                <p>Your order <b>{order_id}</b> is now being prepared by our baristas.</p>
                <p>We'll let you know the moment it's ready.</p>
            </body></html>
            """
        elif new_status == 'ready':
            subject = " Your Order is Ready for Pickup!"
            body = f"""
            <html><body>
                <h2 style="color: #28a745;">It's Ready!</h2>
                <p>Your order <b>{order_id}</b> is fresh and ready for you at the counter.</p>
                <p>Enjoy your RISHI'd Café experience!</p>
            </body></html>
            """
            
        send_notification_email(user_email, subject, body)
    
    cursor.close()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/reservations', methods=['GET'])
def get_reservations():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM reservations WHERE status != 'cancelled' ORDER BY id ASC")
    res = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "data": res})

@app.route('/api/reservations/update', methods=['POST'])
def update_reservation():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE reservations SET status = %s WHERE id = %s", (data.get('status'), data.get('id')))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/menu', methods=['GET'])
def get_menu():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM menu_items ORDER BY id DESC")
    menu = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "data": menu})

@app.route('/api/menu/add', methods=['POST'])
def add_menu():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO menu_items (name, price, category) VALUES (%s, %s, %s)", 
        (data.get('name'), data.get('price'), data.get('category'))
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/menu/edit', methods=['POST'])
def edit_menu():
    try:
        data = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE menu_items SET name = %s, price = %s WHERE id = %s", 
                       (data.get('name'), data.get('price'), data.get('id')))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/api/menu/delete', methods=['POST'])
def delete_menu():
    try:
        data = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM menu_items WHERE id = %s", (data.get('id'),))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/api/menu/update-status', methods=['POST'])
def update_menu_status():
    try:
        data = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update the status in the database
        cursor.execute("UPDATE menu_items SET status = %s WHERE id = %s", 
                       (data.get('status'), data.get('id')))
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/api/customers', methods=['GET'])
def get_customers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, full_name, email, created_at FROM customers ORDER BY id DESC")
    cust = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "data": cust})

if __name__ == '__main__':
    print("Starting RISHI'd_Café_db Server on http://localhost:5000")
    app.run(debug=True, port=5000)