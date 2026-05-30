require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
const { requireAuth, requireStaff, requireAdmin } = require('./middleware/roleMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Connect to Database
connectDB();

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static directories
app.use(express.static(path.join(__dirname, 'public')));

// HTML Views Routing with access guards
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Guard dashboard access from browser direct navigation
app.get('/admin-dashboard.html', authMiddleware, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get('/staff-dashboard.html', authMiddleware, requireStaff, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'staff-dashboard.html'));
});

app.get('/user-dashboard.html', authMiddleware, requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'user-dashboard.html'));
});

// Fallback for other HTML views inside views folder
app.get('/:page.html', (req, res) => {
  const allowedPages = [
    'index', 'products', 'product-detail', 'collections', 'cart', 'checkout',
    'order-success', 'order-tracking', 'contact', 'complaint', 'faq', 'policy',
    'login', 'register', 'forgot-password', '404'
  ];
  const page = req.params.page;
  if (allowedPages.includes(page)) {
    res.sendFile(path.join(__dirname, 'views', `${page}.html`));
  } else {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  }
});

// Register API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/game-accounts', require('./routes/gameAccountRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/collections', require('./routes/collectionRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/site-settings', require('./routes/siteSettingRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

// 404 Route handler for unknown APIs
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint không tồn tại.' });
});

// Serve 404 for standard visual pages
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Local URL: ${url}`);

  // Tự động mở trình duyệt khi server khởi động xong
  try {
    const { exec } = require('child_process');
    const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${startCmd} ${url}`);
  } catch (err) {
    console.log('Không thể tự động mở trình duyệt:', err.message);
  }
});
