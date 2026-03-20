# Page Functionality

**[METADATA_SCHEMA_VERSION: 1.1] [PURPOSE: Technical_Deep_Dive] [TARGET_AUDIENCE: Developers] [RESPONDS_TO: Definition_Explanation, Implementation_How-To]**

This document provides a UI/UX and technical overview of each page in the Angular frontend. It is designed for a web developer onboarding to the project — giving enough business and technical context to begin contributing immediately.

---

## Application Shell

**[SECTION_METADATA: CONCEPTS=Angular_Material,Navigation,Routing | DIFFICULTY=Beginner]**

The app uses a **Material Design** shell (`mat-sidenav-container`) with a persistent side-navigation drawer and a top toolbar branded "TSUS Security Training."

**Layout:**
- **Toolbar** — Fixed top bar with a hamburger toggle and application title.
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
- UTSA logo (inverted white via CSS filter)
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

The page has two visual sections stacked vertically:

**KPI Row** — A responsive 4-column grid of Material cards, each displaying:

| KPI | Icon | Color | Data Source | Calculation |
| :--- | :--- | :--- | :--- | :--- |
| Quiz Attempts | `quiz` | Primary blue | .NET API `GET /api/scores` | Count of all `SimulationResult` records |
| Quiz Pass Rate | `check_circle` | Green `#4caf50` | .NET API `GET /api/scores` | % of scores >= 80 |
| Phishing Campaigns | `campaign` | Orange `#ff9800` | GoPhish API `GET /api/campaigns` | Count of all campaigns |
| Phish Click Rate | `warning` | Red `#f44336` | GoPhish API `GET /api/campaigns` | % of targets who clicked link or submitted data |

**Charts Row** — A responsive 2-column grid of Material cards, each containing a Chart.js canvas:

| Chart | Type | Description |
| :--- | :--- | :--- |
| Quiz Score Distribution | Bar chart | Buckets scores into 5 ranges (0-20%, 21-40%, 41-60%, 61-80%, 81-100%) with color-coded bars (red → blue). |
| Phishing Campaign Results | Pie chart | Segments by GoPhish status (Sending, Email Sent, Email Opened, Clicked Link, Submitted Data) with a bottom legend. |

### Technical Notes

- **Data loading:** Both API calls (`getScores` and `getCampaigns`) fire in parallel on `ngOnInit`. A counter tracks completion; once both resolve (success or error), the loading spinner hides and charts render.
- **Chart rendering:** Chart.js `registerables` are registered globally. Charts are created in a `setTimeout` after `loading=false` to ensure the `*ngIf` has added the `<canvas>` elements to the DOM.
- **Responsive grid:** CSS Grid with `auto-fit` / `minmax` ensures the KPI row and charts row collapse gracefully on smaller screens.

---

## 2. Training Modules (`/modules`)

**[SECTION_METADATA: CONCEPTS=Drupal_JSON_API,Training_Content,Accordion | DIFFICULTY=Beginner | RESPONDS_TO: Definition_Explanation]**

**Screenshot:** `Drupal_Training.png`

### Business Purpose

This is the training catalog. Employees browse available security awareness modules organized by category (e.g., "Phishing Basics," "Social Engineering"). The goal is to guide users to relevant video-based training before they take the quiz.

### UI Layout

- **Heading** — "Training Modules"
- **Accordion** — One `mat-expansion-panel` per category, all expanded by default. Each panel header shows a folder icon, the category name, and a count badge (e.g., "(3)").
- **Module List** — Inside each panel, a `mat-nav-list` of clickable items. Each item displays:
  - A `play_circle` icon
  - The module title (linked to `/modules/:id`)
  - A chip set showing:
    - **Difficulty chip** — Color-coded: Beginner = green (`#c8e6c9`), Intermediate = yellow (`#fff9c4`), Advanced = red (`#ffcdd2`)
    - **Duration chip** — Clock icon + duration text (e.g., "15 minutes")

### Data Flow

1. `DrupalService.getTrainingModules()` calls Drupal JSON:API at `/jsonapi/node/training_module?include=field_category`.
2. Response is mapped to `TrainingModule[]` objects. The `field_category` taxonomy relationship is resolved via the JSON:API `included` sideload.
3. The component groups modules into `{ category, modules[] }` using a `Map` and renders one accordion panel per group.

### Technical Notes

- **Content is CMS-driven.** Module titles, descriptions, video URLs, difficulty, duration, and categories are all managed in Drupal as `training_module` content type fields. No hardcoded training data exists in Angular.
- **Navigation:** Clicking a module navigates to `/modules/:id` using `routerLink`, passing the Drupal UUID.

---

## 3. Module Detail (`/modules/:id`)

**[SECTION_METADATA: CONCEPTS=Video_Embed,Drupal_JSON_API,Content_Detail | DIFFICULTY=Beginner-Intermediate | RESPONDS_TO: Definition_Explanation]**

### Business Purpose

This is the training consumption page. An employee watches a video lesson and reads the module description. It is the primary learning experience before taking the quiz.

### UI Layout

- **Back Link** — A Material button with arrow icon, linking back to `/modules`.
- **Title** — The module's `title` as an `<h2>`.
- **Metadata Chips** — A chip set with:
  - Difficulty (color-coded, same scheme as Modules list)
  - Duration (clock icon)
  - Category (category icon)
