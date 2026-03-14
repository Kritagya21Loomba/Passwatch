# PassWatch

**Cinematic, security-aware password analysis in your browser.**

PassWatch is a real-time, browser-based password strength visualizer that combines entropy scoring, pattern detection, and crack-time simulation with a noir, neon, editorial-grade visual interface. It goes beyond "weak/medium/strong" to provide a forensic, cinematic breakdown of *why* a password is weak or strong, and how different attack models would fare against it.

All analysis runs locally in the browser. No network calls. No data storage. No backend.

---

## Features

### Entropy Calculation
Measures password unpredictability in bits using the formula `H = L × log₂(N)`, where *L* is the password length and *N* is the character set size. Detects four character classes (lowercase, uppercase, digits, symbols) and computes a precise entropy value.

| Entropy (bits) | Rating     |
|----------------|------------|
| < 28           | Very weak  |
| 28–35          | Weak       |
| 36–59          | Moderate   |
| 60–79          | Strong     |
| 80+            | Very strong|

### Pattern Detection Engine
Six detection modules identify human-like patterns that reduce effective strength:

- **Dictionary words** — Scans against 200+ common passwords and words (case-insensitive substring matching)
- **Leet-speak substitutions** — Normalizes characters like `@→a`, `0→o`, `$→s`, `3→e` and re-runs dictionary detection on the normalized string
- **Keyboard walks** — Detects sequences of 3+ characters that follow keyboard layout rows (forward or reversed), e.g. `qwerty`, `asdf`, `4321`
- **Sequential characters** — Catches ascending or descending runs of 3+ characters, e.g. `abc`, `987`
- **Repeated characters** — Flags 3+ consecutive identical characters, e.g. `aaa`, `!!!!`
- **Character class diversity** — Warns when fewer than 3 of the 4 character classes are used

### Strength Score (0–100)
Combines an entropy-derived baseline with pattern penalties:

| Pattern type              | Penalty |
|---------------------------|---------|
| Dictionary word           | −25     |
| Leet-speak dictionary     | −20     |
| Keyboard sequence         | −15     |
| Sequential pattern        | −10     |
| Repeated characters       | −10     |
| Low diversity             | −10     |

Each penalty applies once per type. The final score is clamped to [0, 100].

### Crack-Time Simulation
Estimates how long it would take to brute-force the password under three attack models:

| Model        | Guess Rate          | Description                    |
|--------------|---------------------|--------------------------------|
| Online       | 100 guesses/hour    | Rate-limited login attempts    |
| GPU          | 10⁹ guesses/sec     | Single consumer GPU            |
| ASIC Cluster | 10¹⁵ guesses/sec   | Specialized hardware cluster   |

Calculations use log-space arithmetic to handle extremely large keyspaces without overflow. When a dictionary word is detected, the estimates are overridden to reflect that common words are tried first in any real attack.

### Visual Components

- **Entropy Radar Ring** — Circular conic-gradient display that fills proportionally to entropy (0° at 0 bits, 360° at 120+ bits) with dynamic color coding
- **Strength Bar** — Horizontal gradient bar with animated scanline overlay, color-coded from red (weak) to green (very strong)
- **Attack-Mode Cards** — Three cards showing humanized crack times, glowing green for hard-to-crack and red for instant
- **Character Heatmap** — Per-character grid colored by class (cyan=lowercase, blue=uppercase, yellow=digit, magenta=symbol) with red borders on flagged pattern regions and hover tooltips
- **Weakness Callouts** — Slide-in cards with severity-colored left borders (red=high, orange=medium), icons, and plain-language explanations
- **"How This Works" Panel** — Collapsible section explaining entropy, attack models, and disclaimers

---

## Project Structure

```
passwatch/
├── index.html              # Single-page app shell
├── css/
│   └── style.css           # Noir neon theme, all component styles
├── js/
│   ├── main.js             # DOM wiring, event listeners, initialization
│   ├── analyzer.js         # Entropy, pattern detection, scoring, crack-time
│   ├── visuals.js          # UI update functions for all visual components
│   └── data.js             # Dictionary word list, keyboard rows, substitution map
└── assets/
    └── grain.svg           # Film grain texture overlay
```

### Module Responsibilities

**`analyzer.js`** — Pure analysis logic with no DOM dependencies. Exports:
- `computeEntropy(pwd)` — Character set detection and entropy calculation
- `entropyLabel(bits)` — Maps entropy bits to qualitative labels
- `detectPatterns(pwd)` — Runs all six detection modules, returns array of pattern objects
- `computeScore(entropyBits, patterns)` — Entropy baseline with pattern penalties, clamped to [0, 100]
- `estimateCrackTimes(entropyBits, patterns)` — Log-space crack-time estimation across attack models
- `analyzePassword(pwd)` — Orchestrates the full pipeline, returns `{ entropy, patterns, strength, crackTimes }`

