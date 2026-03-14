// PassWatch – Visual components
// Updates all UI elements based on analysis results

import { entropyLabel } from './analyzer.js';

// ─── Entropy Radar Ring ─────────────────────────────────────

export function updateRing(entropy) {
  const ring = document.getElementById('entropy-ring');
  const ringLabel = document.getElementById('ring-label');
  const ringSublabel = document.getElementById('ring-sublabel');

  const bits = entropy.entropyBits;
  const deg = Math.min(bits * 3, 360);
  const label = entropyLabel(bits);

  // Color based on strength
  let color;
  if (bits < 28) color = '#ff003c';
  else if (bits < 36) color = '#ff6b00';
  else if (bits < 60) color = '#ffbe00';
  else if (bits < 80) color = '#00f2ff';
  else color = '#00ff88';

  ring.style.background = `conic-gradient(${color} ${deg}deg, #1a1a2e ${deg}deg)`;
  ring.style.filter = `drop-shadow(0 0 12px ${color}50)`;

  ringLabel.textContent = bits > 0 ? `${bits}` : '–';
  ringLabel.style.color = color;
  ringSublabel.textContent = bits > 0 ? label : 'Enter a password';
  ringSublabel.style.color = color;
}

// ─── Strength bar ───────────────────────────────────────────

export function updateStrengthBar(strength) {
  const fill = document.getElementById('strength-fill');
  const scoreEl = document.getElementById('strength-score');
  const labelEl = document.getElementById('strength-label');

  fill.style.width = `${strength.score}%`;

  // Gradient position based on score
  let color;
  if (strength.score < 20) color = '#ff003c';
  else if (strength.score < 40) color = '#ff6b00';
  else if (strength.score < 60) color = '#ffbe00';
  else if (strength.score < 80) color = '#00f2ff';
  else color = '#00ff88';

  fill.style.background = `linear-gradient(90deg, ${color}cc, ${color})`;
  fill.style.boxShadow = `0 0 12px ${color}60, inset 0 1px 0 ${color}40`;

  scoreEl.textContent = strength.score;
  scoreEl.style.color = color;
  labelEl.textContent = strength.label;
  labelEl.style.color = color;
}

// ─── Attack-mode cards ──────────────────────────────────────

export function updateAttackCards(crackTimes) {
  const keys = ['online', 'gpu', 'asicCluster'];
  const ids = ['card-online', 'card-gpu', 'card-asic'];

  for (let i = 0; i < keys.length; i++) {
    const data = crackTimes[keys[i]];
    const card = document.getElementById(ids[i]);
    if (!card) continue;

    const timeEl = card.querySelector('.card-time');
    const descEl = card.querySelector('.card-desc');

    timeEl.textContent = data.label;
    descEl.textContent = data.desc;

    // Glow color: green for hard, red for easy
    let glowColor;
    if (data.seconds < 1) glowColor = '#ff003c';
    else if (data.seconds < 3600) glowColor = '#ff6b00';
    else if (data.seconds < 86400 * 365) glowColor = '#ffbe00';
    else glowColor = '#00ff88';

    card.style.borderColor = `${glowColor}40`;
    card.style.boxShadow = `0 0 15px ${glowColor}15, inset 0 0 20px ${glowColor}08`;
    timeEl.style.color = glowColor;
  }
}

// ─── Pattern heatmap ────────────────────────────────────────

