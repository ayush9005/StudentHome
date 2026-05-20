const API_BASE_URL = 'http://localhost:10000';
let properties = [];
let selectedPropertyForBooking = null;
let authMode = 'login';

document.addEventListener("DOMContentLoaded", () => {
    fetchPropertiesFromDatabase();
    setupEventListeners();
    checkAuthStatus();
    injectMockRazorpayModalHTML();
});

async function fetchPropertiesFromDatabase() {
    const loader = document.getElementById("shimmerLoader");
    const grid = document.getElementById("pgContainer");
    if (loader) loader.classList.remove("hidden");
    if (grid) grid.classList.add("hidden");

    try {
        const response = await fetch(`${API_BASE_URL}/api/properties`);
        properties = await response.json();
        
        setTimeout(() => {
            if (loader) loader.classList.add("hidden");
            if (grid) grid.classList.remove("hidden");
            renderProperties(properties);
        }, 800);
    } catch (err) {
        console.error("Database connection dropped:", err);
    }
}

function setupEventListeners() {
    document.getElementById("searchBtn")?.addEventListener("click", handleSearch);
    document.getElementById("searchInput")?.addEventListener("keypress", (e) => { if (e.key === 'Enter') handleSearch(); });
    document.getElementById("sortSelect")?.addEventListener("change", handleSort);
    document.getElementById("propertyForm")?.addEventListener("submit", handleAddProperty);
    document.getElementById("studentForm")?.addEventListener("submit", handleAuthSubmit);
    document.getElementById("finalBookingForm")?.addEventListener("submit", handlePaymentExecution);
}

function renderProperties(data) {
    const container = document.getElementById("pgContainer");
    const countLabel = document.getElementById("countLabel");
    if (!container) return;
    container.innerHTML = "";
    if (countLabel) countLabel.textContent = `${data.length} active spaces mapped around your parameters`;

    if (data.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 font-bold">No verified spaces matches current query bounds.</div>`;
        return;
    }

    data.forEach(p => {
        container.innerHTML += `
            <div class="bg-white rounded-[2rem] overflow-hidden shadow-md border border-gray-100 flex flex-col group hover:shadow-xl transition-all duration-300">
                <div class="relative overflow-hidden aspect-[4/3]">
                    <img src="${p.image || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af'}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    <span class="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-amber-400 px-3 py-1.5 rounded-xl text-xs font-black"><i class="fas fa-star mr-1"></i>${Number(p.rating || 5.0).toFixed(1)}</span>
                </div>
                <div class="p-6 flex flex-col flex-grow">
                    <h4 class="text-xl font-black text-slate-800 line-clamp-1 mb-1">${p.name}</h4>
                    <p class="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">📍 ${p.location}</p>
                    <div class="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                        <div>
                            <span class="text-2xl font-black text-slate-900">₹${Number(p.price).toLocaleString('en-IN')}</span>
                            <span class="text-slate-400 text-xs font-bold block">/ month</span>
                        </div>
                        <button onclick="openBookingFlow(${p.id || 0})" class="bg-slate-900 text-white font-black py-3 px-6 rounded-xl hover:bg-sky-500 transition-colors duration-300 shadow-sm text-sm">Book Space</button>
                    </div>
                </div>
            </div>`;
    });
}

function toggleModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("hidden");
    el.classList.toggle("flex");
}

function switchMainView(target) {
    const explore = document.getElementById("exploreHeaderSection");
    const catalog = document.getElementById("catalogGridSection");
    const bookings = document.getElementById("bookingsSection");
    const landlord = document.getElementById("landlordSection");

    explore?.classList.add("hidden"); catalog?.classList.add("hidden"); 
    bookings?.classList.add("hidden"); landlord?.classList.add("hidden");

    if (target === 'explorer') {
        explore?.classList.remove("hidden"); catalog?.classList.remove("hidden");
    } else if (target === 'bookings') {
        bookings?.classList.remove("hidden"); bookings?.classList.add("flex");
        fetchUserBookingsList();
    } else if (target === 'landlord') {
        landlord?.classList.remove("hidden"); landlord?.classList.add("flex");
        fetchLandlordMatrixMetrics();
    }
}

