document.addEventListener("DOMContentLoaded", function() {
    let currentIndex = 0;
    const carList = document.querySelector(".car-list");
    const carItems = document.querySelectorAll(".car-item");
    const totalItems = carItems.length;
    const thumbnails = document.querySelectorAll(".thumbnail");
    const pauseButton = document.querySelector(".nav.pause");
    let isPaused = false;
    let autoRotateInterval;

    function showItem(index) {
        carList.style.transform = `translateX(-${index * 100}%)`;
        carItems.forEach(item => item.classList.remove("active"));
        carItems[index].classList.add("active");
        thumbnails.forEach(thumb => thumb.classList.remove("active"));
        thumbnails[index].classList.add("active");
    }

    function nextItem() {
        currentIndex = (currentIndex + 1) % totalItems;
        showItem(currentIndex);
    }

    function prevItem() {
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
        showItem(currentIndex);
    }

    function autoRotate() {
        if (!isPaused) {
            nextItem();
        }
    }

    function startAutoRotate() {
        autoRotateInterval = setInterval(autoRotate, 10000); // 10 seconds
    }

    function stopAutoRotate() {
        clearInterval(autoRotateInterval);
    }

    document.querySelector(".nav.next").addEventListener("click", nextItem);
    document.querySelector(".nav.prev").addEventListener("click", prevItem);
    pauseButton.addEventListener("click", function() {
        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? "▶" : "||";
    });

    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener("click", function() {
            currentIndex = index;
            showItem(currentIndex);
        });
    });

    // Add touch and drag functionality
    let startX, endX;

    carList.addEventListener("touchstart", function(event) {
        startX = event.touches[0].clientX;
    });

    carList.addEventListener("touchend", function(event) {
        endX = event.changedTouches[0].clientX;
        handleSwipe();
    });

    carList.addEventListener("mousedown", function(event) {
        startX = event.clientX;
        carList.style.cursor = "grabbing";
    });

    carList.addEventListener("mouseup", function(event) {
        endX = event.clientX;
        carList.style.cursor = "grab";
        handleSwipe();
    });

    function handleSwipe() {
        if (startX > endX + 50) {
            nextItem();
        } else if (startX < endX - 50) {
            prevItem();
        }
    }

    // Popup functionality
    const popup = document.getElementById("popup");
    const popupImg = document.getElementById("popup-img");
    const popupClose = document.querySelector(".popup-close");

    document.querySelectorAll(".popup-trigger").forEach(item => {
        item.addEventListener("click", function() {
            popup.style.display = "flex";
            popupImg.src = this.src;
        });
    });

    popupClose.addEventListener("click", function() {
        popup.style.display = "none";
    });

    popup.addEventListener("click", function(event) {
        if (event.target === popup || event.target === popupImg) {
            popup.style.display = "none";
        }
    });

    // Initialize carousel
    showItem(currentIndex);
    startAutoRotate();
});
