let customerIsLoggedIn = false;
let loggedInUserEmail = ""; 
let cart = [];
let currentCheckoutTotal = 0;

document.getElementById("openMenu").addEventListener("click", () => {
  document.getElementById("mobileMenu").classList.add("active");
});
document.getElementById("closeMenu").addEventListener("click", () => {
  document.getElementById("mobileMenu").classList.remove("active");
});

function navigateTo(sectionId) {
  document.querySelectorAll(".page-section").forEach((sec) => sec.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");
  window.scrollTo(0, 0);
  document.querySelectorAll(".nav-link").forEach((link) => {
    if (link.getAttribute("onclick") && link.getAttribute("onclick").includes(sectionId))
      link.classList.add("active");
    else link.classList.remove("active");
  });
  document.getElementById("mobileMenu").classList.remove("active");
}

function handleBookingClick() {
  if (!customerIsLoggedIn) navigateTo("sec-customer-login");
  else navigateTo("sec-booking");
}
function handleAuthClick() {
  if (customerIsLoggedIn) {
    if (confirm("Log out?")) {
      customerIsLoggedIn = false;
      loggedInUserEmail = ""; // Clear the email on logout
      updateAuthUI();
      navigateTo("sec-home");
    }
  } else navigateTo("sec-role-select");
}

function updateAuthUI() {
  const addButtons = document.querySelectorAll(".add-cart-btn");
  if (customerIsLoggedIn) {
    document.getElementById("navAuthBtn").innerText = "Log Out";
    document.getElementById("mobileAuthBtn").innerText = "Log Out";
    document.getElementById("menuIntroMsg").innerText = "Add your favorite items to your bill.";
    addButtons.forEach((btn) => (btn.style.display = "flex"));
    document.getElementById("floatingCartBtn").style.display = "flex";
  } else {
    document.getElementById("navAuthBtn").innerText = "Login";
    document.getElementById("mobileAuthBtn").innerText = "Login";
    document.getElementById("menuIntroMsg").innerText = "Login to order items.";
    addButtons.forEach((btn) => (btn.style.display = "none"));
    document.getElementById("floatingCartBtn").style.display = "none";
    cart = [];
    updateCartUI();
  }
  loadCustomerMenu();
}

// MySQL Connections
document.getElementById("customerLoginForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const email = document.getElementById("custEmail").value;
  const pass = document.getElementById("custPass").value;
  const errBox = document.getElementById("custLoginError");
  errBox.style.display = "none";
  try {
    const response = await fetch("/api/customer-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await response.json();
    if (data.success) {
      customerIsLoggedIn = true;
      loggedInUserEmail = email; // Save the email
      updateAuthUI();
      this.reset();
      navigateTo("sec-menu");
    } else {
      errBox.innerText = data.message;
      errBox.style.display = "block";
    }
  } catch (e) {
    errBox.innerText = "No connection to Python server.";
    errBox.style.display = "block";
  }
});

document.getElementById("customerSignupForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const name = document.getElementById("signName").value;
  const email = document.getElementById("signEmail").value;
  const pass = document.getElementById("signPass").value;
  const errBox = document.getElementById("custSignupError");
  errBox.style.display = "none";
  try {
    const response = await fetch(
      "/api/customer-signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, email, password: pass }),
      },
    );
    const data = await response.json();
    if (data.success) {
      customerIsLoggedIn = true;
      loggedInUserEmail = email; // Save the email
      updateAuthUI();
      this.reset();
      navigateTo("sec-menu");
    } else {
      errBox.innerText = data.message;
      errBox.style.display = "block";
    }
  } catch (e) {
    errBox.innerText = "No connection to Python server.";
    errBox.style.display = "block";
    }
});

document.getElementById("adminLoginForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const staffId = document.getElementById("staffId").value;
  const password = document.getElementById("staffPassword").value;
  const errorMsg = document.getElementById("adminErrorMsg");
  errorMsg.style.display = "none";
  try {
    const response = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, password }),
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem("rishid_admin_logged_in", "true");
      window.location.href = "dashboard.html";
    } else {
      errorMsg.innerText = data.message;
      errorMsg.style.display = "block";
    }
  } catch (e) {
    errorMsg.innerText = "No connection to Python server.";
    errorMsg.style.display = "block";
  }
});

// -------------------------
// ADVANCED CART & BILL LOGIC
// -------------------------
function toggleCart() {
  document.getElementById("cartSidebar").classList.toggle("open");
}

