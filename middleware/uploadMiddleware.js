const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'others';

    // Identify folder name based on URL path or custom query parameter
    if (req.baseUrl.includes('game-accounts') || req.originalUrl.includes('game-accounts')) {
      folder = 'game-accounts';
    } else if (req.baseUrl.includes('categories') || req.originalUrl.includes('categories')) {
      folder = 'categories';
    } else if (req.baseUrl.includes('collections') || req.originalUrl.includes('collections')) {
      folder = 'collections';
    } else if (req.baseUrl.includes('site-settings') || req.originalUrl.includes('site-settings') || req.baseUrl.includes('siteSetting') || req.originalUrl.includes('siteSetting')) {
      folder = 'banners';
    } else if (req.baseUrl.includes('complaints') || req.originalUrl.includes('complaints')) {
      folder = 'complaints';
    } else if (req.baseUrl.includes('orders') || req.originalUrl.includes('orders')) {
      folder = 'payment-proofs'; // custom folder for payment proofs
    } else if (req.query.folder) {
      folder = req.query.folder;
    }

    const dir = path.join(__dirname, '..', 'public', 'uploads', folder);

    // Synchronously create directory if not exists
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận các định dạng ảnh: jpeg, jpg, png, gif, webp.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max size
  fileFilter: fileFilter
});

module.exports = upload;
