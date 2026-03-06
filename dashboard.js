const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('rishid_admin_logged_in');
    if (isLoggedIn !== 'true') window.location.href = 'index.html'; 
    loadAllData();
});

function loadAllData() {
    loadDashboardStats();
    loadOrders();
    loadReservations();
    loadMenu();
    loadCustomers(); // Load newly registered customers
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/dashboard-stats`);
        const result = await response.json();
        if (result.success) {
            document.getElementById('statOrders').innerText = result.data.orders_today;
            document.getElementById('statRevenue').innerText = '₹' + result.data.revenue.toFixed(2);
            document.getElementById('statReservations').innerText = result.data.bookings;
        }
    } catch (error) {}
}

async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/orders`);
        const result = await response.json();
        
        // Ensure elements exist before trying to clear them
        const tableBody = document.querySelector('#ordersTable tbody');
        const overviewBody = document.querySelector('#overviewTable tbody');
        
        if (!tableBody || !overviewBody) {
            console.error("Table bodies not found in the DOM");
            return;
        }

        tableBody.innerHTML = ''; 
        overviewBody.innerHTML = '';

        if (result.success && result.data) {
            result.data.forEach((order, index) => {
                // Formatting for the Overview section
                if(index < 5) {
                    overviewBody.innerHTML += `
                        <tr>
                            <td><strong>${order.order_id}</strong></td>
                            <td>${order.details}</td>
                            <td>₹${parseFloat(order.total).toFixed(2)}</td>
                            <td><span class="status ${order.status}">${order.status}</span></td>
                        </tr>`;
                }

                // Logic for action buttons and clickable status badges
                let actionBtn = '';
                let nextStatus = '';
                
                if (order.status === 'pending') {
                    nextStatus = 'preparing';
                    actionBtn = `<button class="action-btn" onclick="updateOrderStatus(${order.id}, 'preparing')">Start Prep</button>`;
                } else if (order.status === 'preparing') {
                    nextStatus = 'ready';
                    actionBtn = `<button class="action-btn success" onclick="updateOrderStatus(${order.id}, 'ready')">Mark Ready</button>`;
                } else if (order.status === 'ready') {
                    nextStatus = 'completed';
                    actionBtn = `<button class="action-btn delete" onclick="updateOrderStatus(${order.id}, 'completed')">Clear</button>`;
                }

                // Add pointer cursor and onclick to the status span itself
                let statusClickAttr = nextStatus ? `onclick="updateOrderStatus(${order.id}, '${nextStatus}')" style="cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1" title="Click to mark as ${nextStatus}"` : '';

                tableBody.innerHTML += `
                    <tr>
                        <td>${order.time}</td>
                        <td><strong>${order.order_id}</strong></td>
                        <td>${order.details}</td>
                        <td>₹${parseFloat(order.total).toFixed(2)}</td>
                        <td><span class="status ${order.status}" ${statusClickAttr}> ${order.status} </span></td>
                        <td>${actionBtn}</td>
                    </tr>`;
            });
        }
    } catch (error) {
        console.error("Dashboard Load Error:", error);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    await fetch(`${API_BASE}/orders/update`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            id: orderId, 
            status: newStatus,
            notify: true // Tell backend to send an update email
        }) 
    });
    loadAllData();
}

async function loadReservations() {
    try {
        const response = await fetch(`${API_BASE}/reservations`);
        const result = await response.json();
        const tableBody = document.querySelector('#reservationsTable tbody');
        tableBody.innerHTML = '';

        if (result.success) {
            result.data.forEach(res => {
                let actions = '';
                if(res.status === 'booked') {
                    actions = `
                        <button class="action-btn success" onclick="updateReservation(${res.id}, 'checked_in')">
                            Check In
                        </button> 
                        <button class="action-btn delete" onclick="updateReservation(${res.id}, 'cancelled')">
                            Cancel
                        </button>
                    `;
                } else actions = `<span style="color:#aaa; font-size:12px;">Checked In</span>`;

                tableBody.innerHTML += `
                            <tr style="${res.status === 'checked_in' ? 'background-color:#f9f9f9; color:#888;' : ''}">
                                <td>${res.date_time}</td>
                                <td><strong>${res.customer_name}</strong></td>
                                <td>${res.contact}</td>
                                <td>${res.guests}</td>
                                <td>${res.requests || 'None'}</td>
                                <td><span class="status ${res.status}">${res.status.replace('_',' ')}</span></td>
                                <td>${actions}</td>
                            </tr>
                        `;
            });
        }
    } catch (error) {}
}

async function updateReservation(resId, newStatus) {
    if (newStatus === 'cancelled' && !confirm("Cancel this reservation?")) return;
    await fetch(`${API_BASE}/reservations/update`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id: resId, status: newStatus }) 
        }
    );
    loadAllData();
}

