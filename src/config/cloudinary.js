import { v2 as cloudinary } from 'cloudinary'

const {
  CLOUDINARY_URL,
  CLOUD_NAME,
  CLOUD_API_KEY,
  CLOUD_API_SECRET,
} = process.env;

if (CLOUDINARY_URL) {
  // Render and other hosted environments usually expose a single CLOUDINARY_URL
  cloudinary.config({
    secure: true,
  });
} else if (CLOUD_NAME && CLOUD_API_KEY && CLOUD_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_API_KEY,
    api_secret: CLOUD_API_SECRET,
    secure: true,
  });
} else {
  throw new Error(
    'Missing Cloudinary configuration. Provide CLOUDINARY_URL or CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET.'
  );
}

export default cloudinary;
