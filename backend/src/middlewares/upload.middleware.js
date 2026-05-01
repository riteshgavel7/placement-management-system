const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isPDF = file.mimetype === "application/pdf";
  const isImage = file.mimetype.startsWith("image/");
  const isDoc = 
    file.mimetype === "application/msword" || 
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isPDF || isImage || isDoc) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, Images, and Word documents allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024 },
});

module.exports = upload;