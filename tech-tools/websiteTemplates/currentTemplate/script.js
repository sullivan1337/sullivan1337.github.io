// Dark mode toggle logic and template placeholder

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.remove('dark-mode');
      themeToggle.textContent = '🌙';
    } else {
      themeToggle.textContent = '☀️';
    }
  });
  
  document.getElementById('themeToggle').addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    this.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });
  
  // Placeholder for additional future JavaScript logic
  console.log("Template site loaded. Add your custom JavaScript here.");
  