**`visuals.js`** — DOM manipulation for all visual components. Exports:
- `updateRing(entropy)` — Entropy radar ring (conic-gradient + color + labels)
- `updateStrengthBar(strength)` — Strength bar fill, color, score, and label
- `updateAttackCards(crackTimes)` — Attack-mode card text and glow colors
- `updateHeatmap(pwd, patterns)` — Per-character grid with pattern overlays and tooltips
- `updateWeaknessList(patterns)` — Weakness callout cards with severity styling
- `updateAll(pwd, result)` — Calls all update functions

**`data.js`** — Static data used by the analyzer:
- `COMMON_WORDS` — 200+ common passwords and dictionary words
- `KEYBOARD_ROWS` — QWERTY layout rows including number and symbol rows
- `SUB_MAP` — Leet-speak character substitution mappings (`@ → a`, `0 → o`, etc.)

**`main.js`** — Application entry point. Wires up the password input event listener, show/hide toggle, and collapsible info panel. Calls `analyzePassword()` on every keystroke and pipes the result to `updateAll()`.

---

## Getting Started

### Run Locally

No build step, no dependencies, no server required. Just open the file:

```bash
# Option 1: Open directly
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux

# Option 2: Use any static file server (needed for ES module imports in some browsers)
npx serve .
# or
python -m http.server 8000
```

> **Note:** Because the app uses ES module `import`/`export` syntax, some browsers require it to be served over HTTP rather than opened as a `file://` URL. If you see module-related errors, use option 2.

### Deploy

PassWatch is a static site — no backend, no build, no environment variables. Deploy to any static hosting provider:

**GitHub Pages:**
1. Push the repo to GitHub
2. Go to Settings → Pages → set source to the `main` branch root
3. Your site is live at `https://<username>.github.io/<repo>/`

**Netlify / Vercel / Cloudflare Pages:**
1. Connect your repository
2. Set build command to **(none)** and publish directory to `.` (root)
3. Deploy

**Any web server:**
Upload the entire project directory. No configuration needed — just serve static files.

---

## How It Works

### Entropy

Entropy quantifies how unpredictable a password is, measured in bits. The formula is:

```
H = L × log₂(N)
```

Where:
- **L** = password length
- **N** = size of the character set used (26 for lowercase only, up to 95 for all printable ASCII)

A password using only lowercase letters has `log₂(26) ≈ 4.7 bits` per character. Adding uppercase, digits, and symbols increases *N* and thus the bits per character.

### Attack Models

The crack-time estimates assume a brute-force search through the full keyspace (`2^H` possibilities). Real attacks are often faster due to dictionary prioritization, which is why PassWatch overrides the estimates when common words are detected.

| Model        | Assumption                                            |
|--------------|-------------------------------------------------------|
| Online       | 100 guesses/hour — reflects rate limiting and lockout |
| GPU          | 10⁹/sec — a single modern GPU cracking hashes        |
| ASIC Cluster | 10¹⁵/sec — purpose-built hardware (e.g. Bitcoin ASICs)|

### Pattern Penalties

Patterns reduce the effective search space because attackers try common patterns first. A 12-character password that is just a dictionary word with leet-speak substitutions provides far less security than its raw entropy suggests.

---

## Design

### Visual Identity
- **Theme:** Noir terminal with neon accents and subtle film grain
- **Background:** Deep black (#050509) with SVG grain overlay at 3.5% opacity
- **Primary accent:** Cyan (#00f2ff)
- **Secondary accent:** Magenta (#ff006e)
- **Display font:** Space Grotesk (bold, condensed)
- **Body font:** JetBrains Mono (monospace)

### Responsive Behavior
Desktop-first layout (max-width: 1100px) with a breakpoint at 860px that stacks the two-column hero, dashboard panels, attack cards, and info grid into single-column layout.

---

## Security and Privacy

- **No network calls** — Zero `fetch`, `XMLHttpRequest`, or external requests (fonts are the only external resource, loaded from Google Fonts CDN)
- **No storage** — No `localStorage`, `sessionStorage`, cookies, or any form of persistence
- **No telemetry** — No analytics, no tracking, no third-party scripts
- **Local-only analysis** — All computation runs in JavaScript in the user's browser
- **Autocomplete disabled** — The input field has `autocomplete="off"` to prevent browser password managers from interacting with it
- **Educational only** — This tool provides approximate estimates for learning purposes. It is not a real cracking tool and should not be used to make security decisions for production systems

---

## Disclaimer

PassWatch is an **educational tool**. The crack-time estimates are approximate and based on simplified assumptions about attacker capabilities. They do not account for targeted attacks, pre-computed rainbow tables, or password-specific optimizations.

**Do not reuse passwords entered into this tool on real accounts.** While no data leaves your browser, good security hygiene means generating passwords with a dedicated password manager.

---

## License

MIT
