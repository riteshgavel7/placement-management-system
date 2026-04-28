const multer = require("multer");

// memory storage (for cloud / buffer use)
const storage = multer.memoryStorage();

// file filter
const fileFilter = (req, file, cb) => {
  const isPDF = file.mimetype === "application/pdf";
  const isImage = file.mimetype.startsWith("image/");

  if (isPDF || isImage) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and Images allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;