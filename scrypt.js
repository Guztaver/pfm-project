document.addEventListener("DOMContentLoaded", function() {
    const pages = document.querySelectorAll("main"); 
  
    pages.forEach(page => {
      page.classList.add('fade-in');
      page.addEventListener('animationend', () => {
        page.classList.remove('fade-in');
      });
    });
  });
  