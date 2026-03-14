// PassWatch – Main entry point
// DOM wiring and event listeners

import { analyzePassword } from './analyzer.js';
import { updateAll } from './visuals.js';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('password-input');
  const toggleBtn = document.getElementById('toggle-visibility');
  const howToggle = document.getElementById('how-toggle');
  const howContent = document.getElementById('how-content');

  // Password input handler
  input.addEventListener('input', () => {
    const pwd = input.value;
    const result = analyzePassword(pwd);
    updateAll(pwd, result);
  });

  // Show/hide toggle
  toggleBtn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '◉' : '◎';
    toggleBtn.title = isPassword ? 'Hide password' : 'Show password';
  });

  // How-it-works collapsible
  howToggle.addEventListener('click', () => {
    const expanded = howContent.classList.toggle('expanded');
    howToggle.querySelector('.how-arrow').textContent = expanded ? '▾' : '▸';
  });

  // Initialize with empty state
  const result = analyzePassword('');
  updateAll('', result);
});
