const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "PetHelp/Profiles",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const parser = multer({ storage });

module.exports = parser;
