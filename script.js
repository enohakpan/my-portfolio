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
    const skillProjects = details.querySelector('.skill-projects');

    // Update content based on skill type
    switch(skillType) {
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
                <h4>Proficiency Level: Advanced</h4>
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
                <h4>Proficiency Level: Advanced</h4>
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
                <h4>Proficiency Level: Advanced</h4>
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

// Hamburger menu functionality
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.querySelector('.menu-btn');
    const nav = document.querySelector('nav');

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