function addToCart(name, price) {
  const existing = cart.find((item) => item.name === name);
  if (existing) existing.quantity += 1;
  else cart.push({ name, price, quantity: 1 });
  updateCartUI();
  if (!document.getElementById("cartSidebar").classList.contains("open"))
    toggleCart();
}

function decreaseQuantity(name) {
  const existing = cart.find((item) => item.name === name);
  if (existing) {
    existing.quantity -= 1;
    if (existing.quantity <= 0) {
      removeFromCart(name);
      return;
    }
  }
  updateCartUI();
}
function removeFromCart(name) {
  cart = cart.filter((item) => item.name !== name);
  updateCartUI();
}

function updateCartUI() {
  const container = document.getElementById("cartItemsContainer");
  let html = "";
  let totalAmount = 0,
  totalItems = 0;

  if (cart.length === 0) {
    html = '<div class="cart-empty-msg" id="emptyCartMsg">Your bill is currently empty.</div>';
  } else {
      cart.forEach((item) => {
        totalAmount += item.price * item.quantity;
        totalItems += item.quantity;
        html += `
                  <div class="cart-item">
                    <div class="cart-item-details">
                      <span class="cart-item-title">${item.name}</span>
                      <span class="cart-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div class="cart-item-controls">
                      <button class="qty-btn" onclick="decreaseQuantity('${item.name}')"><i class="fas fa-minus"></i></button>
                      <span class="qty-display">${item.quantity}</span>
                      <button class="qty-btn" onclick="addToCart('${item.name}', ${item.price})"><i class="fas fa-plus"></i></button>
                      <button class="remove-item" onclick="removeFromCart('${item.name}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                  </div>
                `;
    });
  }

  // Inject safe HTML
  container.innerHTML = html;

  // Update Totals & Badges
  currentCheckoutTotal = totalAmount;
  document.getElementById("cartTotalValue").innerText = `₹${totalAmount.toFixed(2)}`;
  document.getElementById("cartBadge").innerText = totalItems;

  // Enable/Disable Checkout Button
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (totalAmount > 0) {
    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = "1";
    checkoutBtn.style.cursor = "pointer";
  } else {
    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = "0.5";
    checkoutBtn.style.cursor = "not-allowed";
  }
}

// --- CHECKOUT LOGIC ---//
function prepareCheckout() {
  if (cart.length === 0 || currentCheckoutTotal === 0) {
    alert("Your bill is empty. Please add items before checking out.");
    return;
  }

  const checkoutList = document.getElementById("checkoutItemsList");
  checkoutList.innerHTML = "";

  cart.forEach((item) => {
    checkoutList.innerHTML += `
                                <div style="display:flex; justify-content:space-between; font-size:15px; margin-bottom:8px; color:#ddd;">
                                  <span><span style="font-weight:bold; color:#fff;">${item.quantity}x</span> ${item.name}</span>
                                  <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              `;
  });

  const tax = currentCheckoutTotal * 0.085;
  const final = currentCheckoutTotal + tax;
  document.getElementById("chkSubtotal").innerText = `₹${currentCheckoutTotal.toFixed(2)}`;
  document.getElementById("chkTax").innerText = `₹${tax.toFixed(2)}`;
  document.getElementById("chkTotal").innerText = `₹${final.toFixed(2)}`;

  document.getElementById("cartSidebar").classList.remove("open");
  navigateTo("sec-checkout");
}

function switchTab(method) {
  document.querySelectorAll(".pay-tab").forEach((t) => t.classList.remove("active"));
  event.currentTarget.classList.add("active");
  document.querySelectorAll(".pay-form-area").forEach((a) => a.classList.remove("active"));
  document.getElementById(`${method}-area`).classList.add("active");
  const cardInputs = document.querySelectorAll("#card-area input");
  const upiInput = document.getElementById("upiId");
  if (method === "card") {
    cardInputs.forEach((i) => i.setAttribute("required", "true"));
    upiInput.removeAttribute("required");
  } else if (method === "upi") {
    cardInputs.forEach((i) => i.removeAttribute("required"));
    upiInput.setAttribute("required", "true");
  }
}

