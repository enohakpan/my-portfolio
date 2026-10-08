const SECTION_LINKS = document.querySelectorAll('[data-section]');
const PAGE_LABEL = document.getElementById('page-label');

function pad(value) {
    return String(value).padStart(2, '0');
}

function initClock() {
    const clock = document.getElementById('clock');
    if (!clock) return;
    const render = () => {
        const now = new Date();
        clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        clock.dateTime = now.toISOString();
    };
    render();
    setInterval(render, 1000);
}

function initSound() {
    const button = document.getElementById('sound-toggle');
    const label = document.getElementById('sound-label');
    const canvas = document.getElementById('sound-wave');
    if (!button || !canvas) return;

    const ctx2d = canvas.getContext('2d');
    let audioCtx = null;
    let master = null;
    let analyser = null;
    let enabled = false;
    const bins = new Uint8Array(32);

    function ensureAudio() {
        if (audioCtx) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
        master = audioCtx.createGain();
        master.gain.value = 0;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 380;
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;

        const low = audioCtx.createOscillator();
        const high = audioCtx.createOscillator();
        low.type = 'sine';
        high.type = 'triangle';
        low.frequency.value = 73.42;
        high.frequency.value = 110;
        const lowGain = audioCtx.createGain();
        const highGain = audioCtx.createGain();
        lowGain.gain.value = 0.32;
        highGain.gain.value = 0.08;
        low.connect(lowGain).connect(filter);
        high.connect(highGain).connect(filter);
        filter.connect(analyser).connect(master).connect(audioCtx.destination);
        low.start();
        high.start();
    }

    function setSound(next) {
        ensureAudio();
        enabled = next;
        if (next) audioCtx.resume();
        const now = audioCtx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.linearRampToValueAtTime(next ? 0.04 : 0, now + 0.35);
        if (!next) {
            window.setTimeout(() => {
                if (!enabled) audioCtx.suspend();
            }, 400);
        }
        button.setAttribute('aria-pressed', String(next));
        label.textContent = next ? 'ON' : 'OFF';
    }

    let waveTimer = 0;

    function paint(time) {
        const width = canvas.width;
        const height = canvas.height;
        ctx2d.clearRect(0, 0, width, height);
        ctx2d.strokeStyle = 'rgba(140, 225, 255, 0.9)';
        ctx2d.lineWidth = 1.4;
        ctx2d.beginPath();
        if (enabled && analyser) {
            analyser.getByteTimeDomainData(bins);
            for (let index = 0; index < bins.length; index += 1) {
                const x = (index / (bins.length - 1)) * width;
                const y = (bins[index] / 255) * height;
                if (index === 0) ctx2d.moveTo(x, y);
                else ctx2d.lineTo(x, y);
            }
        } else {
            ctx2d.moveTo(0, height / 2);
            ctx2d.bezierCurveTo(width * 0.25, height * 0.2, width * 0.55, height * 0.85, width, height / 2);
        }
        ctx2d.stroke();
    }

    function setWave(next) {
        if (waveTimer) {
            clearInterval(waveTimer);
            waveTimer = 0;
        }
        if (next) waveTimer = window.setInterval(() => paint(performance.now()), 90);
        else paint(0);
    }

    button.addEventListener('click', () => {
        setSound(!enabled);
        setWave(enabled);
    });
    paint(0);
}

function initNavigation() {
    const sections = [...document.querySelectorAll('main section')];

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', event => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const setActive = (id) => {
        SECTION_LINKS.forEach(link => {
            const on = link.dataset.section === id;
            link.classList.toggle('is-active', on);
            if (link.closest('.rail-nav')) {
                if (on) link.setAttribute('aria-current', 'page');
                else link.removeAttribute('aria-current');
            }
        });
        const section = document.getElementById(id);
        if (section && PAGE_LABEL) PAGE_LABEL.textContent = section.dataset.label || 'MAIN';
    };

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setActive(visible.target.id);
        }, { threshold: [0.35, 0.55], rootMargin: '-10% 0px -35% 0px' });
        sections.forEach(section => observer.observe(section));
    }
}

function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        items.forEach(item => item.classList.add('is-in'));
        return;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.18 });
    items.forEach(item => observer.observe(item));
}

