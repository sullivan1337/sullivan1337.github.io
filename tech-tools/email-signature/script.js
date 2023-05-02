const generateButton = document.getElementById('generate');
const formContainer = document.querySelector('.form-container');
const signature = document.querySelector('.signature');
const logoUpload = document.getElementById('logo-upload');
const logoPreview = document.getElementById('logo-preview');
const logo = document.getElementById('logo');

logoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            logoPreview.innerHTML = '';
            logoPreview.appendChild(img);
            logo.src = event.target.result;
        };
        img.src = event.target.result;
        img.width = 100;
        img.height = 100;
    };

    reader.readAsDataURL(file);
});

generateButton.addEventListener('click', () => {
    const name = document.getElementById('name').value;
    const title = document.getElementById('title').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;

    if (!name || !title || !phone || !email) {
        alert('Please fill in all fields.');
        return;
    }

    signature.querySelector('.name').innerText = name;
    signature.querySelector('.title').innerText = title;
    signature.querySelector('.phone').innerText = `Phone: ${phone}`;
    signature.querySelector('.email').innerText = `Email: ${email}`;

    formContainer.style.display = 'none';
    signature.style.display = 'flex';
});

// Animate the logo
let rotation = 0;
const animationSpeed = 0.02;

function animateLogo() {
    if (!logo.complete || logo.naturalWidth === 0 || logo.naturalHeight === 0) {
        requestAnimationFrame(animateLogo);
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = Math.max(logo.naturalWidth, logo.naturalHeight);
    canvas.width = size;
    canvas.height = size;

    ctx.translate(size / 2, size / 2);
    ctx.rotate(rotation);
    ctx.drawImage(logo, -logo.naturalWidth / 2, -logo.naturalHeight / 2);

    logo.src = canvas.toDataURL();

    rotation += animationSpeed;
    requestAnimationFrame(animateLogo);
}

animateLogo();
