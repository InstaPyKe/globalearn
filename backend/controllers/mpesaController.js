const axios = require('axios');
const db = require('../db'); // Assuming you have a db.js for PostgreSQL connection

// 1. Middleware to generate the mandatory Daraja Access Token
const generateToken = async (req, res, next) => {
    // Collect your variables from Railway's environment
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    // Basic validation for environment variables
    if (!consumerKey || !consumerSecret) {
        console.error("M-Pesa Token Generation Error: MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET not set.");
        return res.status(500).json({ error: "M-Pesa API credentials are not configured." });
    }

    // Safaricom Sandbox URL (Change to https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials for Production)
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    
    // Combine keys into a base64 string for Basic Auth
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}` // Corrected from 'Base' to 'Basic'
            }
        });
        req.token = response.data.access_token;
        next();
    } catch (error) {
        console.error("M-Pesa Token Generation Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to generate M-Pesa access token" });
    }
};

// 2. STK Push Handler
const stkPush = async (req, res) => {
    const { phoneNumber, amount } = req.body;
    const token = req.token;

    // Basic validation
    if (!phoneNumber || !amount) {
        return res.status(400).json({ error: "Phone number and amount are required for STK Push." });
    }

    // Format phone number to standard 2547XXXXXXXX or 2541XXXXXXXX format
    const formattedPhone = phoneNumber.startsWith('0') ? '254' + phoneNumber.slice(1) : phoneNumber;
    if (!/^(2547|2541)\d{8}$/.test(formattedPhone)) {
        return res.status(400).json({ error: "Invalid Kenyan phone number format. Must be 2547XXXXXXXX or 2541XXXXXXXX." });
    }

    const shortCode = process.env.MPESA_SHORTCODE; // Sandbox Business Shortcode (e.g., 174379)
    const passkey = process.env.MPESA_PASSKEY;

    if (!shortCode || !passkey) {
        console.error("STK Push Error: MPESA_SHORTCODE or MPESA_PASSKEY not set.");
        return res.status(500).json({ error: "M-Pesa STK Push credentials are not configured." });
    }
    
    // Generate Timestamp (YYYYMMDDHHmmss)
    const date = new Date();
    const timestamp = 
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    // Create the mandatory base64 password string
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    // Safaricom Sandbox URL (Change to https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest for Production)
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    
    // Railway public app URL to receive transaction status updates
    // Ensure RAILWAY_PROJECT_NAME is set in your Railway environment variables
    const callbackUrl = `https://${process.env.RAILWAY_PROJECT_NAME}.up.railway.app/api/mpesa/callback`;
    // Fallback for local development if RAILWAY_PROJECT_NAME is not set
    const finalCallbackUrl = process.env.NODE_ENV === 'production' && process.env.RAILWAY_PROJECT_NAME
        ? callbackUrl
        : `http://localhost:${process.env.PORT || 5000}/api/mpesa/callback`;

    const requestBody = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: finalCallbackUrl, // Use the determined callback URL
        AccountReference: "GlobalEarnWallet", // This will appear on the M-Pesa message
        TransactionDesc: "GlobalEarn Membership Upgrade" // Specific description
    };

    try {
        const response = await axios.post(url, requestBody, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error("STK Push Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "STK push initiation failed" });
    }
};

// 3. Callback URL listener to capture transaction results from Safaricom
const mpesaCallback = async (req, res) => {
    const callbackData = req.body;
    console.log("M-Pesa Callback Received:", JSON.stringify(callbackData, null, 2));

    // Safaricom sends an empty object if the transaction is cancelled or times out
    if (!callbackData || !callbackData.Body || !callbackData.Body.stkCallback) {
        console.log("M-Pesa Callback: Invalid or empty data received (likely user cancelled/timed out).");
        // Acknowledge Safaricom's request even if data is empty/invalid to prevent retries
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted (no action needed)" });
    }

    const resultCode = callbackData.Body.stkCallback.ResultCode;
    
    if (resultCode === 0) {
        // Transaction Successful!
        const metadata = callbackData.Body.stkCallback.CallbackMetadata.Item;
        const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
        const amountPaid = metadata.find(item => item.Name === 'Amount')?.Value;
        const userPhone = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

        console.log(`Success! Receipt: ${mpesaReceiptNumber}, Amount: ${amountPaid}, Phone: ${userPhone}`);
        
        // Normalize phone: Convert Safaricom's 254... to your DB's 0... format
        const phoneStr = userPhone.toString();
        const dbPhone = phoneStr.startsWith('254') ? '0' + phoneStr.slice(3) : phoneStr;

        try {
            await db.query('BEGIN');
            
            // 1. Locate the user in the vault
            const userRes = await db.query('SELECT id, username FROM users WHERE phone = $1', [dbPhone]);
            
            if (userRes.rows.length > 0) {
                const userId = userRes.rows[0].id;
                
                // 2. Determine membership level based on protocol amount
                let newTier = 'basic';
                if (amountPaid >= 2000) newTier = 'platinum';
                else if (amountPaid >= 1000) newTier = 'gold';
                else if (amountPaid >= 500) newTier = 'basic';

                // 3. Authorize the Tier Upgrade
                await db.query('UPDATE users SET membership_tier = $1 WHERE id = $2', [newTier, userId]);
                
                // 4. Document the transaction in the ledger
                await db.query(
                    `INSERT INTO transactions (user_id, type, amount, status, method, reference_id) 
                     VALUES ($1, 'mpesa_upgrade', $2, 'completed', 'M-Pesa', $3)`,
                    [userId, amountPaid, mpesaReceiptNumber]
                );
                
                await db.query('COMMIT');
                console.log(`Upgrade Success: ${userRes.rows[0].username} promoted to ${newTier.toUpperCase()}`);
            } else {
                console.warn(`M-Pesa Callback Error: User with phone ${dbPhone} not identified.`);
                await db.query('ROLLBACK');
            }
        } catch (dbError) {
            console.error("M-Pesa Callback Database Exception:", dbError);
            await db.query('ROLLBACK');
        }
    } else {
        // Transaction failed or cancelled by user
        const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;
        const resultDesc = callbackData.Body.stkCallback.ResultDesc;
        console.log(`Transaction failed or cancelled. CheckoutRequestID: ${checkoutRequestID}, Result: ${resultDesc}`);
        // TODO: Log this failure in your database if you have a pending transaction record
    }

    // Always tell Safaricom you received their data successfully
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
};

module.exports = { generateToken, stkPush, mpesaCallback };