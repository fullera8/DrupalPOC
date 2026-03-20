# Page Functionality

**[METADATA_SCHEMA_VERSION: 1.1] [PURPOSE: Technical_Deep_Dive] [TARGET_AUDIENCE: Developers] [RESPONDS_TO: Definition_Explanation, Implementation_How-To]**

This document provides a UI/UX and technical overview of each page in the Angular frontend. It is designed for a web developer onboarding to the project — giving enough business and technical context to begin contributing immediately.

---

## Application Shell

**[SECTION_METADATA: CONCEPTS=Angular_Material,Navigation,Routing | DIFFICULTY=Beginner]**

The app uses a **Material Design** shell (`mat-sidenav-container`) with a persistent side-navigation drawer and a top toolbar branded with the UTSA logo and "Security Training" title.

**Layout:**
- **Toolbar** — Fixed top bar with a hamburger toggle, UTSA logo (32px), and application title "Security Training".
- **Sidenav** — Always-open side drawer with five navigation links (icon + label):

| Nav Item | Route | Icon | Component |
| :--- | :--- | :--- | :--- |
| Home | `/home` | `home` | `HomeComponent` |
| Dashboard | `/dashboard` | `dashboard` | `DashboardComponent` |
| Training Modules | `/modules` | `school` | `ModulesComponent` |
| Quiz | `/quiz` | `quiz` | `QuizComponent` |
| Simulation Results | `/results` | `assessment` | `ResultsComponent` |

- **Content Area** — A padded `<router-outlet>` that renders the active page.

**Routing:** The root path (`/`) redirects to `/home`. Module Detail is accessed at `/modules/:id` (no direct nav entry — navigated to from the Modules list).

**Screenshot reference:** All screenshots share this consistent shell layout.

---

## 0. Home (`/home`)

**[SECTION_METADATA: CONCEPTS=Landing_Page,UTSA_Branding,KPI,Live_Data,Marketing | DIFFICULTY=Beginner-Intermediate | RESPONDS_TO: Definition_Explanation]**

### Business Purpose

The Home page is the marketing-quality landing page and first impression of the application. It communicates the platform's value proposition, provides quick navigation to key areas, and displays live KPI data. It is branded with **UTSA colors** (Orange `#F15A22`, Midnight Navy `#032044`) and **Montserrat + Roboto** typography.

### UI Layout

The page has five sections stacked vertically:

**1. Hero Section** — Full-width campus backdrop image (`UTSA_Backdrop.png`) with a dark gradient overlay (`rgba(3, 32, 68, 0.72)` → `rgba(3, 32, 68, 0.88)`). Content centered:
- UTSA logo (rendered as-is against dark hero overlay)
- Headline: *"Protect Our Campus — Security Awareness Starts Here"* — Montserrat 700, white, 2.6rem
- Subtitle: *"Empowering UT San Antonio faculty, staff, and students..."* — Roboto 300, white
- Two CTA buttons:
  - **"View Dashboard"** — `mat-raised-button`, UTSA Orange `#F15A22`, routes to `/dashboard`
  - **"Start Training"** — `mat-stroked-button`, white border, routes to `/modules`

**2. Value Proposition Cards** — Limestone `#F8F4F1` background, section title *"Why Security Awareness Matters"*. A responsive 4-column CSS Grid of `mat-card` elements:

| Card | Icon | Title |
| :--- | :--- | :--- |
| 1 | `phishing` | Phishing Awareness Training |
| 2 | `science` | Simulation-Based Learning |
| 3 | `analytics` | Analytics & Compliance |
| 4 | `school` | Academic Integration |

Each card: centered icon (48px, UTSA Orange), title (Montserrat 600, Navy), description paragraph (Roboto 400).

**3. Training Pathways** — White background, section title *"Training Pathways"* with subtitle. A responsive 2×2 CSS Grid of clickable `mat-card` tiles:

| Tile | Icon | Title | Route |
| :--- | :--- | :--- | :--- |
| 1 | `shield` | Foundations of Phishing Awareness | `/modules` |
| 2 | `psychology` | Advanced Social Engineering | `/modules` |
| 3 | `bar_chart` | Executive Reporting & Analytics | `/results` |
| 4 | `groups` | Faculty & Staff Training Paths | `/modules` |

Each tile has a hover effect (`translateY(-2px)` + `box-shadow`), an "Explore →" link in UTSA Orange, and the entire card is clickable via `[routerLink]`.

**4. KPI Row (Live Data)** — Midnight Navy `#032044` background, section title *"Program at a Glance"* (white). Displays a loading spinner while APIs resolve, then 4 KPI stat blocks:

| KPI | Value | Label |
| :--- | :--- | :--- |
| Quiz Attempts | `{{ totalQuizAttempts }}` | Quiz Attempts |
| Quiz Pass Rate | `{{ quizPassRate }}%` | Quiz Pass Rate |
| Phishing Campaigns | `{{ totalCampaigns }}` | Phishing Campaigns |
| Phish Click Rate | `{{ phishClickRate }}%` | Phish Click Rate |

Style: Large values (3rem, Montserrat 700, white), smaller labels (Roboto 400, `rgba(255,255,255,0.8)`).

**5. Footer** — Athletics Navy `#0C2340` background. Four placeholder links (About, Privacy, Documentation, Contact), attribution line, and copyright.

### Data Flow

1. `ApiService.getScores()` and `GophishService.getCampaigns()` fire in parallel on `ngOnInit`.
2. A `dataReady` counter tracks completion. When both resolve (success or error), KPIs are computed and `loading = false`.
3. `ChangeDetectorRef.detectChanges()` is called after async resolution.
4. KPI computation uses the same logic as `DashboardComponent`: pass rate = scores >= 80, click rate = status `'Clicked Link'` or `'Submitted Data'`.

### Technical Notes

- **Standalone component** with inline template and inline styles, matching all other page components.
- **UTSA brand assets** (`UTSA_Backdrop.png`, `UTSA_logo.png`) served from `public/images/`.
- **Fonts:** Montserrat (Google Fonts) added to `index.html` for headlines. Roboto was already present for body text.
- **Graceful degradation:** If APIs fail, KPI values show 0 — the page still renders fully.
- **Responsive:** CSS Grid `auto-fit` / `minmax` for card/tile grids. Media queries at 768px and 480px adjust hero text size and padding.

---

## 1. Dashboard (`/dashboard`)

**[SECTION_METADATA: CONCEPTS=Chart.js,KPI,Analytics,Dashboard | DIFFICULTY=Beginner-Intermediate | RESPONDS_TO: Definition_Explanation]**

**Screenshot:** `Drupal_Dashboard.png`

### Business Purpose

The Dashboard is the landing page and executive summary. It answers the question: *"At a glance, how is our security training program performing?"* Compliance officers and managers use this page to assess quiz completion rates and phishing simulation effectiveness.

### UI Layout

The page has three visual sections stacked vertically:

**Branded Header Bar** — Full-width Midnight Navy `#032044` background. Contains:
- **Title:** *"Compliance Dashboard"* — Montserrat 700, white, 1.8rem
- **Subtitle:** *"Security Training Program Performance"* — Roboto 300, `rgba(255,255,255,0.7)`, 1rem

**KPI "At a Glance" Section** — Continuous Midnight Navy `#032044` background (shared with header). A responsive 4-column grid of stat blocks, each with a thin white border outline (`1px solid rgba(255,255,255,0.2)`), 12px border-radius, and transparent background:

| KPI | Icon | Data Source | Calculation |
| :--- | :--- | :--- | :--- |
| Quiz Attempts | `quiz` (24px, white) | .NET API `GET /api/scores` | Count of all `SimulationResult` records |
| Quiz Pass Rate | `check_circle` (24px, white) | .NET API `GET /api/scores` | % of scores >= 80 |
| Phishing Campaigns | `campaign` (24px, white) | GoPhish API `GET /api/campaigns` | Count of all campaigns |
| Phish Click Rate | `warning` (24px, white) | GoPhish API `GET /api/campaigns` | % of targets who clicked link or submitted data |

