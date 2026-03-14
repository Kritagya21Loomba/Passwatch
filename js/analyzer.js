// PassWatch – Analysis engine
// Entropy, pattern detection, scoring, and crack-time simulation

import { COMMON_WORDS, KEYBOARD_ROWS, SUB_MAP } from './data.js';

// ─── Entropy ────────────────────────────────────────────────

export function computeEntropy(pwd) {
  if (!pwd.length) return { length: 0, charsetSize: 0, entropyBits: 0 };

  let charsetSize = 0;
  if (/[a-z]/.test(pwd)) charsetSize += 26;
  if (/[A-Z]/.test(pwd)) charsetSize += 26;
  if (/[0-9]/.test(pwd)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) charsetSize += 33;

  const entropyBits = pwd.length * Math.log2(charsetSize || 1);

  return {
    length: pwd.length,
    charsetSize,
    entropyBits: Math.round(entropyBits * 10) / 10
  };
}

export function entropyLabel(bits) {
  if (bits < 28) return 'Very weak';
  if (bits < 36) return 'Weak';
  if (bits < 60) return 'Moderate';
  if (bits < 80) return 'Strong';
  return 'Very strong';
}

// ─── Pattern detection ──────────────────────────────────────

function detectDictionary(pwd) {
  const lower = pwd.toLowerCase();
  const results = [];

  for (const word of COMMON_WORDS) {
    if (word.length < 3) continue;
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      results.push({
        type: 'dictionary',
        word,
        start: idx,
        end: idx + word.length,
        severity: 'high'
      });
    }
  }
  return results;
}

function detectKeyboardSequences(pwd) {
  const lower = pwd.toLowerCase();
  const results = [];

  for (const row of KEYBOARD_ROWS) {
    const reversed = row.split('').reverse().join('');
    for (let len = Math.min(lower.length, row.length); len >= 3; len--) {
      for (let i = 0; i <= lower.length - len; i++) {
        const sub = lower.slice(i, i + len);
        if (row.includes(sub) || reversed.includes(sub)) {
          // Check not already covered by a longer match
          const dominated = results.some(
            r => r.type === 'keyboard_sequence' && r.start <= i && r.end >= i + len
          );
          if (!dominated) {
            results.push({
              type: 'keyboard_sequence',
              sequence: sub,
              start: i,
              end: i + len,
              severity: 'high'
            });
          }
        }
      }
    }
  }
  return results;
}

function detectSequential(pwd) {
  const results = [];
  let i = 0;

  while (i < pwd.length - 2) {
    let seqLen = 1;
    const code0 = pwd.charCodeAt(i);
    const diff = pwd.charCodeAt(i + 1) - code0;

    if (diff === 1 || diff === -1) {
      for (let j = i + 1; j < pwd.length; j++) {
        if (pwd.charCodeAt(j) - pwd.charCodeAt(j - 1) === diff) {
          seqLen++;
        } else {
          break;
        }
      }
    }

    if (seqLen >= 3) {
      results.push({
        type: 'sequential',
        sequence: pwd.slice(i, i + seqLen),
        start: i,
        end: i + seqLen,
        severity: 'medium'
      });
      i += seqLen;
    } else {
      i++;
    }
  }
  return results;
}

function detectRepetition(pwd) {
  const results = [];
  const re = /(.)\1{2,}/g;
  let match;

  while ((match = re.exec(pwd)) !== null) {
    results.push({
      type: 'repetition',
      char: match[1],
      count: match[0].length,
      start: match.index,
      end: match.index + match[0].length,
      severity: 'medium'
    });
  }
  return results;
}

function detectSubstitutionDictionary(pwd) {
  let normalized = '';
  for (const ch of pwd.toLowerCase()) {
    normalized += SUB_MAP[ch] || ch;
  }

  const results = [];
  for (const word of COMMON_WORDS) {
    if (word.length < 3) continue;
    const idx = normalized.indexOf(word);
    if (idx !== -1) {
      const original = pwd.slice(idx, idx + word.length);
      // Only flag if the original differs (i.e. substitutions were used)
      if (original.toLowerCase() !== word) {
        results.push({
          type: 'substitution_dictionary',
          original,
          normalized: word,
          start: idx,
          end: idx + word.length,
          severity: 'high'
        });
      }
    }
  }
  return results;
}

function detectDiversity(pwd) {
  if (!pwd.length) return [];

  const classes = [];
  if (/[a-z]/.test(pwd)) classes.push('lower');
  if (/[A-Z]/.test(pwd)) classes.push('upper');
  if (/[0-9]/.test(pwd)) classes.push('digit');
  if (/[^a-zA-Z0-9]/.test(pwd)) classes.push('symbol');

  if (classes.length < 3) {
    return [{
      type: 'diversity',
      classesUsed: classes,
      severity: classes.length < 2 ? 'high' : 'medium'
    }];
  }
  return [];
}

