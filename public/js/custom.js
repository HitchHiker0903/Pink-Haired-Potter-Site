document.addEventListener('DOMContentLoaded', () => {
  const { esc } = PHP;
  const form = document.getElementById('custom-form');
  const msg = document.getElementById('form-msg');
  if (new URLSearchParams(location.search).get('paid')) {
    document.getElementById('paid-notice').innerHTML = '<div class="notice">Payment received – thank you! I’ll be in touch soon with next steps.</div>';
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    if (!fd.get('name') || !fd.get('email') || !fd.get('details')) {
      msg.innerHTML = '<div class="notice error">Please fill in your name, email, and a few details about your idea.</div>';
      return;
    }
    const photo = fd.get('photo');
    if (photo && photo.size > 10 * 1024 * 1024) {
      msg.innerHTML = '<div class="notice error">That photo is over 10 MB – please choose a smaller one.</div>';
      return;
    }
    if (photo && !photo.size) fd.delete('photo');
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await fetch('/api/custom-order', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      form.innerHTML = `<div class="center"><h2 class="script">Got it – thank you!</h2><p>I’ll read through your idea and email you soon. Keep an eye on your inbox (and spam folder, just in case).</p><a class="btn" href="/gallery">Browse the gallery</a></div>`;
    } catch (err) {
      msg.innerHTML = `<div class="notice error">${esc(err.message)} You can also email me directly.</div>`;
      btn.disabled = false;
      btn.textContent = 'Send my request';
    }
  });
});
