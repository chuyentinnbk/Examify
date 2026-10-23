/**
 * Test script: Generates a 22-question Geometry Exam (6 MCQ, 6 True/False, 6 Short Answer, 4 Essay)
 * to test the SVG geometry canonicalization and rendering engine.
 */
async function main() {
  console.log('--- 1. Authenticating as Admin ---');
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'minhmcpc.tao@gmail.com',
      password: '2011',
    }),
  });

  const loginData = (await loginRes.json()) as any;
  if (!loginData.success || !loginData.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.data.token;
  console.log('✓ Logged in successfully. Token acquired.');

  console.log('\n--- 2. Sending Exam Generation Request ---');
  console.log('Distribution: 6 Multiple Choice, 6 True/False, 6 Short Answer, 4 Essay (Total 22 questions)');
  console.log('Topic: Hình học Không gian & Khối đa diện (GDPT 2018)');

  const payload = {
    title: 'Đề kiểm tra Chuyên đề: Hình học Không gian & Khối Đa diện (Chuẩn GDPT 2018)',
    curriculum: {
      level: 'THPT',
      grade: 'Lớp 12',
      subject: 'Toán học',
      semester: 'Học kỳ 1',
      topic: 'Hình học không gian, Thể tích khối đa diện, Khoảng cách và Góc',
    },
    examType: 'MID_TERM',
    durationMinutes: 90,
    totalPoints: 10,
    totalQuestions: 22,
    cognitiveMatrix: {
      knowledge: 25,
      comprehension: 35,
      application: 25,
      highApplication: 15,
    },
    sectionDistribution: {
      multipleChoice: {
        count: 6,
        matrix: { knowledge: 50, comprehension: 50, application: 0, highApplication: 0 },
      },
      trueFalse: {
        count: 6,
        matrix: { knowledge: 20, comprehension: 40, application: 40, highApplication: 0 },
      },
      shortAnswer: {
        count: 6,
        matrix: { knowledge: 0, comprehension: 30, application: 40, highApplication: 30 },
      },
      essay: {
        count: 4,
        matrix: { knowledge: 0, comprehension: 25, application: 50, highApplication: 25 },
      },
    },
    customPrompt:
      'Tập trung chuyên sâu vào các bài toán Hình học Không gian: hình chóp tam giác S.ABC, hình chóp tứ giác S.ABCD, hình lăng trụ tam giác ABC.A\'B\'C\', hình lập phương ABCD.A\'B\'C\'D\', hình hộp chữ nhật, hình nón. Bắt buộc vẽ hình Vector SVG chuẩn tỉ lệ vàng vào trường content cho các câu hỏi hình học.',
    aiProvider: 'gemini',
  };

  const startTime = Date.now();
  const genRes = await fetch('http://localhost:3000/api/v1/exams/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const genData = (await genRes.json()) as any;

  if (!genData.success) {
    console.error(`✗ Generation failed (${genRes.status}):`, genData);
    process.exit(1);
  }

  const examId = genData.data?.examId || genData.data?.id;
  const examData = genData.data?.examData;
  const questions = examData?.questions || [];

  console.log(`\n✓ Generation Succeeded in ${durationSec}s!`);
  console.log(`Exam ID: ${examId}`);
  console.log(`Title: ${examData?.title || payload.title}`);
  console.log(`Total questions returned: ${questions.length}`);

  // Question type count analysis
  const typeCounts: Record<string, number> = {};
  let svgCount = 0;
  let canonicalSvgCount = 0;

  questions.forEach((q: any, i: number) => {
    const t = q.type || 'UNKNOWN';
    typeCounts[t] = (typeCounts[t] || 0) + 1;

    const hasSvg = q.content && q.content.includes('<svg');
    const hasCanonical = q.content && q.content.includes('data-canonical-geo');
    if (hasSvg) svgCount++;
    if (hasCanonical) canonicalSvgCount++;

    console.log(
      `  [Q${i + 1}] Type: ${t.padEnd(16)} | Level: ${(q.level || q.cognitiveLevel || '').padEnd(15)} | Has SVG: ${hasSvg ? 'YES' : 'NO '} | Golden Canonical: ${hasCanonical ? 'YES' : 'NO '}`
    );
  });

  console.log('\n--- Summary ---');
  console.log('Type breakdown:', typeCounts);
  console.log(`Questions with SVG: ${svgCount}/${questions.length}`);
  console.log(`Canonical Golden SVGs applied: ${canonicalSvgCount}/${svgCount}`);
  console.log(`\nDirect Browser URL: http://localhost:3000`);
}

main().catch(console.error);
