const assert = require('node:assert/strict');
const { test, beforeEach, afterEach, after, mock } = require('node:test');
const { Writable } = require('node:stream');
const cloudinary = require('../src/config/cloudinary.ts').default;
const { imageStorage, managedImageId } = require('../src/service/imageStorage.ts');
const { connection } = require('../src/util/connection.ts');
const { OfferDAOPostgres } = require('../src/infra/bd/postgres/offer.Postgres.dao.ts');
const { OfferPhotoDAOPostgres } = require('../src/infra/bd/postgres/offerPhoto.Postgres.dao.ts');
const { UserDAOPostgres } = require('../src/infra/bd/postgres/user.Postgres.dao.ts');
const originalConfig = { ...cloudinary.config() };
const id = 'redecamarao/offers/00000000-0000-4000-8000-000000000001';
const profileId = id.replace('/offers/', '/profiles/');
const url = publicId => `https://res.cloudinary.com/test-cloud/image/upload/v123/${publicId}.png`;
let destroyed;

beforeEach(() => {
  cloudinary.config({ cloud_name: 'test-cloud', api_key: 'test-key', api_secret: 'test-secret' });
  destroyed = [];
  mock.method(cloudinary.uploader, 'destroy', async (publicId, options) => {
    assert.deepEqual(options, { resource_type: 'image', type: 'upload', invalidate: true, timeout: 10000 });
    destroyed.push(publicId); return { result: 'ok' };
  });
  mock.method(connection, 'query', async () => { throw new Error('Unexpected database access'); });
});
afterEach(() => { mock.restoreAll(); cloudinary.config(originalConfig); });
after(() => connection.end());

test('uploads the validated buffer as a signed image stream with a unique public ID and HTTPS URL', async () => {
  const input = Buffer.from('validated image bytes');
  const received = [];
  const upload = mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => {
    assert.equal(options.overwrite, false); assert.equal(options.resource_type, 'image');
    assert.equal(options.type, 'upload'); assert.equal(options.timeout, 20000);
    assert.deepEqual(options.allowed_formats, ['jpg', 'jpeg', 'png']);
    return new Writable({
      write(chunk, _encoding, done) { received.push(chunk); done(); },
      final(done) { callback(null, { public_id: options.public_id, secure_url: url(options.public_id) }); done(); },
    });
  });
  const image = await imageStorage.upload(input, 'profiles');
  assert.match(image.publicId, /^redecamarao\/profiles\/[a-f0-9-]{36}$/);
  assert.equal(image.imageUrl, url(image.publicId));
  assert.deepEqual(Buffer.concat(received), input);
  assert.equal(upload.mock.callCount(), 1); assert.deepEqual(destroyed, []);
});

test('missing credentials reject the upload without calling the provider', async () => {
  cloudinary.config({ api_secret: '' });
  const upload = mock.method(cloudinary.uploader, 'upload_stream', () => assert.fail('Must not upload'));
  await assert.rejects(imageStorage.upload(Buffer.from('image'), 'offers'), { code: 'IMAGE_STORAGE_UNAVAILABLE' });
  assert.equal(upload.mock.callCount(), 0); assert.deepEqual(destroyed, []);
});

for (const failure of ['provider', 'stream', 'invalid-response']) {
  test(`${failure} failure hides provider details and cleans the generated asset ID`, async () => {
    let generated;
    mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => {
      generated = options.public_id;
      return new Writable({ write(_chunk, _encoding, done) {
        if (failure === 'stream') return done(new Error('Sensitive secret from provider'));
        if (failure === 'provider') callback(new Error('Sensitive secret from provider'));
        else callback(null, { public_id: options.public_id, secure_url: 'https://example.test/image.png' });
        done();
      } });
    });
    await assert.rejects(imageStorage.upload(Buffer.from('image'), 'offers'), error => {
      assert.equal(error.code, 'IMAGE_STORAGE_UNAVAILABLE'); assert(!error.message.includes('Sensitive')); return true;
    });
    assert.deepEqual(destroyed, [generated]);
  });
}