function initViewer() {
    const stage = document.getElementById('viewer-stage');
    if (!stage) return;

    const allCards = [...stage.querySelectorAll('.viewer-card')];
    const filters = [...document.querySelectorAll('.viewer-filters button')];
    const title = document.getElementById('viewer-title');
    const role = document.getElementById('viewer-role');
    const summary = document.getElementById('viewer-summary');
    const tags = document.getElementById('viewer-tags');
    const live = document.getElementById('viewer-live');
    const code = document.getElementById('viewer-code');
    const indexLabel = document.getElementById('viewer-index');
    const pos = document.getElementById('viewer-pos');
    const total = document.getElementById('viewer-total');
    const timeLabel = document.getElementById('viewer-time');
    const bar = document.getElementById('viewer-progress-bar');
    const pauseBtn = document.getElementById('viewer-pause');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let filter = 'all';
    let index = 0;
    let playing = !reduced;
    let elapsed = 0;
    let last = performance.now();
    const duration = 8000;

    const visibleCards = () => allCards.filter(card => !card.classList.contains('is-hidden'));

    function applyFilter(next) {
        filter = next;
        filters.forEach(button => button.classList.toggle('is-active', button.dataset.filter === next));
        allCards.forEach(card => {
            const show = next === 'all' || card.dataset.filter === next;
            card.classList.toggle('is-hidden', !show);
        });
        index = 0;
        elapsed = 0;
        layout();
    }

    function layout() {
        const cards = visibleCards();
        const count = cards.length;
        if (!count) return;
        index = (index + count) % count;
        cards.forEach((card, cardIndex) => {
            const delta = (cardIndex - index + count) % count;
            card.classList.remove('is-current', 'is-prev', 'is-next', 'is-far');
            if (delta === 0) card.classList.add('is-current');
            else if (delta === count - 1) card.classList.add('is-prev');
            else if (delta === 1) card.classList.add('is-next');
            else card.classList.add('is-far');
        });

        const current = cards[index];
        title.textContent = current.querySelector('.card-title').textContent;
        role.textContent = current.querySelector('.card-role').textContent.toUpperCase();
        summary.textContent = current.querySelector('.card-summary').textContent;
        tags.innerHTML = current.querySelector('.card-tags').textContent
            .split(',')
            .map(tag => `<span>${tag.trim()}</span>`)
            .join('');
        const liveLink = current.querySelector('.card-live');
        const codeLink = current.querySelector('.card-code');
        live.href = liveLink.href;
        live.hidden = false;
        if (codeLink) {
            code.href = codeLink.href;
            code.hidden = false;
        } else {
            code.hidden = true;
        }
        const numeral = pad(index + 1);
        indexLabel.textContent = numeral;
        pos.textContent = numeral;
        total.textContent = pad(count);
    }

    function step(direction) {
        index += direction;
        elapsed = 0;
        layout();
    }

    filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
    document.querySelector('.viewer-next').addEventListener('click', () => step(1));
    document.querySelector('.viewer-prev').addEventListener('click', () => step(-1));

    stage.addEventListener('click', event => {
        const card = event.target.closest('.viewer-card');
        if (!card || card.classList.contains('is-hidden')) return;
        const cards = visibleCards();
        const next = cards.indexOf(card);
        if (next < 0 || next === index) return;
        index = next;
        elapsed = 0;
        layout();
    });

    let touchX = 0;
    stage.addEventListener('touchstart', event => {
        touchX = event.changedTouches[0].clientX;
    }, { passive: true });
    stage.addEventListener('touchend', event => {
        const delta = event.changedTouches[0].clientX - touchX;
        if (Math.abs(delta) > 40) step(delta < 0 ? 1 : -1);
    }, { passive: true });

    pauseBtn.addEventListener('click', () => {
        playing = !playing;
        pauseBtn.setAttribute('aria-pressed', String(!playing));
        pauseBtn.setAttribute('aria-label', playing ? 'Pause projects' : 'Play projects');
        pauseBtn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${playing ? 'pause' : 'play'}"></use></svg>`;
    });

    const viewer = document.querySelector('.viewer');
    viewer.addEventListener('mouseenter', () => { viewer.dataset.hover = 'true'; });
    viewer.addEventListener('mouseleave', () => { viewer.dataset.hover = 'false'; });

    document.addEventListener('keydown', event => {
        const projects = document.getElementById('projects');
        const rect = projects.getBoundingClientRect();
        const onScreen = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.3;
        if (!onScreen) return;
        if (event.key === 'ArrowRight') step(1);
        if (event.key === 'ArrowLeft') step(-1);
    });

    let timer = 0;
    const projects = document.getElementById('projects');

    function tick() {
        const now = performance.now();
        const delta = now - last;
        last = now;
        const hovered = viewer.dataset.hover === 'true';
        if (playing && !hovered && !document.hidden) elapsed += delta;
        if (elapsed >= duration) {
            elapsed = 0;
            index += 1;
            layout();
        }
        const seconds = Math.min(8, Math.floor(elapsed / 1000));
        timeLabel.textContent = `00:${pad(seconds)} / 00:08`;
        bar.style.width = `${(elapsed / duration) * 100}%`;
    }

    function startTicker() {
        if (timer) return;
        last = performance.now();
        timer = window.setInterval(tick, 120);
    }

    function stopTicker() {
        clearInterval(timer);
        timer = 0;
    }

    if (projects && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !document.hidden) startTicker();
            else stopTicker();
        }, { threshold: 0.2 });
        observer.observe(projects);
    } else {
        startTicker();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopTicker();
        else if (projects && projects.getBoundingClientRect().bottom > 0 && projects.getBoundingClientRect().top < window.innerHeight) startTicker();
    });

    layout();
}

