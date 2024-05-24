let currentIndex = 0;
let isPaused = false;
let intervalId;

const carList = document.querySelector('.car-list');
const carItems = document.querySelectorAll('.car-item');
const thumbnails = document.querySelectorAll('.thumbnail');
const totalCars = carItems.length;
const pauseButton = document.querySelector('.pause');

function updateActiveClass() {
    carItems.forEach((item, index) => {
        item.classList.toggle('active', index === currentIndex);
    });
    thumbnails.forEach((thumbnail, index) => {
        thumbnail.classList.toggle('active', index === currentIndex);
    });
}

function showNextCar() {
    currentIndex = (currentIndex + 1) % totalCars;
    carList.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateActiveClass();
}

function showPrevCar() {
    currentIndex = (currentIndex - 1 + totalCars) % totalCars;
    carList.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateActiveClass();
}

function togglePause() {
    if (isPaused) {
        startCarousel();
        pauseButton.textContent = '||';
    } else {
        clearInterval(intervalId);
        pauseButton.textContent = '▶';
    }
    isPaused = !isPaused;
}

function startCarousel() {
    intervalId = setInterval(showNextCar, 10000); // Change car every 10 seconds
}

document.querySelector('.next').addEventListener('click', showNextCar);
document.querySelector('.prev').addEventListener('click', showPrevCar);
pauseButton.addEventListener('click', togglePause);

thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
        currentIndex = index;
        carList.style.transform = `translateX(-${currentIndex * 100}%)`;
        updateActiveClass();
    });
});

window.addEventListener('resize', () => {
    // Reset the transform to ensure the correct car is displayed after a resize
    carList.style.transform = `translateX(-${currentIndex * 100}%)`;
});

// Initial setup
updateActiveClass();
startCarousel();

// Popup functionality
const popup = document.getElementById('popup');
const popupImg = document.getElementById('popup-img');
const carouselImages = document.querySelectorAll('.carousel-img');
const popupClose = document.querySelector('.popup-close');

carouselImages.forEach(image => {
    image.addEventListener('click', () => {
        popup.style.display = 'flex';
        popupImg.src = image.src;
    });
});

popupClose.addEventListener('click', () => {
    popup.style.display = 'none';
});

popup.addEventListener('click', (e) => {
    if (e.target === popup) {
        popup.style.display = 'none';
    }
});
