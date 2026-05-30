const fs = require('fs');
const path = require('path');

const deleteFile = (filePath) => {
  if (!filePath) return;
  
  let absolutePath = filePath;
  if (!path.isAbsolute(filePath)) {
    // If it's a URL path like /uploads/... map it to the actual file path on disk
    const relativePart = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    absolutePath = path.join(__dirname, '..', 'public', relativePart);
  }
  
  fs.unlink(absolutePath, (err) => {
    if (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Error deleting file at ${absolutePath}:`, err);
      }
    } else {
      console.log(`Deleted file: ${absolutePath}`);
    }
  });
};

module.exports = deleteFile;
