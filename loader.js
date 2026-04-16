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
                <div class="user-profile-menu" style="position: relative; display: inline-flex; align-items: center; gap: 10px; cursor: pointer; color: white;">
                    <i class="fas fa-user-circle" style="font-size: 1.2rem; color: var(--accent);"></i>
                    <span style="font-weight: 600;">${user.name.split(' ')[0]}</span>
                    <div class="user-drop" style="display: none; position: absolute; top: 100%; right: 0; background: white; color: #333; padding: 10px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 1000; width: 120px; margin-top: 5px;">
                        <a href="#" onclick="logoutUser()" style="display: block; padding: 8px; text-decoration: none; color: #ff4d4d; font-size: 14px; font-weight: 600;"><i class="fas fa-sign-out-alt"></i> Logout</a>
                    </div>
                </div>
            `;
        });
        
        // Toggle menu logic for all menus
        const menus = document.querySelectorAll('.user-profile-menu');
        menus.forEach(menu => {
            menu.addEventListener('click', function(e) {
                const drop = this.querySelector('.user-drop');
                if (drop) {
                    const isVisible = drop.style.display === 'block';
                    document.querySelectorAll('.user-drop').forEach(d => d.style.display = 'none'); // hide all
                    drop.style.display = isVisible ? 'none' : 'block';
                }
                e.stopPropagation();
            });
        });
        
        document.addEventListener('click', () => {
            document.querySelectorAll('.user-drop').forEach(drop => drop.style.display = 'none');
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
