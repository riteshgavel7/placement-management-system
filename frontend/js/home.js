const RENDER_URL = "https://placement-management-system-etjs.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Hamburger Menu Toggle
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if(menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
        });
    }

    // 2. Dropdown Toggle (GGU Style)
    const dropbtns = document.querySelectorAll('.dropbtn');
    dropbtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                e.preventDefault();
                e.stopPropagation();
                const parent = btn.parentElement;

                // Toggle current one
                parent.classList.toggle('active');

                // Close others
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== parent) d.classList.remove('active');
                });
            }
        });
    });

    // 3. Click outside to close
    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
    });

    // Load Features
    loadDynamicNotices();
    showSlides();
});

// Slider Logic
let slideIndex = 0;
function showSlides() {
    let slides = document.getElementsByClassName("mySlides");
    if (slides.length === 0) return;
    for (let i = 0; i < slides.length; i++) slides[i].style.display = "none";
    slideIndex++;
    if (slideIndex > slides.length) slideIndex = 1;
    slides[slideIndex-1].style.display = "block";
    setTimeout(showSlides, 3000);
}

// Notices Logic
async function loadDynamicNotices() {
    const marquee = document.getElementById("homeMarquee");
    if (!marquee) return;
    try {
        const res = await fetch(`${RENDER_URL}/api/admin/notices`);
        const notices = await res.json();
        if (notices.length === 0) {
            marquee.innerHTML = "No new notices.";
            return;
        }
        marquee.innerHTML = notices.map(n => `
            <div class="notice-item" style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>• ${n.title}</strong><br>${n.description}
            </div>`).join('');
    } catch (err) {
        marquee.innerHTML = "Error loading notices.";
    }
}