- **Video Player** — A responsive 16:9 iframe (`padding-bottom: 56.25%` trick). Supports YouTube and Vimeo embeds.
- **Description Card** — A Material card with the module's `field_description` text.

### Data Flow

1. The route parameter `:id` (a Drupal UUID) is read from `ActivatedRoute`.
2. `DrupalService.getTrainingModule(id)` fetches a single node with its category included.
3. If the module has a `videoUrl`, it is converted to an embed URL and sanitized via `DomSanitizer.bypassSecurityTrustResourceUrl()`.

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

### UI Layout — Pre-Submission

- **Info Banner** — A blue Material card explaining that the quiz is authored in Drupal Webforms and rendered dynamically via the `webform_rest` API.
- **Question Cards** — One `mat-card` per question, each showing:
  - Question number and title
  - A "Required" chip
  - **Radio buttons** (`mat-radio-group`) for multiple-choice questions
  - Supports `radios`, `select`, `checkboxes`, and `textfield`/`textarea` types
- **Submit Button** — Disabled until all required questions are answered. Shows an italic hint: "Answer all questions to submit."

### UI Layout — Post-Submission

- **Result Banner** — Replaces the info banner. Green (`#c8e6c9`) for pass (>= 80%), red (`#ffcdd2`) for fail. Displays score as fraction and percentage.
- **Question Cards** — Each card gains a colored left border:
  - Green border + "Correct" chip for right answers
  - Red border + "Incorrect" chip for wrong answers
- **Radio buttons become disabled** (read-only review mode).
- **Retake Button** — Replaces the submit button, allowing the user to reset and try again.
- **Snack Bar** — A Material snackbar confirms score was saved (or warns if the .NET API was unreachable).

### Data Flow

1. **Load:** `DrupalService.getQuizFields('phishing_awareness_quiz')` fetches field definitions from Drupal's `webform_rest` module at `/webform_rest/phishing_awareness_quiz/fields?_format=json`.
2. **Parse:** The `parseFields()` method converts raw webform field objects into a `QuizQuestion[]` array (key, title, type, required, options).
3. **Grade:** Answers are checked client-side against a hardcoded `ANSWER_KEY` (Q1=c, Q2=c, Q3=b, Q4=b, Q5=b). The score percentage is `(correct / total) * 100`.
4. **Save:** `ApiService.postResult()` sends the score to the .NET API at `POST /api/results` with payload `{ userId, campaignId, score, completedAt }`.
5. **Reset:** `resetQuiz()` clears all answers and state, allowing unlimited retakes.

### Technical Notes

- **Questions are CMS-driven.** The quiz structure (questions, options, types) is authored in Drupal Webforms — the Angular app renders whatever fields the API returns. Adding or changing questions requires no Angular code change.
- **Answer key is hardcoded.** The current answer key matches the seed script `create_quiz_webform.php`. If questions change in Drupal, the answer key in the component must be updated to match.
- **Graceful degradation:** If the .NET API is down, the score is still calculated and displayed — only the persistence fails (with a warning snackbar).

---

## 5. Simulation Results (`/results`)

**[SECTION_METADATA: CONCEPTS=Data_Tables,GoPhish_Campaigns,Score_Tracking | DIFFICULTY=Intermediate | RESPONDS_TO: Definition_Explanation]**

**Screenshots:** `Drupal_QuizScores.png`, `Drupal_PhishingScores.png`

### Business Purpose

The Results page is the detailed reporting view. While the Dashboard shows high-level KPIs, this page lets administrators drill into individual quiz attempts and phishing campaign target-level data. It answers: *"Who took the quiz and how did they score?"* and *"Which employees clicked the phishing link?"*

### UI Layout

The page uses a **Material tab group** with two tabs:

#### Tab 1: Quiz Scores

- **Summary Card** — Three stats displayed in a centered row:

| Stat | Description |
| :--- | :--- |
| Total Attempts | Count of all quiz result records |
| Average Score | Mean of all scores (rounded %) |
| Pass Rate | % of scores >= 80 |

- **Results Table** — A full-width `mat-table` with columns:

| Column | Content |
| :--- | :--- |
| User | `userId` (currently "demo-user") |
| Campaign / Quiz | `campaignId` (e.g., "phishing_awareness_quiz") |
| Score | Percentage with pass/fail chip (green >= 80%, red < 80%) |
| Completed | Formatted date/time |

- **Empty State** — If no results exist, an inbox icon with "No results yet. Complete a quiz to see scores here."
- **Refresh Button** — Bottom-right button to reload data.

#### Tab 2: Phishing Campaigns

- **Campaign Cards** — One `mat-card` per GoPhish campaign, each showing:
  - Campaign name and status chip (color-coded by status)
  - Launch date
  - **Summary Row** — 5 stats: Targets, Emails Sent, Opened, Clicked Link, Submitted Data
  - **Target Table** — A `mat-table` with columns: Name, Email, Position, Status (color-coded chip), Send Date

- **Status Chip Colors:**

| Status | Color |
| :--- | :--- |
| Sending / In Progress | Orange `#fff3e0` |
| Email Sent | Blue `#e3f2fd` |
| Email Opened | Yellow `#fff9c4` |
| Clicked Link | Amber `#ffe0b2` |
| Submitted Data | Red `#ffcdd2` |
| Completed | Green `#c8e6c9` |

- **Empty State** — "No phishing campaigns found. Seed GoPhish to see campaigns here."
- **Refresh Button** — Per-tab reload.

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
