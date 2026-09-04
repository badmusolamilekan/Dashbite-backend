import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { checkoutRouter, webhookRouter } from './routes/stripeRoutes.js';

const app = express();
const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  'https://dashbite-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean));

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use('/api/payments', webhookRouter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', checkoutRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
