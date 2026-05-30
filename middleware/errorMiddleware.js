const path = require('path');

const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.';

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // For visual pages error, redirect to 404.html page
  res.status(statusCode).sendFile(path.join(__dirname, '..', 'views', '404.html'));
};

module.exports = errorMiddleware;
