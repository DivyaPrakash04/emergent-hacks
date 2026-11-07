/* Local hackathon simulator. Never use this as an authentication boundary. */
(function () {
  'use strict';
  const CHECKS = ['email', 'idSelfie', 'card'];
  function trust(user) {
    if (!user) return { status: 'caution', reason: 'Sign in to begin' };
    if (user.suspended) return { status: 'suspended', reason: 'Demo account suspended' };
    const pending = CHECKS.filter(k => user.verification[k] !== 'passed');
    if (user.role === 'host' && !user.consent) pending.push('landlord consent');
    return pending.length ? { status: 'caution', reason: 'Pending: ' + pending.join(', ') } :
      { status: 'verified', reason: 'All simulated checks passed' };
  }
  function transition(user, check, outcome) {
    if (!user || !CHECKS.includes(check) || !['passed', 'failed', 'pending'].includes(outcome)) throw new Error('Invalid verification transition');
    if (check !== 'email' && user.verification.email !== 'passed') throw new Error('Complete the email demo first');
    return { ...user, verification: { ...user.verification, [check]: outcome } };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { trust, transition };
  if (typeof document === 'undefined') return;
  const root = document.getElementById('accountRoot');
  if (!root) return;
  const storageKey = 'roomsure-demo-session-v1';
  let user = null;
  let message = '';
  // Intentionally session-only: reloads persist, closing the tab ends the demo session.
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved && typeof saved.name === 'string' && typeof saved.email === 'string' && ['host', 'seeker'].includes(saved.role) &&
      CHECKS.every(k => ['pending', 'passed', 'failed'].includes(saved.verification?.[k]))) user = saved;
  } catch (_) { /* Storage can be unavailable in private browsing. */ }
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function save() {
    try { if (user) sessionStorage.setItem(storageKey, JSON.stringify(user)); else sessionStorage.removeItem(storageKey); }
    catch (_) { message = 'Browser storage is unavailable; your demo session will end on reload.'; }
  }
  const style = document.createElement('style');
  style.textContent = '#accountRoot{max-width:800px}#accountRoot form,#accountRoot .account-panel{padding:22px;background:var(--surface);border:1px solid var(--line);border-radius:12px;margin-bottom:16px}#accountRoot label{display:block;margin:12px 0}#accountRoot input:not([type=checkbox]),#accountRoot select{display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:6px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:inherit}#accountRoot button{margin:6px 8px 6px 0}#accountRoot button:disabled{opacity:.5;cursor:default}#accountRoot .account-check{padding:16px 0;border-top:1px solid var(--line)}#accountRoot h3{margin:0 0 8px}#accountRoot small{display:block;color:var(--muted)}';
  document.head.append(style);
  function render() {
    if (!user) {
      root.innerHTML = `<form id="demoSignup"><h3>Create or resume a demo account</h3><p>This browser tab holds one demo account. Any name and sample email work; there is no password or real authentication.</p><label>Name<input name="name" maxlength="80" required autocomplete="off" placeholder="Maya Chen"></label><label>Demo email<input name="email" type="email" maxlength="254" required autocomplete="off" placeholder="maya@example.com"></label><label>I’m a<select name="role"><option value="seeker">Room seeker</option><option value="host">Host</option></select></label><button class="btn" type="submit">Start demo session</button></form><p role="status">${escape(message)}</p>`;
      root.querySelector('form').onsubmit = event => {
        event.preventDefault();
        const form = new FormData(event.target);
        const name = String(form.get('name')).trim();
        if (!name) return;
        user = { name, email: String(form.get('email')).trim(), role: form.get('role'), consent: false,
          verification: { email: 'pending', idSelfie: 'pending', card: 'pending' } };
        message = 'Demo session started.'; save(); render();
      };
      return;
    }
    const state = trust(user);
    const unlocked = user.verification.email === 'passed';
    root.innerHTML = `<div class="account-panel"><h3>${escape(user.name)} · ${escape(user.role)}</h3><p>${escape(user.email)}</p><p><strong>${state.status === 'verified' ? '✓ Verified (demo)' : 'Caution (demo)'}</strong> · ${escape(state.reason)}</p><small>These badges describe simulated checks only. Listing scam signals can still require caution.</small><button class="btn" id="signout">Sign out & clear demo account</button></div>
      <div class="account-panel"><h3>Complete your demo checks</h3>
      <div class="account-check"><strong>1. Email code · ${escape(user.verification.email)}</strong><p>Enter the displayed demo code: <b>123456</b>. No email is sent.</p><form id="emailCheck"><label>Demo code<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label><button class="btn">Confirm demo email</button></form></div>
      <div class="account-check"><strong>2. ID + selfie · ${escape(user.verification.idSelfie)}</strong><p>Simulate a provider result. Do not upload identification or photos.</p><button class="btn" data-check="idSelfie" data-result="passed" ${unlocked?'':'disabled'}>Simulate ID pass</button><button class="btn" data-check="idSelfie" data-result="failed" ${unlocked?'':'disabled'}>Simulate ID failure</button></div>
      <div class="account-check"><strong>3. $1 card check · ${escape(user.verification.card)}</strong><p>Simulated authorization and immediate release. $0 charged. No card fields, payment processor, deposit holding, or actual authorization.</p><button class="btn" data-check="card" data-result="passed" ${unlocked?'':'disabled'}>Simulate $1 authorization</button><button class="btn" data-check="card" data-result="failed" ${unlocked?'':'disabled'}>Simulate declined card</button></div>
      ${user.role === 'host' ? `<div class="account-check"><label><input id="consent" type="checkbox" ${user.consent?'checked':''}> Demo: I confirm permission to rent this room</label><small>Self-attestation only; no ownership or landlord records checked.</small></div>` : ''}
      <button class="btn" id="resetChecks">Reset verification</button></div><p role="status" aria-live="polite" id="accountMessage">${escape(message)}</p>`;
    root.querySelector('#signout').onclick = () => { user = null; message = 'Signed out. Demo account cleared.'; save(); render(); };
    root.querySelector('#emailCheck').onsubmit = e => {
      e.preventDefault();
      const passed = new FormData(e.target).get('code') === '123456';
      user = transition(user, 'email', passed ? 'passed' : 'failed');
      // A failed email check invalidates dependent checks.
      if (!passed) user.verification = { email: 'failed', idSelfie: 'pending', card: 'pending' };
      message = passed ? 'Demo email confirmed. ID and card simulations unlocked.' : 'Incorrect demo code. Use 123456.';
      save(); render();
    };
    root.querySelectorAll('[data-check]').forEach(button => button.onclick = () => {
      user = transition(user, button.dataset.check, button.dataset.result);
      message = button.dataset.result === 'passed' ? 'Simulated check passed. No real verification or charge occurred.' : 'Simulated check failed. Retry with the pass option.';
      save(); render();
    });
    if (user.role === 'host') root.querySelector('#consent').onchange = e => { user.consent = e.target.checked; message = 'Demo host permission updated.'; save(); render(); };
    root.querySelector('#resetChecks').onclick = () => { user.verification = {email:'pending',idSelfie:'pending',card:'pending'}; user.consent = false; message = 'All checks reset.'; save(); render(); };
  }
  render();
})();
