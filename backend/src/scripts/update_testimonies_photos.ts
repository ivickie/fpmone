import { pool } from '../db/index';

async function run() {
  await pool.query(`
    UPDATE testimonies SET photo_url = '/uploads/fpm-media/testimonies/global/63fbb80a-a989-4354-871a-98cb887691e0/727118ff-8d13-496c-a764-730197d687e5.jpg' WHERE id = '1866cbfa-5bbe-4c29-975b-025cca0554c1';
    UPDATE testimonies SET photo_url = '/uploads/fpm-media/testimonies/global/81751f77-448b-4f0b-bfa2-13443d13910a/7036f24b-0ae9-4e86-8faa-1e1ebe025522.jpg' WHERE id = '4d88f58d-1084-4c0b-a392-fe4d562d432a';
    UPDATE testimonies SET photo_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800' WHERE id = 'de6300dc-a8b7-4e5d-a4c6-09e466d7373b';
    UPDATE testimonies SET photo_url = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800' WHERE id = 'b5393d0e-16f9-4bd7-8c2a-6aaab37402ef';
    UPDATE testimonies SET photo_url = 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800' WHERE id = 'a4be349b-127c-42c1-8962-65a89e256314';
  `);
  console.log('Updated testimonies photo_url successfully in database');
  const res = await pool.query('SELECT id, title, photo_url FROM testimonies');
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