async function fetchUserBookingsList() {
    const email = localStorage.getItem("userEmail");
    const container = document.getElementById("bookingsContainer");
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings?email=${email}`);
        const transactionList = await response.json();
        container.innerHTML = "";
        if (transactionList.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center text-slate-400 py-16 font-bold">You haven't secured any room allocations yet.</div>`;
            return;
        }
        transactionList.forEach(b => {
            container.innerHTML += `
            <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-md flex flex-col gap-4">
                <img src="${b.propertyImage}" class="w-full h-40 object-cover rounded-2xl">
                <div>
                    <h4 class="font-black text-slate-800 text-lg">${b.propertyName}</h4>
                    <p class="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider">📅 Secured: ${b.date}</p>
                </div>
                
                <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                    <span class="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Evaluate Accommodation Room</span>
                    <div class="flex gap-2 text-sm">
                        <input type="number" id="reviewRate-${b.id}" placeholder="Rating (1-5)" min="1" max="5" step="0.1" class="w-1/2 p-2 rounded-xl bg-white border border-gray-200 font-bold outline-none text-xs">
                        <button onclick="submitStudentPropertyReview(${b.id}, '${b.propertyName}')" class="w-1/2 bg-sky-500 text-white font-black text-xs rounded-xl hover:bg-slate-900 transition-colors duration-300">Post Stars</button>
                    </div>
                </div>

                <div class="bg-slate-950 text-slate-400 p-4 rounded-2xl text-xs space-y-1 font-bold">
                    <div class="flex justify-between items-center"><span>Total Paid:</span><span class="text-emerald-400 font-black">₹${Number(b.amountPaid).toLocaleString('en-IN')}</span></div>
                    <span class="font-mono text-[9px] block tracking-wider truncate text-slate-500 select-all mt-1 bg-slate-900 p-1.5 rounded-lg">Ref: ${b.transactionId}</span>
                </div>
            </div>`;
        });
    } catch (e) { console.error(e); }
}

async function submitStudentPropertyReview(bookingId, propertyName) {
    const rateInput = document.getElementById(`reviewRate-${bookingId}`);
    const newRating = parseFloat(rateInput?.value);
    
    if (!newRating || newRating < 1 || newRating > 5) {
        alert("Please post within mathematical score bounds (1.0 - 5.0)");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyName, rating: newRating })
        });
        if (response.ok) {
            alert("⭐️ Star score updated dynamically onto data engine drive parameters!");
            if (rateInput) rateInput.value = "";
            fetchPropertiesFromDatabase();
        }
    } catch (err) { console.error(err); }
}

async function fetchLandlordMatrixMetrics() {
    const table = document.getElementById("llTable");
    const earnMetric = document.getElementById("llEarnMetric");
    const countMetric = document.getElementById("llCountMetric");
    if (!table) return;

    try {
        const response = await fetch(`${API_BASE_URL}/landlord/all-bookings`);
        const allBookings = await response.json();
        
        let totalRevenue = 0;
        table.innerHTML = `
            <thead>
                <tr class="bg-gray-100 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    <th class="p-4">Occupant Student</th>
                    <th class="p-4">PG Asset Name</th>
                    <th class="p-4">Date Tracked</th>
                    <th class="p-4">Paid Remittance</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-bold text-slate-700">`;
        
        if (allBookings.length === 0) {
            table.innerHTML += `<tr><td colspan="4" class="p-6 text-center text-slate-400">No active leases recorded on data file.</td></tr>`;
        } else {
            allBookings.forEach(b => {
                totalRevenue += parseInt(b.amountPaid);
                table.innerHTML += `
                    <tr class="hover:bg-purple-50/20 transition">
                        <td class="p-4 font-mono text-xs text-purple-900 select-all">${b.studentEmail}</td>
                        <td class="p-4 font-black">${b.propertyName}</td>
                        <td class="p-4 text-xs text-slate-400">${b.date}</td>
                        <td class="p-4 text-emerald-600 font-black">₹${Number(b.amountPaid).toLocaleString('en-IN')}</td>
                    </tr>`;
            });
        }
        table.innerHTML += `</tbody>`;
        if (earnMetric) earnMetric.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
        if (countMetric) countMetric.textContent = `${allBookings.length} Allocated Units`;
    } catch (err) { console.error(err); }
}

