const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const examId = '53a23522-0573-4e0c-a9d4-6e38d47aef91';
const filePath = path.join(__dirname, '..', 'storage', 'exams', '2026', '10', `${examId}.json`);

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Mẫu hình hộp chữ nhật chuẩn SVG (Golden Coordinates)
const q5Svg = `<svg viewBox="0 0 320 220" width="320" height="220" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg">
  <polygon points="60,60 200,60 250,90 110,90" fill="none" stroke="black" stroke-width="1.5" />
  <line x1="60" y1="60" x2="60" y2="150" stroke="black" stroke-width="1.5" />
  <line x1="200" y1="60" x2="200" y2="150" stroke="black" stroke-width="1.5" />
  <line x1="250" y1="90" x2="250" y2="180" stroke="black" stroke-width="1.5" />
  <line x1="110" y1="90" x2="110" y2="180" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="60" y1="150" x2="200" y2="150" stroke="black" stroke-width="1.5" />
  <line x1="200" y1="150" x2="250" y2="180" stroke="black" stroke-width="1.5" />
  <line x1="60" y1="150" x2="110" y2="180" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="250" y1="180" x2="110" y2="180" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <text x="44" y="55" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">A'</text>
  <text x="204" y="55" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">B'</text>
  <text x="258" y="92" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">C'</text>
  <text x="96" y="85" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">D'</text>
  <text x="44" y="160" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">A</text>
  <text x="204" y="160" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">B</text>
  <text x="258" y="188" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">C</text>
  <text x="100" y="196" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">D</text>
</svg>`;

const newQ5 = {
  questionNumber: 5,
  type: 'MULTIPLE_CHOICE',
  cognitiveLevel: 'COMPREHENSION',
  content: `Cho hình hộp chữ nhật $ABCD.A'B'C'D'$ có các kích thước $AB = a, AD = 2a$ và chiều cao $AA' = a\\sqrt{5}$ (tham khảo hình vẽ bên).\n${q5Svg}\nKhoảng cách giữa đường thẳng $AB$ và mặt phẳng $(A'B'C'D')$ bằng`,
  options: [
    '$a\\sqrt{5}$',
    '$a$',
    '$2a$',
    '$a\\sqrt{6}$'
  ],
  explanation: `Vì đường thẳng $AB \\parallel (A'B'C'D')$ nên khoảng cách giữa $AB$ và mặt phẳng $(A'B'C'D')$ bằng khoảng cách từ điểm $A$ tùy ý trên $AB$ đến mặt phẳng $(A'B'C'D')$.\nDo $AA' \\perp (A'B'C'D')$ tại $A'$, nên khoảng cách đó chính bằng độ dài cạnh bên: $d(AB, (A'B'C'D')) = AA' = a\\sqrt{5}$.`,
  correctAnswer: 'A',
  points: 0.25
};

// Mẫu hình chóp S.ABC vuông góc đáy
const q6Svg = `<svg viewBox="0 0 320 220" width="320" height="220" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg">
  <polygon points="90,35 45,175 235,175" fill="none" stroke="black" stroke-width="1.5" />
  <line x1="90" y1="35" x2="90" y2="130" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="90" y1="130" x2="45" y2="175" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="90" y1="130" x2="235" y2="175" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="90" y1="130" x2="67" y2="105" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <text x="88" y="24" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">S</text>
  <text x="72" y="132" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">A</text>
  <text x="28" y="185" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">B</text>
  <text x="245" y="185" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">C</text>
  <text x="54" y="102" font-size="12" font-family="Times New Roman, serif" font-weight="bold" fill="black">H</text>
</svg>`;

const newQ6 = {
  questionNumber: 6,
  type: 'MULTIPLE_CHOICE',
  cognitiveLevel: 'COMPREHENSION',
  content: `Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$, $AB = a, BC = 2a$. Cạnh bên $SA$ vuông góc với mặt phẳng đáy $(ABC)$ và $SA = a\\sqrt{3}$. Khoảng cách từ điểm $A$ đến mặt phẳng $(SBC)$ bằng`,
  options: [
    '$\\frac{a\\sqrt{3}}{2}$',
    '$\\frac{a\\sqrt{3}}{4}$',
    '$\\frac{2a}{\\sqrt{5}}$',
    '$a\\sqrt{3}$'
  ],
  explanation: `Trong tam giác vuông $SAB$ (vuông tại $A$), kẻ đường cao $AH \\perp SB$ tại $H$.\nTa có:\n$\\begin{cases} BC \\perp AB \\\\ BC \\perp SA \\text{ (do } SA \\perp (ABC)) \\end{cases} \\Rightarrow BC \\perp (SAB) \\Rightarrow BC \\perp AH$.\nVì $AH \\perp SB$ và $AH \\perp BC$ nên $AH \\perp (SBC)$.\nDo đó khoảng cách từ $A$ đến mặt phẳng $(SBC)$ chính là $d(A, (SBC)) = AH$.\nÁp dụng hệ thức lượng trong tam giác vuông $SAB$:\n$\\frac{1}{AH^2} = \\frac{1}{SA^2} + \\frac{1}{AB^2} = \\frac{1}{(a\\sqrt{3})^2} + \\frac{1}{a^2} = \\frac{1}{3a^2} + \\frac{1}{a^2} = \\frac{4}{3a^2} \\Rightarrow AH = \\frac{a\\sqrt{3}}{2}$.\n${q6Svg}`,
  correctAnswer: 'A',
  points: 0.25
};

const qIdx5 = data.content.questions.findIndex(q => q.questionNumber === 5);
if (qIdx5 >= 0) data.content.questions[qIdx5] = newQ5;

const qIdx6 = data.content.questions.findIndex(q => q.questionNumber === 6);
if (qIdx6 >= 0) data.content.questions[qIdx6] = newQ6;

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

async function updateDb() {
  await prisma.exam.update({
    where: { id: examId },
    data: { structuredJson: JSON.stringify(data.content) }
  });
  console.log('SUCCESS: Fixed Questions 5 and 6 with golden SVG and pedagogical rigor.');
}

updateDb().finally(() => prisma.$disconnect());
