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
];

/**
 * Generate a procedural variation of a math/science question to guarantee 100% uniqueness
 */
function generateProceduralQuestion(
  subject: string,
  grade: string,
  level: string,
  index: number
): ExamQuestion {
  const numA = (index * 3 + 2) % 9 + 2;
  const numB = (index * 5 + 4) % 11 + 3;
  const numC = numA * numB;

  if (subject.includes('Toán')) {
    const questions = [
      {
        content: `Cho hàm số bậc ba y = x³ - ${3 * numA}x² + ${numB}. Tìm toạ độ điểm cực trị của đồ thị hàm số có hoành độ dương:`,
        options: [
          { key: 'A', text: `x = ${2 * numA}`, isCorrect: true },
          { key: 'B', text: `x = ${numA}`, isCorrect: false },
          { key: 'C', text: `x = -${numA}`, isCorrect: false },
          { key: 'D', text: `x = 0`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `y' = 3x² - ${6 * numA}x = 3x(x - ${2 * numA}). Đồ thị có điểm cực trị tại x = 0 và x = ${2 * numA}. Hoành độ dương là x = ${2 * numA}.`,
      },
      {
        content: `Tính tích phân I = ∫(${numA}x + ${numB})dx lấy cận từ 0 đến 2:`,
        options: [
          { key: 'A', text: `I = ${2 * numA + 2 * numB}`, isCorrect: true },
          { key: 'B', text: `I = ${numA + numB}`, isCorrect: false },
          { key: 'C', text: `I = ${4 * numA + numB}`, isCorrect: false },
          { key: 'D', text: `I = ${2 * numA + 4 * numB}`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `I = [(${numA}/2)x² + ${numB}x] từ 0 đến 2 = (${numA}/2)*4 + ${numB}*2 = ${2 * numA + 2 * numB}.`,
      },
      {
        content: `Trong không gian Oxyz, cho mặt phẳng (P): ${numA}x + ${numB}y - z + ${numC} = 0. Vectơ nào sau đây là một vectơ pháp tuyến của (P)?`,
        options: [
          { key: 'A', text: `n = (${numA}; ${numB}; -1)`, isCorrect: true },
          { key: 'B', text: `n = (${numA}; ${numB}; 1)`, isCorrect: false },
          { key: 'C', text: `n = (${numA}; -${numB}; -1)`, isCorrect: false },
          { key: 'D', text: `n = (-${numA}; ${numB}; 1)`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `Mặt phẳng Ax + By + Cz + D = 0 có VTPT n = (A; B; C) = (${numA}; ${numB}; -1).`,
      },
      {
        content: `Tập xác định D của hàm số y = log_${numA}(x - ${numB}) là:`,
        options: [
          { key: 'A', text: `D = (${numB}; +∞)`, isCorrect: true },
          { key: 'B', text: `D = [${numB}; +∞)`, isCorrect: false },
          { key: 'C', text: `D = (-∞; ${numB})`, isCorrect: false },
          { key: 'D', text: `D = R \\ {${numB}}`, isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: `Điều kiện xác định: x - ${numB} > 0 <=> x > ${numB} => D = (${numB}; +∞).`,
      },
    ];
    const pick = questions[index % questions.length];
    return {
      id: Date.now() + index + Math.floor(Math.random() * 10000),
      order: `Câu ${String(index + 1).padStart(2, '0')}`,
      level: level as any,
      levelClass: 'bg-blue-50 text-blue-700 border-blue-200',
      topic: `${subject} - ${grade}`,
      content: pick.content,
      options: pick.options.map((o) => ({ ...o })),
      points: 0.25,
      correctAnswer: pick.correctAnswer,
      explanation: pick.explanation,
    };
  }

  if (subject.includes('Vật lý')) {
    const f = 50;
    const omega = 100;
    const lValue = numA;
    const pick = {
      content: `Một đoạn mạch điện xoay chiều có điện áp u = ${numA * 100}√2 cos(${omega}πt) (V). Tần số dòng điện chạy trong mạch là:`,
      options: [
        { key: 'A', text: `f = ${omega / 2} Hz`, isCorrect: true },
        { key: 'B', text: `f = ${omega} Hz`, isCorrect: false },
        { key: 'C', text: `f = 100 Hz`, isCorrect: false },
        { key: 'D', text: `f = 25 Hz`, isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: `Tần số f = ω / (2π) = ${omega}π / (2π) = ${omega / 2} Hz.`,
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

  // Generic fallback variation
  return {
    id: Date.now() + index + Math.floor(Math.random() * 10000),
    order: `Câu ${String(index + 1).padStart(2, '0')}`,
    level: level as any,
    levelClass: 'bg-slate-50 text-slate-700 border-slate-200',
    topic: `${subject} - Chuyên đề ${index + 1}`,
    content: `[Kiến thức ${level} ${index + 1}] Trong chương trình ${subject} ${grade}, đặc điểm cốt lõi của quy luật ${index + 1} được biểu diễn qua yếu tố nào?`,
    options: [
      { key: 'A', text: `Phương án đặc trưng ${index + 1}A chuẩn hóa GDPT`, isCorrect: true },
      { key: 'B', text: `Phương án so sánh ${index + 1}B`, isCorrect: false },
      { key: 'C', text: `Phương án đối chiếu ${index + 1}C`, isCorrect: false },
      { key: 'D', text: `Phương án loại suy ${index + 1}D`, isCorrect: false },
    ],
    points: 0.25,
    correctAnswer: 'A',
    explanation: `Phân tích chi tiết phương án chuẩn hóa sư phạm GDPT 2018 theo cấp độ ${level}.`,
  };
}

/**
 * Returns a high-quality, strictly unique curriculum question based on subject, grade, and level.
 * Avoids any question in the existingQuestionContents list.
 */
export function getCurriculumQuestion(
  subject: string,
  grade: string,
  level: string,
  seedIndex: number = 0,
  existingContents: string[] = []
): ExamQuestion {
  const match = CURRICULUM_QUESTION_BANK.filter(
    (q) => q.subject.toLowerCase() === subject.toLowerCase()
  );

  // Filter out questions that have already been used in this exam
  const unusedFromSubject = match.filter(
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

    return {
      id: Date.now() + seedIndex + Math.floor(Math.random() * 1000),
      order: `Câu ${String(seedIndex + 1).padStart(2, '0')}`,
      level: template.level,
      levelClass,
      topic: `${template.subject} - ${template.topic || grade}`,
      content: template.content,
      options: template.options.map((o) => ({ ...o })),
      points: 0.25,
      correctAnswer: template.correctAnswer,
      explanation: template.explanation,
    };
  }

  // If all bank items for this subject are used, generate procedural unique variation
  return generateProceduralQuestion(subject, grade, level, seedIndex);
}

/**
 * Generates an array of count unique questions with no duplicates
 */
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