function handleSearch() {
    const q = document.getElementById("searchInput").value.toLowerCase().trim();
    const filtered = properties.filter(p => p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
    renderProperties(filtered);
}

function handleSort() {
    const mode = document.getElementById("sortSelect").value;
    let sorted = [...properties];
    if (mode === "low") sorted.sort((a, b) => a.price - b.price);
    if (mode === "high") sorted.sort((a, b) => b.price - a.price);
    renderProperties(sorted);
}

async function handleAddProperty(e) {
    e.preventDefault();
    const payload = {
        id: Date.now(),
        name: document.getElementById("propName").value, 
        location: document.getElementById("propLocation").value,
        price: parseInt(document.getElementById("propPrice").value), 
        rating: parseFloat(document.getElementById("propRating").value) || 5.0,
        image: document.getElementById("propImage").value
    };
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        if (response.ok) { 
            fetchPropertiesFromDatabase(); 
            e.target.reset(); 
            toggleModal('listModal'); 
        }
    } catch (err) { console.error(err); }
}

function openAuthModal(mode) {
    authMode = mode;
    const title = document.getElementById("modalTitle");
    const sub = document.getElementById("modalSubtitle");
    const btn = document.getElementById("authSubmitBtn");
    const nameField = document.getElementById("nameFieldContainer");
    if (mode === 'login') {
        if (title) title.innerHTML = `Welcome <span class="text-sky-500">Back</span>`; 
        if (sub) sub.textContent = "Access your profile records node";
        if (btn) btn.textContent = "Sign In Engine"; 
        if (nameField) nameField.classList.add("hidden");
    } else {
        if (title) title.innerHTML = `Create <span class="text-sky-500">Account</span>`; 
        if (sub) sub.textContent = "Initialize account configuration tracks";
        if (btn) btn.textContent = "Register Matrix"; 
        if (nameField) nameField.classList.remove("hidden");
    }
    toggleModal('regModal');
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const name = document.getElementById("authName")?.value || "";
    const selectedRole = document.querySelector('input[name="authRole"]:checked').value;
    
    const target = authMode === 'login' ? 'login' : 'register';
    const payload = { name, email, password, role: selectedRole };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/${target}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem("authToken", data.token); 
            localStorage.setItem("userEmail", email);
            localStorage.setItem("userRole", selectedRole);
            toggleModal('regModal'); 
            checkAuthStatus();
            switchMainView('explorer');
        } else { alert(data.error || "Authentication sequence mismatch."); }
    } catch (err) { console.error(err); }
}

function checkAuthStatus() {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    const bookingsBtn = document.getElementById("navBookingsBtn");
    const landlordBtn = document.getElementById("navLandlordBtn");
    const badge = document.getElementById("roleBadge");

    if (token) {
        document.getElementById("navLoginBtn")?.classList.add("hidden"); 
        document.getElementById("navRegisterBtn")?.classList.add("hidden");
        document.getElementById("navLogoutBtn")?.classList.remove("hidden");
        if (badge) badge.classList.remove("hidden");
        
        if (role === 'landlord') {
            if (landlordBtn) landlordBtn.classList.remove("hidden"); 
            if (bookingsBtn) bookingsBtn.classList.add("hidden");
            if (badge) {
                badge.textContent = "Landlord Profile"; 
                badge.className = "bg-purple-100 text-purple-800 font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider";
            }
        } else {
            if (bookingsBtn) bookingsBtn.classList.remove("hidden"); 
            if (landlordBtn) landlordBtn.classList.add("hidden");
            if (badge) {
                badge.textContent = "Student Profile"; 
                badge.className = "bg-sky-50 text-sky-700 font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border border-sky-100";
            }
        }
    } else {
        document.getElementById("navLoginBtn")?.classList.remove("hidden"); 
        document.getElementById("navRegisterBtn")?.classList.remove("hidden");
        document.getElementById("navLogoutBtn")?.classList.add("hidden"); 
        if (bookingsBtn) bookingsBtn.classList.add("hidden"); 
        if (landlordBtn) landlordBtn.classList.add("hidden");
        if (badge) badge.classList.add("hidden");
    }
}

function handleLogout() {
    localStorage.clear(); checkAuthStatus(); switchMainView('explorer'); location.reload();
}

