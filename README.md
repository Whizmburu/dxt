# Whizpoint Solutions - Service Web App with M-Pesa Integration

Whizpoint Solutions is a modern, service-based web application that features a sleek bento-grid service selection interface and a robust M-Pesa STK Push integration.

## Features

### 1. Service & Cart Logic
- **Modern Bento-Grid**: A visually appealing grid layout for selecting services.
- **Cart System**: Easily "Add to Cart" and manage selected services before proceeding to checkout.
- **Multi-Provider Checkout**: A unified checkout screen showing M-Pesa (active), Airtel Money (Coming Soon), and T-Kash (Coming Soon).

### 2. Smart M-Pesa Modal
- **Smart Formatting**: Automatically detects and converts various phone number formats (e.g., `07...`, `01...`, `7...`, `1...`) to the required `254...` format for Daraja API.
- **User Details**: Captures Full Name and Phone Number for transaction tracking.

### 3. Real-Time Transaction Tracking
- **Live Status**: Uses Socket.io (WebSockets) for real-time communication between the backend and frontend.
- **State Handling**:
    - **Success**: Displays "Payment Successful" with the M-Pesa Receipt Number.
    - **Cancelled**: Detects user cancellation and displays "Transaction Cancelled by User."
    - **Failed**: Handles insufficient funds, timeouts, and other failure responses.

### 4. Backend & Automation
- **Node.js & Express**: Powered by a robust backend.
- **Automated Tunneling**: Uses `@ngrok/ngrok` to automatically generate a `CallBackURL` for localhost, making development and testing seamless.

## Tech Stack
- **Frontend**: HTML5, Tailwind CSS (via CDN), JavaScript (Vanilla), Socket.io Client.
- **Backend**: Node.js, Express, Socket.io, Axios, Dotenv, Ngrok.

## Prerequisites
- Node.js installed.
- M-Pesa Daraja API credentials (Consumer Key, Consumer Secret, Passkey, Shortcode).
- Ngrok Authtoken (Optional but recommended for local testing).

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd whizpoint-solutions
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your credentials. Use `.env.example` as a template.

4. **Start the server**:
   ```bash
   npm start
   ```
   Or for development with automatic restarts:
   ```bash
   npm run dev
   ```

## Environment Variables Example

Create a `.env` file with the following content:

```env
# M-Pesa Daraja API Credentials
MPESA_CONSUMER_KEY=your_actual_consumer_key_here
MPESA_CONSUMER_SECRET=your_actual_consumer_secret_here
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_SHORTCODE=174379

# Ngrok Configuration (Get your token from https://dashboard.ngrok.com/)
NGROK_AUTHTOKEN=your_ngrok_authtoken_here

# Server Configuration
PORT=3000

# Callback URL (If not using Ngrok, set this to your publicly accessible URL)
# CALLBACK_URL=https://your-domain.com
```

## How it Works
1. When the server starts, it establishes an Ngrok tunnel (if an authtoken is provided) and sets the `CALLBACK_URL` to the tunnel URL.
2. When a user initiates a payment, the backend requests an OAuth2 token from Daraja and then triggers an STK Push.
3. The user receives a PIN prompt on their phone.
4. Once the transaction is completed (Success/Failed/Cancelled), Safaricom sends a POST request to the `CALLBACK_URL`.
5. The backend receives the callback and emits a `transaction-update` event via Socket.io to the frontend.
6. The frontend updates the UI immediately to show the result.
