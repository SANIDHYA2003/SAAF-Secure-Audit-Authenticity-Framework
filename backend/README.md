# VerifyChain Backend API

Enterprise supply chain verification platform backend.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
2. Update the environment variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/verifychain
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000/api/v1`

---

## 📚 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register organization |
| `/auth/login` | POST | Login |
| `/auth/otp/verify` | POST | Verify OTP |
| `/auth/otp/resend` | POST | Resend OTP |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/logout` | POST | Logout |
| `/auth/me` | GET | Get current user |

### Organizations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/orgs/me` | GET | Get my organization |
| `/orgs/me` | PATCH | Update my organization |
| `/orgs/me/members` | GET | Get organization members |
| `/orgs` | GET | List verified organizations |
| `/orgs/:orgId` | GET | Get organization by ID |
| `/orgs/:orgId/verify` | POST | Verify organization (admin) |
| `/orgs/:orgId/suspend` | POST | Suspend organization (admin) |

### Invites

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/invites` | POST | Create invite |
| `/invites` | GET | List invites |
| `/invites/validate/:code` | GET | Validate invite code |
| `/invites/claim/:code` | POST | Claim invite |
| `/invites/:inviteId` | DELETE | Revoke invite |

### Shipments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/shipments` | POST | Create shipment |
| `/shipments` | GET | List shipments |
| `/shipments/:id` | GET | Get shipment details |
| `/shipments/:id/pickup` | POST | Confirm pickup |
| `/shipments/:id/logs` | POST | Add transit log |
| `/shipments/:id/deliver` | POST | Complete delivery |
| `/shipments/:id/accept` | POST | Accept delivery |
| `/shipments/:id/reject` | POST | Reject delivery |
| `/shipments/transporter/assignments` | GET | Get transporter assignments |

---

## 🔐 Security Features

- **Password Hashing**: bcrypt with configurable salt rounds
- **JWT Tokens**: Access + Refresh token pattern
- **Rate Limiting**: Configurable per-window limits
- **CORS**: Whitelist-based origin control
- **Helmet**: Security headers
- **Input Validation**: express-validator
- **Audit Logging**: All actions logged with actor, resource, result

---

## 📦 Project Structure

```
backend/
├── src/
│   ├── models/           # Mongoose models
│   │   ├── Organization.js
│   │   ├── User.js
│   │   ├── Shipment.js
│   │   ├── Supporting.js  # Invite, Session, Anchor, etc.
│   │   └── index.js
│   ├── routes/           # Express routes
│   │   ├── auth.js
│   │   ├── organizations.js
│   │   ├── invites.js
│   │   └── shipments.js
│   ├── middleware/       # Custom middleware
│   │   └── auth.js       # JWT validation, role auth
│   ├── utils/            # Helper functions
│   │   └── helpers.js
│   └── server.js         # Main entry point
├── .env                  # Environment variables
├── .env.example          # Environment template
└── package.json
```

---

## 🗄️ Database Schema

### Organizations
- Basic info (name, type, contact)
- Legal info (GST, PAN)
- On-chain data (address, metaHash, status)
- Documents array

### Users
- Profile (name, email, phone)
- Roles (OrgAdmin, Manager, Driver, etc.)
- Password hash (bcrypt)
- 2FA settings
- Security (failed attempts, lockout)

### Shipments
- From/To organization
- Status lifecycle
- Pickup/Delivery proofs
- Transit logs
- On-chain anchors

---

## 🔗 Integration with Frontend

The frontend can use the `ApiService.js` to connect:

```javascript
import { AuthAPI, ShipmentAPI } from './services/ApiService';

// Login
const result = await AuthAPI.login(email, password);

// Create shipment
const shipment = await ShipmentAPI.create({
  toOrgId: 'ORG-xxx',
  batchIds: ['BATCH-001'],
  meta: { packageCount: 10 }
});
```

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "phone": "+919876543210",
    "name": "Test Pharma",
    "type": "manufacturer"
  }'
```

---

## 🚧 Production Considerations

1. **Use MongoDB Atlas** with proper security
2. **Use strong JWT secrets** (32+ characters)
3. **Enable rate limiting** appropriately
4. **Set up proper CORS** origins
5. **Use HTTPS** in production
6. **Integrate real OTP** (Twilio/MSG91)
7. **Set up monitoring** (PM2, logs)
8. **Use KMS** for key management
