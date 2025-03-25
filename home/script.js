window.onload = function() {
    alert('Vladmir pastelarias');
   
    setTimeout(function() {
        var audio = document.getElementById('audio');
        audio.play().catch(function(error) {
            console.log("Erro ao tocar o áudio:", error);
        });
    }, 500); 
};
