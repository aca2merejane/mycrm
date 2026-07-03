const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');

/**
 * Checks if the minimal Tencent COS configuration is present.
 * To use COS, KEY (SecretId), SECRET_KEY (SecretKey), and BUCKET_NAME must be defined.
 */
const isCosConfigured = () => {
  const secretId = process.env.SECRET_ID || process.env.KEY || process.env.COS_SECRET_ID;
  const secretKey = process.env.SECRET_KEY || process.env.COS_SECRET_KEY;
  const bucket = process.env.BUCKET_NAME || process.env.COS_BUCKET;
  
  return !!(secretId && secretKey && bucket);
};

let cosClient = null;

if (isCosConfigured()) {
  const secretId = process.env.SECRET_ID || process.env.KEY || process.env.COS_SECRET_ID;
  const secretKey = process.env.SECRET_KEY || process.env.COS_SECRET_KEY;
  cosClient = new COS({
    SecretId: secretId,
    SecretKey: secretKey,
    // Add debugging in dev mode if needed
    SimpleSignForGet: true
  });
  console.log('Tencent Cloud COS storage provider initialized successfully.');
} else {
  console.warn(
    'Tencent Cloud COS is not fully configured (missing KEY/SecretId, SECRET_KEY/SecretKey, or BUCKET_NAME).\n' +
    'Falling back to local storage.'
  );
}

const getCosParams = () => {
  const bucket = process.env.BUCKET_NAME || process.env.COS_BUCKET;
  const region = process.env.COS_REGION || 'ap-jakarta';
  return { Bucket: bucket, Region: region };
};

/**
 * Uploads a local file to Tencent COS if configured, otherwise does nothing (keeps it local).
 * @param {string} localFilePath - Path to the local file.
 * @param {string} filename - Target filename in storage.
 * @returns {Promise<string>} - The public URL or local relative path of the file.
 */
const uploadToCos = async (localFilePath, filename) => {
  if (!cosClient) {
    return `/uploads/${filename}`;
  }

  const { Bucket, Region } = getCosParams();
  
  return new Promise((resolve, reject) => {
    cosClient.uploadFile({
      Bucket: Bucket,
      Region: Region,
      Key: filename,
      FilePath: localFilePath,
      SliceSize: 1024 * 1024 * 5, // 5MB slice size
    }, (err, data) => {
      if (err) {
        console.error('Tencent COS upload error:', err);
        return reject(err);
      }
      // Construct public URL
      const url = data.Location ? `https://${data.Location}` : `https://${Bucket}.cos.${Region}.myqcloud.com/${filename}`;
      resolve(url);
    });
  });
};

/**
 * Deletes a file from Tencent COS if configured.
 * @param {string} filename - Filename in storage.
 */
const deleteFromCos = async (filename) => {
  if (!cosClient) return;

  const { Bucket, Region } = getCosParams();

  return new Promise((resolve) => {
    cosClient.deleteObject({
      Bucket: Bucket,
      Region: Region,
      Key: filename,
    }, (err) => {
      if (err) {
        console.error('Tencent COS delete error:', err);
      }
      resolve();
    });
  });
};

/**
 * Gets the redirect or proxy URL for a file.
 * If COS is configured, redirect to COS URL. Otherwise serve locally.
 * @param {string} filename 
 * @returns {string}
 */
const getFileUrl = (filename) => {
  if (!cosClient) {
    return `/uploads/${filename}`;
  }
  const { Bucket, Region } = getCosParams();
  return `https://${Bucket}.cos.${Region}.myqcloud.com/${filename}`;
};

module.exports = {
  isCosConfigured,
  uploadToCos,
  deleteFromCos,
  getFileUrl,
};
