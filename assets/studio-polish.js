/* Shared accessibility improvements; no dependency or external requests. */
(() => {
  const nav = document.querySelector('.nav');
  const menu = document.querySelector('.menu');
  const links = document.querySelector('.nav-links');
  if (nav && menu && links) {
    links.id = 'primary-links';
    menu.setAttribute('aria-controls', links.id);
    const closeMenu = () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
    links.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); }
    });
    document.addEventListener('click', event => { if (!nav.contains(event.target)) closeMenu(); });
    nav.addEventListener('focusout', event => { if (!nav.contains(event.relatedTarget)) closeMenu(); });
  }
  // Revoking optional-font consent must also remove the loaded stylesheet.
  document.querySelector('#cookie-decline')?.addEventListener('click', () => {
    document.querySelector('#google-fonts-stylesheet')?.remove();
    document.querySelectorAll('link[rel="preconnect"]').forEach(link => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(link.href)) link.remove();
    });
  });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.createElement('div');
  progress.className = 'nle-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);
  let scrollPending = false;
  const updateProgress = () => {
    scrollPending = false;
    const range = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0})`;
  };
  addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();

  document.querySelectorAll('#faq details, .project-card details').forEach(details => {
    const summary = details.querySelector('summary');
    if (!summary) return;
    details.style.overflow = 'hidden';
    let animation;
    summary.addEventListener('click', event => {
      if (reduced || !details.animate) return;
      event.preventDefault();
      animation?.cancel();
      const opening = !details.open;
      const start = details.getBoundingClientRect().height;
      if (opening) details.open = true;
      const end = opening ? details.scrollHeight : summary.getBoundingClientRect().height;
      animation = details.animate([{ height: `${start}px` }, { height: `${end}px` }], {
        duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)'
      });
      animation.onfinish = () => { details.open = opening; animation = null; };
    });
  });

  const stage = document.querySelector('.studio-stage');
  if (stage) {
    const labels = ['01 / AI + 3D', '02 / Creator Reel', '03 / UGC Film'];
    const frames = [...stage.querySelectorAll('.stage-frames button')];
    const segments = [...stage.querySelectorAll('.edit-timeline button')];
    const discipline = stage.querySelector('.stage-discipline');
    const timecode = stage.querySelector('.stage-timecode');
    let active = -1, elapsed = 36, last = 0, ticker = 0;
    const display = () => {
      const frame = Math.floor(elapsed) % 24;
      const seconds = Math.floor(elapsed / 24);
      timecode.textContent = `00:${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}:${String(frame).padStart(2,'0')}`;
    };
    const tick = now => {
      if (last) elapsed += Math.min((now - last) * .024, 3);
      last = now; display(); ticker = requestAnimationFrame(tick);
    };
    const select = index => {
      active = index; discipline.textContent = labels[index];
      frames.forEach((el, i) => el.classList.toggle('is-active', i === index));
      segments.forEach((el, i) => el.classList.toggle('is-active', i === index));
    };
    const reset = () => { active = -1; discipline.textContent = 'Selected frames / 01'; frames.forEach(el => el.classList.remove('is-active')); segments.forEach(el => el.classList.remove('is-active')); };
    [...frames, ...segments].forEach((el, i) => {
      const index = i % 3;
      el.addEventListener('mouseenter', () => select(index));
      el.addEventListener('focus', () => select(index));
      el.addEventListener('mouseleave', reset);
      el.addEventListener('blur', reset);
      el.addEventListener('click', () => {
        const target = document.querySelector(`.tile[data-video="${frames[index].dataset.video}"]`);
        document.querySelector('#port')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
        if (target) { target.classList.add('stage-target'); setTimeout(() => target.classList.remove('stage-target'), 1800); }
      });
    });
    stage.addEventListener('mouseenter', () => { if (!reduced && !ticker) ticker = requestAnimationFrame(tick); });
    stage.addEventListener('mouseleave', () => { cancelAnimationFrame(ticker); ticker = 0; last = 0; reset(); });
    display();
  }

  document.querySelectorAll('.hero-stats b, .metrics .metric b').forEach(el => {
    const original = el.textContent.trim();
    const match = original.match(/^([\d,]+)(.*)$/);
    if (!match) return;
    const target = Number(match[1].replaceAll(',', ''));
    if (reduced) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const draw = now => {
        const t = Math.min(1, (now - start) / 1400);
        const value = Math.round(target * (1 - Math.pow(1 - t, 3)));
        el.textContent = value.toLocaleString('en-US') + match[2];
        if (t < 1) requestAnimationFrame(draw); else el.textContent = original;
      };
      requestAnimationFrame(draw);
    }, { threshold: .5 });
    observer.observe(el);
  });

  if (!reduced) document.querySelectorAll('#port .tile').forEach(tile => {
    const video = tile.querySelector('.tile-loop');
    if (!video) return;
    let frame = 0, x = 0, y = 0, targetX = 0, targetY = 0, tracking = false;
    const progressTick = () => {
      if (!tile.classList.contains('is-playing') || video.paused) { frame = 0; return; }
      tile.style.setProperty('--loop-progress', video.duration ? video.currentTime / video.duration : 0);
      frame = requestAnimationFrame(progressTick);
    };
    video.addEventListener('playing', () => { if (!frame) frame = requestAnimationFrame(progressTick); });
    video.addEventListener('pause', () => { cancelAnimationFrame(frame); frame = 0; });
    const move = () => {
      x += (targetX - x) * .2; y += (targetY - y) * .2;
      tile.style.setProperty('--reticle-x', `${x}px`);
      tile.style.setProperty('--reticle-y', `${y}px`);
      if (tracking) requestAnimationFrame(move);
    };
    tile.addEventListener('pointerenter', event => { if (event.pointerType !== 'mouse') return; const r = tile.getBoundingClientRect(); x = targetX = event.clientX - r.left; y = targetY = event.clientY - r.top; tracking = true; requestAnimationFrame(move); });
    tile.addEventListener('pointermove', event => { const r = tile.getBoundingClientRect(); targetX = Math.max(62, Math.min(r.width - 62, event.clientX - r.left)); targetY = Math.max(22, Math.min(r.height - 22, event.clientY - r.top)); }, { passive: true });
    tile.addEventListener('pointerleave', () => { tracking = false; });
  });
})();