Stat values: UTSA Orange `#F15A22`, Montserrat 700, 2.5rem. Labels: white, uppercase, Roboto 400, 0.85rem, letter-spacing 0.5px.

**Charts Section** — Limestone `#F8F4F1` background, below the navy block. A responsive 2-column grid of `mat-card` elements (white, 12px border-radius, subtle shadow `0 2px 8px rgba(0,0,0,0.08)`). Card titles: Montserrat 600, Navy `#032044`, 1.1rem.

| Chart | Type | UTSA Color Scheme |
| :--- | :--- | :--- |
| Quiz Score Distribution | Bar chart | Smoke `#D5CFC8` → River Mist `#C8DCFF` → Athletics Navy `#0C2340` → Midnight Navy `#032044` → UTSA Orange `#F15A22` (5 buckets: 0-20% through 81-100%) |
| Phishing Campaign Results | Pie chart | Sending = River Mist `#C8DCFF`, Email Sent = Smoke `#D5CFC8`, Email Opened = Concrete `#EBE6E2`, Clicked Link = UTSA Orange `#F15A22`, Submitted Data = Midnight Navy `#032044` |

### Technical Notes

- **UTSA Brand Consistency:** The Dashboard uses the same Montserrat + Roboto font pairing, UTSA Orange `#F15A22`, and Midnight Navy `#032044` as the Home page, establishing a cohesive design system across the application.
- **Edge-to-edge layout:** The component uses `margin: -24px` on `.dashboard-container` to negate the app shell's content-area padding, allowing the navy background to extend to the edges.
- **Loading spinner:** Renders on the navy background with UTSA Orange stroke color (`::ng-deep` override on `mat-mdc-progress-spinner circle`).
- **Data loading:** Both API calls (`getScores` and `getCampaigns`) fire in parallel on `ngOnInit`. A counter tracks completion; once both resolve (success or error), the loading spinner hides and charts render.
- **Chart rendering:** Chart.js `registerables` are registered globally. Charts are created in a `setTimeout` after `loading=false` to ensure the `*ngIf` has added the `<canvas>` elements to the DOM. Chart.js axis labels and legend use Roboto font family.
- **Responsive:** Three breakpoints — desktop (4-col KPI, 2-col charts), tablet ≤768px (2-col KPI, 1-col charts, header title 1.4rem, stat values 2rem), mobile ≤480px (1-col KPI, 1-col charts).

---

## 2. Training Modules (`/modules`)

**[SECTION_METADATA: CONCEPTS=Drupal_JSON_API,Training_Content,Accordion | DIFFICULTY=Beginner | RESPONDS_TO: Definition_Explanation]**

**Screenshot:** `Drupal_Training.png`

> **Branding status (Mar 20, 2026):** This page now uses the UTSA brand design system (Montserrat + Roboto fonts, Orange/Navy/Limestone palette). See below for Pluralsight-inspired split layout details.

### Business Purpose

This is the training catalog. Employees browse available security awareness modules organized by category (e.g., "Phishing Basics," "Social Engineering"). The goal is to guide users to relevant video-based training before they take the quiz.

### UI Layout

The page uses a **Pluralsight-inspired split layout** with a branded header bar, hero placeholder, and dark sidebar:

**1. Header Bar** — Full-width Midnight Navy `#032044` background with `margin: -24px` edge-to-edge reset.
- Title: *"Training Modules"* — Montserrat 700, white, 1.8rem
- Subtitle: *"Security Awareness Curriculum"* — Roboto 300, `rgba(255,255,255,0.7)`

**2. Split Layout** — CSS Grid with `grid-template-columns: 1fr 380px`:
- **Left — Hero Panel:** Athletics Navy `#0C2340` background, centered large orange `play_circle` icon (80px, `#F15A22`), subtitle text *"Select a module to begin"*. `min-height: 400px`.
- **Right — Sidebar Panel:** Midnight Navy `#032044` background, contains the accordion.

