// Toggle visibility of sections
function toggleSection(sectionId) {
  var sectionContent = document.getElementById(sectionId);
  var toggleIcon = document.getElementById(sectionId + '-toggle');
  if (sectionContent.style.display === "none" || sectionContent.style.display === "") {
    sectionContent.style.display = "block";
    toggleIcon.innerText = "-";
  } else {
    sectionContent.style.display = "none";
    toggleIcon.innerText = "+";
  }
}

// Show iframe and hide the landing page
function showIframe(src) {
  document.getElementById('landing-page').style.display = 'none';
  var iframe = document.getElementById('content-frame');
  iframe.style.display = 'block';
  iframe.src = src;
}

// Show landing page and hide the iframe
function showLandingPage() {
  document.getElementById('landing-page').style.display = 'block';
  document.getElementById('content-frame').style.display = 'none';
}

// Set the GitHub API URL to fetch the last X commits
var apiUrl = "https://api.github.com/repos/sullivan1337/sullivan1337.github.io/commits?per_page=1";

// Use an AJAX request to get the last X commits from the GitHub API
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    var response = JSON.parse(this.responseText);
    var lastCommitElem = document.getElementById("lastCommits");
    if (response.length > 0) {
      var commit = response[0];
      var commitDate = new Date(commit.commit.author.date);
      var estDate = new Date(commitDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
      var commitUrl = commit.html_url;
      var commitId = commit.sha;

      lastCommitElem.innerHTML = commit.commit.message + " (" + estDate.toLocaleString() + " EST) <a href='" + commitUrl + "' target='_blank'>" + commitId + "</a>";
    }
  }
};
xhttp.open("GET", apiUrl, true);
xhttp.send();

// Set the GitHub API URL for the GitHub Actions workflow runs
var actionsApiUrl = "https://api.github.com/repos/sullivan1337/sullivan1337.github.io/actions/runs?per_page=1";

// Use an AJAX request to get the last GitHub Actions workflow runs
var actionsXhttp = new XMLHttpRequest();
actionsXhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    var actionsResponse = JSON.parse(this.responseText);
    var runs = actionsResponse.workflow_runs;
    var actionsElem = document.getElementById("githubActions");
    if (runs.length > 0) {
      var run = runs[0];
      var status = run.status;
      var conclusion = run.conclusion ? `(${run.conclusion})` : "";
      actionsElem.innerHTML = "<a href='" + run.html_url + "' target='_blank'>" + run.name + " #" + run.run_number + "</a>" + " - " + status + " " + conclusion;
    }
  }
};
actionsXhttp.open("GET", actionsApiUrl, true);
actionsXhttp.send();

// Generate a list of all navigation items for the landing page with previews
function generateToolList() {
    const toolSections = document.querySelectorAll('.section-content');
  
    toolSections.forEach(section => {
      const sectionId = section.id;
      const toolListDiv = document.getElementById(sectionId + '-list');
      const buttons = section.querySelectorAll('button');
  
      buttons.forEach(button => {
        const newButton = button.cloneNode(true);
        newButton.classList.add('tool-tile');
  
        // Extract URL from button's onclick attribute and determine the action type
        const onClickAttr = newButton.getAttribute('onclick');
        const isNewTab = onClickAttr.includes('window.open');
        const url = onClickAttr.match(/'(.*?)'/)[1];
  
        // Create iframe preview
        const iframePreview = document.createElement('iframe');
        iframePreview.src = url; // Set URL from button's onclick
        iframePreview.className = 'tool-preview'; // Add class for styling
        iframePreview.setAttribute('scrolling', 'no');
        iframePreview.setAttribute('frameborder', '0');
  
        // Create an overlay div to capture clicks
        const overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.addEventListener('click', () => {
          if (isNewTab) {
            window.open(url, '_blank'); // Opens the link in a new tab
          } else {
            showIframe(url); // Opens the link in the iframe
          }
        });
  
        // Append button, preview iframe, and overlay to the tool list
        const previewContainer = document.createElement('div');
        previewContainer.classList.add('tool-preview-container');
        previewContainer.appendChild(newButton);
        previewContainer.appendChild(iframePreview);
        previewContainer.appendChild(overlay);
  
        toolListDiv.appendChild(previewContainer);
      });
    });
  }
  
  // Generate tool list on load
  document.addEventListener('DOMContentLoaded', generateToolList);
  
  // Show iframe and hide the landing page
  function showIframe(src) {
    document.getElementById('landing-page').style.display = 'none';
    const iframe = document.getElementById('content-frame');
    iframe.style.display = 'block';
    iframe.src = src;
  }
  