function openBookingFlow(id) {
    if (!localStorage.getItem("authToken")) { alert("Authentication signature tracking missing. Access denied."); openAuthModal('login'); return; }
    selectedPropertyForBooking = properties.find(p => p.id === id);
    if (!selectedPropertyForBooking) return;
    
    document.getElementById("bookModalName").textContent = selectedPropertyForBooking.name;
    document.getElementById("bookModalLocation").textContent = `📍 ${selectedPropertyForBooking.location}`;
    document.getElementById("bookModalImage").src = selectedPropertyForBooking.image || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af';
    
    const rent = selectedPropertyForBooking.price;
    const deposit = Math.round(rent * 1.5);
    document.getElementById("invoiceRent").textContent = `₹${rent.toLocaleString('en-IN')}`;
    document.getElementById("invoiceDeposit").textContent = `₹${deposit.toLocaleString('en-IN')}`;
    document.getElementById("invoiceTotal").textContent = `₹${(rent + deposit).toLocaleString('en-IN')}`;
    toggleModal('bookingModal');
}

function injectMockRazorpayModalHTML() {
    if (document.getElementById("mockRzpOverlay")) return;
    const modalHTML = `
    <div id="mockRzpOverlay" class="fixed inset-0 bg-slate-900/60 z-[9999] hidden items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-slate-900 w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col font-sans">
            <div class="bg-sky-600 p-6 flex justify-between items-center"><h3 class="font-black text-sm uppercase">Razorpay Payment Sandbox</h3><button type="button" onclick="closeMockPaymentWindow()"><i class="fas fa-times"></i></button></div>
            <div class="bg-slate-800/50 px-6 py-4 flex justify-between items-center"><h4 id="mockRzpDesc" class="text-sm">Deposit</h4><span id="mockRzpAmt" class="text-lg font-black text-amber-400">₹0</span></div>
            <div class="p-6 space-y-4">
                <input type="text" value="Ayush Kumar" readonly class="w-full bg-slate-800 px-4 py-3 rounded-xl text-sm text-slate-300">
                <input type="text" value="4111 1111 1111 1111" readonly class="w-full bg-slate-800 px-4 py-3 rounded-xl text-sm font-mono text-slate-300">
            </div>
            <div class="p-6 pt-0"><button type="button" onclick="executeSuccessfulMockPayment()" class="w-full bg-amber-500 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-wider hover:bg-sky-500 hover:text-white transition-colors duration-300">Simulate Success Card Run</button></div>
        </div>
    </div>`;
    const template = document.createElement('div'); template.innerHTML = modalHTML; document.body.appendChild(template.firstElementChild);
}

function handlePaymentExecution(e) {
    e.preventDefault(); if (!selectedPropertyForBooking) return;
    const total = selectedPropertyForBooking.price + Math.round(selectedPropertyForBooking.price * 1.5);
    document.getElementById("mockRzpDesc").textContent = `Initial Deposit for ${selectedPropertyForBooking.name}`;
    document.getElementById("mockRzpAmt").textContent = `₹${total.toLocaleString('en-IN')}`;
    const target = document.getElementById("mockRzpOverlay"); 
    if (target) { target.classList.remove("hidden"); target.classList.add("flex"); }
}

async function executeSuccessfulMockPayment() {
    closeMockPaymentWindow();
    const fakeId = "pay_" + Math.random().toString(36).substring(2, 16).toUpperCase();
    const bookingDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentEmail: localStorage.getItem("userEmail"), 
                propertyName: selectedPropertyForBooking.name,
                amountPaid: selectedPropertyForBooking.price + Math.round(selectedPropertyForBooking.price * 1.5),
                transactionId: fakeId, 
                propertyImage: selectedPropertyForBooking.image || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af',
                date: bookingDate
            })
        });
        if (response.ok) { 
            alert(`🎉 Room Allocation Completed!\n💳 Transaction Track ID: ${fakeId}`); 
            toggleModal('bookingModal'); 
            const activeRole = localStorage.getItem("userRole");
            if(activeRole === 'landlord') { switchMainView('landlord'); } else { switchMainView('bookings'); }
        }
    } catch (err) { console.error(err); }
}

function closeMockPaymentWindow() { 
    const target = document.getElementById("mockRzpOverlay"); 
    if (target) { target.classList.remove("flex"); target.classList.add("hidden"); }
}

// Global Explicit Bindings Injection
window.switchMainView = switchMainView;
window.submitStudentPropertyReview = submitStudentPropertyReview;
window.handleLogout = handleLogout;
window.openAuthModal = openAuthModal;
window.openBookingFlow = openBookingFlow;
window.closeMockPaymentWindow = closeMockPaymentWindow;
window.executeSuccessfulMockPayment = executeSuccessfulMockPayment;
window.toggleModal = toggleModal;