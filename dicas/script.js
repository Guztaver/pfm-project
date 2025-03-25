
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('footer p');
    const year = new Date().getFullYear();
    footer.innerHTML = `&copy; ${year} Dicas de Mercado de Trabalho`;
});
