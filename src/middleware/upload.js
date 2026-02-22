const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const env = require('../config/env');

// Allowed MIME types
const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Storage config — local disk (move to S3/R2 in production)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

// File filter — only PDF and images
function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Acceptés: PDF, JPG, PNG, WebP`), false);
  }
}

// Upload configurations
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 5,
  },
});

// Middleware presets
const uploadSingle = upload.single('file');
const uploadMultiple = upload.array('files', 5);

// Error handler wrapper
function handleUpload(uploadFn) {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `Fichier trop volumineux. Max: ${env.MAX_UPLOAD_MB}MB` });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Trop de fichiers. Max: 5' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
}

module.exports = { upload, uploadSingle: handleUpload(uploadSingle), uploadMultiple: handleUpload(uploadMultiple) };
