const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main() {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  const source = path.resolve(__dirname, '../../Frontend/public/images/logo-redecamarao-integrada.png');
  const hash = createHash('sha256').update(fs.readFileSync(source)).digest('hex').slice(0, 16);
  const publicId = `redecamarao/brand/lockup-${hash}`;
  let asset;
  try { asset = await cloudinary.api.resource(publicId); }
  catch (error) {
    if (error.error?.http_code !== 404 && error.http_code !== 404) throw error;
    asset = await cloudinary.uploader.upload(source, { public_id: publicId, overwrite: false, resource_type: 'image', format: 'png', timeout: 60000 });
  }
  const logoUrl = cloudinary.url(publicId, { secure: true, version: asset.version, format: 'png', transformation: [{ width: 640, height: 203, crop: 'fit' }] });
  const response = await fetch(logoUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Cloudinary logo verification failed');
  const bytes = (await response.arrayBuffer()).byteLength;
  fs.writeFileSync(path.resolve(__dirname, '../../Frontend/src/data/brand.ts'), `// Published by Backend/scripts/publish-brand.cjs. The original icon remains local for the favicon.\nexport const brandLogoUrl = ${JSON.stringify(logoUrl)}\nexport const brandIconUrl = "/images/logo-redecamarao.png"\n`);
  console.log(JSON.stringify({ publicId, originalUrl: asset.secure_url, logoUrl, deliveredBytes: bytes }));
}
main().catch(error => { console.error('Brand publication failed:', error.error?.message || error.message); process.exitCode = 1; });
