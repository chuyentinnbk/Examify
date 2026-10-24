/**
 * Canonical Golden Geometry SVG Templates & Parametric Builder
 * Standardized for Vietnamese National High School Examination (GDPT 2018)
 * Ensures mathematically accurate oblique projection, clean dashed/solid lines,
 * and aesthetic label placements with zero distortion or line overlapping.
 */

export type GeometryShapeType =
  | 'cube'
  | 'rectangular_box'
  | 'pyramid_triangle_sa_perp'
  | 'pyramid_triangle_regular'
  | 'pyramid_quad_sa_perp'
  | 'pyramid_quad_regular'
  | 'prism_triangle'
  | 'cone'
  | 'cylinder';

export interface CanonicalGeometryOptions {
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  highlightEdges?: string[];
  customLabels?: Record<string, string>;
}

/**
 * 1. HÌNH LẬP PHƯƠNG (CUBE) ABCD.A'B'C'D'
 * Phép chiếu trục đo xiên chuẩn SGK Việt Nam:
 * - Đáy dưới ABCD: A ở góc khuất phía sau bên trái.
 * - Đáy trên A'B'C'D': thẳng đứng trên ABCD.
 * - Tỉ lệ ngang:cao:sâu cân đối, tạo cảm giác lập phương vuông vắn 3D hoàn mỹ.
 */
export function buildCubeSvg(labels: Record<string, string> = {}): string {
  const l = {
    A_prime: labels["A'"] || "A'",
    B_prime: labels["B'"] || "B'",
    C_prime: labels["C'"] || "C'",
    D_prime: labels["D'"] || "D'",
    A: labels['A'] || 'A',
    B: labels['B'] || 'B',
    C: labels['C'] || 'C',
    D: labels['D'] || 'D',
  };

  return `<svg viewBox="0 0 300 230" width="300" height="230" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg" data-canonical-geo="cube">
  <!-- Đáy trên A'B'C'D' (toàn bộ nét liền) -->
  <polygon points="90,40 50,80 180,80 220,40" fill="none" stroke="black" stroke-width="1.5" />
  
  <!-- 3 Cạnh bên nhìn thấy (nét liền) -->
  <line x1="50" y1="80" x2="50" y2="195" stroke="black" stroke-width="1.5" />
  <line x1="180" y1="80" x2="180" y2="195" stroke="black" stroke-width="1.5" />
  <line x1="220" y1="40" x2="220" y2="155" stroke="black" stroke-width="1.5" />
  
  <!-- 2 Cạnh đáy dưới nhìn thấy (nét liền) -->
  <line x1="50" y1="195" x2="180" y2="195" stroke="black" stroke-width="1.5" />
  <line x1="180" y1="195" x2="220" y2="155" stroke="black" stroke-width="1.5" />
  
  <!-- 3 Cạnh khuất đi qua đỉnh A (nét đứt) -->
  <line x1="90" y1="40" x2="90" y2="155" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="90" y1="155" x2="50" y2="195" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="90" y1="155" x2="220" y2="155" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Nhãn đỉnh đặt chuẩn vị trí, không đè nét -->
  <text x="86" y="28" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A_prime}</text>
  <text x="30" y="78" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B_prime}</text>
  <text x="188" y="78" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C_prime}</text>
  <text x="228" y="38" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.D_prime}</text>
  <text x="98" y="150" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A}</text>
  <text x="30" y="204" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B}</text>
  <text x="186" y="204" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C}</text>
  <text x="228" y="160" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.D}</text>
</svg>`;
}

/**
 * 1B. HÌNH HỘP CHỮ NHẬT (RECTANGULAR CUBOID / BOX) ABCD.A'B'C'D'
 * Phép chiếu trục đo xiên chuẩn SGK Việt Nam:
 * - Đáy hình chữ nhật nằm ngang dài hơn chiều sâu, chiều cao tương ứng tạo khối hộp chữ nhật rõ rệt.
 * - Phân biệt hoàn toàn với hình lập phương vuông vức.
 */
