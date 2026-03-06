# ☕ RISHI'd Café - Full-Stack Cafe Management System

![Live Status](https://img.shields.io/badge/Status-Live-brightgreen)
![Python](https://img.shields.io/badge/Python-3.x-blue)
![Flask](https://img.shields.io/badge/Flask-Backend-black)
![MySQL](https://img.shields.io/badge/MySQL-Database-orange)

**Live Demo:** [https://rishid-cafe.onrender.com](https://rishid-cafe.onrender.com)

## About The Project
RISHI'd Café is a comprehensive, full-stack web application designed to handle both the customer-facing e-commerce experience and the internal administrative operations of a modern coffee shop. 

Built with a responsive vanilla frontend and a robust Python/Flask backend, this application allows customers to place live orders and book tables, while providing staff with a secure, real-time dashboard to manage kitchen operations and database records.

## Key Features

### Customer Portal
* **Secure Authentication:** User sign-up and login functionality.
* **Interactive Menu & Cart:** Browse categories, add items to the cart, and manage quantities.
* **Checkout Simulation:** Secure checkout UI supporting both Card and UPI payment flows.
* **Table Reservations:** Book tables for specific dates, times, and guest counts.

### Admin Dashboard (Staff Portal)
* **Real-time Live Orders:** View incoming orders, start preparation, and mark them as ready.
* **Menu Management:** Perform full CRUD (Create, Read, Update, Delete) operations on menu items and toggle 'Sold Out' status.
* **Reservation Tracking:** Manage incoming table bookings, check-in guests, or cancel reservations.
* **Business Analytics:** View total revenue, active orders, and a comprehensive customer database.

## Built With
* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Python, Flask, Flask-CORS
* **Database:** MySQL (Hosted in the cloud via Aiven)
* **Deployment:** Render (Gunicorn WSGI)

## Running the Project Locally

To run this project on your local machine for development or testing:

1️. Clone the Repository
```bash
git clone https://github.com/Rishita560/RISHId-Cafe.git
cd rishid-cafe
```
2️. Install Dependencies
```bash
pip install -r requirements.txt
```
3. Set Environment Variables

Create a .env file in the root directory and add your database credentials:
```bash
DB_HOST=your_database_host

DB_PORT=your_database_port

DB_USER=your_database_user

DB_PASSWORD=your_database_password

DB_NAME=your_database_name
```
4. Start the Server
```
python app.py
```
The application will run at:

http://localhost:5000

## Future Enhancements :

Re-enable Flask-Mail SMTP server for automated customer email receipts and staff notifications.

Add user profile pages for customers to view their past order history.

------------------------------------------------------------------------------------------------------------------------------------------------------------------
** Designed and built by Rishita. **