export function detectPatterns(pwd) {
  if (!pwd.length) return [];
  return [
    ...detectDictionary(pwd),
    ...detectSubstitutionDictionary(pwd),
    ...detectKeyboardSequences(pwd),
    ...detectSequential(pwd),
    ...detectRepetition(pwd),
    ...detectDiversity(pwd)
  ];
}

// ─── Strength score ─────────────────────────────────────────

export function computeScore(entropyBits, patterns) {
  // Baseline from entropy
  let base;
  if (entropyBits <= 20) {
    base = (entropyBits / 20) * 20;
  } else if (entropyBits <= 40) {
    base = 20 + ((entropyBits - 20) / 20) * 30;
  } else if (entropyBits <= 80) {
    base = 50 + ((entropyBits - 40) / 40) * 40;
  } else {
    base = 90 + Math.min((entropyBits - 80) / 40, 1) * 10;
  }

  // Penalties
  const seen = new Set();
  for (const p of patterns) {
    if (seen.has(p.type)) continue;
    seen.add(p.type);

    switch (p.type) {
      case 'dictionary':             base -= 25; break;
      case 'substitution_dictionary': base -= 20; break;
      case 'keyboard_sequence':      base -= 15; break;
      case 'sequential':             base -= 10; break;
      case 'repetition':             base -= 10; break;
      case 'diversity':              base -= 10; break;
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(base)));
  let label;
  if (score < 20) label = 'Very weak';
  else if (score < 40) label = 'Weak';
  else if (score < 60) label = 'Moderate';
  else if (score < 80) label = 'Strong';
  else label = 'Very strong';

  return { score, label };
}

// ─── Crack-time simulation ──────────────────────────────────

const ATTACK_MODELS = {
  online:     { rate: 100 / 3600, label: 'Online (throttled)', desc: 'Rate-limited login attempts' },
  gpu:        { rate: 1e9,        label: 'Offline GPU',        desc: 'Single consumer GPU' },
  gpuRig:     { rate: 1e12,       label: 'GPU Rig',            desc: 'High-end multi-GPU rig' },
  asicCluster:{ rate: 1e15,       label: 'ASIC Cluster',       desc: 'Specialized hardware cluster' }
};

function humanize(seconds) {
  if (seconds < 1) return 'less than 1 second';
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < 31557600) return `${(seconds / 86400).toFixed(1)} days`;
  if (seconds < 31557600 * 100) return `${(seconds / 31557600).toFixed(1)} years`;
  if (seconds < 31557600 * 1e6) return `${(seconds / 31557600).toExponential(1)} years`;
  return 'longer than the age of the universe';
}

export function estimateCrackTimes(entropyBits, patterns) {
  const hasHighDict = patterns.some(
    p => (p.type === 'dictionary' || p.type === 'substitution_dictionary') && p.severity === 'high'
  );

  // Work in log-space for large keyspaces
  const logKeyspace = entropyBits * Math.LN2;  // ln(2^H)
  const notes = [];

  if (hasHighDict) {
    notes.push('Contains a common dictionary word — trivial for offline attacks.');
  }

  const result = {};

  for (const [key, model] of Object.entries(ATTACK_MODELS)) {
    let seconds;

    if (entropyBits === 0) {
      seconds = 0;
    } else {
      // T = 2^H / rate  →  ln(T) = H*ln2 - ln(rate)
      const logSeconds = logKeyspace - Math.log(model.rate);
      seconds = logSeconds > 700 ? Infinity : Math.exp(logSeconds);
    }

    // Dictionary override: common words are tried first in any attack
    if (hasHighDict) {
      if (key === 'online') {
        // Even rate-limited, dictionary words are tried in the first few hundred guesses
        seconds = Math.min(seconds, 3600);
      } else {
        seconds = Math.min(seconds, 0.001);
      }
    }

    result[key] = {
      seconds,
      label: humanize(seconds),
      modelLabel: model.label,
      desc: model.desc
    };
  }

  result.notes = notes;
  return result;
}

// ─── Main entry point ───────────────────────────────────────

export function analyzePassword(pwd) {
  const entropy = computeEntropy(pwd);
  const patterns = detectPatterns(pwd);
  const strength = computeScore(entropy.entropyBits, patterns);
  const crackTimes = estimateCrackTimes(entropy.entropyBits, patterns);

  return { entropy, patterns, strength, crackTimes };
}
