# Farmer Customer Platform - Mobile App

This project is a mobile-first farmer-to-customer marketplace. The Expo React Native app lives in `mobile/`, and the Node/Express/MongoDB API lives in `server/`.

## Tech Stack

- Mobile app: React Native with Expo, React Navigation, Axios, Expo SecureStore
- Backend: Node.js, Express.js, Socket.io
- Database: MongoDB with Mongoose
- Integrations: JWT auth, bcrypt, Cloudinary uploads, Nodemailer hooks, Stripe/demo payment flow
- Deployment target: hosted backend on Render/Railway/AWS/DigitalOcean, Expo mobile app connected to that API

## Mobile Features

- Authentication and role-based app navigation
- Secure JWT storage and automatic session restore
- Customer product browsing, product details, cart, checkout, orders, order details, profile, notifications, promotions, and reviews
- Farmer dashboard, product management, farm orders, promotions, reviews, profile, and notifications
- Admin dashboard, user/farmer approval management, product management, order management, promotions, reviews, profile, and notifications
- Delivery dashboard, assigned delivery list, delivery acceptance, delivery status/tracking updates, profile, and notifications

## Project Structure

```text
mobile/   Expo React Native mobile app
server/   Express + MongoDB backend API
```

## How To Run On Another Laptop

Clone the repo on the other laptop, then choose one of the two modes below.

### Mode 1: Run Everything Locally

Use this while developing before deployment.

1. Install server dependencies:

```bash
npm install --prefix server
```

2. Create `server/.env` from `server/.env.example` and fill in local values.

3. Start the backend:

```bash
npm run dev --prefix server
```

4. Install mobile dependencies:

```bash
npm install --prefix mobile
```

5. Set the mobile API URL to your own machine's IP address, for example:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:5000/api
```

6. Start Expo:

```bash
npm start --prefix mobile
```

7. Run on Android or iOS using the Expo prompt, or use LAN mode for a phone on the same Wi-Fi.

### Mode 2: Run With Deployed Backend

Use this after the backend is deployed to Render.

1. Keep the backend running on Render.
2. Do not run `npm run dev` in the `server` folder on your laptop.
3. Set the mobile API URL to the Render backend:

```env
EXPO_PUBLIC_API_URL=https://farm-fresh-mobile.onrender.com/api
```

4. Start Expo locally:

```bash
npm start --prefix mobile -- --lan --go --clear
```

5. Open the app on your phone. The mobile app will load locally through Expo, but all API calls will go to Render.

If the backend is already deployed, this laptop only needs the mobile app and Expo running.

## Backend Setup

```bash
npm install --prefix server
copy server\.env.example server\.env
npm run seed --prefix server
npm run dev --prefix server
```

Production start command:

```bash
npm start --prefix server
```

The backend uses `process.env.PORT`, so it is ready for Render-style hosting.

## Backend Environment Variables

Set these in `server/.env` and in your hosting provider:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
MONGO_DB=farmer_customer_platform
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret
CORS_ORIGIN=*
SERVER_URL=https://your-render-service.onrender.com
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Optional values include `STRIPE_SECRET`, SMTP settings, checkout tax/delivery fee settings, and delivery delay threshold settings.

## Mobile App Setup

```bash
npm install --prefix mobile
npm start --prefix mobile
```

Run on Android:

```bash
npm run android --prefix mobile
```

Run on iOS:

```bash
npm run ios --prefix mobile
```

## Mobile API URL Setup

The mobile API client is in `mobile/src/api/api.js`.

Use one of these:

- Local Android emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

- Physical phone on the same Wi-Fi while backend runs locally:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:5000/api
```

- Physical phone after backend is deployed:

```env
EXPO_PUBLIC_API_URL=https://farm-fresh-mobile.onrender.com/api
```

The deployed mode should use the hosted backend, not localhost.

## Render Deployment Steps

1. Push the project to GitHub.
2. Create a new Render Web Service.
3. Set root directory to `server`.
4. Set build command:

```bash
npm install
```

5. Set start command:

```bash
npm start
```

6. Add all backend environment variables from `server/.env.example`.
7. Confirm `MONGO_URI` points to MongoDB Atlas.
8. Deploy and test:

```text
https://your-render-service.onrender.com/
```

Expected response:

```text
API running
```

9. Set the mobile app `EXPO_PUBLIC_API_URL` to:

```text
https://farm-fresh-mobile.onrender.com/api
```

## Production Checklist

After Render deploys successfully:

1. Confirm the Render service is live.
2. Open `https://farm-fresh-mobile.onrender.com/` and check it returns `API running`.
3. Make sure these env values exist in Render:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN`
   - `SERVER_URL=https://farm-fresh-mobile.onrender.com`
4. Add Cloudinary credentials if product image uploads are needed in production.
5. Set `mobile/.env` to `EXPO_PUBLIC_API_URL=https://farm-fresh-mobile.onrender.com/api`.
6. Start Expo locally on any laptop that will run the app.
7. Stop the local backend when you want the app to use Render instead of localhost.

## Demo Accounts

After running the seeder, all accounts use:

```text
password123
```

- Admin: `admin@example.com`
- Farmer: `farmer@example.com`
- Farmer 2: `farmer2@example.com`
- Pending farmer: `farmer-pending@example.com`
- Customer: `customer@example.com`
- Customer 2: `customer2@example.com`
- Delivery: `delivery@example.com`
- Delivery 2: `delivery2@example.com`

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/orders/preview`
- `POST /api/orders`
- `GET /api/orders/me`
- `GET /api/orders/farmer`
- `GET /api/orders/admin`
- `GET /api/orders/delivery`
- `GET /api/promotions`
- `GET /api/promotions/manage`
- `GET /api/reviews/manage`
- `GET /api/notifications`
- `GET /api/users/stats`
- `GET /api/users/analytics`

Mobile requests use:

```text
Authorization: Bearer <token>
```

## Testing

Backend tests:

```bash
npm test --prefix server
```

Manual mobile test flow:

1. Login as customer.
2. Browse products and add items to cart.
3. Checkout using COD or online demo payment.
4. Login as farmer and move order to In Transit.
5. Login as delivery and accept/update delivery.
6. Login as admin and review users, products, orders, promotions, and dashboard stats.

## Assignment Checklist

- React Native mobile app in `mobile/`
- Node.js + Express backend preserved in `server/`
- MongoDB + Mongoose backend preserved
- JWT Bearer authentication used by mobile app
- Secure mobile token storage implemented with Expo SecureStore
- Role-based mobile navigation implemented
- Backend deployment variables documented
- Render deployment steps documented
- Mobile app can switch from local API to hosted API
- Final demo can run without localhost by setting `EXPO_PUBLIC_API_URL`

## Recommended Next Improvements

- Add native image picking/upload from the mobile app to the existing Cloudinary route.
- Add richer mobile forms for advanced promotion product/farmer targeting.
- Add push notifications through Expo Notifications in addition to stored notifications.
- Add mobile charts for admin/farmer analytics.
- Add EAS Build configuration for APK/AAB generation.