export function buildRectangularBoxSvg(labels: Record<string, string> = {}): string {
  const l = {
    A_prime: labels["A'"] || "A'",
    B_prime: labels["B'"] || "B'",
    C_prime: labels["C'"] || "C'",
    D_prime: labels["D'"] || "D'",
    A: labels['A'] || 'A',
    B: labels['B'] || 'B',
    C: labels['C'] || 'C',
    D: labels['D'] || 'D',
  };

  return `<svg viewBox="0 0 320 230" width="320" height="230" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg" data-canonical-geo="rectangular_box">
  <!-- Đáy trên A'B'C'D' (toàn bộ nét liền, hình chữ nhật phối cảnh) -->
  <polygon points="85,40 40,75 205,75 250,40" fill="none" stroke="black" stroke-width="1.5" />
  
  <!-- 3 Cạnh bên nhìn thấy (nét liền) -->
  <line x1="40" y1="75" x2="40" y2="190" stroke="black" stroke-width="1.5" />
  <line x1="205" y1="75" x2="205" y2="190" stroke="black" stroke-width="1.5" />
  <line x1="250" y1="40" x2="250" y2="155" stroke="black" stroke-width="1.5" />
  
  <!-- 2 Cạnh đáy dưới nhìn thấy (nét liền) -->
  <line x1="40" y1="190" x2="205" y2="190" stroke="black" stroke-width="1.5" />
  <line x1="205" y1="190" x2="250" y2="155" stroke="black" stroke-width="1.5" />
  
  <!-- 3 Cạnh khuất đi qua đỉnh A (nét đứt) -->
  <line x1="85" y1="40" x2="85" y2="155" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="85" y1="155" x2="40" y2="190" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="85" y1="155" x2="250" y2="155" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Nhãn đỉnh đặt chuẩn vị trí, không đè nét -->
  <text x="80" y="28" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A_prime}</text>
  <text x="22" y="75" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B_prime}</text>
  <text x="214" y="75" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C_prime}</text>
  <text x="258" y="38" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.D_prime}</text>
  <text x="94" y="150" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A}</text>
  <text x="22" y="198" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B}</text>
  <text x="212" y="198" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C}</text>
  <text x="258" y="160" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.D}</text>
</svg>`;
}

/**
 * 2. HÌNH CHÓP S.ABCD (SA VUÔNG GÓC ĐÁY)
 */
export function buildPyramidQuadSaPerpSvg(labels: Record<string, string> = {}): string {
  const l = {
    S: labels['S'] || 'S',
    A: labels['A'] || 'A',
    B: labels['B'] || 'B',
    C: labels['C'] || 'C',
    D: labels['D'] || 'D',
  };

  return `<svg viewBox="0 0 300 220" width="300" height="220" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg" data-canonical-geo="pyramid_quad_sa_perp">
  <!-- Cạnh thấy (nét liền) -->
  <line x1="85" y1="35" x2="45" y2="180" stroke="black" stroke-width="1.5" />
  <line x1="85" y1="35" x2="195" y2="180" stroke="black" stroke-width="1.5" />
  <line x1="85" y1="35" x2="235" y2="135" stroke="black" stroke-width="1.5" />
  <line x1="45" y1="180" x2="195" y2="180" stroke="black" stroke-width="1.5" />
  <line x1="195" y1="180" x2="235" y2="135" stroke="black" stroke-width="1.5" />
  
  <!-- Cạnh khuất qua đỉnh A (nét đứt) -->
  <line x1="85" y1="35" x2="85" y2="135" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="85" y1="135" x2="45" y2="180" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="85" y1="135" x2="235" y2="135" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Nhãn đỉnh -->
  <text x="82" y="24" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.S}</text>
  <text x="68" y="136" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A}</text>
  <text x="28" y="188" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B}</text>
  <text x="202" y="188" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C}</text>
  <text x="242" y="138" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.D}</text>
</svg>`;
}

/**
 * 3. HÌNH CHÓP S.ABC (SA VUÔNG GÓC ĐÁY)
 */
