const services = [
    { id: 1, name: 'Web Development', price: 1500, description: 'Professional high-quality websites tailored to your needs.', class: 'md:col-span-2 md:row-span-2' },
    { id: 2, name: 'SEO Optimization', price: 500, description: 'Rank higher on Google and drive organic traffic.', class: '' },
    { id: 3, name: 'Graphic Design', price: 800, description: 'Stunning visuals for your brand identity.', class: '' },
    { id: 4, name: 'Social Media Management', price: 1200, description: 'Grow and engage your audience effectively.', class: 'md:col-span-1 md:row-span-2' },
    { id: 5, name: 'Content Writing', price: 600, description: 'Compelling articles and blog posts.', class: '' },
];

let cart = [];

const servicesGrid = document.getElementById('services-grid');
const cartSection = document.getElementById('cart-section');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');

function renderServices() {
    servicesGrid.innerHTML = services.map(service => `
        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition cursor-pointer flex flex-col justify-between ${service.class}" onclick="addToCart(${service.id})">
            <div>
                <h3 class="text-xl font-bold mb-2">${service.name}</h3>
                <p class="text-gray-400 text-sm">${service.description}</p>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <span class="text-blue-400 font-bold">KES ${service.price}</span>
                <span class="bg-blue-600 text-white p-2 rounded-full">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </span>
            </div>
        </div>
    `).join('');
}

window.addToCart = function(serviceId) {
    const service = services.find(s => s.id === serviceId);
    cart.push(service);
    updateCartUI();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

function updateCartUI() {
    if (cart.length > 0) {
        cartSection.classList.remove('hidden');
    } else {
        cartSection.classList.add('hidden');
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="flex justify-between items-center mb-2 bg-gray-700 p-2 rounded">
            <span class="text-sm">${item.name}</span>
            <div class="flex items-center">
                <span class="text-sm font-bold mr-2">KES ${item.price}</span>
                <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    cartTotal.innerText = `KES ${total}`;
}

const checkoutBtn = document.getElementById('checkout-btn');
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckout = document.getElementById('close-checkout');

checkoutBtn.onclick = () => {
    checkoutModal.classList.remove('hidden');
};

closeCheckout.onclick = () => {
    checkoutModal.classList.add('hidden');
};

// M-Pesa Modal Logic
const mpesaBtn = document.getElementById('mpesa-btn');
const mpesaModal = document.getElementById('mpesa-modal');
const closeMpesa = document.getElementById('close-mpesa');
const phoneNumberInput = document.getElementById('phone-number');
const formattedNumberDisplay = document.getElementById('formatted-number');
const payNowBtn = document.getElementById('pay-now-btn');
const userNameInput = document.getElementById('user-name');

mpesaBtn.onclick = () => {
    checkoutModal.classList.add('hidden');
    mpesaModal.classList.remove('hidden');
};

closeMpesa.onclick = () => {
    mpesaModal.classList.add('hidden');
    checkoutModal.classList.remove('hidden');
};

function formatPhoneNumber(value) {
    let cleaned = value.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    }

    return cleaned;
}

phoneNumberInput.oninput = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.length === 12 && (formatted.startsWith('2547') || formatted.startsWith('2541'))) {
        formattedNumberDisplay.innerText = `Formatted: ${formatted}`;
        formattedNumberDisplay.classList.remove('text-red-500');
        formattedNumberDisplay.classList.add('text-green-500');
    } else if (formatted.length > 0) {
        formattedNumberDisplay.innerText = 'Invalid format';
        formattedNumberDisplay.classList.remove('text-green-500');
        formattedNumberDisplay.classList.add('text-red-500');
    } else {
        formattedNumberDisplay.innerText = '';
    }
};

// Socket.io and Payment Logic
const socket = io();
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');

socket.on('connect', () => {
    console.log('Connected to server via WebSockets. ID:', socket.id);
    connectionDot.classList.replace('bg-red-500', 'bg-green-500');
    connectionText.innerText = 'Connected';
    connectionText.classList.replace('text-gray-400', 'text-green-500');
});

