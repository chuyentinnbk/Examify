import { ExamQuestion } from './store/app-store';

export interface CurriculumQuestionTemplate {
  subject: string;
  grade: string;
  level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
  topic: string;
  content: string;
  options: { key: string; text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
}

export interface ParsedGrade {
  gradeNum: number | null; // 1 to 12
  levelCategory: 'PRIMARY' | 'LOWER_SEC' | 'UPPER_SEC' | 'OTHER';
  displayName: string;
}

/**
 * Accurately parses educational grade strings into structured numerical and pedagogical levels.
 * Distinguishes "Lớp 1" from "Lớp 10", "Lớp 11", "Lớp 12".
 */
export function parseGrade(gradeStr: string): ParsedGrade {
  const str = String(gradeStr || '').trim().toLowerCase();
  const match = str.match(/(?:lớp|khối|grade)?\s*(\d{1,2})(?!\d)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 5) return { gradeNum: num, levelCategory: 'PRIMARY', displayName: `Lớp ${num}` };
    if (num >= 6 && num <= 9) return { gradeNum: num, levelCategory: 'LOWER_SEC', displayName: `Lớp ${num}` };
    if (num >= 10 && num <= 12) return { gradeNum: num, levelCategory: 'UPPER_SEC', displayName: `Lớp ${num}` };
  }

  if (str.includes('tiểu học') || str.includes('primary')) return { gradeNum: 1, levelCategory: 'PRIMARY', displayName: 'Tiểu học' };
  if (str.includes('thcs') || str.includes('trung học cơ sở') || str.includes('secondary')) return { gradeNum: 8, levelCategory: 'LOWER_SEC', displayName: 'THCS' };
  if (str.includes('thpt') || str.includes('cấp 3') || str.includes('high')) return { gradeNum: 10, levelCategory: 'UPPER_SEC', displayName: 'THPT' };

  return { gradeNum: null, levelCategory: 'OTHER', displayName: gradeStr };
}