async function loadMenu() {
    try {
        // Cache-busting URL to ensure fresh data
        const response = await fetch(`${API_BASE}/menu?t=${new Date().getTime()}`, { cache: 'no-store' });
        const result = await response.json();
        const tableBody = document.querySelector('#menuTable tbody');
        
        if (!tableBody) return; 
        tableBody.innerHTML = '';

        if (result.success && result.data) {
            result.data.forEach(item => {
                const price = parseFloat(item.price) || 0;
                const statusClass = item.status.replace(/\s+/g, '').toLowerCase();

                // Escape quotes so items like "Librarian's Blend" don't break the Edit button
                const safeName = item.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${item.name}</strong></td>
                        <td>${item.category || 'Uncategorized'}</td>
                        <td>₹${price.toFixed(2)}</td>
                        <td>
                            <span class="status ${statusClass}" 
                                  style="cursor: pointer; transition: opacity 0.2s;" 
                                  onclick="toggleMenuStatus(${item.id}, '${item.status}')"
                                  onmouseover="this.style.opacity=0.7" 
                                  onmouseout="this.style.opacity=1"
                                  title="Click to toggle Available/Sold Out">
                                ${item.status}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn" onclick="editMenuItem(${item.id}, '${safeName}', ${price})">
                                Edit
                            </button>
                            <button class="action-btn delete" onclick="deleteMenuItem(${item.id})">
                                Delete
                            </button>
                        </td>
                    </tr>`;
            });
        }
    } catch (error) {
        console.error("Menu Load Error:", error);
    }
}

async function toggleMenuStatus(id, currentStatus) {
    // If it's Available, make it Sold Out. Otherwise, make it Available.
    const newStatus = currentStatus === 'Available' ? 'Sold Out' : 'Available';
    
    try {
        const response = await fetch(`${API_BASE}/menu/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, status: newStatus })
        });
        
        const result = await response.json();
        if (result.success) {
            loadMenu(); // Refresh the table to show the new status colors
        } else {
            alert("Failed to update status: " + result.message);
        }
    } catch (error) {
        alert("Server connection error.");
    }
}

async function addNewMenuItem() {
    const name = prompt("Enter new menu item name:");
    if (!name) return; 

    const category = prompt("Enter category (e.g., Espresso & Coffee, Pastries & Bites):");
    if (!category) return;

    let price = prompt("Enter price (e.g. 150):");
    if (!price) return;
    price = parseFloat(price.replace(/[^0-9.]/g, ''));

    await fetch(`${API_BASE}/menu/add`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            name: name, 
            price: price, 
            category: category
        }) 
    });
    loadMenu();
}

async function editMenuItem(id, currentName, currentPrice) {
    // Revert the encoded quotes so they look normal in the prompt box
    const decodedName = currentName.replace(/&quot;/g, '"');
    
    const newName = prompt("Edit Item Name:", decodedName);
    if (!newName) return;
    
    let newPrice = prompt("Edit Item Price:", currentPrice);
    if (!newPrice) return;
    newPrice = parseFloat(newPrice.replace(/[^0-9.]/g, ''));

    try {
        const response = await fetch(`${API_BASE}/menu/edit`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id: id, name: newName, price: newPrice }) 
        });
        const result = await response.json();
        if (!result.success) alert("Edit failed: " + result.message);
    } catch (error) {
        alert("Server connection error.");
    }
    
    // Reload menu immediately after the fetch completes
    loadMenu();
}

async function deleteMenuItem(id) {
    if(!confirm("Delete item permanently?")) return;
    
    try {
        const response = await fetch(`${API_BASE}/menu/delete`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id: id }) 
        });
        const result = await response.json();
        if (!result.success) alert("Delete failed: " + result.message);
    } catch (error) {
        alert("Server connection error.");
    }
    
    // Reload menu immediately after the fetch completes
    loadMenu();
}

// --- NEW: Load Customers Logic ---
async function loadCustomers() {
    try {
        const response = await fetch(`${API_BASE}/customers`);
        const result = await response.json();
        const tableBody = document.querySelector('#customersTable tbody');
        tableBody.innerHTML = '';

        if (result.success) {
            result.data.forEach(cust => {
                // Format the MySQL timestamp nicely
                const joinDate = new Date(cust.created_at).toLocaleDateString();
                tableBody.innerHTML += `
                            <tr>
                                <td>#CUST_${cust.id}</td>
                                <td><strong>${cust.full_name}</strong></td>
                                <td>${cust.email}</td>
                                <td>${joinDate}</td>
                            </tr>
                        `;
            });
        }
    } catch (error) {}
}

// --- UI Navigation ---
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content-section');
navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        sections.forEach(sec => sec.classList.remove('active'));
        const targetId = this.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        if (window.innerWidth <= 992) toggleSidebar();
    });
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
    document.body.style.overflow = document.getElementById('sidebar').classList.contains('active') ? 'hidden' : 'auto';
}

document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);

function logout() {
    if(confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('rishid_admin_logged_in'); 
        window.location.href = 'index.html'; 
    }
}