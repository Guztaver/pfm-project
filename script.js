document.addEventListener('DOMContentLoaded', () => {
  // Update copyright year
  const year = new Date().getFullYear();
  const footerYear = document.querySelector('.footer-bottom p');
  if (footerYear) {
    footerYear.innerHTML = `&copy; ${year} PFM - Todos os direitos reservados.`;
  }
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Adjust for header height
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Animation on scroll for benefits
  const benefits = document.querySelectorAll('.benefit');
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = 1;
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  benefits.forEach(benefit => {
    benefit.style.opacity = 0;
    benefit.style.transform = 'translateY(30px)';
    benefit.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(benefit);
  });
});