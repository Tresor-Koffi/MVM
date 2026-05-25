const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Keep file in memory — Cloudinary receives the buffer directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Format de fichier non supporté'));
  },
});

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

// identifier: phone number used as stable Cloudinary public_id (overwrite on re-registration)
async function processPhoto(file, identifier = null) {
  const options = { folder: 'mvm_predicateurs', resource_type: 'image' };
  if (identifier) {
    const sanitized = String(identifier).replace(/[^a-zA-Z0-9_+\-]/g, '_');
    options.public_id = `TEL_${sanitized}`;
    options.overwrite = true;
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    bufferToStream(file.buffer).pipe(uploadStream);
  });
}

// Extract Cloudinary public_id from a secure_url and delete the asset
async function deletePhoto(url) {
  if (!url || !url.includes('cloudinary.com')) return;
  // URL: https://res.cloudinary.com/{cloud}/image/upload/v{n}/{public_id}.{ext}
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  if (match) {
    await cloudinary.uploader.destroy(match[1]).catch(console.error);
  }
}

module.exports = { upload, processPhoto, deletePhoto };
