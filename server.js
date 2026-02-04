require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const ngrok = require('@ngrok/ngrok');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
  });
});

const getBaseUrl = () => {
  return process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
};

const getAccessToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();
  const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

app.post('/api/stkpush', async (req, res) => {
  const { phoneNumber, amount } = req.body;
  console.log(`[STK Push] Initiation requested for ${phoneNumber} (Amount: ${amount})`);

  try {
    const token = await getAccessToken();
    console.log('[STK Push] OAuth token generated successfully');
    const url = `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    const callbackUrl = process.env.CALLBACK_URL;
    if (!callbackUrl) {
      return res.status(500).json({ error: 'Callback URL not set' });
    }

    const data = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: `${callbackUrl}/api/callback`,
      AccountReference: 'Whizpoint Solutions',
      TransactionDesc: 'Payment for services',
    };

    console.log('[STK Push] Sending request to Daraja API...');
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    });
    console.log('[STK Push] Daraja Response:', JSON.stringify(response.data, null, 2));
    res.status(200).json(response.data);
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error('[STK Push] Error:', JSON.stringify(errorData, null, 2));
    res.status(500).json({ error: errorData });
  }
});

app.post('/api/callback', (req, res) => {
  try {
    const { Body } = req.body;
    console.log('--- M-Pesa Callback Received ---');
    console.log(JSON.stringify(req.body, null, 2));

    if (!Body || !Body.stkCallback) {
      console.error('Invalid callback body structure');
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid body' });
    }

    const stkCallback = Body.stkCallback;
    const resultCode = stkCallback.ResultCode;
    const checkoutRequestID = stkCallback.CheckoutRequestID;

    let status = 'failed';
    let message = stkCallback.ResultDesc;
    let receiptNumber = null;

    if (resultCode === 0) {
      status = 'success';
      if (stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) {
        const callbackMetadata = stkCallback.CallbackMetadata.Item;
        const receiptItem = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber');
        receiptNumber = receiptItem ? receiptItem.Value : 'N/A';
      }
    } else if (resultCode === 1032) {
      status = 'cancelled';
      message = 'Transaction Cancelled by User.';
    }

    console.log(`[Callback] Success! Broadcasting update: ${status} for ID: ${checkoutRequestID}`);

    io.emit('transaction-update', {
      checkoutRequestID: checkoutRequestID,
      status: status,
      message: message,
      receiptNumber: receiptNumber
    });

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

app.get('/health', (req, res) => {
  res.send('Server is healthy');
});

server.listen(PORT, async () => {
  console.log(`\n--- Whizpoint Solutions Backend ---`);
  console.log(`Local Server: http://localhost:${PORT}`);

  if (process.env.NGROK_AUTHTOKEN) {
    try {
      console.log('Establishing Ngrok tunnel...');
      const session = await new ngrok.SessionBuilder()
        .authtoken(process.env.NGROK_AUTHTOKEN.trim())
        .connect();
      const tunnel = await session.httpEndpoint().listen();
      const url = tunnel.url();
      console.log(`Ngrok Tunnel: ${url}`);
      process.env.CALLBACK_URL = url;
      console.log(`M-Pesa CallBackURL: ${url}/api/callback`);
    } catch (error) {
      console.error('Error starting Ngrok:', error.message);
    }
  } else {
    console.log('NGROK_AUTHTOKEN not found, skipping Ngrok tunnel creation.');
    if (process.env.CALLBACK_URL) {
      console.log(`Using existing CALLBACK_URL: ${process.env.CALLBACK_URL}`);
    } else {
      console.warn('WARNING: No CALLBACK_URL set. STK Push will fail unless CALLBACK_URL is provided in .env');
    }
  }
});