**3. Sidebar Accordion** — Dark-themed `mat-expansion-panel` list:
- Panel backgrounds: transparent on navy. Headers: white Montserrat 600 text, white folder icon, pill count badge (`rgba(255,255,255,0.3)` background).
- First section expanded, others collapsed (`[expanded]="i === 0"`).
- Each module item displays:
  - **Numbered orange circle badge** — UTSA Orange `#F15A22`, Montserrat 700, 28px circle (replaces old `play_circle` icon)
  - Module title — white, Roboto 400
  - **Difficulty chip** — Color-coded: Beginner = green (`#c8e6c9`), Intermediate = yellow (`#fff9c4`), Advanced = red (`#ffcdd2`), dark text `#333`
  - **Duration chip** — `rgba(255,255,255,0.2)` background, white text
- Hover state: `rgba(255,255,255,0.08)` background

**4. Loading State** — UTSA Orange spinner on Athletics Navy `#0C2340` background.

**5. Responsive** — At ≤768px, split layout stacks vertically (hero on top, sidebar below, hero min-height 200px). At ≤480px, title shrinks to 1.4rem.

### Data Flow

1. `DrupalService.getTrainingModules()` calls Drupal JSON:API at `/jsonapi/node/training_module?include=field_category`.
2. Response is mapped to `TrainingModule[]` objects via `mapModule()`. The mapping handles Drupal JSON:API field types:
   - **Link fields** (`field_video_url`) return `{ uri, title, options }` → extracted via `?.uri` fallback
   - **Formatted text fields** (`field_description`) return `{ value, format, processed }` → extracted via `?.value` fallback
   - **Entity reference fields** (`field_category`) return `data` as an array `[{type, id}]` → unwrapped via `Array.isArray()` before resolving against `included` sideload
3. The component groups modules into `{ category, modules[] }` using a `Map` and renders one accordion panel per group.

### Technical Notes

