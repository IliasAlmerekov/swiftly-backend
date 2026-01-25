import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_URL, CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET } =
  process.env;

const isTest = process.env.NODE_ENV === "test";

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
} else if (CLOUDINARY_URL) {
  // Render and other hosted environments usually expose a single CLOUDINARY_URL
  cloudinary.config({
    secure: true,
  });
  client = cloudinary;
} else if (CLOUD_NAME && CLOUD_API_KEY && CLOUD_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_API_KEY,
    api_secret: CLOUD_API_SECRET,
    secure: true,
  });
  client = cloudinary;
} else {
  throw new Error(
    "Missing Cloudinary configuration. Provide CLOUDINARY_URL or CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET."
  );
}

export default client;