test('only recognizes versioned URLs in this application namespace and configured cloud', () => {
  assert.equal(managedImageId(url(id)), id); assert.equal(managedImageId(url(profileId)), profileId);
  for (const value of [null, '', 'file:///secret.png', url(id).replace('https:', 'http:'),
    url(id).replace('/test-cloud/', '/other-cloud/'), url(id).replace('res.cloudinary.com', 'res.cloudinary.com.evil.test'),
    url(id).replace('/redecamarao/', '/other-app/'), url(id).replace('/v123/', '/c_fill/v123/'),
    url(id) + '?other=1', url(id).replace('/v123/', '/'), 'https://example.test/uploads/profiles/image.png']) {
    assert.equal(managedImageId(value), null);
  }
});

test('cleanup deduplicates candidates, ignores external URLs and preserves images used by any profile or offer', async () => {
  mock.method(connection, 'query', async (sql, values) => {
    assert.match(sql, /FROM "offerPhotos"/); assert.match(sql, /FROM users/);
    assert.deepEqual(values, [[url(id), url(profileId)]]);
    return { rows: [{ imageUrl: url(profileId) }] };
  });
  await imageStorage.removeUnused([url(id), url(id), url(profileId), 'https://example.test/image.png']);
  assert.deepEqual(destroyed, [id]);
});

test('cleanup failures preserve successful saves and never log provider details', async () => {
  const errors = mock.method(console, 'error', () => {});
  await imageStorage.removeUnused([url(id)]);
  assert.deepEqual(destroyed, []);
  mock.method(cloudinary.uploader, 'destroy', async () => { throw new Error('Sensitive provider secret'); });
  await imageStorage.removeCreated([id]);
  assert.equal(errors.mock.callCount(), 2);
  assert(!JSON.stringify(errors.mock.calls).includes('Sensitive'));
});

for (const operation of ['offer', 'account', 'photo', 'replace-photo']) {
  test(`${operation} deletes only unused managed images after a successful database write`, async () => {
    let writes = 0;
    mock.method(connection, 'query', async (sql, values) => {
      if (sql.startsWith('SELECT')) { assert.equal(writes, 1); return { rows: [] }; }
      writes++;
      assert.equal(destroyed.length, 0);
      if (operation === 'offer') {
        assert.match(sql, /DELETE FROM offers WHERE id = \$1 AND "userId" = \$2/);
        assert.deepEqual(values, ['offer-1', 'owner-1']);
      } else if (operation === 'account') {
        assert.match(sql, /JOIN offers/); assert.match(sql, /DELETE FROM users WHERE id = \$1/);
        assert.deepEqual(values, ['owner-1']);
      } else {
        assert.match(sql, /offers\."userId" = \$\d+/);
        assert.deepEqual(values.slice(-3), ['photo-1', 'offer-1', 'owner-1']);
        if (operation === 'replace-photo') assert.match(sql, /RETURNING previous\."imageUrl"/);
      }
      return { rowCount: 1, rows: [{ images: [url(id)], imageUrl: url(id) }] };
    });
    if (operation === 'offer') assert.equal(await new OfferDAOPostgres().delete('offer-1', 'owner-1'), true);
    else if (operation === 'account') await new UserDAOPostgres().delete('owner-1');
    else if (operation === 'photo') assert.equal(await new OfferPhotoDAOPostgres().delete('photo-1', 'offer-1', 'owner-1'), true);
    else assert.equal(await new OfferPhotoDAOPostgres().update('photo-1', 'offer-1', 'owner-1', { imageUrl: 'https://example.test/new.png' }), true);
    assert.deepEqual(destroyed, [id]);
  });
}

test('conflicted or failed offer deletion never removes an image', async () => {
  mock.method(connection, 'query', async () => ({ rowCount: 0, rows: [] }));
  assert.equal(await new OfferDAOPostgres().delete('offer-1', 'other-owner'), false);
  mock.method(connection, 'query', async () => { throw new Error('Database unavailable'); });
  await assert.rejects(new OfferDAOPostgres().delete('offer-1', 'owner-1'));
  assert.deepEqual(destroyed, []);
});
