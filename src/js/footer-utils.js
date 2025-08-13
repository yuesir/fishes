// Footer utility - shared footer across all pages
// This creates and inserts the footer HTML dynamically

function createFooter() {
    const footer = document.createElement('footer');
    footer.id = 'footer-love';
    footer.style.cssText = 'text-align:center; margin:32px 0 12px 0; color:#888; font-size:1.05em;';
    
    footer.innerHTML = `
        Made with <span style="color:#e25555;">Love</span> by <a href="https://drawafish.online">drawafish.online</a>
    `;
    
    return footer;
}

function createSpecialFooter() {
    // Special footer for fishtank-view.html which has navigation links
    const footer = document.createElement('footer');
    footer.style.cssText = 'text-align:center; margin:32px 0 12px 0; color:#888; font-size:12px;';
    
    footer.innerHTML = `
        <a href="index.html" style="color: #0066cc; text-decoration: underline;">Draw</a>
        | <a href="tank.html" style="color: #0066cc; text-decoration: underline;">Public Tank</a>
        | <a href="rank.html" style="color: #0066cc; text-decoration: underline;">Rankings</a>
        | <a href="fishtanks.html" id="my-tanks-link" style="color: #0066cc; text-decoration: underline;">My Tanks</a>
        | <a href="login.html" id="auth-link" style="color: #0066cc; text-decoration: underline;">Login</a>
        <br>
    `;
    
    return footer;
}

function insertFooter(special = false) {
    // Remove any existing footer first
    const existingFooter = document.querySelector('#footer-love, footer');
    if (existingFooter) {
        existingFooter.remove();
    }
    
    // Create and insert the appropriate footer
    const footer = special ? createSpecialFooter() : createFooter();
    
    // Insert before the first script tag in the body, or at the end of body if no scripts
    const bodyScripts = document.querySelectorAll('body script');
    if (bodyScripts.length > 0) {
        bodyScripts[0].parentNode.insertBefore(footer, bodyScripts[0]);
    } else {
        document.body.appendChild(footer);
    }
    
    // Debug log to verify insertion
}

// Auto-initialize footer when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if this is fishtank-view.html based on the page structure or URL
    const isSpecialFooter = document.querySelector('#tank-content') !== null || 
                           window.location.pathname.includes('fishtank-view.html');
    
    insertFooter(isSpecialFooter);
    
});

// Export functions for manual usage if needed
window.footerUtils = {
    insertFooter,
    createFooter,
    createSpecialFooter
};
