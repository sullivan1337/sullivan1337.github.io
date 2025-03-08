// Show iframe and hide landing page
function showIframe(src) {
    document.getElementById('landing-page').style.display = 'none';
    const iframe = document.getElementById('content-frame');
    iframe.style.display = 'block';
    iframe.src = src;
  }
  
  // Show landing page and hide iframe
  function showLandingPage() {
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('content-frame').style.display = 'none';
  }
  
  // Generate dynamic tool tiles from nav buttons
  function generateToolList() {
    const toolSections = document.querySelectorAll('.section-content');
    toolSections.forEach(section => {
      const sectionId = section.id;
      const toolListDiv = document.getElementById(sectionId + '-list');
      if (!toolListDiv) return;
      const buttons = section.querySelectorAll('button');
      buttons.forEach(button => {
        const newButton = button.cloneNode(true);
        newButton.classList.add('tool-tile');
        const onClickAttr = newButton.getAttribute('onclick');
        const isNewTab = onClickAttr.includes('window.open');
        const urlMatch = onClickAttr.match(/'(.*?)'/);
        if (!urlMatch) return;
        const url = urlMatch[1];
        // Create iframe preview (optional)
        const iframePreview = document.createElement('iframe');
        iframePreview.src = url;
        iframePreview.className = 'tool-preview';
        iframePreview.setAttribute('scrolling', 'no');
        iframePreview.setAttribute('frameborder', '0');
        // Overlay to capture clicks
        const overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.addEventListener('click', () => {
          if (isNewTab) {
            window.open(url, '_blank');
          } else {
            showIframe(url);
          }
        });
        // Append preview elements
        const previewContainer = document.createElement('div');
        previewContainer.classList.add('tool-preview-container');
        previewContainer.appendChild(newButton);
        previewContainer.appendChild(iframePreview);
        previewContainer.appendChild(overlay);
        toolListDiv.appendChild(previewContainer);
      });
    });
  }
  
  // On page load, generate dynamic tool tiles
  document.addEventListener('DOMContentLoaded', () => {
    generateToolList();
  });
  