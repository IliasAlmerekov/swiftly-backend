import fs from "fs";
import logger from "../../utils/logger.js";

class CloudinaryFileStorage {
  constructor({ cloudinary, fsModule = fs, loggerInstance = logger }) {
    if (typeof cloudinary?.uploader?.upload !== "function") {
      throw new TypeError(
        "cloudinary.uploader.upload is required for attachment upload"
      );
    }

    this.cloudinary = cloudinary;
    this.fs = fsModule;
    this.logger = loggerInstance;
  }

  async uploadTicketAttachment(filePath) {
    const result = await this.cloudinary.uploader.upload(filePath, {
      folder: "ticket-attachments",
      resource_type: "auto",
    });

    if (!result?.public_id || !result?.secure_url) {
      throw new Error(
        "Cloudinary upload result does not contain required fields"
      );
    }

    return {
      publicId: result.public_id,
      url: result.secure_url,
    };
  }

  async removeTemporaryFile(filePath) {
    if (!filePath || typeof this.fs?.unlinkSync !== "function") {
      return;
    }

    try {
      this.fs.unlinkSync(filePath);
    } catch (unlinkError) {
      this.logger.warn(
        { error: unlinkError, filePath },
        "Failed to remove temporary upload file"
      );
    }
  }
}

export default CloudinaryFileStorage;