- **Content is CMS-driven.** Module titles, descriptions, video URLs, difficulty, duration, and categories are all managed in Drupal as `training_module` content type fields. No hardcoded training data exists in Angular.
- **JSON:API field type gotcha:** Drupal JSON:API returns structured objects for Link, formatted text, and multi-value entity reference fields — not plain strings. The `mapModule()` method in `drupal.service.ts` uses optional chaining (`?.uri`, `?.value`) and `Array.isArray()` to safely extract scalar values. This was a bug discovered during integration testing (Mar 20, 2026). See ChatLog: [Drupal JSON:API Field Mapping Bugfixes](ChatLog#drupal-jsonapi-field-mapping-bugfixes-mar-20-2026) for the full field-type reference table.
- **Navigation:** Clicking a module navigates to `/modules/:id` using `routerLink`, passing the Drupal UUID.

---

## 3. Module Detail (`/modules/:id`)

**[SECTION_METADATA: CONCEPTS=Video_Embed,Drupal_JSON_API,Content_Detail | DIFFICULTY=Beginner-Intermediate | RESPONDS_TO: Definition_Explanation]**

> **Branding status (Mar 20, 2026):** This page now uses the UTSA brand design system (Montserrat + Roboto fonts, Orange/Navy/Limestone palette). See below for branded header, video frame, and description card details.

### Business Purpose

This is the training consumption page. An employee watches a video lesson and reads the module description. It is the primary learning experience before taking the quiz.

### UI Layout

**1. Header Bar** — Full-width Midnight Navy `#032044` background with `margin: -24px` edge-to-edge reset.
- **Back Link:** Orange `#F15A22` text, Montserrat 600, `arrow_back` icon — links to `/modules`. Positioned top-left inside the header.
- **Title:** `{{ mod.title }}` — Montserrat 700, white, 1.8rem
- **Subtitle:** `{{ mod.category }}` — Roboto 300, `rgba(255,255,255,0.7)`

**2. Content Area** — Limestone `#F8F4F1` background with `padding: 24px`.

**3. Metadata Chips** — A chip set with:
  - **Difficulty chip** — Color-coded (same green/yellow/red scheme), dark text `#333`
  - **Duration chip** — Concrete `#EBE6E2` background, Navy `#032044` text and icon
  - **Category chip** — Concrete `#EBE6E2` background, Navy `#032044` text and icon

**4. Video Frame** — Athletics Navy `#0C2340` outer frame with `padding: 16px`, `border-radius: 12px`, `box-shadow: 0 4px 16px rgba(0,0,0,0.12)`. Inner iframe retains responsive 16:9 ratio with `border-radius: 12px`.

**5. Description Card** — White `#FFFFFF` background, Concrete `#EBE6E2` border, `border-radius: 12px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`.
- Title: *"About This Module"* — Montserrat 600, Navy `#032044`, 1.1rem
- Body: `{{ mod.description }}` — Roboto 400, Navy `#032044`

**6. Loading State** — UTSA Orange spinner on Limestone background.

**7. Responsive** — At ≤768px, reduced header and content padding, smaller video frame padding. At ≤480px, title shrinks to 1.4rem.

### Data Flow

1. The route parameter `:id` (a Drupal UUID) is read from `ActivatedRoute`.
2. `DrupalService.getTrainingModule(id)` fetches a single node with its category included. The `mapModule()` method extracts `.uri` from the Link field, `.value` from the formatted text field, and unwraps the category array — see Modules data flow for details.
3. If the module has a `videoUrl`, it is converted to an embed URL via `toEmbedUrl()` and sanitized via `DomSanitizer.bypassSecurityTrustResourceUrl()`.

### Video URL Conversion

The `toEmbedUrl()` method handles two providers:

| Input Pattern | Output |
| :--- | :--- |
| `youtube.com/watch?v=ABC` or `youtu.be/ABC` | `https://www.youtube.com/embed/ABC` |
| `vimeo.com/123456` | `https://player.vimeo.com/video/123456` |
| Any other URL | Passed through unchanged |

---

## 4. Quiz (`/quiz`)

**[SECTION_METADATA: CONCEPTS=Drupal_Webform,Quiz_Scoring,API_Integration | DIFFICULTY=Intermediate | RESPONDS_TO: Definition_Explanation, Implementation_How-To]**

**Screenshot:** `Drupal_Quiz.png`

### Business Purpose

The Quiz page is a graded assessment that tests the employee's phishing awareness knowledge after completing training. Scores are recorded and surfaced on the Dashboard and Results pages. A pass threshold of **80%** determines compliance.

### UI Layout

The page has three visual sections stacked vertically, matching the UTSA brand design system established by the Home page and Dashboard:

**Branded Header Bar** — Full-width Midnight Navy `#032044` background. Contains:
- **Title:** *"Phishing Awareness Quiz"* — Montserrat 700, white, 1.8rem
- **Subtitle:** *"Test Your Security Awareness Knowledge"* — Roboto 300, `rgba(255,255,255,0.7)`, 1rem

**Content Area (Pre-Submission)** — Limestone `#F8F4F1` background. Contains:

- **Info Banner** — A branded callout card with Limestone `#F8F4F1` background, UTSA Orange left border (`4px solid #F15A22`), 8px border-radius. `school` icon in Midnight Navy `#032044`. Explains that the quiz is authored in Drupal Webforms and rendered dynamically via the `webform_rest` API.
- **Question Cards** — One `mat-card` per question, white background with Concrete border (`1px solid #EBE6E2`), 12px border-radius, generous padding. Each card shows:
  - **Orange number badge** — UTSA Orange `#F15A22` pill (28px circle, Montserrat 700, white text) displaying the question number (1, 2, 3, etc.)
  - **Question title** — Montserrat 600, Midnight Navy `#032044`
  - A "Required" chip — transparent background with navy border (`1px solid #032044`)
  - **Radio buttons** (`mat-radio-group`) for multiple-choice questions with increased spacing (12px between options)
  - Supports `radios`, `select`, `checkboxes`, and `textfield`/`textarea` types
- **Submit Button** — UTSA Orange `#F15A22` background, white text, Montserrat 600, 8px border-radius. Disabled until all required questions are answered. Shows an italic hint in Smoke `#D5CFC8`: "Answer all questions to submit."

**Content Area (Post-Submission)** — Same Limestone background. Additional elements:

- **Pass Banner** — Warm light orange `#FFF3E0` background with UTSA Orange left border (`4px solid #F15A22`), 12px border-radius. `check_circle` icon in UTSA Orange. Score text: Montserrat 600, Navy `#032044`. "Passed!" text: UTSA Orange, bold.
- **Fail Banner** — Midnight Navy `#032044` background, 12px border-radius. `cancel` icon in UTSA Orange `#F15A22`. Score text: white. "Please review..." text: `rgba(255,255,255,0.8)`.
- **Question Cards** — Each card gains a colored left border:
  - Green border (`#4caf50`) + "Correct" chip (`#c8e6c9`) for right answers
  - Red border (`#f44336`) + "Incorrect" chip (`#ffcdd2`) for wrong answers
- **Radio buttons become disabled** (read-only review mode).
- **Retake Button** — Outlined orange style (`2px solid #F15A22`, transparent background, orange text), Montserrat 600, 8px border-radius. Replaces the submit button.
- **Snack Bar** — A Material snackbar confirms score was saved (or warns if the .NET API was unreachable).

### Data Flow

1. **Load:** `DrupalService.getQuizFields('phishing_awareness_quiz')` fetches field definitions from Drupal's `webform_rest` module at `/webform_rest/phishing_awareness_quiz/fields?_format=json`.
2. **Parse:** The `parseFields()` method converts raw webform field objects into a `QuizQuestion[]` array (key, title, type, required, options).
3. **Grade:** Answers are checked client-side against a hardcoded `ANSWER_KEY` (Q1=c, Q2=c, Q3=b, Q4=b, Q5=b). The score percentage is `(correct / total) * 100`.
4. **Save:** `ApiService.postResult()` sends the score to the .NET API at `POST /api/results` with payload `{ userId, campaignId, score, completedAt }`.
5. **Reset:** `resetQuiz()` clears all answers and state, allowing unlimited retakes.

### Technical Notes

- **UTSA Brand Consistency:** The Quiz page uses the same Montserrat + Roboto font pairing, UTSA Orange `#F15A22`, Midnight Navy `#032044`, and Limestone `#F8F4F1` as the other branded pages, completing the cohesive design system across all six branded pages (Home, Dashboard, Quiz, Modules, Module Detail, Results).
- **Edge-to-edge layout:** The component uses `margin: -24px` on `.quiz-container` to negate the app shell's content-area padding, allowing the navy header to extend to the edges.
- **Loading spinner:** Renders on the Limestone content area with UTSA Orange stroke color (`::ng-deep` override on `mat-mdc-progress-spinner circle`).
- **Questions are CMS-driven.** The quiz structure (questions, options, types) is authored in Drupal Webforms — the Angular app renders whatever fields the API returns. Adding or changing questions requires no Angular code change.
- **Answer key is hardcoded.** The current answer key matches the seed script `create_quiz_webform.php`. If questions change in Drupal, the answer key in the component must be updated to match.
- **Graceful degradation:** If the .NET API is down, the score is still calculated and displayed — only the persistence fails (with a warning snackbar).
- **Responsive:** Two breakpoints — tablet ≤768px (header title 1.4rem, content padding 16px), mobile ≤480px (header padding reduced, buttons stack vertically).
- **Correct/Incorrect feedback:** Green/red left borders and chips are intentionally kept as functional feedback indicators (not branded) for universal comprehension.

---

## 5. Simulation Results (`/results`)

**[SECTION_METADATA: CONCEPTS=Data_Tables,GoPhish_Campaigns,Score_Tracking,UTSA_Branding | DIFFICULTY=Intermediate | RESPONDS_TO: Definition_Explanation]**

**Screenshots:** `Drupal_QuizScores.png`, `Drupal_PhishingScores.png`

> **Branding status:** ✅ UTSA-branded (Mar 20, 2026). This page follows the same design system as Home, Dashboard, Quiz, and Modules: Montserrat + Roboto fonts, Orange/Navy/Limestone palette, navy header block, orange KPI values.

### Business Purpose

The Results page is the detailed reporting view. While the Dashboard shows high-level KPIs, this page lets administrators drill into individual quiz attempts and phishing campaign target-level data. It answers: *"Who took the quiz and how did they score?"* and *"Which employees clicked the phishing link?"*

### UI Layout

The page uses a **branded header block** (Midnight Navy `#032044`) containing the page title, subtitle, and a Material tab group with an orange active-tab indicator on a navy background. Tab content renders on a Limestone `#F8F4F1` background.

#### Branded Header

- **Title:** "Simulation Results" — Montserrat 700, white, 1.8rem
- **Subtitle:** "Quiz Scores & Phishing Campaign Analytics" — Roboto 300, `rgba(255,255,255,0.7)`, 1rem
- **Tab labels:** White (Montserrat 600, 0.9rem), inactive tabs `rgba(255,255,255,0.6)`, active tab has UTSA Orange `#F15A22` underline indicator
- **Layout:** Edge-to-edge (`margin: -24px`) to negate the app shell's content padding

#### Tab 1: Quiz Scores

- **KPI Summary Row** — Athletics Navy `#0C2340` background, 3-column grid, each stat in a thin white-bordered card (12px radius):

| Stat | Value Style | Label Style |
| :--- | :--- | :--- |
| Total Attempts | Orange `#F15A22`, Montserrat 700, 2.5rem | White, Roboto 400, uppercase, 0.85rem |
| Average Score | Orange `#F15A22`, Montserrat 700, 2.5rem | White, Roboto 400, uppercase, 0.85rem |
| Pass Rate (≥80%) | Orange `#F15A22`, Montserrat 700, 2.5rem | White, Roboto 400, uppercase, 0.85rem |

- **Results Table** — White card wrapper (12px radius, Concrete `#EBE6E2` border, subtle shadow), Concrete header row, Montserrat 600 uppercase header text, Roboto 400 body cells, Limestone hover:

| Column | Content |
| :--- | :--- |
| User | `userId` (currently "demo-user") |
| Campaign / Quiz | `campaignId` (e.g., "phishing_awareness_quiz") |
| Score | Percentage with pill-shaped pass/fail chip (green ≥80%, red <80%) |
| Completed | Formatted date/time |

- **Empty State** — Limestone background card with Concrete left border, inbox icon with "No results yet. Complete a quiz to see scores here."
- **Refresh Button** — Orange `#F15A22` outlined style (2px border, Montserrat 600), bottom-right.

#### Tab 2: Phishing Campaigns

- **Campaign Cards** — White cards (12px radius, Concrete border, subtle shadow), padding 24px, each showing:
  - **Campaign title:** Montserrat 600, Midnight Navy `#032044`, 1.2rem
  - **Status chip:** Pill-shaped (16px radius), semantic colors retained (orange/green/blue/yellow/amber/red)
  - **Launch date:** Roboto 400, `rgba(0,0,0,0.54)`, 0.9rem
  - **Summary Stats Grid** — 5-column grid: Targets, Emails Sent, Opened, Clicked Link, Submitted Data. Values: UTSA Orange `#F15A22`, Montserrat 700, 1.5rem. Labels: Midnight Navy `#032044`, Roboto 400, uppercase, 0.75rem.
  - **Target Table** — Same branded styling as Quiz tab table (Concrete header, row hover, branded fonts)

- **Status Chip Colors:**

| Status | Color |
| :--- | :--- |
| Sending / In Progress | Orange `#fff3e0` |
| Email Sent | Blue `#e3f2fd` |
| Email Opened | Yellow `#fff9c4` |
| Clicked Link | Amber `#ffe0b2` |
| Submitted Data | Red `#ffcdd2` |
| Completed | Green `#c8e6c9` |

- **Empty State** — Limestone background with Concrete left border. "No phishing campaigns found. Seed GoPhish to see campaigns here."
- **Error State** — Limestone background with red left border.
- **Refresh Button** — Same orange outlined style as Quiz tab.

### Technical Notes

- **Edge-to-edge layout:** `.results-container { margin: -24px; }` — same pattern used by Dashboard, Quiz, Modules.
- **Tab styling via `::ng-deep`:** Overrides Material tab label colors, indicator color, and header border to match the navy header block.
- **Differentiated stat grids:** Quiz summary uses `.summary-stats` (3 columns, larger values on navy). Campaign uses `.campaign-stats` (5 columns, smaller values on white).
- **Responsive breakpoints:** Desktop (>1024px) full layout → Tablet (768–1024px) campaign stats 3-col → Mobile (<768px) quiz KPI stacks to 1-col, campaign stats 2-col, tables scroll horizontally.
- **Loading spinner:** UTSA Orange `#F15A22` via `::ng-deep .mat-mdc-progress-spinner circle { stroke: #F15A22; }`.

### Data Flow

- **Tab 1:** `ApiService.getScores()` → `GET /api/scores` → `SimulationResult[]`. Stats (average, pass rate) are computed in `calculateStats()`.
- **Tab 2:** `GophishService.getCampaigns()` → `GET /api/campaigns` (proxied through .NET API to GoPhish) → `Campaign[]`. Each campaign contains a `results[]` array with per-target status data.

---

## Data Source Summary

**[SECTION_METADATA: CONCEPTS=API_Architecture,Data_Flow | DIFFICULTY=Intermediate | RESPONDS_TO: Implementation_How-To]**

| Service | Base URL (dev) | Used By Pages | Purpose |
| :--- | :--- | :--- | :--- |
| **DrupalService** | Drupal (`/jsonapi/...`, `/webform_rest/...`) | Modules, Module Detail, Quiz | CMS-managed training content and quiz definitions |
| **ApiService** | .NET API (`/api/scores`, `/api/results`) | Home, Dashboard, Quiz, Results | Quiz score persistence and retrieval |
| **GophishService** | .NET API (`/api/campaigns`) | Home, Dashboard, Results | Phishing campaign data (proxied from GoPhish) |

---

## Shared UX Patterns

**[SECTION_METADATA: CONCEPTS=UX_Patterns,Angular_Material | DIFFICULTY=Beginner | RESPONDS_TO: Definition_Explanation]**

| Pattern | Implementation | Pages |
| :--- | :--- | :--- |
| **Loading Spinner** | `mat-spinner` inside an `*ngIf="loading"` block; data area hidden until loading completes | All 6 pages |
| **Error State** | Red Material card with `error` icon and descriptive message | Quiz, Results |
| **Empty State** | Material card with `inbox` icon and guidance text | Results |
| **Difficulty Chips** | Color-coded `mat-chip` using `--mdc-chip-elevated-container-color` CSS variable | Modules, Module Detail |
| **Responsive Grids** | CSS Grid `auto-fit` / `minmax` for columns that collapse on mobile | Home, Dashboard |
| **Manual Change Detection** | `ChangeDetectorRef.detectChanges()` called after async data arrives (standalone component pattern) | All 6 pages |
| **Snackbar Notifications** | `MatSnackBar` for transient success/warning messages | Quiz |
| **UTSA Design System** | Montserrat (600/700/800 headlines) + Roboto (300/400 body), Orange `#F15A22` accents, Navy `#032044` header sections, Limestone `#F8F4F1` content areas, edge-to-edge layout via `margin: -24px`, responsive at 768px/480px. Modules page adds Pluralsight-inspired split layout (hero panel + dark sidebar). Results page uses tabbed KPI (navy header + tab group with orange active indicator). | All 6 pages |

> **Branding scope (Mar 20, 2026):** All six pages have UTSA branding: **Home**, **Dashboard**, **Quiz**, **Modules**, **Module Detail**, **Results**.
