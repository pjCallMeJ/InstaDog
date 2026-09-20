/**
 * ตรวจ endpoint หลักทั้งหมดอย่างรวดเร็ว
 * รันด้วย: node scripts/smoke-test.mjs   (ต้องเปิด npm run develop ไว้ก่อน)
 */

const BASE = process.env.BASE_URL || 'http://localhost:1337';
const EMAIL = process.env.SEED_EMAIL || 'browny@instadog.app';
const PASSWORD = process.env.SEED_PASSWORD || 'Instadog123';

let token = '';
let pass = 0;
let fail = 0;

async function call(method, path, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function check(label, fn) {
  try {
    const result = await fn();
    if (result === false) throw new Error('assertion failed');
    console.log(`  PASS  ${label}${typeof result === 'string' ? ` — ${result}` : ''}`);
    pass += 1;
  } catch (error) {
    console.log(`  FAIL  ${label} — ${error.message}`);
    fail += 1;
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const run = async () => {
  console.log(`\nInstaDog API smoke test — ${BASE}\n`);

  await check('POST /api/auth/local (เข้าสู่ระบบ)', async () => {
    const { status, json } = await call('POST', '/api/auth/local', {
      identifier: EMAIL,
      password: PASSWORD,
    }, { auth: false });
    expect(status === 200, `status ${status} ${JSON.stringify(json).slice(0, 200)}`);
    expect(json.jwt, 'ไม่ได้รับ jwt');
    token = json.jwt;
    return `user=${json.user.username}`;
  });

  await check('GET /api/me/profile', async () => {
    const { status, json } = await call('GET', '/api/me/profile');
    expect(status === 200, `status ${status}`);
    expect(json.data.primaryDog?.handle === 'browny.thegolden', 'สุนัขหลักไม่ถูกต้อง');
    const c = json.data.primaryDog.counts;
    return `${json.data.displayName} • โพสต์ ${c.posts} / ผู้ติดตาม ${c.followers} / กำลังติดตาม ${c.following}`;
  });

  await check('GET /api/feed', async () => {
    const { status, json } = await call('GET', '/api/feed?page=1&pageSize=10');
    expect(status === 200, `status ${status}`);
    expect(json.data.length > 0, 'ฟีดว่าง');
    const first = json.data[0];
    expect(first.coverUrl?.startsWith('http'), 'URL รูปไม่ใช่ absolute');
    return `${json.meta.total} โพสต์ • บนสุด "${first.dog.handle}" ${first.likeCountText} ไลค์ ${first.commentCountText} คอมเมนต์ (${first.timeAgo})`;
  });

  await check('GET /api/stories', async () => {
    const { status, json } = await call('GET', '/api/stories');
    expect(status === 200, `status ${status}`);
    expect(json.data.length > 0, 'ไม่มีสตอรี่');
    return `${json.data.length} วง • self=${json.self?.handle}`;
  });

  await check('GET /api/explore/categories (จำนวนแท็บ)', async () => {
    const { status, json } = await call('GET', '/api/explore/categories');
    expect(status === 200, `status ${status}`);
    expect(json.data.length >= 5, 'หมวดน้อยเกินไป');
    return `${json.data.length} แท็บ: ${json.data.map((c) => c.nameTh).join(', ')}`;
  });

  await check('GET /api/explore?category=all', async () => {
    const { status, json } = await call('GET', '/api/explore?category=all&pageSize=21');
    expect(status === 200, `status ${status}`);
    expect(json.data.length > 0, 'กริดว่าง');
    return `${json.data.length} รูป`;
  });

  await check('GET /api/explore?category=walk (กรองตามหมวด)', async () => {
    const { status, json } = await call('GET', '/api/explore?category=walk');
    expect(status === 200, `status ${status}`);
    return `${json.data.length} รูป`;
  });

  await check('GET /api/search', async () => {
    const { status, json } = await call('GET', '/api/search?q=บรูนี่');
    expect(status === 200, `status ${status}`);
    return `สุนัข ${json.data.dogs.length} • แฮชแท็ก ${json.data.hashtags.length}`;
  });

  await check('GET /api/notifications?scope=you (จัดกลุ่มตามเวลา)', async () => {
    const { status, json } = await call('GET', '/api/notifications?scope=you');
    expect(status === 200, `status ${status}`);
    expect(json.data.length > 0, 'ไม่มีแจ้งเตือน');
    return json.data.map((g) => `${g.label}(${g.items.length})`).join(' ');
  });

  await check('GET /api/notifications?scope=following', async () => {
    const { status, json } = await call('GET', '/api/notifications?scope=following');
    expect(status === 200, `status ${status}`);
    return json.data.map((g) => `${g.label}(${g.items.length})`).join(' ') || 'ว่าง';
  });

  await check('GET /api/notifications/unread-count', async () => {
    const { status, json } = await call('GET', '/api/notifications/unread-count');
    expect(status === 200, `status ${status}`);
    return `${json.count} รายการ`;
  });

  await check('GET /api/dogs/browny.thegolden/profile', async () => {
    const { status, json } = await call('GET', '/api/dogs/browny.thegolden/profile');
    expect(status === 200, `status ${status}`);
    expect(json.data.ageText, 'ไม่มีข้อความอายุ');
    expect(json.data.coverUrl, 'ไม่มีรูปปก');
    return `${json.data.nameTh} • ${json.data.breedNameTh} • ${json.data.ageText}`;
  });

  for (const tab of ['posts', 'photos', 'about']) {
    await check(`GET /api/dogs/browny.thegolden/${tab} (แท็บโปรไฟล์)`, async () => {
      const { status, json } = await call('GET', `/api/dogs/browny.thegolden/${tab}`);
      expect(status === 200, `status ${status}`);
      return Array.isArray(json.data) ? `${json.data.length} รายการ` : 'ok';
    });
  }

  let postId = '';
  await check('POST /api/posts/:id/like (สลับไลค์)', async () => {
    const feed = await call('GET', '/api/feed?pageSize=1');
    postId = feed.json.data[0].documentId;
    const before = feed.json.data[0].likeCount;

    const on = await call('POST', `/api/posts/${postId}/like`);
    expect(on.status === 200, `status ${on.status}`);
    expect(on.json.liked === true, 'ควรเป็น liked=true');
    expect(on.json.likeCount === before + 1, 'จำนวนไลค์ไม่เพิ่ม');

    const off = await call('POST', `/api/posts/${postId}/like`);
    expect(off.json.liked === false, 'ควรเป็น liked=false');
    expect(off.json.likeCount === before, 'จำนวนไลค์ไม่กลับค่าเดิม');
    return `${before} -> ${on.json.likeCount} -> ${off.json.likeCount}`;
  });

  await check('POST /api/posts/:id/save (สลับบันทึก)', async () => {
    const on = await call('POST', `/api/posts/${postId}/save`);
    expect(on.status === 200 && on.json.saved === true, 'บันทึกไม่สำเร็จ');
    const off = await call('POST', `/api/posts/${postId}/save`);
    expect(off.json.saved === false, 'ยกเลิกบันทึกไม่สำเร็จ');
    return 'saved -> unsaved';
  });

  await check('GET|POST /api/posts/:id/comments', async () => {
    const created = await call('POST', `/api/posts/${postId}/comments`, { text: 'ทดสอบคอมเมนต์ 🐾' });
    expect(created.status === 200, `status ${created.status}`);
    const list = await call('GET', `/api/posts/${postId}/comments`);
    expect(list.json.data.length > 0, 'ไม่มีคอมเมนต์');
    return `รวม ${list.json.meta.total} คอมเมนต์`;
  });

  await check('POST /api/dogs/shiba.momo/follow', async () => {
    const on = await call('POST', '/api/dogs/shiba.momo/follow');
    expect(on.status === 200, `status ${on.status}`);
    const off = await call('POST', '/api/dogs/shiba.momo/follow');
    return `${on.json.following} -> ${off.json.following}`;
  });

  await check('GET /api/activity/today (วงแหวนก้าว)', async () => {
    const { status, json } = await call('GET', '/api/activity/today');
    expect(status === 200, `status ${status}`);
    return `${json.data.steps}/${json.data.stepGoal} ก้าว • ${json.data.distanceKm} กม.`;
  });

  await check('GET /api/activity/week (กราฟ 7 วัน)', async () => {
    const { status, json } = await call('GET', '/api/activity/week');
    expect(status === 200, `status ${status}`);
    expect(json.data.length === 7, 'ต้องมี 7 วัน');
    return json.data.map((d) => d.weekdayTh).join(' ');
  });

  await check('POST /api/walks/start + stop', async () => {
    const start = await call('POST', '/api/walks/start', {});
    expect(start.status === 200, `status ${start.status}`);
    const stop = await call('POST', `/api/walks/${start.json.data.documentId}/stop`, {
      durationSec: 600,
      steps: 980,
      distanceKm: 0.64,
      calories: 44,
    });
    expect(stop.status === 200, `status ${stop.status}`);
    return `${stop.json.data.steps} ก้าว / ${stop.json.data.distanceKm} กม.`;
  });

  await check('GET /api/care-routines + toggle', async () => {
    const list = await call('GET', '/api/care-routines');
    expect(list.status === 200, `status ${list.status}`);
    expect(list.json.data.length > 0, 'ไม่มีรายการดูแล');

    const first = list.json.data[0];
    // รายการอาจถูกติ๊กไว้แล้วจากการทดลองในแอป ปรับให้เป็น "ยังไม่เสร็จ" ก่อนเริ่มทดสอบ
    if (first.isCompleted) {
      await call('POST', '/api/care-logs/toggle', { routine: first.documentId });
    }

    const on = await call('POST', '/api/care-logs/toggle', { routine: first.documentId });
    expect(on.json.isCompleted === true, 'ติ๊กแล้วไม่เปลี่ยนเป็นเสร็จ');

    const off = await call('POST', '/api/care-logs/toggle', { routine: first.documentId });
    expect(off.json.isCompleted === false, 'ยกเลิกติ๊กไม่ได้');

    // คืนสถานะเดิมให้ตรงกับก่อนรันทดสอบ
    if (first.isCompleted) {
      await call('POST', '/api/care-logs/toggle', { routine: first.documentId });
    }
    return `${list.json.meta.completed}/${list.json.meta.total} • ติ๊ก "${first.title}" ได้`;
  });

  await check('GET /api/care-insight', async () => {
    const { status, json } = await call('GET', '/api/care-insight');
    expect(status === 200, `status ${status}`);
    return json.data.title;
  });

  await check('GET /api/bark/thread', async () => {
    const { status, json } = await call('GET', '/api/bark/thread');
    expect(status === 200, `status ${status}`);
    expect(json.data.messages.length > 0, 'ไม่มีข้อความต้อนรับ');
    return `${json.data.messages.length} ข้อความ • ${json.data.quickPrompts.length} quick prompts`;
  });

  await check('POST /api/bark/messages (กฎช็อกโกแลต)', async () => {
    const { status, json } = await call('POST', '/api/bark/messages', {
      text: 'น้องเผลอกินช็อกโกแลตไปนิดหน่อย',
    });
    expect(status === 200, `status ${status}`);
    expect(json.data.aiMessage.isEmergency === true, 'ต้องเป็นข้อความฉุกเฉิน');
    expect(json.data.aiMessage.text.includes('Theobromine'), 'ต้องเตือนเรื่อง Theobromine');
    return 'ตอบเป็นการ์ดฉุกเฉิน';
  });

  await check('POST /api/bark/messages (กฎอาหาร)', async () => {
    const { json } = await call('POST', '/api/bark/messages', { text: 'วันนี้ควรให้อาหารกี่กรัม' });
    expect(json.data.aiMessage.payload?.kind === 'nutrition', 'ต้องคืน payload โภชนาการ');
    return `${json.data.aiMessage.payload.dailyKcal} kcal / ${json.data.aiMessage.payload.dryFoodGram} g`;
  });

  await check('GET /api/bark/grooming-styles', async () => {
    const { status, json } = await call('GET', '/api/bark/grooming-styles');
    expect(status === 200, `status ${status}`);
    expect(json.data.length === 3, 'ควรมี 3 ทรง');
    return json.data.map((s) => s.name).join(', ');
  });

  await check('GET /api/nutrition-plan', async () => {
    const { status, json } = await call('GET', '/api/nutrition-plan');
    expect(status === 200, `status ${status}`);
    return `${json.data.dailyKcal} kcal • ${json.data.dryFoodGram} g • ${json.data.mealsPerDay} มื้อ`;
  });

  await check('GET /api/breeds (สาธารณะ)', async () => {
    const { status, json } = await call('GET', '/api/breeds', undefined, { auth: false });
    expect(status === 200, `status ${status}`);
    return `${json.data.length} สายพันธุ์`;
  });

  await check('GET /api/feed แบบไม่มี token ต้องถูกปฏิเสธ', async () => {
    const { status } = await call('GET', '/api/feed', undefined, { auth: false });
    expect(status === 401 || status === 403, `ควรได้ 401/403 แต่ได้ ${status}`);
    return `status ${status}`;
  });

  console.log(`\nสรุป: ผ่าน ${pass} / ล้มเหลว ${fail}\n`);
  process.exit(fail > 0 ? 1 : 0);
};

run().catch((error) => {
  console.error('smoke test พัง:', error);
  process.exit(1);
});