const SKILL_COPY = {
    typescript: ['Type-safe React and Next.js development', 'Interfaces, generics, and strict typing', 'Production bug fixes and feature development', 'API integration with typed responses'],
    nextjs: ['App Router and server rendering', 'Interfaces that stay fast after launch', 'Deployment on AWS and Render', 'Performance work on real product paths'],
    react: ['Hooks and component architecture', 'State that stays predictable', 'Responsive product screens', 'Interfaces built to be used, not just viewed'],
    javascript: ['ES6+ and async flows', 'DOM behavior under the framework', 'API integration', 'Debugging production issues'],
    html: ['Semantic HTML5', 'Accessibility in the markup', 'Structure that stays readable', 'Forms and content hierarchy'],
    css: ['Layout with modern CSS', 'Responsive breakpoints', 'Motion that explains the interface', 'The visual system of this portfolio']
};

function initSkills() {
    const overlay = document.querySelector('.skill-overlay');
    const info = overlay.querySelector('.skill-info');
    const close = overlay.querySelector('.close-overlay');

    function open(skill) {
        const lines = SKILL_COPY[skill] || [];
        info.innerHTML = `<h4 id="skill-dialog-title">${skill}</h4><ul>${lines.map(line => `<li>${line}</li>`).join('')}</ul>`;
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        close.focus();
    }

    function closeOverlay() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.skill-card').forEach(card => {
        card.addEventListener('click', () => open(card.dataset.skill));
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open(card.dataset.skill);
            }
        });
    });

    close.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) closeOverlay();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
    });
}

function initCertificate() {
    const viewer = document.getElementById('cert-viewer');
    if (!viewer) return;

    const iframe = document.getElementById('cert-iframe');
    const viewport = viewer.querySelector('.cert-viewer__viewport');
    const title = document.getElementById('cert-viewer-title');
    const download = document.getElementById('cert-download');
    const zoomLabel = document.getElementById('cert-zoom-label');
    let zoom = 1;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    function setZoom(next) {
        zoom = Math.min(2, Math.max(0.75, next));
        iframe.style.transform = `scale(${zoom})`;
        iframe.style.width = `${100 / zoom}%`;
        iframe.style.height = `${100 / zoom}%`;
        zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    }

    function open(path, name) {
        title.textContent = name || 'Certificate';
        download.href = path;
        iframe.src = `${path}#toolbar=0&navpanes=0&scrollbar=0`;
        setZoom(1);
        viewer.classList.add('active');
        viewer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        viewer.classList.remove('active');
        viewer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        iframe.src = '';
        setZoom(1);
    }

    document.querySelectorAll('.cert-viewer-trigger').forEach(trigger => {
        trigger.addEventListener('click', event => {
            event.preventDefault();
            open(trigger.dataset.cert, trigger.dataset.title);
        });
    });

    viewer.querySelectorAll('[data-cert-close]').forEach(el => el.addEventListener('click', close));
    document.getElementById('cert-zoom-in').addEventListener('click', () => setZoom(zoom + 0.15));
    document.getElementById('cert-zoom-out').addEventListener('click', () => setZoom(zoom - 0.15));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && viewer.classList.contains('active')) close();
    });

    viewport.addEventListener('pointerdown', event => {
        dragging = true;
        viewport.classList.add('is-dragging');
        viewport.setPointerCapture(event.pointerId);
        startX = event.clientX;
        startY = event.clientY;
        scrollLeft = viewport.scrollLeft;
        scrollTop = viewport.scrollTop;
    });
    viewport.addEventListener('pointerup', () => {
        dragging = false;
        viewport.classList.remove('is-dragging');
    });
    viewport.addEventListener('pointermove', event => {
        if (!dragging) return;
        viewport.scrollLeft = scrollLeft - (event.clientX - startX);
        viewport.scrollTop = scrollTop - (event.clientY - startY);
    });
}

function initEmail() {
    document.querySelectorAll('[data-email]').forEach(link => {
        link.addEventListener('click', event => {
            const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
            if (!touch) return;
            event.preventDefault();
            window.location.href = `mailto:${link.dataset.email}`;
        });
    });
}

initEmail();
initClock();
initSound();
initNavigation();
initReveal();
initViewer();
initSkills();
initCertificate();
