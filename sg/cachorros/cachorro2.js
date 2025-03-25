window.onload = function() {
    var button = document.getElementById('randomButton');
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;

    var randomX = Math.random() * (screenWidth - 100);
    var randomY = Math.random() * (screenHeight - 50);

    button.style.left = randomX + 'px';
    button.style.top = randomY + 'px';
};
