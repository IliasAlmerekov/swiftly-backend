import { v2 as cloudinary } from "cloudinary";
import { config } from "./env.js";

const { cloudinaryUrl, cloudinaryName, cloudinaryApiKey, cloudinaryApiSecret } =
  config;

const isTest = config.isTest;

let client;

if (isTest) {
  client = {
    uploader: {
      upload: async () => ({
        public_id: "test",
        secure_url: "https://example.com/test.jpg",
      }),
    },
  };
} else if (cloudinaryUrl) {
  // Render and other hosted environments usually expose a single CLOUDINARY_URL
  cloudinary.config({
    secure: true,
  });
  client = cloudinary;
} else if (cloudinaryName && cloudinaryApiKey && cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: cloudinaryName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
    secure: true,
  });
  client = cloudinary;
} else {
  throw new Error(
    "Missing Cloudinary configuration. Provide CLOUDINARY_URL or CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET."
  );
}

export default client;
