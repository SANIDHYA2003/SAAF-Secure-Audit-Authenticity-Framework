# 🔐 Required Connection Strings & API Keys

## ✅ **Free Services You Need to Set Up**

### 1. **MongoDB Atlas** (Database)
- **Website:** https://www.mongodb.com/cloud/atlas/register
- **Steps:**
  1. Create free account
  2. Create a free cluster (M0 - Free tier)
  3. Create database user (username + password)
  4. Whitelist your IP (or use 0.0.0.0/0 for all IPs)
  5. Get connection string
- **Connection String Format:**
  ```
  mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/blockchainlogistics?retryWrites=true&w=majority
  ```
- **What to provide:**
  ```
  MONGODB_URI=mongodb+srv://...
  ```

---

### 2. **Twilio** (SMS/OTP for 2FA) - OPTIONAL but Recommended
- **Website:** https://www.twilio.com/try-twilio
- **Free Tier:** $15 credit, enough for testing
- **Steps:**
  1. Create free account
  2. Verify your phone number
  3. Get Account SID and Auth Token from console
  4. Get a Twilio phone number
- **What to provide:**
  ```
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_PHONE_NUMBER=+1234567890
  ```

---

### 3. **JWT Secret** (For Authentication)
- **Generate:** Run this in terminal:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- **What to provide:**
  ```
  JWT_SECRET=your_generated_secret_here
  JWT_EXPIRY=7d
  ```

---

### 4. **Infura or Alchemy** (For Real Blockchain - OPTIONAL for now)
- **For now:** Use Hardhat local node
- **For production blockchain:**
  - **Infura:** https://infura.io (Free tier: 100k requests/day)
  - **Alchemy:** https://www.alchemy.com (Free tier: 300M compute units/month)
- **What to provide (when moving to real blockchain):**
  ```
  ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
  # or
  ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
  ```

---

### 5. **Email Service** (For Notifications) - OPTIONAL
- **Option 1 - SendGrid:** https://sendgrid.com (Free: 100 emails/day)
- **Option 2 - Mailgun:** https://www.mailgun.com (Free: 100 emails/day)
- **Option 3 - Gmail SMTP:** Use your Gmail (less professional)
- **What to provide:**
  ```
  EMAIL_SERVICE=sendgrid
  SENDGRID_API_KEY=SG.xxxxxxxx
  EMAIL_FROM=noreply@verifychain.com
  ```

---

## 📋 **Current Setup Checklist**

### ✅ **Required NOW (Must Have):**
- [ ] MongoDB Atlas connection string
- [ ] JWT Secret (generate locally)

### 🎯 **Recommended for Testing:**
- [ ] Twilio for SMS/OTP (or we can skip 2FA for now)

### 🔮 **Future (Not needed yet):**
- [ ] Real blockchain RPC (Infura/Alchemy)
- [ ] Email service (SendGrid/Mailgun)
- [ ] Cloud storage for documents (AWS S3/Cloudinary)

---

## 🚀 **Quick Start - Minimum Required**

For now, to move from demo to real, you only need:

### **Step 1: Get MongoDB Atlas**
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Create cluster
4. Get connection string

### **Step 2: Generate JWT Secret**
```bash
# Run in terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **Step 3: Update .env file**
```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/blockchainlogistics

# JWT
JWT_SECRET=your_64_char_hex_string_here
JWT_EXPIRY=7d

# Server
PORT=5000
NODE_ENV=production

# Blockchain (local for now)
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
```

---

## ⚙️ **Optional Services (Can Add Later)**

### **For SMS/2FA:**
- Twilio (recommended)
- OR disable 2FA for now

### **For Email:**
- SendGrid (easiest)
- OR disable email for now

### **For File Upload:**
- Cloudinary (free: 25GB)
- OR store on server for now

---

## 🎯 **What I Need from You**

Please provide:
1. ✅ **MongoDB Atlas connection string**
2. ✅ **JWT Secret** (I'll help you generate)

Optional (can skip for testing):
3. ⚪ Twilio credentials (if you want real SMS)
4. ⚪ Email service API key (if you want email notifications)

Once you provide these, I'll:
1. ✅ Clean up your database
2. ✅ Remove all demo code
3. ✅ Set up production-ready backend
4. ✅ Enhance smart contracts
5. ✅ Create proper error handling
6. ✅ Add comprehensive logging
7. ✅ Create deployment guide
