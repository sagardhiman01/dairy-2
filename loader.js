// loader.js - Global Dynamic Content Loader for Vaishnavi Mava Bhandar

const loadSiteSettings = async () => {
    try {
        const settings = await fetch('/api/settings').then(r => r.json());
        
        // Do NOT overwrite the logo-text since it has styled span children
        // Logo is hardcoded in HTML as "VAISHNAVI <span>MAVA BHANDAR</span>"
        
        // Update Contact Info (Header & Footer)
        const phoneEl = document.querySelector('.top-right span i.fa-phone')?.parentElement;
        if (phoneEl) phoneEl.innerHTML = `<i class="fas fa-phone"></i> ${settings.contact_phone}`;

        const footerPhone = document.querySelector('.footer-col.contact .contact-item i.fa-phone')?.nextElementSibling;
        if (footerPhone) footerPhone.textContent = settings.contact_phone;

        const footerEmail = document.querySelector('.footer-col.contact .contact-item i.fa-envelope')?.nextElementSibling;
        if (footerEmail) footerEmail.textContent = settings.contact_email;

        const footerAddress = document.querySelector('.footer-col.contact .contact-item i.fa-location-dot')?.nextElementSibling;
        if (footerAddress) footerAddress.textContent = settings.contact_address;

        // Insta Link
        const instaLink = document.querySelector('a[href*="instagram.com"]');
        if (instaLink && settings.instagram_url) instaLink.href = settings.instagram_url;

    } catch (err) {
        console.error("Failed to load settings:", err);
    }
};

const loadHeroSlides = async () => {
    // Hero slides are now static in HTML — no dynamic loading needed
    // This prevents the "Loading..." placeholder issue on Render
    return;
};

const loadTestimonials = async () => {
    const testimonialGrid = document.querySelector('.testimonials-grid');
    if (!testimonialGrid) return;

    try {
        const reviews = await fetch('/api/testimonials').then(r => r.json());
        if (reviews.length === 0) return;

        testimonialGrid.innerHTML = reviews.map((r, i) => `
            <div class="testimonial-card ${i === 1 ? 'featured' : ''}">
                <div class="stars">
                    ${Array(r.rating).fill('<i class="fas fa-star"></i>').join('')}
                </div>
                <p class="testimonial-text">"${r.text}"</p>
                <div class="testimonial-author">
                    <div class="author-avatar"><i class="fas fa-user-circle"></i></div>
                    <div>
                        <h4>${r.name}</h4>
                        <span>${r.location}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Failed to load testimonials:", err);
    }
};

const checkUserAuth = () => {
    const userData = localStorage.getItem('user_data');
    const authLinks = document.querySelectorAll('a[href="login.html"]');
    
    if (userData && authLinks.length > 0) {
        const user = JSON.parse(userData);
        authLinks.forEach(authLink => {
            authLink.outerHTML = `
                <div style="display: inline-flex; align-items: center; gap: 15px; color: var(--text-main);">
                    <div style="display: flex; align-items: center; gap: 5px; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-user-circle" style="font-size: 1.2rem; color: var(--accent);"></i>
                        ${user.name.split(' ')[0]}
                    </div>
                    <button onclick="logoutUser()" style="background: linear-gradient(45deg, #ff416c, #ff4b2b); color: white; border: none; padding: 6px 14px; border-radius: 20px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 15px rgba(255, 65, 108, 0.4); animation: pulseLogout 2s infinite; transition: transform 0.2s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-power-off"></i> Logout
                    </button>
                    <style>
                        @keyframes pulseLogout {
                            0% { box-shadow: 0 0 0 0 rgba(255, 65, 108, 0.4); }
                            70% { box-shadow: 0 0 0 10px rgba(255, 65, 108, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(255, 65, 108, 0); }
                        }
                    </style>
                </div>
            `;
        });
    }
};

window.logoutUser = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    window.location.reload();
};

// Site-wide init
document.addEventListener('DOMContentLoaded', () => {
    loadSiteSettings();
    loadHeroSlides();
    loadTestimonials();
    checkUserAuth();
});
