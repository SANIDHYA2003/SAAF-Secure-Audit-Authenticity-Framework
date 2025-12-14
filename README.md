# SAAF - Secure Audit & Authenticity Framework

A blockchain-powered supply chain verification platform built with React, Node.js, MongoDB, and Ethereum smart contracts.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+ 
- MongoDB (local or Atlas)
- Git

### 1. Clone & Install

```bash
git clone https://github.com/SANIDHYA2003/SAAF-Secure-Audit-Authenticity-Framework.git
cd SAAF-Secure-Audit-Authenticity-Framework
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
npm install
npm start
```

### 3. Frontend Setup

```bash
cd blockchain-explorer
npm install
npm run dev
```

### 4. (Optional) Blockchain Setup

```bash
# In project root
npm install
npx hardhat node
# In another terminal
npx hardhat run scripts/deploy.js --network localhost
```

---

## ☁️ Vercel Deployment

This project is configured for easy deployment to Vercel.

### Deploy Backend (API)

1. Go to [vercel.com](https://vercel.com) and import the repository
2. Set the **Root Directory** to `backend`
3. Add these **Environment Variables**:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `JWT_SECRET` - A secure random string
   - `JWT_REFRESH_SECRET` - Another secure random string
   - `FRONTEND_URL` - Your frontend Vercel URL (after deploying frontend)
   - `NODE_ENV` - `production`

4. Deploy!

### Deploy Frontend

1. Create a new project in Vercel
2. Set the **Root Directory** to `blockchain-explorer`
3. Add these **Environment Variables**:
   - `VITE_API_URL` - Your backend Vercel URL + `/api/v1` (e.g., `https://your-backend.vercel.app/api/v1`)
   - `VITE_BLOCKCHAIN_RPC_URL` - Leave empty to disable blockchain (or add Besu/Infura URL later)
   - `VITE_CONTRACT_ADDRESS` - Leave empty for now

4. Deploy!

---

## 📁 Project Structure

```
├── backend/                 # Node.js + Express API
│   ├── api/                 # Vercel serverless entry
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── models/          # MongoDB schemas
│   │   ├── middleware/      # Auth middleware
│   │   └── server.js        # Express app
│   └── vercel.json          # Vercel config
│
├── blockchain-explorer/     # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # App context
│   │   ├── services/        # API services
│   │   └── config.js        # Environment config
│   └── vercel.json          # Vercel config
│
├── contracts/               # Solidity smart contracts
├── scripts/                 # Hardhat deployment scripts
└── hardhat.config.js        # Hardhat configuration
```

---

## 🔐 Features

- **Multi-role authentication**: Manufacturer, Distributor, Transporter, Retailer, Consumer
- **Organization management**: Register, verify, and manage supply chain partners
- **Shipment tracking**: Create, track, and verify shipments through the supply chain
- **Blockchain anchoring**: Immutable audit trail on Ethereum/Besu (when enabled)
- **Real-time updates**: Dashboard with role-specific views

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Node.js, Express, MongoDB |
| Blockchain | Solidity, Hardhat, ethers.js |
| Deployment | Vercel (Frontend + Backend) |

---

## 📝 Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend.vercel.app/api/v1
VITE_BLOCKCHAIN_RPC_URL=    # Optional
VITE_CONTRACT_ADDRESS=      # Optional
```

---

## 📄 License

MIT

---

## 👤 Author

**Sanidhya Sharma**
- GitHub: [@SANIDHYA2003](https://github.com/SANIDHYA2003)