document.getElementById("cardNumber").addEventListener("input", function (e) {
  let v = this.value.replace(/\D/g, "");
  v = v.replace(/(.{4})/g, "$1 ").trim();
  this.value = v;
});
document.getElementById("cardExp").addEventListener("input", function (e) {
  let v = this.value.replace(/\D/g, "");
  if (v.length > 2) v = v.substring(0, 2) + "/" + v.substring(2, 4);
  this.value = v;
});
document.getElementById("cardCvv").addEventListener("input", function (e) {
  this.value = this.value.replace(/\D/g, "");
});

async function processPayment() {
  const form = document.getElementById('paymentForm');
  if (!form.checkValidity()) { form.reportValidity(); return; }
    
  // GET THE EMAIL AND PAYMENT MODE
  const userEmail = loggedInUserEmail;
  const paymentMethod = document.querySelector('.pay-tab.active').innerText.trim();

  const btn = document.getElementById('masterPayBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;
    
  // Format cart items into a single string for the database (e.g. "2x Latte, 1x Croissant")
  const detailsString = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');
  const tax = currentCheckoutTotal * 0.085;
  const finalTotal = currentCheckoutTotal + tax;

  try {
    const response = await fetch('/api/orders/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        details: detailsString,
        total: finalTotal.toFixed(2),
        email: userEmail,       
        payment_mode: paymentMethod 
      })
    });

    const result = await response.json();
        
    if (result.success) {
      alert("Payment Successful! Your order has been sent to the kitchen.");
      cart = []; 
      updateCartUI(); 
      form.reset();
      navigateTo('sec-home');
    } else {
        alert("Order failed: " + result.message);
    }
  } catch (e) {
      alert("Error connecting to the server.");
    } finally {
        btn.innerHTML = 'Pay Securely <i class="fas fa-lock"></i>'; 
        btn.disabled = false;
    }
}

// Initialize UI
updateCartUI();

// --- Reservation API Call ---
async function submitBooking(event) {
  event.preventDefault();

  const name = document.getElementById("bookName").value;
  const phone = document.getElementById("bookPhone").value;
  const date = document.getElementById("bookDate").value;
  const time = document.getElementById("bookTime").value;
  
  // Grab the values from the new input fields
  const guests = document.getElementById("bookGuests").value;
  const requests = document.getElementById("bookRequests").value || "None";
  
  const userEmail = loggedInUserEmail;
  const dateTime = `${date}, ${time}`; // Combine date and time for the database

  try {
    const response = await fetch("/api/reservations/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        contact: phone,
        date_time: dateTime,
        email: userEmail,
        guests: guests,    // Sending the actual guest count
        requests: requests // Sending the actual requests
      }),
    });

    const result = await response.json();
    if (result.success) {
      alert("Table booked successfully!");
      event.target.reset();
      navigateTo("sec-home");
    } else {
      alert("Booking failed: " + result.message);
    }
  } catch (e) {
    alert("Error connecting to the server.");
  }
}


// --- Fetch Menu from Database ---
async function loadCustomerMenu() {
  try {
    const response = await fetch('/api/menu');
    const result = await response.json();
        
    if (result.success) {
      const grid = document.querySelector('.menu-grid');
      grid.innerHTML = ''; // This wipes out the hardcoded HTML
            
      // Group the items by their category
      const categories = {};
      result.data.forEach(item => {
        const cat = item.category || 'Custom Addition';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      // Generate fresh HTML from the database
      for (const [category, items] of Object.entries(categories)) {
        let catHTML = `<div class="menu-category"><h2>${category}</h2>`;
        items.forEach(item => {
          // Hide Add button if logged out or sold out
          const btnStyle = (customerIsLoggedIn && item.status !== 'Sold Out') ? 'display: flex;' : 'display: none;';
          const statusTxt = item.status === 'Sold Out' ? '<span style="color:red; font-size:12px; margin-left:8px;">(Sold Out)</span>' : '';
                    
          catHTML += `
                    <div class="menu-item">
                        <div class="menu-item-header">
                            <span class="menu-item-title">${item.name} ${statusTxt}</span>
                            <div class="menu-item-dots"></div>
                            <span class="menu-item-price" style="font-weight: bold;">₹${parseFloat(item.price).toFixed(2)}</span>
                            <button class="add-cart-btn" style="${btnStyle}" onclick="addToCart('${item.name}', ${item.price})"><i class="fas fa-plus"></i> Add</button>
                        </div>
                    </div>`;
        });
        catHTML += `</div>`;
        grid.innerHTML += catHTML;
      }
    }
  } catch(error) {
    console.error("Menu fetch error:", error);
  }
}

// Run this as soon as the page loads
loadCustomerMenu();