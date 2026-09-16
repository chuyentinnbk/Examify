---
name: Intelligent Exam & Assessment Studio
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#003a46'
  on-tertiary: '#ffffff'
  tertiary-container: '#005362'
  on-tertiary-container: '#3cccea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Be Vietnam Pro
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The platform embodies academic authority, cognitive clarity, and algorithmic precision. Designed specifically for educational administrators, curriculum directors, and classroom teachers, the visual ethos departs from playful consumer EdTech and firmly adopts an enterprise-grade, institutional SaaS demeanor.

Key aesthetic characteristics:
- **Tone:** Methodical, trustworthy, empowering, and focused.
- **Visual Style:** Modern Functionalist with Tonal Layering. It leverages clean content cards, precision hairline borders, structural micro-grids, and vibrant algorithmic indicators (Cyan for generative AI actions, Emerald for validation and standard mastery).
- **Cognitive Ergonomics:** High data-density interfaces (matrix tables, test item banks, multi-tier question builders) balanced by rhythmic whitespace and clean focal points to eliminate grading and authoring fatigue.

## Colors

The palette establishes institutional trust while distinguishing manual administrative tasks from automated AI assistance:

- **Primary (`#1E40AF` - Royal Indigo):** Anchors primary commands, active navigation landmarks, primary action buttons, and active tabs.
- **Secondary (`#0F172A` - Slate Navy):** High-contrast structural foundation applied to deep header regions, side navigation drawers, master headings, and high-priority metrics.
- **Tertiary (`#06B6D4` - Cyber Cyan):** Reserved for generative AI tools, instant prompt generation, auto-balancing algorithms, and predictive test difficulty diagnostics.
- **Semantic Accent (`#10B981` - Emerald Matrix):** Validated states, verified scoring keys, curriculum compliance confirmation, and passing metrics.
- **Neutral & Surface Ecosystem:** 
  - Canvas Base: `#F8FAFC` (Slate 50) delivers an easy-on-the-eyes backdrop.
  - Card & Modal Surfaces: `#FFFFFF` pure white for maximum legibility.
  - Subdued Borders: `#E2E8F0` (Slate 200) for surgical sectioning without visual noise.
  - Body Text: `#1E293B` (Slate 800) with secondary meta at `#64748B` (Slate 500).

## Typography

**Be Vietnam Pro** is selected as the unified typeface across all display, body, and label roles. Crafted specifically with Vietnamese diacritics in mind, it provides pristine optical balance, preventing line-height clipping and uneven vertical rhythm when rendering complex mathematical and Vietnamese phrasing.

- **Headlines:** Clean, geometric, and authoritative without feeling cold. Rendered in Slate Navy (`#0F172A`) for effortless scanning.
- **Body:** Open counters and generous apertures preserve legibility across complex multi-line assessment prompts, LaTeX formulas, and multiple-choice options.
- **Labels & Tags:** Medium and Semi-bold weights maintain crisp readability at small scales (11px–13px) in dense data tables and difficulty indicators.

## Layout & Spacing

The design system employs a structured 12-column responsive layout built for complex multi-pane workspaces:

- **Workplace Grid:** 
  - Desktop (1200px+): Left persistent sidebar (260px), 12-column fluid workbench with `gutter: 1.5rem` and outer `margin: 2rem`. Split-screen view is standard: Left 7 columns for exam structure/matrix, Right 5 columns for AI generation & prompt tuning.
  - Tablet (768px - 1199px): Collapsible icon-rail navigation, 8-column layout with `1rem` gutters.
  - Mobile (<768px): Single-column stacked canvas, `gutter-mobile: 0.75rem`, `margin-mobile: 1rem`. Panels transform into full-height bottom-sheets.
- **Rhythm:** Multiples of `0.25rem` (4px baseline). Form fields, test-item cards, and analytics tiles conform strictly to internal padding scales (`space-md` for standard cards, `space-sm` for question item blocks).

## Elevation & Depth

Visual hierarchy combines low-contrast borders with subtle, cool-tinted ambient shadows to provide deep contextual focus without distracting glare:

- **Base Layer (Flat):** Outer workspace canvas (`#F8FAFC`). No shadow.
- **Level 1 (Card & Content Blocks):** Pure white background (`#FFFFFF`), single-pixel hairline border in `#E2E8F0`, and ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Hover & Active Exam Items):** Elevates questions during reordering or direct editing: hairline border shifts to `#CBD5E1`, with shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (AI Tooltips, Popovers & Context Menus):** `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`.
- **Level 4 (Modals & Exam Preview Overlay):** Backdrop blur `backdrop-blur-sm` paired with `0 20px 25px -5px rgba(15, 23, 42, 0.12)`.

## Shapes

The design system standardizes on `roundedness: 2` (base radius of `0.5rem` / 8px). This creates an approachable yet disciplined enterprise feel.

- **Micro-elements (Inputs, Buttons, Dropdowns):** `0.5rem` (8px) radius for consistency and precision touch targets.
- **Structural Containers (Cards, Modals, Flyouts):** `rounded-lg` (`1rem` / 16px) for major outer frames, housing cleanly sectioned internal lists.
- **Tags, Badges & AI Action Triggers:** Fully pill-shaped (`9999px`) to immediately signal categorical or interactive metadata.

## Components

### Buttons & Interactive CTAs
- **Primary Action:** Solid `#1E40AF` background, `#FFFFFF` text, `0.5rem` border radius, high-contrast hover `#1D4ED8`.
- **AI Assist Action:** Gradient accent or bordered `#06B6D4` with 10% tint fill (`#ECFEFF`), cyan icon spark prefix, transitioning to bold cyan glow on hover.
- **Secondary / Neutral:** `#FFFFFF` fill with `1px solid #E2E8F0`, `#0F172A` text, hover tint `#F1F5F9`.

### Chips & Pill Tags
- **Curriculum & Subject Tags:** Pill-shaped, subtle slate fill (`#F1F5F9`), `#334155` text, `0.25rem 0.75rem` padding.
- **AI Difficulty Indicators:** 
  - *Dễ (Easy):* `#ECFDF5` background, `#059669` text.
  - *Trung bình (Medium):* `#EFF6FF` background, `#2563EB` text.
  - *Vận dụng cao (Advanced):* `#FEF2F2` background, `#DC2626` text.

### Form Inputs & Formula Fields
- **Input Fields:** Crisp 40px height, `#FFFFFF` surface, `1px solid #CBD5E1` border, 8px radius. Active focus switches outline to a 2px outer ring of `#1E40AF` with zero interior color bleeding. Placeholder text in `#94A3B8`.
- **Exam Question Textarea:** Auto-expanding, monospaced-ready formula toggle button fixed in the top right utility toolbar.

### Data Tables & Exam Blueprints (Ma Trận Đề Thi)
- **Header:** Sticky `#F8FAFC` row, `label-sm` uppercase text in `#64748B`, discrete bottom border `1px solid #E2E8F0`.
- **Cells:** Vertical padding of `0.75rem`, clear numerical alignment, alternating rows on data-dense matrix screens.

### Question Item Card (Thẻ Câu Hỏi)
- **Structure:** Level 1 elevation, white container with left-hand drag indicator, clear order pill (e.g., "Câu 01"), multiple-choice options in 2x2 or 1x4 list layouts, and a dedicated AI explanation accordion at the footer.