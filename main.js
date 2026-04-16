document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // 2. Sidebar Toggle Logic
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('category-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    };
    if (openSidebarBtn) openSidebarBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // 3. Initialize Hero Swiper
    window.initHeroSwiper = () => {
        if (document.querySelector('.heroSwiper')) {
            new Swiper('.heroSwiper', {
                loop: true,
                autoplay: { delay: 6000, disableOnInteraction: false },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                effect: 'fade',
                fadeEffect: { crossFade: true },
                speed: 1000
            });
        }
    };
    initHeroSwiper();

    // 4. Hero Parallax
    document.addEventListener('mousemove', (e) => {
        const leaves = document.querySelectorAll('.parallax-leaf');
        const x = (window.innerWidth - e.pageX * 2) / 100;
        const y = (window.innerHeight - e.pageY * 2) / 100;
        leaves.forEach(leaf => {
            const speed = leaf.getAttribute('data-speed');
            leaf.style.transform = `translateX(${x * speed}px) translateY(${y * speed}px) rotate(${x * 10}deg)`;
        });
    });

    // 5. Cart Management is now handled by cart-manager.js

    // 7. Countdown Timer
    const timer = document.getElementById('timer');
    if (timer) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 3);
        function updateCountdown() {
            const now = new Date();
            const diff = endDate - now;
            if (diff <= 0) return;
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            const daysEl = document.getElementById('days');
            const hoursEl = document.getElementById('hours');
            const minsEl = document.getElementById('mins');
            const secsEl = document.getElementById('secs');
            if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
            if (minsEl) minsEl.textContent = String(m).padStart(2, '0');
            if (secsEl) secsEl.textContent = String(s).padStart(2, '0');
        }
        setInterval(updateCountdown, 1000);
        updateCountdown();
    }

    // 8. Reveal Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.cat-card, .feature-item, .section-header, .deal-card, .step-card, .testimonial-card, .about-feature, .about-preview-grid, .area-tag, .dh-item, .cta-card').forEach((el, i) => {
        el.classList.add('reveal');
        el.style.transitionDelay = `${(i % 5) * 0.1}s`;
        observer.observe(el);
    });

    // 9. Global Search Functionality
    const setupSearch = () => {
        const searchBars = document.querySelectorAll('.search-bar');
        searchBars.forEach(bar => {
            const input = bar.querySelector('input');
            const btn = bar.querySelector('button');
            const select = bar.querySelector('select');
            
            const performSearch = () => {
                let url = 'shop.html?';
                if (input && input.value.trim()) {
                    url += `search=${encodeURIComponent(input.value.trim())}&`;
                }
                if (select && select.value !== '0' && select.value !== '') {
                    // map select text to category name since shop.html filters by exact category string if we want
                    const catName = select.options[select.selectedIndex].text;
                    if(catName !== 'All Categories') {
                        url += `category=${encodeURIComponent(catName)}`;
                    }
                }
                window.location.href = url;
            };

            if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); performSearch(); });
            if (input) input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); performSearch(); }
            });
        });
    };
    setupSearch();
});
