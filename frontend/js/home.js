document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    const RENDER_URL = "https://placement-management-system-etjs.onrender.com";
    
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // Optional: Animate hamburger bars
        menuToggle.classList.toggle('is-active');
    });

    // Close dropdowns when clicking outside
    window.onclick = function(event) {
        if (!event.target.matches('.dropbtn')) {
            const dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                let openDropdown = dropdowns[i];
                if (openDropdown.style.display === "block") {
                    openDropdown.style.display = "none";
                }
            }
        }
    }
});
// ================== Dynamic Notices Load ==================
async function loadDynamicNotices() {
    const marquee = document.getElementById("homeMarquee");
    if (!marquee) {
        console.error("DOM Error: Marquee element 'homeMarquee' not found.");
        return;
    }

    try {
        console.log("Fetching notices...");
       const res = await fetch(`${RENDER_URL}/api/admin/notices`);
        
        if (!res.ok) throw new Error("Invalid server response.");
        
        const notices = await res.json();
        console.log("Notices Data:", notices); 

        if (notices.length === 0) {
            marquee.innerHTML = "Currently, there are no new notices available.";
            return;
        }

        // Marquee ko naye data se bharo
        const noticeHTML = notices.map(n => {
            const pdfUrl = n.pdfPath ? `${RENDER_URL}${n.pdfPath}` : null;
            
            return `
                <div class="notice-item" style="margin-bottom: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">
                    <div style="font-weight: bold; color: #222;">• ${n.title}</div>
                    <div style="font-size: 13px; color: #555; margin: 3px 0;">${n.description}</div>
                    ${pdfUrl ? `
                        <span onclick="event.stopPropagation(); window.open('${pdfUrl}', '_blank');" 
                              style="color:red; cursor:pointer; font-weight:bold; font-size: 12px; text-decoration:underline; display:inline-block;">
                            [View PDF]
                        </span>` : ''}
                </div>
            `;
        }).join('');

        marquee.innerHTML = noticeHTML;

    } catch (err) {
        console.error("Notice load error:", err);
        marquee.innerHTML = "Unable to load notices. Please refresh the page.";
    }
}
document.addEventListener("DOMContentLoaded", loadDynamicNotices);

let slideIndex = 0;
function showSlides() {
    let slides = document.getElementsByClassName("mySlides");
    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  // Sabko chhupao
    }
    slideIndex++;
    if (slideIndex > slides.length) {slideIndex = 1}    
    slides[slideIndex-1].style.display = "block";  // Ek ko dikhao
    setTimeout(showSlides, 3000); // Har 3 second mein badlo
}

// Page load hote hi chalu karo
document.addEventListener('DOMContentLoaded', showSlides);