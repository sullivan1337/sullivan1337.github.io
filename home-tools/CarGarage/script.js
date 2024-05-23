let currentIndex = 0;

const carList = document.querySelector('.car-list');
const carItems = document.querySelectorAll('.car-item');
const thumbnails = document.querySelectorAll('.thumbnail');
const totalCars = carItems.length;

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

document.querySelector('.next').addEventListener('click', showNextCar);
document.querySelector('.prev').addEventListener('click', showPrevCar);

thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
        currentIndex = index;
        carList.style.transform = `translateX(-${currentIndex * 100}%)`;
        updateActiveClass();
    });
});

setInterval(showNextCar, 10000); // Change car every 10 seconds

window.addEventListener('resize', () => {
    // Reset the transform to ensure the correct car is displayed after a resize
    carList.style.transform = `translateX(-${currentIndex * 100}%)`;
});

// Initial setup
updateActiveClass();

// Popup functionality
const popup = document.getElementById('popup');
const popupImg = document.getElementById('popup-img');
const popupTriggers = document.querySelectorAll('.popup-trigger');
const popupClose = document.querySelector('.popup-close');

popupTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
        popup.style.display = 'flex';
        popupImg.src = trigger.src;
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