export function buildPyramidTriangleSaPerpSvg(labels: Record<string, string> = {}): string {
  const l = {
    S: labels['S'] || 'S',
    A: labels['A'] || 'A',
    B: labels['B'] || 'B',
    C: labels['C'] || 'C',
  };

  return `<svg viewBox="0 0 300 220" width="300" height="220" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg" data-canonical-geo="pyramid_triangle_sa_perp">
  <!-- Cạnh thấy (nét liền) -->
  <line x1="90" y1="35" x2="45" y2="180" stroke="black" stroke-width="1.5" />
  <line x1="90" y1="35" x2="240" y2="180" stroke="black" stroke-width="1.5" />
  <line x1="45" y1="180" x2="240" y2="180" stroke="black" stroke-width="1.5" />
  
  <!-- Cạnh khuất qua đỉnh A (nét đứt) -->
  <line x1="90" y1="35" x2="90" y2="135" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="90" y1="135" x2="45" y2="180" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="90" y1="135" x2="240" y2="180" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Nhãn đỉnh -->
  <text x="88" y="24" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.S}</text>
  <text x="72" y="136" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A}</text>
  <text x="28" y="188" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B}</text>
  <text x="248" y="188" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C}</text>
</svg>`;
}

/**
 * 4. HÌNH LĂNG TRỤ TAM GIÁC ABC.A'B'C' (ĐỨNG)
 */
export function buildPrismTriangleSvg(labels: Record<string, string> = {}): string {
  const l = {
    A_prime: labels["A'"] || "A'",
    B_prime: labels["B'"] || "B'",
    C_prime: labels["C'"] || "C'",
    A: labels['A'] || 'A',
    B: labels['B'] || 'B',
    C: labels['C'] || 'C',
  };

  return `<svg viewBox="0 0 300 220" width="300" height="220" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg" data-canonical-geo="prism_triangle">
  <!-- Đáy trên A'B'C' (toàn bộ nét liền) -->
  <polygon points="65,55 145,35 230,55" fill="none" stroke="black" stroke-width="1.5" />
  
  <!-- 2 Cạnh bên đứng nhìn thấy (nét liền) -->
  <line x1="65" y1="55" x2="65" y2="165" stroke="black" stroke-width="1.5" />
  <line x1="230" y1="55" x2="230" y2="165" stroke="black" stroke-width="1.5" />
  
  <!-- Cạnh đáy dưới nhìn thấy (nét liền) -->
  <line x1="65" y1="165" x2="230" y2="165" stroke="black" stroke-width="1.5" />
  
  <!-- 3 Cạnh khuất qua đỉnh B phía sau (nét đứt) -->
  <line x1="145" y1="35" x2="145" y2="145" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="65" y1="165" x2="145" y2="145" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="230" y1="165" x2="145" y2="145" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Nhãn đỉnh -->
  <text x="52" y="48" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A_prime}</text>
  <text x="145" y="25" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B_prime}</text>
  <text x="238" y="48" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C_prime}</text>
  <text x="46" y="178" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A}</text>
  <text x="152" y="145" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B}</text>
  <text x="238" y="178" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.C}</text>
</svg>`;
}

/**
 * 5. KHỐI NÓN TRÒN XOAY (CONE)
 */
export function buildConeSvg(labels: Record<string, string> = {}): string {
  const l = {
    S: labels['S'] || 'S',
    O: labels['O'] || 'O',
    A: labels['A'] || 'A',
    B: labels['B'] || 'B',
  };

  return `<svg viewBox="0 0 300 220" width="300" height="220" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg" data-canonical-geo="cone">
  <!-- Đường sinh bên ngoài (nét liền) -->
  <line x1="150" y1="35" x2="60" y2="170" stroke="black" stroke-width="1.5" />
  <line x1="150" y1="35" x2="240" y2="170" stroke="black" stroke-width="1.5" />
  
  <!-- Đường cao SO và bán kính đáy OA (nét đứt) -->
  <line x1="150" y1="35" x2="150" y2="170" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="60" y1="170" x2="240" y2="170" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Cung đáy elip nửa trước (nét liền) -->
  <path d="M 60,170 A 90,24 0 0,0 240,170" fill="none" stroke="black" stroke-width="1.5" />
  <!-- Cung đáy elip nửa sau (nét đứt) -->
  <path d="M 60,170 A 90,24 0 0,1 240,170" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Nhãn -->
  <text x="146" y="24" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.S}</text>
  <text x="146" y="186" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.O}</text>
  <text x="44" y="174" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.A}</text>
  <text x="246" y="174" font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">${l.B}</text>
</svg>`;
}

