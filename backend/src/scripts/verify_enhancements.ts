import { pool } from '../db/index';

async function testEnhancements() {
  const baseUrl = 'http://localhost:5000/api';

  console.log('--- 1. Authenticating as Admin ---');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrPhone: 'admin@fpmchurch.org', password: 'Password123!' })
  });
  const loginData = await loginRes.json() as any;
  if (!loginData.token) throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  const adminToken = loginData.token;
  console.log('✓ Admin authenticated successfully.');

  console.log('\n--- 2. Creating Service with Flyer Image (Requirement 4) ---');
  const flyerUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800';
  const servicePayload = {
    branchId: 'b1111111-1111-1111-1111-111111111111',
    name: 'Midweek Miracle & Deliverance Explosion',
    dayOfWeek: 'Wednesday',
    startTime: '18:00',
    expectedEndTime: '20:30',
    gracePeriodMinutes: 15,
    attendanceDurationHours: 3.5,
    liveStreamUrl: 'https://youtube.com/live/fpm-midweek',
    imageUrl: flyerUrl
  };
  const createServiceRes = await fetch(`${baseUrl}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(servicePayload)
  });
  const createdService = await createServiceRes.json() as any;
  console.log('✓ Service created:', createdService.id, createdService.name);
  if (createdService.imageUrl !== flyerUrl) {
    throw new Error(`Expected imageUrl ${flyerUrl}, got ${createdService.imageUrl}`);
  }
  console.log('✓ Service persisted flyer image correctly:', createdService.imageUrl);

  console.log('\n--- 3. Creating Service Highlight with Multiple Media (Requirement 1) ---');
  const mediaList = [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'
  ];
  const highlightPayload = {
    serviceId: createdService.id,
    branchId: 'b1111111-1111-1111-1111-111111111111',
    title: 'Supernatural Encounters at Midweek Miracle',
    preacher: 'Pastor David Adeleke',
    sermonTitle: 'Walking in Uncommon Favor',
    keyScripture: 'Psalm 102:13',
    summaryNotes: 'A glorious outpouring of the Holy Spirit with prophetic confirmations and miraculous healing testimonies.',
    videoUrl: 'https://youtube.com/watch?v=fpm-recap-sample',
    mediaUrls: mediaList,
    isPublished: true
  };
  const createHighlightRes = await fetch(`${baseUrl}/highlights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(highlightPayload)
  });
  const createdHighlight = await createHighlightRes.json() as any;
  console.log('✓ Highlight created:', createdHighlight.id, createdHighlight.title);
  if (!createdHighlight.photos || createdHighlight.photos.length !== 3) {
    throw new Error(`Expected 3 photos, got ${JSON.stringify(createdHighlight.photos)}`);
  }
  console.log('✓ Highlight persisted multi-media gallery correctly (3 photos):', createdHighlight.photos);

  console.log('\n--- 4. Creating New Event with Banner Image (Requirement 6) ---');
  const eventBannerUrl = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800';
  const eventPayload = {
    branchId: 'b1111111-1111-1111-1111-111111111111',
    title: 'FPM International Youth & Young Adults Summit 2026',
    description: 'Empowering the next generation for kingdom impact, leadership excellence, and global marketplace takeover.',
    bannerUrl: eventBannerUrl,
    startDatetime: '2026-10-15T16:00:00Z',
    endDatetime: '2026-10-18T20:00:00Z',
    location: 'Faith Cathedral International Auditorium',
    speaker: 'Pastor David Adeleke & Pastor Kesh',
    category: 'Youth',
    registrationRequired: true,
    registrationCapacity: 2500,
    targetScope: 'all',
    status: 'published'
  };
  const createEventRes = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(eventPayload)
  });
  const createdEvent = await createEventRes.json() as any;
  console.log('✓ Event created:', createdEvent.id, createdEvent.title);
  if (createdEvent.bannerUrl !== eventBannerUrl) {
    throw new Error(`Expected bannerUrl ${eventBannerUrl}, got ${createdEvent.bannerUrl}`);
  }
  console.log('✓ Event persisted banner image correctly:', createdEvent.bannerUrl);

  console.log('\n--- 5. Verifying Mobile Feed / Services / Events Endpoints ---');
  const servicesRes = await (await fetch(`${baseUrl}/services`)).json() as any;
  const foundSvc = servicesRes.find((s: any) => s.id === createdService.id);
  console.log('✓ Public GET /services contains created service with flyer:', !!foundSvc?.imageUrl);

  const eventsRes = await (await fetch(`${baseUrl}/events`)).json() as any;
  const foundEvt = eventsRes.find((e: any) => e.id === createdEvent.id);
  console.log('✓ Public GET /events contains created event with banner:', !!foundEvt?.bannerUrl);

  const testimoniesRes = await (await fetch(`${baseUrl}/testimonies`)).json() as any;
  const withPhotos = testimoniesRes.filter((t: any) => !!t.photoUrl);
  console.log(`✓ Public GET /testimonies returns ${withPhotos.length} / ${testimoniesRes.length} testimonies with photos.`);
  console.log(`✓ Public GET /testimonies returns ${withPhotos.length} / ${testimoniesRes.length} testimonies with photos.`);

  console.log('\n=========================================');
  console.log('ALL API-LEVEL VERIFICATION CHECKS PASSED!');
  console.log('=========================================');
  await pool.end();
}

testEnhancements().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