export function updateHeatmap(pwd, patterns) {
  const container = document.getElementById('heatmap');
  container.innerHTML = '';

  if (!pwd.length) {
    container.innerHTML = '<span class="heatmap-placeholder">Character analysis will appear here</span>';
    return;
  }

  // Build pattern coverage map
  const coverage = new Array(pwd.length).fill(null);
  for (const p of patterns) {
    if (p.start === undefined) continue;
    for (let i = p.start; i < p.end; i++) {
      if (!coverage[i] || p.severity === 'high') {
        coverage[i] = p;
      }
    }
  }

  for (let i = 0; i < pwd.length; i++) {
    const ch = pwd[i];
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';

    // Base color by character class
    if (/[a-z]/.test(ch)) cell.style.background = '#00f2ff20';
    else if (/[A-Z]/.test(ch)) cell.style.background = '#4488ff20';
    else if (/[0-9]/.test(ch)) cell.style.background = '#ffbe0020';
    else cell.style.background = '#ff006e20';

    // Character class text color
    if (/[a-z]/.test(ch)) cell.style.color = '#00f2ff';
    else if (/[A-Z]/.test(ch)) cell.style.color = '#6ea8ff';
    else if (/[0-9]/.test(ch)) cell.style.color = '#ffbe00';
    else cell.style.color = '#ff006e';

    // Pattern overlay
    if (coverage[i]) {
      cell.classList.add('heatmap-flagged');
      if (coverage[i].severity === 'high') {
        cell.style.borderColor = '#ff003c';
        cell.style.background = '#ff003c15';
      } else {
        cell.style.borderColor = '#ff6b00';
        cell.style.background = '#ff6b0015';
      }
    }

    cell.textContent = ch;

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'heatmap-tooltip';
    let charClass = /[a-z]/.test(ch) ? 'lowercase' : /[A-Z]/.test(ch) ? 'uppercase' : /[0-9]/.test(ch) ? 'digit' : 'symbol';
    let tip = `"${ch}" — ${charClass}`;
    if (coverage[i]) {
      tip += `\n⚠ Part of ${coverage[i].type.replace(/_/g, ' ')}`;
    }
    tooltip.textContent = tip;
    cell.appendChild(tooltip);

    container.appendChild(cell);
  }
}

// ─── Weakness callouts ──────────────────────────────────────

const PATTERN_INFO = {
  dictionary: {
    icon: '⚠',
    title: 'Dictionary word detected',
    template: p => `Contains "${p.word}", a common word in leaked password databases.`
  },
  substitution_dictionary: {
    icon: '⚠',
    title: 'Leet-speak dictionary word',
    template: p => `"${p.original}" normalizes to "${p.normalized}" — a common password pattern.`
  },
  keyboard_sequence: {
    icon: '⌨',
    title: 'Keyboard walk detected',
    template: p => `"${p.sequence}" follows the keyboard layout and is trivially guessable.`
  },
  sequential: {
    icon: '↗',
    title: 'Sequential pattern',
    template: p => `"${p.sequence}" is an ascending/descending character sequence.`
  },
  repetition: {
    icon: '⟳',
    title: 'Repeated characters',
    template: p => `"${p.char}" is repeated ${p.count} times — adds no real entropy.`
  },
  diversity: {
    icon: '◧',
    title: 'Low character diversity',
    template: p => `Only uses ${p.classesUsed.join(', ')}. Mix uppercase, lowercase, digits, and symbols.`
  }
};

export function updateWeaknessList(patterns) {
  const container = document.getElementById('weaknesses');
  container.innerHTML = '';

  if (!patterns.length) {
    container.innerHTML = '<div class="weakness-placeholder">No weaknesses detected.</div>';
    return;
  }

  // Deduplicate by type (show most severe)
  const seen = new Map();
  for (const p of patterns) {
    if (!seen.has(p.type) || p.severity === 'high') {
      seen.set(p.type, p);
    }
  }

  for (const [type, pattern] of seen) {
    const info = PATTERN_INFO[type];
    if (!info) continue;

    const item = document.createElement('div');
    item.className = `weakness-item severity-${pattern.severity}`;

    item.innerHTML = `
      <span class="weakness-icon">${info.icon}</span>
      <div class="weakness-content">
        <div class="weakness-title">${info.title}</div>
        <div class="weakness-desc">${info.template(pattern)}</div>
      </div>
    `;

    container.appendChild(item);
  }
}

// ─── Master update ──────────────────────────────────────────

export function updateAll(pwd, result) {
  updateRing(result.entropy);
  updateStrengthBar(result.strength);
  updateAttackCards(result.crackTimes);
  updateHeatmap(pwd, result.patterns);
  updateWeaknessList(result.patterns);

  // Update notes
  const notesEl = document.getElementById('crack-notes');
  if (notesEl) {
    notesEl.textContent = result.crackTimes.notes?.join(' ') || '';
  }
}
