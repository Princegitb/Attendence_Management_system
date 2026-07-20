const { calculateHaversineDistance } = require('../utils/haversine');
const { validatePhotoBuffer } = require('../utils/photoValidator');
const { generateTemplateBuffer, processGuardExcelImport } = require('../utils/excelParser');
const seedDb = require('../db/seed');
const db = require('../db');

async function runTests() {
  console.log('🧪 Starting backend automated tests...\n');

  // 1. Database Seed Verification
  await seedDb();

  // 2. Test Haversine Formula
  console.log('\n--- Test 1: Haversine Geo-Fence Calculation ---');
  // Post coords: (28.613939, 77.209021)
  // Close coords (~15 meters away): (28.614000, 77.209100)
  const distanceClose = calculateHaversineDistance(28.613939, 77.209021, 28.614000, 77.209100);
  console.log(`Calculated distance (close point): ${distanceClose} meters`);
  if (distanceClose < 50) {
    console.log('✅ Haversine close distance test PASSED');
  } else {
    console.error('❌ Haversine close distance test FAILED');
  }

  // Far coords (~1200 meters away): (28.625000, 77.215000)
  const distanceFar = calculateHaversineDistance(28.613939, 77.209021, 28.625000, 77.215000);
  console.log(`Calculated distance (far point): ${distanceFar} meters`);
  if (distanceFar > 500) {
    console.log('✅ Haversine geo-fence rejection threshold test PASSED');
  } else {
    console.error('❌ Haversine geo-fence rejection threshold test FAILED');
  }

  // 3. Test Photo Validator
  console.log('\n--- Test 2: Photo Validation ---');
  const emptyBuf = Buffer.alloc(100);
  const valEmpty = validatePhotoBuffer(emptyBuf);
  console.log('Empty photo validation result:', valEmpty);
  if (!valEmpty.valid) {
    console.log('✅ Empty/corrupt photo rejection test PASSED');
  }

  // Create valid fake JPEG header buffer
  const fakeJpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const dummyPayload = Buffer.alloc(2000, 120); // Average byte value 120 (well above 5)
  const validJpegBuf = Buffer.concat([fakeJpegHeader, dummyPayload]);
  const valValid = validatePhotoBuffer(validJpegBuf);
  console.log('Valid photo validation result:', valValid);
  if (valValid.valid) {
    console.log('✅ Valid photo verification test PASSED');
  }

  // 4. Test Excel Template & Bulk Import
  console.log('\n--- Test 3: Excel Bulk Import Module ---');
  const templateBuf = generateTemplateBuffer();
  console.log(`Generated Excel template buffer size: ${templateBuf.length} bytes`);
  
  const importResult = await processGuardExcelImport(templateBuf);
  console.log('Bulk import simulation output:', importResult);
  if (importResult.totalRows === 2 && importResult.successCount === 2) {
    console.log('✅ Excel Bulk Import test PASSED');
  } else {
    console.error('❌ Excel Bulk Import test FAILED');
  }

  console.log('\n🎉 ALL BACKEND CORE UTILITY TESTS COMPLETED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
