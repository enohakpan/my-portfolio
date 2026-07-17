// Skill card functionality
document.querySelectorAll('.skill-card').forEach(card => {
    card.addEventListener('click', function() {
        const overlay = document.querySelector('.skill-overlay');
        const details = overlay.querySelector('.skill-details');
        
        // Update content based on clicked skill
        const skillType = this.getAttribute('data-skill');
        updateSkillDetails(skillType);
        
        // Show overlay
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

// Close overlay when clicking close button or outside content
document.querySelector('.close-overlay').addEventListener('click', closeOverlay);
document.querySelector('.skill-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeOverlay();
    }
});

function closeOverlay() {
    const overlay = document.querySelector('.skill-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function updateSkillDetails(skillType) {
    const details = document.querySelector('.skill-details');
    const skillInfo = details.querySelector('.skill-info');

    // Update content based on skill type
    switch(skillType) {
        case 'typescript':
            skillInfo.innerHTML = `
                <h4>Proficiency Level: Advanced</h4>
                <ul>
                    <li>Type-safe React & Next.js development</li>
                    <li>Interfaces, generics, and strict typing</li>
                    <li>Production bug fixes and feature development</li>
                    <li>API integration with typed responses</li>
                </ul>
            `;
            break;
        case 'nextjs':
            skillInfo.innerHTML = `
                <h4>Proficiency Level: Advanced</h4>
                <ul>
                    <li>App Router & Server Components</li>
                    <li>SSR, SSG, and API routes</li>
                    <li>Deployment on AWS & Render</li>
                    <li>Performance optimization</li>
                </ul>
            `;
            break;
        case 'html':
            skillInfo.innerHTML = `
                <h4>Proficiency Level: Advanced</h4>
                <ul>
                    <li>Semantic HTML5 elements</li>
                    <li>Accessibility best practices</li>
                    <li>SEO optimization</li>
                    <li>Form validation</li>
                </ul>
            `;
            break;
        case 'css':
            skillInfo.innerHTML = `
                <h4>Proficiency Level: Intermediate</h4>
                <ul>
                    <li>CSS Grid and Flexbox</li>
                    <li>CSS Animations and Transitions</li>
                    <li>Responsive Design</li>
                    <li>CSS Preprocessors (SASS)</li>
                </ul>
            `;
            break;
        case 'javascript':
            skillInfo.innerHTML = `
                <h4>Proficiency Level: Intermediate</h4>
                <ul>
                    <li>ES6+ Features</li>
                    <li>DOM Manipulation</li>
                    <li>Async Programming</li>
                    <li>API Integration</li>
                </ul>
            `;
            break;
        case 'react':
            skillInfo.innerHTML = `
                <h4>Proficiency Level: Intermediate</h4>
                <ul>
                    <li>React Hooks</li>
                    <li>State Management</li>
                    <li>Component Architecture</li>
                    <li>React Router</li>
                </ul>
            `;
            break;
    }
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    const themeToggle = document.querySelector('.theme-toggle');

    document.body.classList.toggle('dark-mode', isDark);

    if (themeToggle) {
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('portfolio-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    const themeToggle = document.querySelector('.theme-toggle');

    applyTheme(activeTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            localStorage.setItem('portfolio-theme', nextTheme);
            applyTheme(nextTheme);
        });
    }
}

function initializeTiltCards() {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return;

    const cards = document.querySelectorAll('.skill-card, .project-card, .education-card, .contact-card, .timeline-content, .skill-category');

    cards.forEach(card => {
        card.classList.add('tilt-card');

        card.addEventListener('mousemove', event => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const rotateY = ((x / rect.width) - 0.5) * 10;
            const rotateX = ((0.5 - (y / rect.height)) * 10);

            card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

function initializeRevealAnimations() {
    const animatedItems = document.querySelectorAll('.timeline-item, .skill-category, .skill-card, .project-card, .education-card, .contact-card');

    if (!('IntersectionObserver' in window)) {
        animatedItems.forEach(item => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    animatedItems.forEach(item => observer.observe(item));
}

function initializeCertificateViewer() {
    const viewer = document.getElementById('cert-viewer');
    if (!viewer) return;

    const iframe = document.getElementById('cert-iframe');
    const frame = document.getElementById('cert-frame');
    const viewport = viewer.querySelector('.cert-viewer__viewport');
    const titleEl = document.getElementById('cert-viewer-title');
    const downloadLink = document.getElementById('cert-download');
    const zoomLabel = document.getElementById('cert-zoom-label');
    const zoomInBtn = document.getElementById('cert-zoom-in');
    const zoomOutBtn = document.getElementById('cert-zoom-out');
    const triggers = document.querySelectorAll('.cert-viewer-trigger');

    let zoom = 1;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    function setZoom(nextZoom) {
        zoom = Math.min(2, Math.max(0.75, nextZoom));
        iframe.style.transform = `scale(${zoom})`;
        iframe.style.width = `${100 / zoom}%`;
        iframe.style.height = `${100 / zoom}%`;
        zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    }

    function openViewer(certPath, title) {
        titleEl.textContent = title || 'Certificate';
        downloadLink.href = certPath;
        iframe.src = `${certPath}#toolbar=0&navpanes=0&scrollbar=0`;
        setZoom(1);
        viewer.classList.add('active');
        viewer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeViewer() {
        viewer.classList.remove('active');
        viewer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        iframe.src = '';
        setZoom(1);
    }

    triggers.forEach(trigger => {
        trigger.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            openViewer(trigger.dataset.cert, trigger.dataset.title);
        });
    });

    viewer.querySelectorAll('[data-cert-close]').forEach(el => {
        el.addEventListener('click', closeViewer);
    });

    zoomInBtn.addEventListener('click', () => setZoom(zoom + 0.15));
    zoomOutBtn.addEventListener('click', () => setZoom(zoom - 0.15));

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && viewer.classList.contains('active')) {
            closeViewer();
        }
    });

    viewport.addEventListener('mousedown', event => {
        isDragging = true;
        viewport.classList.add('is-dragging');
        startX = event.pageX - viewport.offsetLeft;
        startY = event.pageY - viewport.offsetTop;
        scrollLeft = viewport.scrollLeft;
        scrollTop = viewport.scrollTop;
    });

    viewport.addEventListener('mouseleave', () => {
        isDragging = false;
        viewport.classList.remove('is-dragging');
    });

    viewport.addEventListener('mouseup', () => {
        isDragging = false;
        viewport.classList.remove('is-dragging');
    });

    viewport.addEventListener('mousemove', event => {
        if (!isDragging) return;
        event.preventDefault();
        const x = event.pageX - viewport.offsetLeft;
        const y = event.pageY - viewport.offsetTop;
        viewport.scrollLeft = scrollLeft - (x - startX);
        viewport.scrollTop = scrollTop - (y - startY);
    });

    // Soft 3D tilt on the framed certificate (desktop only)
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (canHover) {
        frame.addEventListener('mousemove', event => {
            if (!viewer.classList.contains('active')) return;
            const rect = frame.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            const rotateY = (x - 0.5) * 8;
            const rotateX = (0.5 - y) * 6;
            frame.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            frame.style.animation = 'none';
        });

        frame.addEventListener('mouseleave', () => {
            frame.style.transform = '';
            frame.style.animation = '';
        });
    }
}

// Hamburger menu functionality
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.querySelector('.menu-btn');
    const nav = document.querySelector('nav');
    initializeTheme();
    initializeTiltCards();
    initializeRevealAnimations();
    initializeCertificateViewer();

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('open');
        nav.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !nav.contains(e.target)) {
            menuBtn.classList.remove('open');
            nav.classList.remove('active');
        }
    });

    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('open');
            nav.classList.remove('active');
        });
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const headerOffset = 80; // Height of your fixed header
            const elementPosition = targetSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});
