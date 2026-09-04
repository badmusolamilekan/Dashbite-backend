# Backend README

This folder contains the server-side code for the food delivery platform.

## What this folder does

The backend is the brain of the app. It handles:

- user sign up and login
- email verification and OTP
- restaurant and menu data
- customer orders
- delivery tracking
- vendor and admin approval flows
- Stripe payments
- database connection and app startup

In simple terms:

- the frontend shows the website
- the backend stores and returns the real data
- the database keeps users, restaurants, menu items, and orders

## Main folders

### config/
This folder contains environment and database setup.

- `db.js` connects Node.js to MongoDB
- if the database is not available, it can fall back to an in-memory MongoDB for local testing

### controllers/
These files handle the actual business logic.

Examples:

- `authController.js` handles login, registration, and verification
- `catalogController.js` returns approved restaurants and menu items
- `orderController.js` creates and tracks customer orders
- `vendorController.js` handles restaurant owner actions
- `deliveryController.js` handles delivery personnel actions
- `adminController.js` handles admin approvals and analytics

### models/
These files define database tables using Mongoose schemas.

Examples:

- `User.js` stores customer, vendor, admin, and delivery users
- `Vendor.js` stores restaurant information
- `MenuItem.js` stores each menu item
- `Order.js` stores each order and its items
- `DeliveryPersonnel.js` stores delivery worker info

### routes/
These files decide which URL paths are available.

Examples:

- `/api/auth` handles login and registration
- `/api/catalog` returns approved menu and restaurant data
- `/api/orders` manages customer orders
- `/api/vendor` manages vendor features
- `/api/admin` manages approvals and admin functions
- `/api/delivery` manages delivery operations

### middleware/
These are helpers that run before routes are processed.

- `auth.js` checks whether a request is coming from a logged-in user
- `errorHandler.js` sends clean error responses
- `rateLimiter.js` limits repeated requests to prevent abuse

### services/
This folder contains helper logic used by the app.

- `ensureAdminUser.js` creates the default admin account
- `generateToken.js` creates a JWT token
- `sendEmail.js` sends OTP and email messages
- `seedDemoData.js` adds sample demo data if needed

## Entry files

### app.js
This file creates the Express app, enables CORS, loads middlewares, and connects all route files.

### server.js
This is the startup file. It connects to MongoDB, creates admin data, and starts the app on a port.

## Environment variables
The backend expects a `.env` file in this folder.

Sample values are in `.env.example`.

Common variables include:

- `MONGO_URI` — the MongoDB connection string
- `JWT_SECRET` — token secret for user login
- `PORT` — server port (default 5000)
- `CLIENT_URL` — frontend URL for CORS
- `SMTP_*` values — email sending settings
- `STRIPE_*` values — Stripe payment keys

## How the backend works end-to-end

1. A frontend request hits a route like `/api/catalog` or `/api/orders`
2. The route points to a controller function
3. The controller reads or writes data using Mongoose models
4. The server sends a JSON response back to the frontend
5. The frontend displays that response to the user

## Important idea for beginners

Think of the backend as a restaurant kitchen staff:

- controller = the person taking the order
- model = the recipe card and storage list
- route = the kitchen door where requests come in
- middleware = rules like checking if the user is allowed in

## Run the backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

If MongoDB is not reachable, the app warns and may fall back to an in-memory local MongoDB for testing.
