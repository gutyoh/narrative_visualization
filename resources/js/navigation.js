document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case "ArrowLeft":
            if (window.location.href.includes("scene2")) {
                window.location.href = "scene1.html";
            } else if (window.location.href.includes("scene3")) {
                window.location.href = "scene2.html";
            }
            break;
        case "ArrowRight":
            if (window.location.href.includes("scene1")) {
                window.location.href = "scene2.html";
            } else if (window.location.href.includes("scene2")) {
                window.location.href = "scene3.html";
            }
            break;
    }
});
