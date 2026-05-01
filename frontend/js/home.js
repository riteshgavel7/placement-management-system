const RENDER_URL = "https://placement-management-system-etjs.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    // 1. Mobile Hamburger Toggle
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinks.classList.toggle('active');
        menuToggle.classList.toggle('is-active');
    });

    // 2. Dropdown Toggle Logic (Mobile & Laptop)
    const dropbtns = document.querySelectorAll('.dropbtn');
    dropbtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Mobile par dropdown ko toggle karne ke liye
            if (window.innerWidth <= 992) {
                e.preventDefault();
                e.stopPropagation();
                const parent = btn.parentElement;
                
                // Pehle se khule hue dusre dropdowns band karein
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== parent) d.classList.remove('active');
                });

                // Current wale ko toggle karein
                parent.classList.toggle('active');
            }
        });
    });

    // 3. Bahar click karne par sab band ho jaye
    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
        if (navLinks.classList.contains('active') && window.innerWidth <= 992) {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('is-active');
        }
    });

    // Notices aur Slides ko load karein
    loadDynamicNotices();
    showSlides();
});

// ================== Dynamic Notices Load ==================
async function loadDynamicNotices() {
    const marquee = document.getElementById("homeMarquee");
    if (!marquee) return;

    try {
        const res = await fetch(`${RENDER_URL}/api/admin/notices`);
        if (!res.ok) throw new Error("Invalid server response.");
        const notices = await res.json();

        if (notices.length === 0) {
            marquee.innerHTML = "Currently, there are no new notices available.";
            return;
        }

        const noticeHTML = notices.map(n => {
            const pdfUrl = n.pdfPath ? `${RENDER_URL}${n.pdfPath}` : null;
            return `
                <div class="notice-item" style="margin-bottom: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">
                    <div style="font-weight: bold; color: #222;">• ${n.title}</div>
                    <div style="font-size: 13px; color: #555; margin: 3px 0;">${n.description}</div>
                    ${pdfUrl ? `<span onclick="event.stopPropagation(); window.open('${pdfUrl}', '_blank');" style="color:red; cursor:pointer; font-weight:bold; font-size: 12px; text-decoration:underline;">[View PDF]</span>` : ''}
                </div>`;
        }).join('');
        marquee.innerHTML = noticeHTML;
    } catch (err) {
        marquee.innerHTML = "Unable to load notices.";
    }
}

// ================== Image Slider ==================
let slideIndex = 0;
function showSlides() {
    let slides = document.getElementsByClassName("mySlides");
    if (slides.length === 0) return;
    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slideIndex++;
    if (slideIndex > slides.length) {slideIndex = 1}    
    slides[slideIndex-1].style.display = "block";
    setTimeout(showSlides, 3000);
}