export const CURRICULUM_QUESTION_BANK: CurriculumQuestionTemplate[] = [
// ==========================================
  // --- TOÁN HỌC ---
  // ==========================================
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Khảo sát hàm số',
    content: 'Cho hàm số y = f(x) có bảng biến thiên trên đoạn [-2; 3]. Giá trị cực đại của hàm số đã cho bằng bao nhiêu?',
    options: [
      { key: 'A', text: 'y = 3', isCorrect: true },
      { key: 'B', text: 'x = 1', isCorrect: false },
      { key: 'C', text: 'y = -1', isCorrect: false },
      { key: 'D', text: 'x = -2', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Dựa vào bảng biến thiên, tại điểm x = 1 hàm số đạt cực đại và giá trị cực đại tương ứng là y_CĐ = 3.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Nguyên hàm & Tích phân',
    content: 'Họ nguyên hàm của hàm số f(x) = 3x² + 2x là:',
    options: [
      { key: 'A', text: 'F(x) = x³ + x² + C', isCorrect: true },
      { key: 'B', text: 'F(x) = 6x + 2 + C', isCorrect: false },
      { key: 'C', text: 'F(x) = 3x³ + 2x² + C', isCorrect: false },
      { key: 'D', text: 'F(x) = x³ + 2x² + C', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có ∫(3x² + 2x)dx = 3*(x³/3) + 2*(x²/2) + C = x³ + x² + C.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Hình học Không gian Oxyz',
    content: 'Trong không gian Oxyz, toạ độ của vectơ u = 2i - 3j + k là:',
    options: [
      { key: 'A', text: 'u = (2; -3; 1)', isCorrect: true },
      { key: 'B', text: 'u = (2; 3; 1)', isCorrect: false },
      { key: 'C', text: 'u = (-2; 3; -1)', isCorrect: false },
      { key: 'D', text: 'u = (2; -3; 0)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định nghĩa hệ toạ độ không gian Oxyz, vectơ u = x*i + y*j + z*k có toạ độ là (x; y; z) = (2; -3; 1).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Mũ & Logarit',
    content: 'Tập nghiệm S của bất phương trình log_2(x - 1) < 3 là:',
    options: [
      { key: 'A', text: 'S = (1; 9)', isCorrect: true },
      { key: 'B', text: 'S = (-∞; 9)', isCorrect: false },
      { key: 'C', text: 'S = (1; 8)', isCorrect: false },
      { key: 'D', text: 'S = (0; 9)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Điều kiện: x - 1 > 0 <=> x > 1. BPT <=> x - 1 < 2³ = 8 <=> x < 9. Kết hợp điều kiện ta có S = (1; 9).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Khối đa diện',
    content: 'Thể tích V của khối lăng trụ có diện tích đáy B = 6 cm² và chiều cao h = 4 cm là:',
    options: [
      { key: 'A', text: 'V = 24 cm³', isCorrect: true },
      { key: 'B', text: 'V = 8 cm³', isCorrect: false },
      { key: 'C', text: 'V = 12 cm³', isCorrect: false },
      { key: 'D', text: 'V = 72 cm³', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Thể tích khối lăng trụ V = B * h = 6 * 4 = 24 cm³.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Số phức',
    content: 'Cho hai số phức z1 = 3 - 2i và z2 = 1 + 4i. Phần thực và phần ảo của số phức z = z1 + z2 lần lượt là:',
    options: [
      { key: 'A', text: 'Phần thực bằng 4, phần ảo bằng 2', isCorrect: true },
      { key: 'B', text: 'Phần thực bằng 4, phần ảo bằng 2i', isCorrect: false },
      { key: 'C', text: 'Phần thực bằng 2, phần ảo bằng -6', isCorrect: false },
      { key: 'D', text: 'Phần thực bằng 4, phần ảo bằng -2', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'z = (3 - 2i) + (1 + 4i) = (3 + 1) + (-2 + 4)i = 4 + 2i. Phần thực a = 4, phần ảo b = 2.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Vận dụng',
    topic: 'Hình học Không gian Oxyz',
    content: 'Trong không gian Oxyz, cho mặt cầu (S): x² + y² + z² - 2x + 4y - 6z - 11 = 0. Bán kính R của mặt cầu (S) bằng:',
    options: [
      { key: 'A', text: 'R = 5', isCorrect: true },
      { key: 'B', text: 'R = √14', isCorrect: false },
      { key: 'C', text: 'R = 25', isCorrect: false },
      { key: 'D', text: 'R = √11', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Tâm I(1; -2; 3), d = -11. Bán kính R = √(a² + b² + c² - d) = √(1 + 4 + 9 - (-11)) = √25 = 5.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Vận dụng',
    topic: 'Tích phân ứng dụng',
    content: 'Diện tích hình phẳng giới hạn bởi đồ thị hàm số y = x² - 2x và trục hoành Ox bằng:',
    options: [
      { key: 'A', text: 'S = 4/3', isCorrect: true },
      { key: 'B', text: 'S = 2/3', isCorrect: false },
      { key: 'C', text: 'S = 4', isCorrect: false },
      { key: 'D', text: 'S = 8/3', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Phương trình hoành độ giao điểm: x² - 2x = 0 <=> x = 0 hoặc x = 2. S = ∫|x² - 2x|dx từ 0 đến 2 = |(x³/3 - x²)| (từ 0 đến 2) = |8/3 - 4| = 4/3.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Vận dụng cao',
    topic: 'Hình học Không gian & Khoảng cách',
    content: 'Cho khối chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy và SA = a√3. Khoảng cách từ điểm A đến mặt phẳng (SBD) bằng:',
    options: [
      { key: 'A', text: '(a√21) / 7', isCorrect: true },
      { key: 'B', text: '(a√3) / 2', isCorrect: false },
      { key: 'C', text: 'a / 2', isCorrect: false },
      { key: 'D', text: '(a√6) / 3', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Gọi O = AC ∩ BD. AO = a√2/2. Kẻ AH ⊥ SO tại H. Khi đó AH ⊥ (SBD) và 1/AH² = 1/SA² + 1/AO² = 1/(3a²) + 2/a² = 7/(3a²) => AH = a√(3/7) = a√21/7.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 12',
    level: 'Vận dụng cao',
    topic: 'Cực trị Hàm số chứa tham số',
    content: 'Tìm tất cả giá trị thực của tham số m để hàm số y = x³ - 3mx² + 3(m² - 1)x + 2 đạt cực tiểu tại x = 2.',
    options: [
      { key: 'A', text: 'm = 3', isCorrect: true },
      { key: 'B', text: 'm = 1', isCorrect: false },
      { key: 'C', text: 'm = -1', isCorrect: false },
      { key: 'D', text: 'm = 2', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'y\' = 3x² - 6mx + 3(m² - 1). Để đạt cực tiểu tại x = 2 thì y\'(2) = 12 - 12m + 3m² - 3 = 3m² - 12m + 9 = 0 <=> m = 1 hoặc m = 3. Với m = 3, y\'\'(2) = 6*2 - 6*3 = -6 < 0 (cực đại), với m = 1, y\'\'(2) = 12 - 6 = 6 > 0 => m = 3.',
  },

  // ==========================================
  // --- VẬT LÝ ---
  // ==========================================
  {
    subject: 'Vật lý',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Dao động cơ',
    content: 'Một con lắc lò xo dao động điều hòa gồm vật nặng khối lượng m và lò xo có độ cứng k. Chu kỳ dao động T của con lắc là:',
    options: [
      { key: 'A', text: 'T = 2π√(m/k)', isCorrect: true },
      { key: 'B', text: 'T = 2π√(k/m)', isCorrect: false },
      { key: 'C', text: 'T = (1/2π)√(m/k)', isCorrect: false },
      { key: 'D', text: 'T = 2π√(g/l)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo công thức chu kỳ dao động điều hòa của con lắc lò xo: T = 2π/ω = 2π√(m/k).',
  },
  {
    subject: 'Vật lý',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Sóng cơ',
    content: 'Bước sóng λ là khoảng cách giữa hai điểm gần nhau nhất trên cùng một phương truyền sóng mà dao động tại hai điểm đó:',
    options: [
      { key: 'A', text: 'Cùng pha với nhau', isCorrect: true },
      { key: 'B', text: 'Ngược pha với nhau', isCorrect: false },
      { key: 'C', text: 'Vuông pha với nhau', isCorrect: false },
      { key: 'D', text: 'Lệch pha π/4', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Bước sóng là quãng đường sóng truyền đi trong một chu kỳ, cũng là khoảng cách giữa hai điểm gần nhau nhất trên phương truyền sóng dao động cùng pha.',
  },
  {
    subject: 'Vật lý',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Giao thoa sóng',
    content: 'Trong hiện tượng giao thoa sóng nước với hai nguồn kết hợp cùng pha S1, S2, những điểm cực đại giao thoa có hiệu đường đi d2 - d1 thỏa mãn:',
    options: [
      { key: 'A', text: 'd2 - d1 = kλ (với k ∈ Z)', isCorrect: true },
      { key: 'B', text: 'd2 - d1 = (k + 0.5)λ (với k ∈ Z)', isCorrect: false },
      { key: 'C', text: 'd2 - d1 = (2k + 1)λ (với k ∈ Z)', isCorrect: false },
      { key: 'D', text: 'd2 - d1 = kλ/2 (với k ∈ Z)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Hai nguồn cùng pha, điều kiện cực đại giao thoa là hiệu khoảng cách đến 2 nguồn bằng số nguyên lần bước sóng: d2 - d1 = kλ.',
  },
  {
    subject: 'Vật lý',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Dòng điện xoay chiều',
    content: 'Mạch điện xoay chiều chỉ có cuộn cảm thuần với độ tự cảm L. Đặt vào hai đầu mạch điện áp u = U0*cos(ωt). Cảm kháng ZL của cuộn cảm được tính theo công thức:',
    options: [
      { key: 'A', text: 'ZL = ωL', isCorrect: true },
      { key: 'B', text: 'ZL = 1 / (ωL)', isCorrect: false },
      { key: 'C', text: 'ZL = √(ωL)', isCorrect: false },
      { key: 'D', text: 'ZL = ω / L', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Cảm kháng của cuộn thuần cảm là đại lượng cản trở dòng điện xoay chiều, có biểu thức ZL = ωL.',
  },
  {
    subject: 'Vật lý',
    grade: 'Lớp 12',
    level: 'Vận dụng',
    topic: 'Mạch RLC xoay chiều',
    content: 'Đặt điện áp xoay chiều u = 200√2 cos(100πt) (V) vào hai đầu đoạn mạch RLC nối tiếp có R = 100 Ω, cuộn cảm thuần L = 1/π H, tụ điện C = 10^-4 / (2π) F. Cường độ dòng điện hiệu dụng trong mạch là:',
    options: [
      { key: 'A', text: 'I = √2 A', isCorrect: true },
      { key: 'B', text: 'I = 2 A', isCorrect: false },
      { key: 'C', text: 'I = 1 A', isCorrect: false },
      { key: 'D', text: 'I = 0.5 A', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'ZL = ωL = 100 Ω; ZC = 1/(ωC) = 200 Ω. Tổng trở Z = √(R² + (ZL - ZC)²) = √(100² + (-100)²) = 100√2 Ω. Điện áp hiệu dụng U = 200 V => I = U/Z = 200/(100√2) = √2 A.',
  },
  {
    subject: 'Vật lý',
    grade: 'Lớp 12',
    level: 'Vận dụng cao',
    topic: 'Sóng ánh sáng & Giao thoa Y-âng',
    content: 'Trong thí nghiệm Y-âng về giao thoa ánh sáng, nguồn phát đồng thời hai bức xạ đơn sắc có bước sóng λ1 = 0.6 μm và λ2 = 0.45 μm. Khoảng cách ngắn nhất giữa hai vân sáng cùng màu với vân trung tâm là:',
    options: [
      { key: 'A', text: '3 * i1 (hoặc 4 * i2)', isCorrect: true },
      { key: 'B', text: '4 * i1', isCorrect: false },
      { key: 'C', text: '2 * i1', isCorrect: false },
      { key: 'D', text: '5 * i1', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Tại vị trí hai vân sáng trùng nhau: k1*λ1 = k2*λ2 <=> k1/k2 = 0.45/0.6 = 3/4. Khoảng cách ngắn nhất tương ứng k1 = 3 và k2 = 4, tức là x_trùng = 3*i1 = 4*i2.',
  },

  // ==========================================
  // --- HÓA HỌC ---
  // ==========================================
  {
    subject: 'Hóa học',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Este & Lipit',
    content: 'Hợp chất nào sau đây thuộc loại este no, đơn chức, mạch hở?',
    options: [
      { key: 'A', text: 'CH3COOCH3', isCorrect: true },
      { key: 'B', text: 'CH2=CHCOOCH3', isCorrect: false },
      { key: 'C', text: 'CH3COOH', isCorrect: false },
      { key: 'D', text: 'HCOOC6H5', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Methyl axetat (CH3COOCH3) có công thức phân tử C3H6O2 thuộc dãy đồng đẳng este no đơn chức mạch hở CnH2nO2 (n ≥ 2).',
  },
  {
    subject: 'Hóa học',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Cacbohiđrat',
    content: 'Chất nào sau đây không tham gia phản ứng thủy phân trong môi trường axit?',
    options: [
      { key: 'A', text: 'Glucozơ', isCorrect: true },
      { key: 'B', text: 'Saccarozơ', isCorrect: false },
      { key: 'C', text: 'Tinh bột', isCorrect: false },
      { key: 'D', text: 'Xenlulozơ', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Glucozơ là monosaccarit đơn giản nhất, không bị thủy phân.',
  },
  {
    subject: 'Hóa học',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Amin & Amino Axit',
    content: 'Cho dãy các chất: metylamin, anilin, amoniac, đimetylamin. Chất có tính bazơ mạnh nhất trong dãy là:',
    options: [
      { key: 'A', text: 'Đimetylamin (CH3)2NH', isCorrect: true },
      { key: 'B', text: 'Metylamin CH3NH2', isCorrect: false },
      { key: 'C', text: 'Amoniac NH3', isCorrect: false },
      { key: 'D', text: 'Anilin C6H5NH2', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Thứ tự lực bazơ: (CH3)2NH > CH3NH2 > NH3 > C6H5NH2.',
  },
  {
    subject: 'Hóa học',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Cacbohiđrat Phản ứng tráng gương',
    content: 'Thủy phân hoàn toàn m gam saccarozơ thu được dung dịch X. Cho toàn bộ X tác dụng với dung dịch AgNO3/NH3 dư thu được 21,6 gam Ag. Giá trị của m là:',
    options: [
      { key: 'A', text: '17,1 gam', isCorrect: true },
      { key: 'B', text: '34,2 gam', isCorrect: false },
      { key: 'C', text: '8,55 gam', isCorrect: false },
      { key: 'D', text: '27,0 gam', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: '1 mol saccarozơ tạo 1 mol Glu + 1 mol Fruc, tạo 4 mol Ag. nAg = 21.6/108 = 0.2 mol => n_sac = 0.05 mol => m = 0.05 * 342 = 17.1 gam.',
  },
  {
    subject: 'Hóa học',
    grade: 'Lớp 12',
    level: 'Vận dụng',
    topic: 'Kim loại & Phản ứng Oxi hóa khử',
    content: 'Cho m gam bột Fe vào 200 ml dung dịch CuSO4 1M. Sau khi phản ứng xảy ra hoàn toàn, thu được chất rắn có khối lượng (m + 1,6) gam. Giá trị của m tối thiểu để phản ứng hết CuSO4 là:',
    options: [
      { key: 'A', text: '11,2 gam', isCorrect: true },
      { key: 'B', text: '5,6 gam', isCorrect: false },
      { key: 'C', text: '8,4 gam', isCorrect: false },
      { key: 'D', text: '16,8 gam', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Fe + Cu²⁺ -> Fe²⁺ + Cu. Khối lượng tăng = nCu*(64 - 56) = 8*n = 1.6 => n = 0.2 mol. mFe = 0.2 * 56 = 11.2 gam.',
  },
  {
    subject: 'Hóa học',
    grade: 'Lớp 12',
    level: 'Vận dụng cao',
    topic: 'Peptit & Este đa chức',
    content: 'Đốt cháy hoàn toàn 0,1 mol hỗn hợp X gồm hai este đơn chức mạch hở cần vừa đủ 0,45 mol O2 thu được 0,4 mol CO2 và 0,3 mol H2O. Số mol este không no trong hỗn hợp X là:',
    options: [
      { key: 'A', text: '0,1 mol', isCorrect: true },
      { key: 'B', text: '0,05 mol', isCorrect: false },
      { key: 'C', text: '0,08 mol', isCorrect: false },
      { key: 'D', text: '0,02 mol', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Bảo toàn nguyên tố O: 0.1*2 + 0.45*2 = 0.4*2 + 0.3*1 = 1.1 mol (thỏa mãn). Vì nCO2 - nH2O = 0.4 - 0.3 = 0.1 mol = nX, suy ra tất cả este trong X đều có 1 liên kết C=C (k = 2).',
  },

  // ==========================================
  // --- TIẾNG ANH ---
  // ==========================================
  {
    subject: 'Tiếng Anh',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Phonetics - Pronunciation',
    content: 'Mark the letter A, B, C, or D to indicate the word whose underlined part differs from the other three in pronunciation:\nA. booked   B. played   C. looked   D. stopped',
    options: [
      { key: 'A', text: 'played', isCorrect: true },
      { key: 'B', text: 'booked', isCorrect: false },
      { key: 'C', text: 'looked', isCorrect: false },
      { key: 'D', text: 'stopped', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Phần đuôi -ed ở "played" phát âm là /d/, còn lại "booked", "looked", "stopped" phát âm là /t/.',
  },
  {
    subject: 'Tiếng Anh',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Stress - Trọng âm',
    content: 'Mark the letter A, B, C, or D to indicate the word that differs from the other three in the position of primary stress:',
    options: [
      { key: 'A', text: 'economic (âm 3)', isCorrect: true },
      { key: 'B', text: 'education (âm 3)', isCorrect: false },
      { key: 'C', text: 'independent (âm 3)', isCorrect: false },
      { key: 'D', text: 'technology (âm 2)', isCorrect: true },
    ],
    correctAnswer: 'D',
    explanation: 'Technology trọng âm rơi vào âm tiết thứ 2 /tekˈnɒlədʒi/, các từ còn lại trọng âm rơi vào âm tiết thứ 3.',
  },
  {
    subject: 'Tiếng Anh',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Conditional Sentences',
    content: 'If she had studied harder for the entrance examination, she _______ admitted to her dream university.',
    options: [
      { key: 'A', text: 'would have been', isCorrect: true },
      { key: 'B', text: 'would be', isCorrect: false },
      { key: 'C', text: 'will be', isCorrect: false },
      { key: 'D', text: 'had been', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Câu điều kiện loại 3 diễn tả sự việc trái ngược với thực tế trong quá khứ: If + S + had + P2, S + would have + P2.',
  },
  {
    subject: 'Tiếng Anh',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Relative Clauses',
    content: 'The scientist _______ discovered the new vaccine was awarded the prestigious Nobel Prize.',
    options: [
      { key: 'A', text: 'who', isCorrect: true },
      { key: 'B', text: 'whom', isCorrect: false },
      { key: 'C', text: 'which', isCorrect: false },
      { key: 'D', text: 'whose', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: '"The scientist" là danh từ chỉ người làm chủ ngữ của mệnh đề quan hệ, do đó sử dụng đại từ quan hệ "who".',
  },
  {
    subject: 'Tiếng Anh',
    grade: 'Lớp 12',
    level: 'Vận dụng',
    topic: 'Inversion - Đảo ngữ',
    content: 'Scarcely _______ the lecture hall when the professor began speaking.',
    options: [
      { key: 'A', text: 'had the students entered', isCorrect: true },
      { key: 'B', text: 'the students had entered', isCorrect: false },
      { key: 'C', text: 'did the students enter', isCorrect: false },
      { key: 'D', text: 'have the students entered', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Cấu trúc đảo ngữ thời gian: Scarcely + had + S + V(P2) + when + S + V(quá khứ đơn).',
  },
  {
    subject: 'Tiếng Anh',
    grade: 'Lớp 12',
    level: 'Vận dụng cao',
    topic: 'Idioms & Advanced Collocations',
    content: 'After weeks of intense debate, the committee finally reached a decision that managed to kill two birds with one _______.',
    options: [
      { key: 'A', text: 'stone', isCorrect: true },
      { key: 'B', text: 'rock', isCorrect: false },
      { key: 'C', text: 'arrow', isCorrect: false },
      { key: 'D', text: 'bullet', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Thành ngữ cố định: "kill two birds with one stone" có nghĩa là một công đôi việc, đạt được hai mục đích bằng một hành động duy nhất.',
  },

  // ==========================================
  // --- SINH HỌC ---
  // ==========================================
  {
    subject: 'Sinh học',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Di truyền học phân tử',
    content: 'Phân tử nào sau đây mang bộ ba đối mã (anticodon)?',
    options: [
      { key: 'A', text: 'tARN (ARN vận chuyển)', isCorrect: true },
      { key: 'B', text: 'mARN (ARN thông tin)', isCorrect: false },
      { key: 'C', text: 'rARN (ARN riboxom)', isCorrect: false },
      { key: 'D', text: 'ADN mạch kép', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'tARN có cấu trúc mang bộ ba đối mã (anticodon) đặc hiệu để khớp với codon trên mARN trong quá trình dịch mã.',
  },
  {
    subject: 'Sinh học',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Quy luật Menđen',
    content: 'Ở một loài thực vật, alen A quy định thân cao trội hoàn toàn so với alen a quy định thân thấp. Phép lai P: Aa x Aa cho tỉ lệ kiểu hình ở đời con F1 là:',
    options: [
      { key: 'A', text: '3 thân cao : 1 thân thấp', isCorrect: true },
      { key: 'B', text: '1 thân cao : 1 thân thấp', isCorrect: false },
      { key: 'C', text: '100% thân cao', isCorrect: false },
      { key: 'D', text: '1 thân cao : 2 thân trung bình : 1 thân thấp', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Aa x Aa cho tỉ lệ kiểu gen: 1 AA : 2 Aa : 1 aa tương ứng tỉ lệ kiểu hình 3 trội (thân cao) : 1 lặn (thân thấp).',
  },
  {
    subject: 'Sinh học',
    grade: 'Lớp 12',
    level: 'Vận dụng',
    topic: 'Liên kết gen & Hoán vị gen',
    content: 'Cá thể có kiểu gen AB/ab với tần số hoán vị gen f = 20% giảm phân bình thường sẽ tạo ra tỉ lệ giao tử ab là:',
    options: [
      { key: 'A', text: '40%', isCorrect: true },
      { key: 'B', text: '10%', isCorrect: false },
      { key: 'C', text: '20%', isCorrect: false },
      { key: 'D', text: '50%', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Giao tử liên kết AB = ab = (1 - f)/2 = (1 - 0.2)/2 = 40%. Giao tử hoán vị Ab = aB = f/2 = 10%.',
  },

  // ==========================================
  // --- LỊCH SỬ ---
  // ==========================================
  {
    subject: 'Lịch sử',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Kháng chiến chống Pháp',
    content: 'Sự kiện nào đánh dấu bước ngoặt chấm dứt sự thống trị của chủ nghĩa thực dân cũ ở Việt Nam?',
    options: [
      { key: 'A', text: 'Thắng lợi của chiến dịch Điện Biên Phủ năm 1954', isCorrect: true },
      { key: 'B', text: 'Chiến thắng Điện Biên Phủ trên không năm 1972', isCorrect: false },
      { key: 'C', text: 'Cách mạng tháng Tám năm 1945', isCorrect: false },
      { key: 'D', text: 'Chiến dịch Hồ Chí Minh năm 1975', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Chiến thắng lịch sử Điện Biên Phủ 1954 đã đập tan tập đoàn cứ điểm mạnh nhất của thực dân Pháp, buộc Pháp ký Hiệp định Giơ-ne-vơ chấm dứt chiến tranh xâm lược.',
  },
  {
    subject: 'Lịch sử',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Kháng chiến chống Mỹ',
    content: 'Ý nghĩa quan trọng nhất của cuộc Tổng tiến công và nổi dậy Xuân Mậu Thân 1968 là gì?',
    options: [
      { key: 'A', text: 'Buộc Mỹ phải tuyên bố "phi Mỹ hóa" chiến tranh và ngồi vào bàn đàm phán Pa-ri', isCorrect: true },
      { key: 'B', text: 'Làm phá sản hoàn toàn chiến lược "Chiến tranh đặc biệt"', isCorrect: false },
      { key: 'C', text: 'Giải phóng hoàn toàn miền Nam, thống nhất đất nước', isCorrect: false },
      { key: 'D', text: 'Buộc Mỹ ký kết ngay Hiệp định Pa-ri rút quân về nước', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Cuộc Tổng tiến công Xuân Mậu Thân 1968 đã giáng đòn quyết định vào ý chí xâm lược của Mỹ, buộc Mỹ phải chấp nhận ngồi vào bàn đàm phán tại Pa-ri.',
  },

  // ==========================================
  // --- ĐỊA LÝ ---
  // ==========================================
  {
    subject: 'Địa lý',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Địa lý Tự nhiên Việt Nam',
    content: 'Đặc điểm nào sau đây thể hiện rõ nét tính chất nhiệt đới ẩm gió mùa của khí hậu Việt Nam?',
    options: [
      { key: 'A', text: 'Tổng số giờ nắng cao, nhiệt độ trung bình năm trên 20°C và lượng mưa lớn', isCorrect: true },
      { key: 'B', text: 'Mùa đông lạnh và khô ráo kéo dài quanh năm', isCorrect: false },
      { key: 'C', text: 'Chịu ảnh hưởng trực tiếp của gió Tây Nam khô nóng quanh năm', isCorrect: false },
      { key: 'D', text: 'Biên độ nhiệt độ ngày đêm rất lớn trên toàn lãnh thổ', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Khí hậu nhiệt đới ẩm gió mùa nước ta có tổng bức xạ lớn, nhiệt độ trung bình năm trên 20°C, độ ẩm cao >80% và lượng mưa dồi dào từ 1500 - 2000 mm/năm.',
  },
  {
    subject: 'Địa lý',
    grade: 'Lớp 12',
    level: 'Vận dụng',
    topic: 'Địa lý Kinh tế các vùng',
    content: 'Thế mạnh hàng đầu để phát triển công nghiệp chế biến lương thực thực phẩm ở vùng Đồng bằng sông Cửu Long là:',
    options: [
      { key: 'A', text: 'Nguồn nguyên liệu nông nghiệp và thủy hải sản vô cùng dồi dào, phong phú', isCorrect: true },
      { key: 'B', text: 'Cơ sở hạ tầng giao thông đồng bộ và hiện đại nhất cả nước', isCorrect: false },
      { key: 'C', text: 'Nguồn tài nguyên khoáng sản kim loại dồi dào', isCorrect: false },
      { key: 'D', text: 'Lực lượng lao động có trình độ kỹ thuật công nghệ cao', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Đồng bằng sông Cửu Long là vựa lúa, cây ăn trái và vùng trọng điểm nuôi trồng, đánh bắt thủy sản lớn nhất cả nước, tạo nguồn nguyên liệu tại chỗ cực kỳ dồi dào.',
  },

  // ==========================================
  // --- NGỮ VĂN ---
  // ==========================================
  {
    subject: 'Ngữ văn',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Đọc hiểu & Tiếng Việt',
    content: 'Biện pháp tu từ nào được sử dụng trong câu thơ: "Bàn tay ta làm nên tất cả / Có sức người sỏi đá cũng thành cơm"?',
    options: [
      { key: 'A', text: 'Hoán dụ', isCorrect: true },
      { key: 'B', text: 'So sánh', isCorrect: false },
      { key: 'C', text: 'Chơi chữ', isCorrect: false },
      { key: 'D', text: 'Nói giảm nói tránh', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: '"Bàn tay" lấy bộ phận chỉ toàn thể (người lao động), là phép hoán dụ quen thuộc trong văn học.',
  },
  {
    subject: 'Ngữ văn',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Văn học hiện đại Việt Nam',
    content: 'Hình tượng "Sóng" trong bài thơ cùng tên của nữ sĩ Xuân Quỳnh biểu tượng cho điều gì?',
    options: [
      { key: 'A', text: 'Tâm hồn người phụ nữ trong tình yêu với những cung bậc cảm xúc phong phú, chân thành', isCorrect: true },
      { key: 'B', text: 'Sức mạnh tàn phá dữ dội của thiên nhiên biển cả', isCorrect: false },
      { key: 'C', text: 'Khát vọng chinh phục đại dương của con người hiện đại', isCorrect: false },
      { key: 'D', text: 'Nỗi cô đơn tuyệt vọng trước không gian vô tận', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Sóng là hình tượng ẩn dụ cho tâm trạng, khát vọng và vẻ đẹp tâm hồn của người phụ nữ khi yêu: vừa dịu dàng vừa mãnh liệt.',
  },

  // ==========================================
  // --- TIN HỌC ---
  // ==========================================
  {
    subject: 'Tin học',
    grade: 'Lớp 12',
    level: 'Nhận biết',
    topic: 'Cơ sở dữ liệu Quan hệ',
    content: 'Trong hệ quản trị cơ sở dữ liệu quan hệ (RDBMS), một bảng (Table) được cấu thành từ các thành phần cơ bản nào?',
    options: [
      { key: 'A', text: 'Các trường (Fields / Cột) và các bản ghi (Records / Hàng)', isCorrect: true },
      { key: 'B', text: 'Các thư mục và tệp tin văn bản', isCorrect: false },
      { key: 'C', text: 'Các hàm và thủ tục lưu trữ', isCorrect: false },
      { key: 'D', text: 'Các địa chỉ IP và cổng kết nối', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Bảng trong CSDL quan hệ gồm các cột (thuộc tính/field) và các hàng (bản ghi/record/tuple).',
  },
  {
    subject: 'Tin học',
    grade: 'Lớp 12',
    level: 'Thông hiểu',
    topic: 'Lập trình & Giải thuật',
    content: 'Độ phức tạp thời gian trung bình của thuật toán Tìm kiếm Nhị phân (Binary Search) trên mảng đã sắp xếp gồm n phần tử là:',
    options: [
      { key: 'A', text: 'O(log n)', isCorrect: true },
      { key: 'B', text: 'O(n)', isCorrect: false },
      { key: 'C', text: 'O(n²)', isCorrect: false },
      { key: 'D', text: 'O(1)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Sau mỗi bước so sánh, không gian tìm kiếm giảm đi một nửa, do đó số bước thực hiện tối đa là log2(n), tức O(log n).',
  },

  // ==========================================
  // --- TOÁN HỌC - LỚP 10 (GDPT 2018) ---
  // ==========================================
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Nhận biết',
    topic: 'Mệnh đề & Tập hợp',
    content: 'Trong các câu sau, câu nào là một mệnh đề toán học?',
    options: [
      { key: 'A', text: 'Số 15 là số nguyên tố.', isCorrect: true },
      { key: 'B', text: 'Hôm nay trời đẹp quá!', isCorrect: false },
      { key: 'C', text: 'Bạn có thích học môn Toán không?', isCorrect: false },
      { key: 'D', text: 'Hãy làm bài tập về nhà ngay đi!', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Mệnh đề toán học là một khẳng định có tính đúng hoặc sai rõ ràng. Câu "Số 15 là số nguyên tố" là một khẳng định toán học (có chân trị sai).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Nhận biết',
    topic: 'Hệ thức lượng trong tam giác',
    content: 'Cho tam giác ABC có các cạnh BC = a, AC = b, AB = c. Khẳng định nào sau đây diễn tả đúng định lí côsin?',
    options: [
      { key: 'A', text: 'a² = b² + c² - 2bc*cos(A)', isCorrect: true },
      { key: 'B', text: 'a² = b² + c² + 2bc*cos(A)', isCorrect: false },
      { key: 'C', text: 'a² = b² + c² - 2bc*sin(A)', isCorrect: false },
      { key: 'D', text: 'a² = b² + c² - bc*cos(A)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định lí côsin trong tam giác ABC: a² = b² + c² - 2bc*cos(A).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Nhận biết',
    topic: 'Vectơ trong mặt phẳng toạ độ',
    content: 'Trong mặt phẳng toạ độ Oxy, cho vectơ u = 3*i - 4*j (với i, j là hai vectơ đơn vị). Toạ độ của vectơ u là:',
    options: [
      { key: 'A', text: 'u = (3; -4)', isCorrect: true },
      { key: 'B', text: 'u = (-4; 3)', isCorrect: false },
      { key: 'C', text: 'u = (3; 4)', isCorrect: false },
      { key: 'D', text: 'u = (-3; -4)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định nghĩa hệ toạ độ Oxy: vectơ u = x*i + y*j có toạ độ là (x; y) = (3; -4).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Nhận biết',
    topic: 'Giá trị lượng giác từ 0° đến 180°',
    content: 'Với mọi góc alpha thỏa mãn 0° <= alpha <= 180°, khẳng định nào sau đây là ĐÚNG?',
    options: [
      { key: 'A', text: 'cos(180° - alpha) = -cos(alpha)', isCorrect: true },
      { key: 'B', text: 'sin(180° - alpha) = -sin(alpha)', isCorrect: false },
      { key: 'C', text: 'tan(180° - alpha) = tan(alpha) (alpha != 90°)', isCorrect: false },
      { key: 'D', text: 'cos(180° - alpha) = cos(alpha)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo tính chất hai góc bù nhau: sin(180° - alpha) = sin(alpha) và cos(180° - alpha) = -cos(alpha).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Thông hiểu',
    topic: 'Bất phương trình bậc nhất hai ẩn',
    content: 'Cặp số (x; y) nào sau đây là một nghiệm của bất phương trình 2x - 3y + 6 > 0?',
    options: [
      { key: 'A', text: '(1; 2)', isCorrect: true },
      { key: 'B', text: '(-2; 1)', isCorrect: false },
      { key: 'C', text: '(0; 3)', isCorrect: false },
      { key: 'D', text: '(-4; 0)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Thay x = 1, y = 2 vào vế trái: 2*(1) - 3*(2) + 6 = 2 - 6 + 6 = 2 > 0 (thỏa mãn).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Thông hiểu',
    topic: 'Hệ thức lượng trong tam giác',
    content: 'Cho tam giác ABC có góc A = 60° và cạnh đối diện a = 6 cm. Bán kính đường tròn ngoại tiếp R của tam giác ABC bằng:',
    options: [
      { key: 'A', text: 'R = 2√3 cm', isCorrect: true },
      { key: 'B', text: 'R = 4√3 cm', isCorrect: false },
      { key: 'C', text: 'R = 6 cm', isCorrect: false },
      { key: 'D', text: 'R = 3√3 cm', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định lý sin: a / sin(A) = 2R => 2R = 6 / sin(60°) = 6 / (√3/2) = 12/√3 = 4√3 => R = 2√3 cm.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Thông hiểu',
    topic: 'Hàm số bậc hai & Parabol',
    content: 'Toạ độ đỉnh I của đồ thị parabol y = x² - 4x + 3 là:',
    options: [
      { key: 'A', text: 'I(2; -1)', isCorrect: true },
      { key: 'B', text: 'I(-2; 15)', isCorrect: false },
      { key: 'C', text: 'I(2; 1)', isCorrect: false },
      { key: 'D', text: 'I(4; 3)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Hoành độ đỉnh x = -b / (2a) = 4 / 2 = 2. Tung độ đỉnh y = 2² - 4*2 + 3 = -1. Vậy toạ độ đỉnh là I(2; -1).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Thông hiểu',
    topic: 'Dấu của tam thức bậc hai',
    content: 'Tập nghiệm S của bất phương trình bậc hai x² - 5x + 6 <= 0 là:',
    options: [
      { key: 'A', text: 'S = [2; 3]', isCorrect: true },
      { key: 'B', text: 'S = (-inf; 2] U [3; +inf)', isCorrect: false },
      { key: 'C', text: 'S = (2; 3)', isCorrect: false },
      { key: 'D', text: 'S = [-3; -2]', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Tam thức f(x) = x² - 5x + 6 có hai nghiệm x = 2 và x = 3. Hệ số a = 1 > 0. Trong khoảng hai nghiệm f(x) mang dấu âm, do đó f(x) <= 0 <=> x in [2; 3].',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Vận dụng',
    topic: 'Tích vô hướng của hai vectơ',
    content: 'Trong mặt phẳng toạ độ Oxy, cho hai vectơ a = (1; 2) và b = (3; -1). Cosin của góc giữa hai vectơ a và b bằng:',
    options: [
      { key: 'A', text: 'cos(a, b) = √2 / 2', isCorrect: true },
      { key: 'B', text: 'cos(a, b) = 1/2', isCorrect: false },
      { key: 'C', text: 'cos(a, b) = 0', isCorrect: false },
      { key: 'D', text: 'cos(a, b) = √3 / 2', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có a.b = 1*3 + 2*(-1) = 1. Độ dài |a| = √(1 + 4) = √5, |b| = √(9 + 1) = √10. cos(a, b) = 1 / (√5*√10) = 1 / (5√2) = √2 / 2 (góc 45°).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 10',
    level: 'Vận dụng cao',
    topic: 'Hệ thức lượng & Ứng dụng thực tế',
    content: 'Để đo khoảng cách giữa hai điểm A và B bị ngăn cách bởi hồ nước, người ta chọn điểm C sao cho CA = 80 m, CB = 100 m và góc ACB = 60°. Khoảng cách AB giữa hai điểm bằng:',
    options: [
      { key: 'A', text: '20√21 m (xấp xỉ 91,65 m)', isCorrect: true },
      { key: 'B', text: '85,42 m', isCorrect: false },
      { key: 'C', text: '128,06 m', isCorrect: false },
      { key: 'D', text: '98,20 m', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Áp dụng định lý côsin trong tam giác ABC: AB² = CA² + CB² - 2*CA*CB*cos(60°) = 6400 + 10000 - 2*80*100*0.5 = 8400 => AB = √8400 = 20√21 ≈ 91,65 m.',
  },

  // ==========================================
  // --- VẬT LÝ - LỚP 10 (GDPT 2018) ---
  // ==========================================
  {
    subject: 'Vật lý',
    grade: 'Lớp 10',
    level: 'Nhận biết',
    topic: 'Chuyển động thẳng biến đổi đều',
    content: 'Công thức tính vận tốc của chuyển động thẳng biến đổi đều theo thời gian t là:',
    options: [
      { key: 'A', text: 'v = v0 + at', isCorrect: true },
      { key: 'B', text: 'v = v0 + at²', isCorrect: false },
      { key: 'C', text: 'v = v0 + 1/2*at²', isCorrect: false },
      { key: 'D', text: 'v = at', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định nghĩa gia tốc không đổi a = (v - v0)/t => v = v0 + at.',
  },
  {
    subject: 'Vật lý',
    grade: 'Lớp 10',
    level: 'Thông hiểu',
    topic: 'Động lực học & Định luật Newton',
    content: 'Một vật có khối lượng m = 2 kg chịu tác dụng của lực kéo không đổi F = 10 N theo phương chuyển động. Bỏ qua ma sát. Gia tốc mà vật thu được là:',
    options: [
      { key: 'A', text: 'a = 5 m/s²', isCorrect: true },
      { key: 'B', text: 'a = 20 m/s²', isCorrect: false },
      { key: 'C', text: 'a = 0,2 m/s²', isCorrect: false },
      { key: 'D', text: 'a = 2 m/s²', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định luật II Newton: F = m*a => a = F / m = 10 / 2 = 5 m/s².',
  },
  {
    subject: 'Vật lý',
    grade: 'Lớp 10',
    level: 'Vận dụng',
    topic: 'Cơ năng & Bảo toàn năng lượng',
    content: 'Một vật khối lượng m = 0,5 kg rơi tự do từ độ cao h = 20 m so với mặt đất. Lấy g = 10 m/s². Bỏ qua sức cản không khí. Vận tốc của vật ngay trước khi chạm đất là:',
    options: [
      { key: 'A', text: 'v = 20 m/s', isCorrect: true },
      { key: 'B', text: 'v = 10 m/s', isCorrect: false },
      { key: 'C', text: 'v = 14,14 m/s', isCorrect: false },
      { key: 'D', text: 'v = 40 m/s', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định luật bảo toàn cơ năng: m*g*h = 1/2*m*v² => v = √(2*g*h) = √(2*10*20) = √400 = 20 m/s.',
  },

  // ==========================================
  // --- HÓA HỌC - LỚP 10 (GDPT 2018) ---
  // ==========================================
  {
    subject: 'Hóa học',
    grade: 'Lớp 10',
    level: 'Nhận biết',
    topic: 'Cấu tạo nguyên tử',
    content: 'Hạt mang điện tích dương cấu tạo nên hạt nhân nguyên tử là:',
    options: [
      { key: 'A', text: 'Proton', isCorrect: true },
      { key: 'B', text: 'Electron', isCorrect: false },
      { key: 'C', text: 'Nơtron', isCorrect: false },
      { key: 'D', text: 'Hạt photon', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Hạt nhân nguyên tử gồm proton (mang điện dương +1) và nơtron (không mang điện). Vỏ nguyên tử gồm electron (mang điện âm -1).',
  },
  {
    subject: 'Hóa học',
    grade: 'Lớp 10',
    level: 'Thông hiểu',
    topic: 'Bảng tuần hoàn các nguyên tố hóa học',
    content: 'Nguyên tử nguyên tố X có cấu hình electron là 1s² 2s² 2p⁶ 3s¹. Vị trí của X trong bảng tuần hoàn là:',
    options: [
      { key: 'A', text: 'Ô số 11, chu kì 3, nhóm IA', isCorrect: true },
      { key: 'B', text: 'Ô số 11, chu kì 3, nhóm VIIA', isCorrect: false },
      { key: 'C', text: 'Ô số 10, chu kì 2, nhóm IA', isCorrect: false },
      { key: 'D', text: 'Ô số 11, chu kì 1, nhóm IIIA', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Tổng số electron = 11 (ô 11). Có 3 lớp electron (chu kì 3). Lớp ngoài cùng có 1 electron s (nhóm IA - Natri).',
  },

  // ==========================================
  // --- TOÁN HỌC - LỚP 11 ---
  // ==========================================
  {
    subject: 'Toán học',
    grade: 'Lớp 11',
    level: 'Nhận biết',
    topic: 'Cấp số cộng',
    content: 'Cho cấp số cộng (u_n) có số hạng đầu u_1 = 3 và công sai d = 4. Số hạng thứ hai u_2 của cấp số cộng bằng:',
    options: [
      { key: 'A', text: 'u_2 = 7', isCorrect: true },
      { key: 'B', text: 'u_2 = 12', isCorrect: false },
      { key: 'C', text: 'u_2 = -1', isCorrect: false },
      { key: 'D', text: 'u_2 = 1', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định nghĩa cấp số cộng: u_2 = u_1 + d = 3 + 4 = 7.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 11',
    level: 'Thông hiểu',
    topic: 'Đạo hàm',
    content: 'Đạo hàm của hàm số f(x) = 2x³ - 5x + 1 tại điểm x = 1 là:',
    options: [
      { key: 'A', text: 'f\'(1) = 1', isCorrect: true },
      { key: 'B', text: 'f\'(1) = 6', isCorrect: false },
      { key: 'C', text: 'f\'(1) = -3', isCorrect: false },
      { key: 'D', text: 'f\'(1) = 5', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có f\'(x) = 6x² - 5. Tại x = 1: f\'(1) = 6*(1)² - 5 = 1.',
  },

  // ==========================================
  // --- TOÁN HỌC - THCS (LỚP 6, 7, 8, 9) ---
  // ==========================================
  {
    subject: 'Toán học',
    grade: 'Lớp 9',
    level: 'Thông hiểu',
    topic: 'Hệ phương trình bậc nhất hai ẩn',
    content: 'Nghiệm (x; y) của hệ phương trình { x + y = 7; x - y = 3 } là:',
    options: [
      { key: 'A', text: '(5; 2)', isCorrect: true },
      { key: 'B', text: '(4; 3)', isCorrect: false },
      { key: 'C', text: '(2; 5)', isCorrect: false },
      { key: 'D', text: '(6; 1)', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Cộng hai phương trình vế theo vế: 2x = 10 => x = 5. Thay vào phương trình đầu: 5 + y = 7 => y = 2.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 8',
    level: 'Nhận biết',
    topic: 'Hằng đẳng thức đáng nhớ',
    content: 'Khai triển hằng đẳng thức hiệu hai bình phương a² - b² ta được kết quả là:',
    options: [
      { key: 'A', text: '(a - b)(a + b)', isCorrect: true },
      { key: 'B', text: '(a - b)²', isCorrect: false },
      { key: 'C', text: 'a² - 2ab + b²', isCorrect: false },
      { key: 'D', text: '(a + b)²', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo hằng đẳng thức đáng nhớ số 3: a² - b² = (a - b)(a + b).',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 7',
    level: 'Thông hiểu',
    topic: 'Tỉ lệ thức',
    content: 'Tìm số x trong tỉ lệ thức x / 6 = 5 / 2:',
    options: [
      { key: 'A', text: 'x = 15', isCorrect: true },
      { key: 'B', text: 'x = 10', isCorrect: false },
      { key: 'C', text: 'x = 12', isCorrect: false },
      { key: 'D', text: 'x = 30', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Theo tính chất tỉ lệ thức: x = (6 * 5) / 2 = 30 / 2 = 15.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 6',
    level: 'Nhận biết',
    topic: 'Số học & Số nguyên',
    content: 'Tập hợp các ước tự nhiên của số 12 là:',
    options: [
      { key: 'A', text: '{1; 2; 3; 4; 6; 12}', isCorrect: true },
      { key: 'B', text: '{2; 3; 4; 6}', isCorrect: false },
      { key: 'C', text: '{1; 2; 3; 6; 12}', isCorrect: false },
      { key: 'D', text: '{0; 1; 2; 3; 4; 6; 12}', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Các số tự nhiên mà 12 chia hết là: 1, 2, 3, 4, 6, 12.',
  },

  // ==========================================
  // --- TOÁN HỌC - TIỂU HỌC (LỚP 1 - 5) ---
  // ==========================================
  {
    subject: 'Toán học',
    grade: 'Lớp 1',
    level: 'Nhận biết',
    topic: 'Phép tính phạm vi 10',
    content: 'Kết quả của phép tính 5 + 3 là:',
    options: [
      { key: 'A', text: '8', isCorrect: true },
      { key: 'B', text: '7', isCorrect: false },
      { key: 'C', text: '9', isCorrect: false },
      { key: 'D', text: '10', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có 5 + 3 = 8. Chọn đáp án A.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 1',
    level: 'Nhận biết',
    topic: 'Thứ tự các số đến 20',
    content: 'Số liền sau của số 14 là:',
    options: [
      { key: 'A', text: '15', isCorrect: true },
      { key: 'B', text: '13', isCorrect: false },
      { key: 'C', text: '16', isCorrect: false },
      { key: 'D', text: '14', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Số liền sau của 14 là 14 + 1 = 15.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 3',
    level: 'Thông hiểu',
    topic: 'Phép nhân & Chu vi',
    content: 'Một hình vuông có cạnh dài 6 cm. Chu vi của hình vuông đó là:',
    options: [
      { key: 'A', text: '24 cm', isCorrect: true },
      { key: 'B', text: '36 cm', isCorrect: false },
      { key: 'C', text: '12 cm', isCorrect: false },
      { key: 'D', text: '18 cm', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Chu vi hình vuông = cạnh x 4 = 6 x 4 = 24 cm.',
  },
  {
    subject: 'Toán học',
    grade: 'Lớp 5',
    level: 'Thông hiểu',
    topic: 'Phân số & Diện tích',
    content: 'Diện tích tam giác có độ dài đáy a = 8 cm và chiều cao h = 5 cm là:',
    options: [
      { key: 'A', text: '20 cm²', isCorrect: true },
      { key: 'B', text: '40 cm²', isCorrect: false },
      { key: 'C', text: '13 cm²', isCorrect: false },
      { key: 'D', text: '26 cm²', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Diện tích tam giác S = (a x h) / 2 = (8 x 5) / 2 = 20 cm².',
  },

];


/**
 * Generates an academically rigorous, strictly grade-aligned procedural question.
 * Strictly adheres to GDPT 2018 grade-level competencies:
 * - Lớp 10: Hệ thức lượng tam giác, Toạ độ vectơ Oxy, Parabol, Bất phương trình bậc 2, Thống kê.
 * - Lớp 11: Cấp số cộng/nhân, Đạo hàm, Giới hạn.
 * - Lớp 12: Tích phân, Cực trị hàm bậc 3, Tiệm cận, Oxyz mặt cầu, Số phức.
 * - THCS (Lớp 6-9): Hệ phương trình, Hằng đẳng thức, Tỉ lệ thức, Phân số.
 * - Tiểu học (Lớp 1-5): Phép cộng trong phạm vi 10-20 cho Lớp 1, bảng nhân/chu vi cho Lớp 2-5.
 */
function generateProceduralQuestion(
  subject: string,
  grade: string,
  level: string,
  index: number
): ExamQuestion {
  const parsed = parseGrade(grade);
  const numA = (index * 3 + 2) % 7 + 2; // 2..8
  const numB = (index * 5 + 4) % 9 + 3; // 3..11
  const numC = numA * numB;

  // ----------------------------------------------------
  // --- TOÁN HỌC ---
  // ----------------------------------------------------
  if (subject.includes('Toán')) {
    // 1. CẤP TIỂU HỌC (LỚP 1 - LỚP 5)
    if (parsed.levelCategory === 'PRIMARY') {
      if (parsed.gradeNum === 1) {
        const primary1Questions = [
          {
            content: `Kết quả của phép tính $${numA} + ${numB}$ là:`,
            options: [
              { key: 'A', text: `${numA + numB}`, isCorrect: true },
              { key: 'B', text: `${numA + numB - 1}`, isCorrect: false },
              { key: 'C', text: `${numA + numB + 1}`, isCorrect: false },
              { key: 'D', text: `${numA + numB + 2}`, isCorrect: false },
            ],
            correctAnswer: 'A',
            explanation: `Ta có $${numA} + ${numB} = ${numA + numB}$. Chọn đáp án A.`,
          },
          {
            content: `Số liền sau của số $${numA + 5}$ là:`,
            options: [
              { key: 'A', text: `${numA + 6}`, isCorrect: true },
              { key: 'B', text: `${numA + 4}`, isCorrect: false },
              { key: 'C', text: `${numA + 5}`, isCorrect: false },
              { key: 'D', text: `${numA + 7}`, isCorrect: false },
            ],
            correctAnswer: 'A',
            explanation: `Số liền sau của $${numA + 5}$ là $${numA + 5} + 1 = ${numA + 6}$.`,
          },
        ];
        const pick = primary1Questions[index % primary1Questions.length];
        return {
          id: Date.now() + index + Math.floor(Math.random() * 10000),
          order: `Câu ${String(index + 1).padStart(2, '0')}`,
          level: level as any,
          levelClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          topic: `${subject} - ${grade}`,
          content: pick.content,
          options: pick.options,
          points: 0.25,
          correctAnswer: pick.correctAnswer,
          explanation: pick.explanation,
        };
      } else {
        // Lớp 2 đến Lớp 5
        const primaryUpperQuestions = [
          {
            content: `Kết quả của phép nhân $${numA} \times ${numB}$ là:`,
            options: [
              { key: 'A', text: `${numA * numB}`, isCorrect: true },
              { key: 'B', text: `${numA * numB - 2}`, isCorrect: false },
              { key: 'C', text: `${numA * numB + 2}`, isCorrect: false },
              { key: 'D', text: `${numA * numB + numA}`, isCorrect: false },
            ],
            correctAnswer: 'A',
            explanation: `Ta có $${numA} \times ${numB} = ${numA * numB}$.`,
          },
          {
            content: `Một hình chữ nhật có chiều dài $${numA + 6}\\,\\text{cm}$ và chiều rộng $${numB}\\,\\text{cm}$. Chu vi của hình chữ nhật đó là:`,
            options: [
              { key: 'A', text: `${2 * (numA + 6 + numB)}\\,\\text{cm}`, isCorrect: true },
              { key: 'B', text: `${numA + 6 + numB}\\,\\text{cm}`, isCorrect: false },
              { key: 'C', text: `${(numA + 6) * numB}\\,\\text{cm}`, isCorrect: false },
              { key: 'D', text: `${2 * (numA + 6) + numB}\\,\\text{cm}`, isCorrect: false },
            ],
            correctAnswer: 'A',
            explanation: `Chu vi hình chữ nhật $P = 2 \\times (\\text{dài} + \\text{rộng}) = 2 \\times (${numA + 6} + ${numB}) = ${2 * (numA + 6 + numB)}\\,\\text{cm}$.`,
          },
        ];
        const pick = primaryUpperQuestions[index % primaryUpperQuestions.length];
        return {
          id: Date.now() + index + Math.floor(Math.random() * 10000),
          order: `Câu ${String(index + 1).padStart(2, '0')}`,
          level: level as any,
          levelClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          topic: `${subject} - ${grade}`,
          content: pick.content,
          options: pick.options,
          points: 0.25,
          correctAnswer: pick.correctAnswer,
          explanation: pick.explanation,
        };
      }
    }

    // 2. CẤP THCS (LỚP 6 - LỚP 9)
    if (parsed.levelCategory === 'LOWER_SEC') {
      const thcsQuestions = [
        {
          content: `Nghiệm $(x; y)$ của hệ phương trình $\\begin{cases} x + y = ${numA + numB} \\\\ x - y = ${numA - numB} \\end{cases}$ là:`,
          options: [
            { key: 'A', text: `$(${numA}; ${numB})$`, isCorrect: true },
            { key: 'B', text: `$(${numB}; ${numA})$`, isCorrect: false },
            { key: 'C', text: `$(${numA + 1}; ${numB - 1})$`, isCorrect: false },
            { key: 'D', text: `$(${numA - 1}; ${numB + 1})$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Cộng hai phương trình ta được $2x = ${2 * numA} \\Rightarrow x = ${numA}$. Thay vào phương trình đầu suy ra $y = ${numB}$.`,
        },
        {
          content: `Khai triển hằng đẳng thức $(x + ${numA})^2$ ta được kết quả là:`,
          options: [
            { key: 'A', text: `$x^2 + ${2 * numA}x + ${numA ** 2}$`, isCorrect: true },
            { key: 'B', text: `$x^2 + ${numA}x + ${numA ** 2}$`, isCorrect: false },
            { key: 'C', text: `$x^2 + ${numA ** 2}$`, isCorrect: false },
            { key: 'D', text: `$x^2 - ${2 * numA}x + ${numA ** 2}$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Theo hằng đẳng thức: $(a + b)^2 = a^2 + 2ab + b^2 \\Rightarrow (x + ${numA})^2 = x^2 + ${2 * numA}x + ${numA ** 2}$.`,
        },
        {
          content: `Tìm số $x$ trong tỉ lệ thức $\\frac{x}{${numA}} = \\frac{${numB}}{2}$:`,
          options: [
            { key: 'A', text: `$x = ${(numA * numB) / 2}$`, isCorrect: true },
            { key: 'B', text: `$x = ${numA * numB}$`, isCorrect: false },
            { key: 'C', text: `$x = ${numA + numB}$`, isCorrect: false },
            { key: 'D', text: `$x = ${numA * 2}$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Theo tính chất tỉ lệ thức: $x = \\frac{${numA} \\cdot ${numB}}{2} = ${(numA * numB) / 2}$.`,
        },
      ];
      const pick = thcsQuestions[index % thcsQuestions.length];
      return {
        id: Date.now() + index + Math.floor(Math.random() * 10000),
        order: `Câu ${String(index + 1).padStart(2, '0')}`,
        level: level as any,
        levelClass: 'bg-blue-50 text-blue-700 border-blue-200',
        topic: `${subject} - ${grade}`,
        content: pick.content,
        options: pick.options,
        points: 0.25,
        correctAnswer: pick.correctAnswer,
        explanation: pick.explanation,
      };
    }

    // 3. CẤP THPT - KHỐI LỚP 10 (GDPT 2018 CHUẨN MỰC)
    if (parsed.gradeNum === 10) {
      const cosAVal = 0.5; // 60 deg
      const aSquared = numA ** 2 + numB ** 2 - numA * numB;
      const grade10Procedural = [
        {
          content: `Cho tam giác $ABC$ có cạnh $b = ${numA}\\,\\text{cm}$, cạnh $c = ${numB}\\,\\text{cm}$ và góc $\\widehat{A} = 60^\\circ$. Bình phương độ dài cạnh $a$ ($a^2$) bằng:`,
          options: [
            { key: 'A', text: `$a^2 = ${aSquared}\\,\\text{cm}^2$`, isCorrect: true },
            { key: 'B', text: `$a^2 = ${numA ** 2 + numB ** 2}\\,\\text{cm}^2$`, isCorrect: false },
            { key: 'C', text: `$a^2 = ${numA ** 2 + numB ** 2 + numA * numB}\\,\\text{cm}^2$`, isCorrect: false },
            { key: 'D', text: `$a^2 = ${(numA + numB) ** 2}\\,\\text{cm}^2$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Theo định lí côsin: $a^2 = b^2 + c^2 - 2bc\\cos A = ${numA}^2 + ${numB}^2 - 2\\cdot ${numA}\\cdot ${numB}\\cdot 0.5 = ${numA ** 2} + ${numB ** 2} - ${numA * numB} = ${aSquared}\\,\\text{cm}^2$.`,
        },
        {
          content: `Trong mặt phẳng toạ độ $Oxy$, cho hai vectơ $\\vec{u} = (${numA}; -${numB})$ và $\\vec{v} = (${numB}; ${numA})$. Tích vô hướng $\\vec{u} \\cdot \\vec{v}$ bằng:`,
          options: [
            { key: 'A', text: `$0$`, isCorrect: true },
            { key: 'B', text: `$${2 * numA * numB}$`, isCorrect: false },
            { key: 'C', text: `$-${2 * numA * numB}$`, isCorrect: false },
            { key: 'D', text: `$${numA ** 2 + numB ** 2}$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Ta có $\\vec{u} \\cdot \\vec{v} = x_1 x_2 + y_1 y_2 = ${numA}\\cdot ${numB} + (-${numB})\\cdot ${numA} = ${numA * numB} - ${numA * numB} = 0$. (Hai vectơ vuông góc nhau).`,
        },
        {
          content: `Toạ độ đỉnh $I$ của parabol $(P): y = x^2 - ${2 * numA}x + ${numB}$ là:`,
          options: [
            { key: 'A', text: `$I(${numA}; ${numB - numA ** 2})$`, isCorrect: true },
            { key: 'B', text: `$I(-${numA}; ${numB + numA ** 2})$`, isCorrect: false },
            { key: 'C', text: `$I(${2 * numA}; ${numB})$`, isCorrect: false },
            { key: 'D', text: `$I(${numA}; ${numB})$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Hoành độ đỉnh $x_I = -b / (2a) = ${2 * numA} / 2 = ${numA}$. Tung độ $y_I = (${numA})^2 - ${2 * numA}\\cdot ${numA} + ${numB} = ${numB - numA ** 2}$. Do đó $I(${numA}; ${numB - numA ** 2})$.`,
        },
        {
          content: `Tập nghiệm $S$ của bất phương trình bậc hai $x^2 - ${numA + numB}x + ${numA * numB} < 0$ là:`,
          options: [
            { key: 'A', text: `$S = (${Math.min(numA, numB)}; ${Math.max(numA, numB)})$`, isCorrect: true },
            { key: 'B', text: `$S = [-${Math.max(numA, numB)}; -${Math.min(numA, numB)}]$`, isCorrect: false },
            { key: 'C', text: `$S = (-\infty; ${Math.min(numA, numB)}) \\cup (${Math.max(numA, numB)}; +\infty)$`, isCorrect: false },
            { key: 'D', text: `$S = \\mathbb{R}$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Tam thức có hai nghiệm là $x = ${Math.min(numA, numB)}$ và $x = ${Math.max(numA, numB)}$. Hệ số $a = 1 > 0$ nên $f(x) < 0$ trong khoảng hai nghiệm: $S = (${Math.min(numA, numB)}; ${Math.max(numA, numB)})$.`,
        },
        {
          content: `Cho mẫu số liệu thống kê: $${numA}, ${numA + 2}, ${numA + 4}, ${numA + 6}, ${numA + 8}$. Số trung bình $\\bar{x}$ của mẫu số liệu trên bằng:`,
          options: [
            { key: 'A', text: `$\\bar{x} = ${numA + 4}$`, isCorrect: true },
            { key: 'B', text: `$\\bar{x} = ${numA + 2}$`, isCorrect: false },
            { key: 'C', text: `$\\bar{x} = ${numA + 5}$`, isCorrect: false },
            { key: 'D', text: `$\\bar{x} = ${numA + 6}$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Số trung bình $\\bar{x} = [(${numA}) + (${numA + 2}) + (${numA + 4}) + (${numA + 6}) + (${numA + 8})] / 5 = [5\\cdot ${numA} + 20] / 5 = ${numA + 4}$.`,
        },
      ];
      const pick = grade10Procedural[index % grade10Procedural.length];
      return {
        id: Date.now() + index + Math.floor(Math.random() * 10000),
        order: `Câu ${String(index + 1).padStart(2, '0')}`,
        level: level as any,
        levelClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        topic: `${subject} - Lớp 10`,
        content: pick.content,
        options: pick.options,
        points: 0.25,
        correctAnswer: pick.correctAnswer,
        explanation: pick.explanation,
      };
    }

    // 4. CẤP THPT - KHỐI LỚP 11
    if (parsed.gradeNum === 11) {
      const grade11Procedural = [
        {
          content: `Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = ${numA}$ và công sai $d = ${numB}$. Số hạng $u_4$ bằng:`,
          options: [
            { key: 'A', text: `$u_4 = ${numA + 3 * numB}$`, isCorrect: true },
            { key: 'B', text: `$u_4 = ${numA + 4 * numB}$`, isCorrect: false },
            { key: 'C', text: `$u_4 = ${numA * numB}$`, isCorrect: false },
            { key: 'D', text: `$u_4 = ${numA + 2 * numB}$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Theo công thức số hạng tổng quát của cấp số cộng: $u_n = u_1 + (n - 1)d \\Rightarrow u_4 = u_1 + 3d = ${numA} + 3\\cdot ${numB} = ${numA + 3 * numB}$.`,
        },
        {
          content: `Đạo hàm của hàm số $y = ${numA}x^3 - ${numB}x^2 + 5$ là:`,
          options: [
            { key: 'A', text: `$y' = ${3 * numA}x^2 - ${2 * numB}x$`, isCorrect: true },
            { key: 'B', text: `$y' = ${numA}x^2 - ${numB}x$`, isCorrect: false },
            { key: 'C', text: `$y' = ${3 * numA}x^2 + ${2 * numB}x$`, isCorrect: false },
            { key: 'D', text: `$y' = ${3 * numA}x - ${2 * numB}$`, isCorrect: false },
          ],
          correctAnswer: 'A',
          explanation: `Áp dụng công thức đạo hàm hàm đa thức: $(x^n)' = n\\cdot x^{n-1} \\Rightarrow y' = ${3 * numA}x^2 - ${2 * numB}x$.`,
        },
      ];
      const pick = grade11Procedural[index % grade11Procedural.length];
      return {
        id: Date.now() + index + Math.floor(Math.random() * 10000),
        order: `Câu ${String(index + 1).padStart(2, '0')}`,
        level: level as any,
        levelClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        topic: `${subject} - Lớp 11`,
        content: pick.content,
        options: pick.options,
        points: 0.25,
        correctAnswer: pick.correctAnswer,
        explanation: pick.explanation,
      };
    }

    // 5. CẤP THPT - KHỐI LỚP 12 (HOẶC MẶC ĐỊNH)
    const grade12Procedural = [
      {
        content: `Cho hàm số bậc ba $y = x^3 - ${3 * numA}x^2 + ${numB}$. Tìm toạ độ điểm cực trị của đồ thị hàm số có hoành độ dương:`,
        options: [
          { key: 'A', text: `$x = ${2 * numA}$`, isCorrect: true },
          { key: 'B', text: `$x = ${numA}$`, isCorrect: false },
          { key: 'C', text: `$x = -${numA}$`, isCorrect: false },
          { key: 'D', text: `$x = 0$`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `Ta có $y' = 3x^2 - ${6 * numA}x = 3x(x - ${2 * numA})$. Điểm cực trị có hoành độ dương là $x = ${2 * numA}$.`,
      },
      {
        content: `Tính tích phân $I = \\int_0^2 (${numA}x + ${numB})\\,dx$:`,
        options: [
          { key: 'A', text: `$I = ${2 * numA + 2 * numB}$`, isCorrect: true },
          { key: 'B', text: `$I = ${numA + numB}$`, isCorrect: false },
          { key: 'C', text: `$I = ${4 * numA + numB}$`, isCorrect: false },
          { key: 'D', text: `$I = ${2 * numA + 4 * numB}$`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `Ta có $I = [\\frac{${numA}}{2}x^2 + ${numB}x]_0^2 = \\frac{${numA}}{2}\\cdot 4 + ${numB}\\cdot 2 = ${2 * numA + 2 * numB}$.`,
      },
      {
        content: `Trong không gian $Oxyz$, cho mặt phẳng $(P): ${numA}x + ${numB}y - z + ${numC} = 0$. Vectơ nào sau đây là một vectơ pháp tuyến của $(P)$?`,
        options: [
          { key: 'A', text: `$\\vec{n} = (${numA}; ${numB}; -1)$`, isCorrect: true },
          { key: 'B', text: `$\\vec{n} = (${numA}; ${numB}; 1)$`, isCorrect: false },
          { key: 'C', text: `$\\vec{n} = (${numA}; -${numB}; -1)$`, isCorrect: false },
          { key: 'D', text: `$\\vec{n} = (-${numA}; ${numB}; 1)$`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `Mặt phẳng $Ax + By + Cz + D = 0$ có VTPT $\\vec{n} = (A; B; C) = (${numA}; ${numB}; -1)$.`,
      },
      {
        content: `Tập xác định $D$ của hàm số $y = \\log_{${numA + 1}}(x - ${numB})$ là:`,
        options: [
          { key: 'A', text: `$D = (${numB}; +\\infty)$`, isCorrect: true },
          { key: 'B', text: `$D = [${numB}; +\\infty)$`, isCorrect: false },
          { key: 'C', text: `$D = (-\infty; ${numB})$`, isCorrect: false },
          { key: 'D', text: `$D = \\mathbb{R} \\setminus \\{${numB}\\}$`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `Điều kiện xác định: $x - ${numB} > 0 \\Leftrightarrow x > ${numB} \\Rightarrow D = (${numB}; +\\infty)$.`,
      },
    ];
    const pick = grade12Procedural[index % grade12Procedural.length];
    return {
      id: Date.now() + index + Math.floor(Math.random() * 10000),
      order: `Câu ${String(index + 1).padStart(2, '0')}`,
      level: level as any,
      levelClass: 'bg-blue-50 text-blue-700 border-blue-200',
      topic: `${subject} - ${grade}`,
      content: pick.content,
      options: pick.options,
      points: 0.25,
      correctAnswer: pick.correctAnswer,
      explanation: pick.explanation,
    };
  }

  // ----------------------------------------------------
  // --- VẬT LÝ ---
  // ----------------------------------------------------
  if (subject.includes('Vật lý')) {
    if (parsed.gradeNum === 10) {
      const pick = {
        content: `Một ô tô chuyển động thẳng biến đổi đều với gia tốc $a = ${numA}\\,\\text{m/s}^2$. Từ trạng thái nghỉ ($v_0 = 0$), sau thời gian $t = ${numB}\\,\\text{s}$, vận tốc của ô tô đạt:`,
        options: [
          { key: 'A', text: `$v = ${numA * numB}\\,\\text{m/s}$`, isCorrect: true },
          { key: 'B', text: `$v = ${numA + numB}\\,\\text{m/s}$`, isCorrect: false },
          { key: 'C', text: `$v = ${(numA * numB) / 2}\\,\\text{m/s}$`, isCorrect: false },
          { key: 'D', text: `$v = ${numA * numB ** 2}\\,\\text{m/s}$`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `Vận tốc sau thời gian $t$ là $v = v_0 + at = 0 + ${numA}\\cdot ${numB} = ${numA * numB}\\,\\text{m/s}$.`,
      };
      return {
        id: Date.now() + index + Math.floor(Math.random() * 10000),
        order: `Câu ${String(index + 1).padStart(2, '0')}`,
        level: level as any,
        levelClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        topic: `${subject} - Lớp 10`,
        content: pick.content,
        options: pick.options,
        points: 0.25,
        correctAnswer: pick.correctAnswer,
        explanation: pick.explanation,
      };
    }

    const f = 50;
    const omega = 100;
    const pick = {
      content: `Một đoạn mạch điện xoay chiều có điện áp $u = ${numA * 100}\\sqrt{2} \\cos(${omega}\\pi t)\\,(\\text{V})$. Tần số dòng điện chạy trong mạch là:`,
      options: [
        { key: 'A', text: `$f = ${omega / 2}\\,\\text{Hz}$`, isCorrect: true },
        { key: 'B', text: `$f = ${omega}\\,\\text{Hz}$`, isCorrect: false },
        { key: 'C', text: `$f = 100\\,\\text{Hz}$`, isCorrect: false },
        { key: 'D', text: `$f = 25\\,\\text{Hz}$`, isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: `Tần số $f = \\omega / (2\\pi) = ${omega}\\pi / (2\\pi) = ${omega / 2}\\,\\text{Hz}$.`,
    };
    return {
      id: Date.now() + index + Math.floor(Math.random() * 10000),
      order: `Câu ${String(index + 1).padStart(2, '0')}`,
      level: level as any,
      levelClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      topic: `${subject} - ${grade}`,
      content: pick.content,
      options: pick.options.map((o) => ({ ...o })),
      points: 0.25,
      correctAnswer: pick.correctAnswer,
      explanation: pick.explanation,
    };
  }

  // ----------------------------------------------------
  // --- GENERIC ACADEMIC FALLBACK VARIATION ---
  // ----------------------------------------------------
  return {
    id: Date.now() + index + Math.floor(Math.random() * 10000),
    order: `Câu ${String(index + 1).padStart(2, '0')}`,
    level: level as any,
    levelClass: 'bg-slate-50 text-slate-700 border-slate-200',
    topic: `${subject} - ${grade}`,
    content: `[${subject} ${grade} - Cấp độ ${level}] Phân tích và lựa chọn phương án đúng về nguyên lý cốt lõi trong nội dung chuyên đề ${index + 1}:`,
    options: [
      { key: 'A', text: `Phương án chuẩn hóa kiến thức ${index + 1}A phù hợp chuẩn GDPT môn ${subject} ${grade}`, isCorrect: true },
      { key: 'B', text: `Phương án so sánh ${index + 1}B (phản ánh sai lệch khái niệm)`, isCorrect: false },
      { key: 'C', text: `Phương án đối chiếu ${index + 1}C (chưa đầy đủ điều kiện)`, isCorrect: false },
      { key: 'D', text: `Phương án nhiễu ${index + 1}D (phủ định quy luật)`, isCorrect: false },
    ],
    points: 0.25,
    correctAnswer: 'A',
    explanation: `Phân tích sư phạm chi tiết: Phương án A thể hiện chính xác quy luật kiến thức theo chương trình môn ${subject} ${grade} ở cấp độ ${level}.`,
  };
}


export function extractCleanShortAnswerValue(
  optionText?: string | null,
  explanation?: string | null,
  rawAnswer?: string | null
): string {
  // 1. If rawAnswer is already a valid concise answer and NOT just a single letter A-D or True/False label
  if (rawAnswer && typeof rawAnswer === 'string') {
    const trimmed = rawAnswer.trim();
    if (!/^[A-Da-d]$/.test(trimmed) && !trimmed.includes(':') && !trimmed.toLowerCase().includes('xem')) {
      let clean = trimmed.replace(/^\$+|\$+$/g, '').trim();
      clean = clean.replace(/^[a-zA-Z_]\s*[:=]\s*/, '');
      clean = clean.replace(/^(?:đáp số|kết quả|giá trị)\s*[:=]?\s*/i, '');
      if (clean && !/^[A-Da-d]$/.test(clean)) {
        return clean;
      }
    }
  }

  // 2. If optionText from the correct option is provided
  if (optionText && typeof optionText === 'string') {
    let clean = optionText.trim();
    // Strip leading "A. ", "B. ", "(A) ", "a) "
    clean = clean.replace(/^(\(?[A-Da-d]\)[\.\:\-\s]+|[A-Da-d][\.\:\)]\s+)/i, '').trim();
    // Strip outer $...$
    clean = clean.replace(/^\$+|\$+$/g, '').trim();
    // Strip variable prefix like "x = 5", "m = -2", "y = 3", "f(x) = 0", "S = "
    clean = clean.replace(/^[a-zA-Z_](?:\([a-zA-Z0-9_]+\))?\s*[:=]\s*/, '');
    // Strip leading phrases like "Đáp án là", "Kết quả là"
    clean = clean.replace(/^(?:đáp án|đáp số|kết quả|giá trị)\s*(?:là|bằng|=|:)?\s*/i, '');

    if (clean && !/^[A-Da-d]$/.test(clean)) {
      return clean;
    }
  }

  // 3. Search explanation for mathematical conclusion
  if (explanation && typeof explanation === 'string') {
    // Pattern 1: Explicit answer statement like "Đáp số: 15" or "Kết quả: -4"
    const p1 = explanation.match(/(?:đáp số|kết quả|đáp án)\s*[:=]\s*\$?([+-]?\d+(?:[\.,/]\d+)?|\{[^\}]+\}|\([^\)]+\))\$?/i);
    if (p1 && p1[1]) return p1[1].trim();

    // Pattern 2: "Vậy... bằng/là X" or "Do đó... bằng/là X"
    const p2 = explanation.match(/(?:vậy|do đó|suy ra|kết luận)\s+[^,\.\n]*?\s+(?:là|bằng|=|đạt giá trị)\s*\$?([+-]?\d+(?:[\.,/]\d+)?|\{[^\}]+\}|\([^\)]+\))\$?/i);
    if (p2 && p2[1]) return p2[1].trim();

    // Pattern 3: Last formula equality like "= 15" or "bằng 15" at end of explanation
    const matches = [...explanation.matchAll(/(?:=|bằng|là)\s*\$?([+-]?\d+(?:[\.,/]\d+)?)\$?(?:\s*[\.\,\n]|$)/gi)];
    if (matches.length > 0) {
      return matches[matches.length - 1][1].trim();
    }
  }

  // 4. Fallback if optionText had non-empty text
  if (optionText && !/^[A-Da-d]$/.test(optionText.trim())) {
    return optionText.trim().replace(/^\$+|\$+$/g, '');
  }

  return rawAnswer && !/^[A-Da-d]$/.test(rawAnswer.trim()) ? rawAnswer.trim() : '';
}

/**
 * Returns a high-quality, strictly unique curriculum question based on subject, grade, and level.
 * Avoids any question in the existingQuestionContents list.
 * Adapts to targetType (e.g. short_answer, true_false, essay).
 */


/**
 * Returns a high-quality, strictly unique curriculum question based on subject, grade, and level.
 * Avoids any question in the existingQuestionContents list.
 * Adapts to targetType (e.g. short_answer, true_false, essay).
 * Enforces strict pedagogical difficulty according to educational grade.
 */
export function getCurriculumQuestion(
  subject: string,
  grade: string,
  level: string,
  seedIndex: number = 0,
  existingContents: string[] = [],
  targetType?: string
): ExamQuestion {
  const parsed = parseGrade(grade);

  // 1. Filter bank by subject
  const subjectMatches = CURRICULUM_QUESTION_BANK.filter(
    (q) => q.subject.toLowerCase() === subject.toLowerCase()
  );

  // 2. Strict grade matching first (exact grade e.g. "Lớp 10")
  let gradeMatches = subjectMatches.filter((q) => {
    const qParsed = parseGrade(q.grade);
    return qParsed.gradeNum === parsed.gradeNum;
  });

  // If no exact grade match found in bank, match by educational level category (UPPER_SEC, LOWER_SEC, PRIMARY)
  if (gradeMatches.length === 0) {
    gradeMatches = subjectMatches.filter((q) => {
      const qParsed = parseGrade(q.grade);
      return qParsed.levelCategory === parsed.levelCategory;
    });
  }

  // 3. Filter out questions that have already been used in this exam
  const unusedFromSubject = gradeMatches.filter(
    (q) => !existingContents.some((ec) => ec.trim().toLowerCase() === q.content.trim().toLowerCase())
  );

  let template: CurriculumQuestionTemplate | null = null;

  if (unusedFromSubject.length > 0) {
    const levelMatch = unusedFromSubject.filter((q) => q.level === level);
    if (levelMatch.length > 0) {
      template = levelMatch[seedIndex % levelMatch.length];
    } else {
      template = unusedFromSubject[seedIndex % unusedFromSubject.length];
    }
  }

  if (template) {
    const levelClass =
      template.level === 'Nhận biết'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : template.level === 'Thông hiểu'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : template.level === 'Vận dụng'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';

    const rawType = String(targetType || 'multiple_choice').toLowerCase();
    const isSA = rawType.includes('short') || rawType.includes('ngan');
    const isTF = rawType.includes('true') || rawType.includes('dung');
    const isEs = rawType.includes('essay') || rawType.includes('luan');

    let content = template.content;
    let options = template.options.map((o) => ({ ...o }));
    let correctAnswer = template.correctAnswer;
    let points = 0.25;

    if (isSA) {
      options = [];
      points = 0.5;
      const corrOpt = template.options.find(
        (o) => o.key.toUpperCase() === template.correctAnswer.toUpperCase() || o.isCorrect
      );
      correctAnswer = extractCleanShortAnswerValue(corrOpt?.text, template.explanation, template.correctAnswer);
      content = content.replace(/\s*Trong các phương án sau[,:]?/gi, '')
                       .replace(/\s*Chọn khẳng định đúng[:\.]?/gi, '');
    } else if (isTF) {
      points = 1.0;
      const subKeys = ['a', 'b', 'c', 'd'];
      options = subKeys.map((k, i) => {
        const opt = template.options[i];
        return {
          key: k,
          text: opt ? opt.text.replace(/^[A-D][\.\:\)]\s+/i, '') : `Mệnh đề khẳng định ý ${k}`,
          isCorrect: opt ? opt.key.toUpperCase() === template.correctAnswer.toUpperCase() : i % 2 === 0,
        };
      });
      correctAnswer = options.map((o) => `${o.key}: ${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
    } else if (isEs) {
      points = 1.5;
      options = [];
      const corrOpt = template.options.find(
        (o) => o.key.toUpperCase() === template.correctAnswer.toUpperCase() || o.isCorrect
      );
      correctAnswer = `Đáp số: ${extractCleanShortAnswerValue(corrOpt?.text, template.explanation, template.correctAnswer)}`;
    }

    return {
      id: Date.now() + seedIndex + Math.floor(Math.random() * 1000),
      order: `Câu ${String(seedIndex + 1).padStart(2, '0')}`,
      type: isSA ? 'short_answer' : isTF ? 'true_false' : isEs ? 'essay' : 'multiple_choice',
      level: template.level,
      levelClass,
      topic: `${template.subject} - ${template.topic || grade}`,
      content,
      options,
      points,
      correctAnswer,
      explanation: template.explanation,
    };
  }

  // If all bank items for this grade/subject are used, generate procedural grade-aligned variation
  return generateProceduralQuestion(subject, grade, level, seedIndex);
}


export function generateUniqueExamQuestions(
  subject: string,
  grade: string,
  totalQuestions: number,
  matrix: { easy: number; medium: number; hard: number; veryHard: number }
): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  const usedContents: string[] = [];

  const easyCount = Math.round((totalQuestions * matrix.easy) / 100);
  const mediumCount = Math.round((totalQuestions * matrix.medium) / 100);
  const hardCount = Math.round((totalQuestions * matrix.hard) / 100);

  for (let i = 0; i < totalQuestions; i++) {
    const level =
      i < easyCount
        ? 'Nhận biết'
        : i < easyCount + mediumCount
        ? 'Thông hiểu'
        : i < easyCount + mediumCount + hardCount
        ? 'Vận dụng'
        : 'Vận dụng cao';

    const q = getCurriculumQuestion(subject, grade, level, i, usedContents);
    q.id = i + 1;
    q.order = `Câu ${String(i + 1).padStart(2, '0')}`;
    usedContents.push(q.content);
    questions.push(q);
  }

  return questions;
}

/**
 * Intelligent question similarity and duplicate checker using normalized alphanumeric matching
 * and token Jaccard overlap to prevent repetitive exam questions.
 */
export function isQuestionDuplicate(newContent: string, existingList: string[]): boolean {
  if (!newContent || !newContent.trim()) return true;
  const cleanNew = newContent.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  if (cleanNew.length < 8) return true;

  for (const exist of existingList) {
    if (!exist) continue;
    const cleanExist = exist.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    if (cleanExist === cleanNew) return true;

    // Strip common generic Vietnamese math preambles
    const stripPre = (s: string) =>
      s.replace(
        /^(chohàmsố|trongkhônggianoxyz|trongkhônggian|tínhtíchphân|nguyênhàmcủa|tậpxácđịnh|phươngtrình|bấtphươngtrình|chohìnhchóp|chohìnhlăngtrụ|biết|tính|tìm)/gi,
        ''
      );

    const strippedNew = stripPre(cleanNew);
    const strippedExist = stripPre(cleanExist);

    if (strippedNew.length >= 15 && strippedExist.length >= 15) {
      if (strippedNew.slice(0, 50) === strippedExist.slice(0, 50)) {
        return true;
      }
    }

    // Token Jaccard similarity check
    const wordsA = new Set(newContent.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    const wordsB = new Set(exist.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    if (wordsA.size >= 5 && wordsB.size >= 5) {
      let common = 0;
      for (const w of wordsA) {
        if (wordsB.has(w)) common++;
      }
      const unionSize = new Set([...wordsA, ...wordsB]).size;
      if (common / unionSize >= 0.75) {
        return true;
      }
    }
  }
  return false;
}