socket.on('disconnect', () => {
    console.warn('Disconnected from server');
    connectionDot.classList.replace('bg-green-500', 'bg-red-500');
    connectionText.innerText = 'Disconnected';
    connectionText.classList.replace('text-green-500', 'text-gray-400');
});

socket.on('connect_error', (error) => {
    console.error('Socket.io Connection Error:', error);
    connectionDot.classList.replace('bg-green-500', 'bg-red-500');
    connectionText.innerText = 'Connection Error';
});

const statusModal = document.getElementById('status-modal');
const statusLoading = document.getElementById('status-loading');
const statusSuccess = document.getElementById('status-success');
const statusCancelled = document.getElementById('status-cancelled');
const statusFailed = document.getElementById('status-failed');
const receiptNumberDisplay = document.getElementById('receipt-number');
const failMessageDisplay = document.getElementById('fail-message');
const cancelLoadingBtn = document.getElementById('cancel-loading');

let currentCheckoutRequestID = null;
let statusTimeout = null;

payNowBtn.onclick = async () => {
    const name = userNameInput.value;
    const phone = formatPhoneNumber(phoneNumberInput.value);
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    if (!name || phone.length !== 12) {
        alert('Please enter a valid name and phone number.');
        return;
    }

    mpesaModal.classList.add('hidden');
    showStatus('loading');

    // Set a timeout to prevent being stuck in "Processing" state
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
        if (!statusLoading.classList.contains('hidden')) {
            showStatus('failed', 'Transaction timed out. We did not receive a response from M-Pesa in time. Please check your phone or try again.');
        }
    }, 65000); // 65 seconds timeout (M-Pesa typically takes 30-60s)

    try {
        const response = await fetch('/api/stkpush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone, amount: total })
        });

        const data = await response.json();
        console.log('STK Push Response:', data);

        if (data.ResponseCode === '0') {
            currentCheckoutRequestID = data.CheckoutRequestID;
            console.log('STK Push successfully initiated. ID:', currentCheckoutRequestID);
        } else {
            clearTimeout(statusTimeout);
            showStatus('failed', data.CustomerMessage || data.ErrorMessage || data.error || 'Failed to initiate STK Push');
        }
    } catch (error) {
        clearTimeout(statusTimeout);
        console.error('STK Push Fetch Error:', error);
        showStatus('failed', 'Network error occurred while connecting to our server.');
    }
};

function showStatus(state, message = '') {
    if (state !== 'loading') {
        clearTimeout(statusTimeout);
    }

    statusModal.classList.remove('hidden');
    statusLoading.classList.add('hidden');
    statusSuccess.classList.add('hidden');
    statusCancelled.classList.add('hidden');
    statusFailed.classList.add('hidden');

    if (state === 'loading') {
        statusLoading.classList.remove('hidden');
    } else if (state === 'success') {
        statusSuccess.classList.remove('hidden');
    } else if (state === 'cancelled') {
        statusCancelled.classList.remove('hidden');
    } else if (state === 'failed') {
        statusFailed.classList.remove('hidden');
        failMessageDisplay.innerText = message;
    }
}

window.closeStatus = () => {
    statusModal.classList.add('hidden');
    clearTimeout(statusTimeout);
};

cancelLoadingBtn.onclick = () => {
    closeStatus();
    console.log('User manually closed the loading modal.');
};

socket.on('transaction-update', (data) => {
    console.log('Transaction update received:', data);
    if (data.checkoutRequestID === currentCheckoutRequestID) {
        if (data.status === 'success') {
            receiptNumberDisplay.innerText = data.receiptNumber;
            showStatus('success');
        } else if (data.status === 'cancelled') {
            showStatus('cancelled');
        } else {
            showStatus('failed', data.message);
        }
    }
});

renderServices();