/**
 * Detects if a text describes a canonical shape and returns its type
 */
export function detectCanonicalGeometryType(text: string): GeometryShapeType | null {
  const norm = text.toLowerCase();
  // 1. Phân biệt rõ ràng Hình hộp chữ nhật vs Hình lập phương
  if (norm.includes('hộp chữ nhật') || norm.includes('hhcn') || (norm.includes('hình hộp') && !norm.includes('lập phương'))) {
    return 'rectangular_box';
  }
  if (norm.includes('lập phương') || norm.includes('hlp') || norm.includes('khối lập phương')) {
    return 'cube';
  }
  if (text.includes("A'") && text.includes("B'") && text.includes("C'") && text.includes("D'") &&
      (text.includes('>A<') || text.includes('> A <') || text.includes('A</text>')) &&
      (text.includes('>B<') || text.includes('> B <') || text.includes('B</text>')) &&
      (text.includes('>C<') || text.includes('> C <') || text.includes('C</text>')) &&
      (text.includes('>D<') || text.includes('> D <') || text.includes('D</text>'))) {
    return norm.includes('hộp') ? 'rectangular_box' : 'cube';
  }
  if (text.includes("A'") && text.includes("B'") && text.includes("C'") && !text.includes("D'") &&
      (text.includes('>A<') || text.includes('> A <') || text.includes('A</text>')) &&
      (text.includes('>B<') || text.includes('> B <') || text.includes('B</text>')) &&
      (text.includes('>C<') || text.includes('> C <') || text.includes('C</text>'))) {
    return 'prism_triangle';
  }
  if (norm.includes('chóp s.abcd') || (norm.includes('s.abcd') && (norm.includes('sa vuông góc') || norm.includes('sa⊥')))) {
    return 'pyramid_quad_sa_perp';
  }
  if (norm.includes('chóp s.abc') || (norm.includes('s.abc') && (norm.includes('sa vuông góc') || norm.includes('sa⊥')))) {
    return 'pyramid_triangle_sa_perp';
  }
  if (norm.includes('lăng trụ tam giác') || norm.includes("abc.a'b'c'") || norm.includes('abc.a’b’c’')) {
    return 'prism_triangle';
  }
  if (norm.includes('hình nón') || norm.includes('khối nón')) {
    return 'cone';
  }
  return null;
}

/**
 * Post-processes question content:
 * If the question is about a canonical shape and contains an SVG with distorted/skewed coordinates,
 * replaces it with the golden canonical SVG to guarantee 100% textbook quality.
 */
export function autoCanonicalizeGeometrySvg(content: string): string {
  if (!content || !content.includes('<svg')) return content;
  if (content.includes('data-canonical-geo=')) {
    return content;
  }

  const shapeType = detectCanonicalGeometryType(content);
  if (!shapeType) return content;

  if (shapeType === 'rectangular_box') {
    return content.replace(/<svg\b[\s\S]*?<\/svg>/i, () => buildRectangularBoxSvg());
  }
  if (shapeType === 'cube') {
    return content.replace(/<svg\b[\s\S]*?<\/svg>/i, () => buildCubeSvg());
  }
  if (shapeType === 'pyramid_quad_sa_perp') {
    return content.replace(/<svg\b[\s\S]*?<\/svg>/i, () => buildPyramidQuadSaPerpSvg());
  }
  if (shapeType === 'pyramid_triangle_sa_perp') {
    return content.replace(/<svg\b[\s\S]*?<\/svg>/i, () => buildPyramidTriangleSaPerpSvg());
  }
  if (shapeType === 'prism_triangle') {
    return content.replace(/<svg\b[\s\S]*?<\/svg>/i, () => buildPrismTriangleSvg());
  }
  if (shapeType === 'cone') {
    return content.replace(/<svg\b[\s\S]*?<\/svg>/i, () => buildConeSvg());
  }

  return content;
}
