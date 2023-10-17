
function toggleVisibility(id) {
    const element = document.getElementById(id);
    if (element.style.display === "none") {
      element.style.display = "block";
    } else {
      element.style.display = "none";
    }
  }

    function expandAllSections() {
      const expandCollapseButtons = document.querySelectorAll('.expand-collapse-btn');
      for (let btn of expandCollapseButtons) {
          const list = btn.parentElement.nextElementSibling;
          list.style.display = 'block';
          btn.textContent = '↓';
          btn.setAttribute('data-collapsed', 'false');
      }
  }

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

      // Match by closest to start of word then earliest word
      const matchScore = (file, filter) => {
        const fileWords = file.name.replace('.md', '').toLowerCase().split('-');
        filter = filter.toLowerCase()
        let wordIndex;
        let letterPosition;
        for (wordIndex = 0; wordIndex < fileWords.length; wordIndex++) {
          letterPosition = fileWords[wordIndex].indexOf(filter)
          if (letterPosition > -1) break;
        }
        if (letterPosition < 0) {
          letterPosition = 100;
        }
        return wordIndex + letterPosition * 100;
      }
      // Sort files alphabetically
      const sortFiles = () => {
        return (fileA, fileB) => {
          const fileNameA = fileA.path.toLowerCase();
          const fileNameB = fileB.path.toLowerCase();
          if (fileNameA < fileNameB) {
            return -1;
          }
          if (fileNameA > fileNameB) {
            return 1;
          }
          return 0;
        }
      }


      const navigateToFile = async (data, filter = '') => {
  files = data.filter(filterFiles(filter));
  if (files.length === 1) {
    const fileName = files[0].path.replace('.md', '.md');
    if (fileName.endsWith('.pdf')) {
      // If it's a PDF, embed it in an iframe
      const pdfUrl = `https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/main/${files[0].path}`;
      document.getElementById('content').innerHTML = `<iframe src="${pdfUrl}" width="100%" height="500px"></iframe>`;
    } else {
      // If it's a Markdown file, fetch and render it as before
      const markdownUrl = `https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/main/${files[0].path}`;
      const response = await fetch(markdownUrl);
      const mdContent = await response.text();
      const htmlContent = marked(mdContent);
      document.getElementById('content').innerHTML = htmlContent;

      // Update the behavior of links in the rendered markdown
      const markdownLinks = document.querySelectorAll('#content a');
      for (const link of markdownLinks) {
        if (link.href.includes('https://sullivan1337.github.io/')) {
          link.setAttribute('href', 'https://sullivan1337.github.io/home-tools/recipes/index.html');
        }
      }
    }
  }
};

      document.addEventListener('click', (event) => {
        if (event.target.tagName === 'A' && event.target.textContent === 'https://sullivan1337.github.io/home-tools/recipes/index.html') {
          event.preventDefault();
          document.getElementById('content').innerHTML = '';
          search_input.value = '';
          updateList(data);
        }
      });

      (async () => {
    // Get GitHub repository file info
    const mdResponse = await fetch('https://api.github.com/repos/sullivan1337/sullivan1337.github.io/contents/home-tools/recipes/markdownRecipes');
    const pdfResponse = await fetch('https://api.github.com/repos/sullivan1337/sullivan1337.github.io/contents/home-tools/recipes/PDFs');
    const favPdfResponse = await fetch('https://api.github.com/repos/sullivan1337/sullivan1337.github.io/contents/home-tools/recipes/favoriteMeals');
    const drinkPdfResponse = await fetch('https://api.github.com/repos/sullivan1337/sullivan1337.github.io/contents/home-tools/recipes/drinks');
    const metadataResponse = await fetch('https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/master/home-tools/recipes/metadata.json');
    const mdData = await mdResponse.json();
    const pdfData = await pdfResponse.json();
    const favPdfData = await favPdfResponse.json();
    const drinkData = await drinkPdfResponse.json();
    const data = [...mdData, ...pdfData, ...favPdfData, ...drinkData];
    metadata = await metadataResponse.json();

    // Extract all unique tags from the metadata
    const allTags = [...new Set(Object.values(metadata).flat())];

    // Display the tags below the search bar
    const tagContainer = document.getElementById('tag_filters');
    allTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('tag'); // Use 'tag-badge' to match the style of other tags
        tagElement.textContent = tag;
        tagElement.addEventListener('click', function() {
            updateList(data, tag); // Update the list based on the clicked tag
            expandAllSections(); // Expand all sections
        });
        tagContainer.appendChild(tagElement);
    });

    // Initialize search fields and results
    const search_form = document.getElementById('search_form');
    const search_input = document.getElementById('search_input');
    const clear_search = document.getElementById('clear_search');
    const search_value = decodeURIComponent(document.location.search.replace('?', '').replace(/\+/g, ' '));
    search_input.value = search_value;
    navigateToFile(data, search_value);
    updateList(data, search_value);

// Check for query parameter and update search input
const params = new URLSearchParams(window.location.search);
const searchTerm = params.get('q');

if (searchTerm && searchTerm !== '') {
    search_input.value = searchTerm;
    navigateToFile(data, searchTerm);
    updateList(data, searchTerm);
    expandAllSections(); // Ensure sections are expanded

    // Show the clear button if there's a search term
    clear_search.style.display = 'inline';
} else {
    // If there's no search term, ensure the URL is clean
    window.history.replaceState({}, '', window.location.pathname);
    clear_search.style.display = 'none';
}



search_input.addEventListener('input', (event) => {
  updateList(data, event.target.value);
  expandAllSections();

  const currentParams = new URLSearchParams(window.location.search);
  if (event.target.value && event.target.value !== '') {
      currentParams.set('q', event.target.value);
      window.history.replaceState({}, '', '?' + currentParams.toString());
  } else {
      window.history.replaceState({}, '', window.location.pathname);
  }

  // Show the clear button if there's a search term
  if (search_input.value) {
      clear_search.style.display = 'inline';
  } else {
      clear_search.style.display = 'none';
  }
});



clear_search.addEventListener('click', () => {
    search_input.value = '';
    clear_search.style.display = 'none';
    // Remove the 'q' parameter from the URL when the clear button is clicked
    window.history.replaceState({}, '', window.location.pathname);
    // Optionally, update the list based on the cleared search input
    updateList(data);
});

document.addEventListener('keypress', (event) => {
          search_input.focus()
        })
        document.addEventListener('click', (event) => {
    if (event.target.classList.contains('tag') && event.target.id !== 'clear_search') {
        const clickedTag = event.target.textContent;

        // If the clicked tag is already selected, remove the filter
        if (event.target.classList.contains('selected-tag')) {
            updateList(data, ''); // Update the list without any filter
            document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('selected-tag')); // Remove selected class from all tags
        } else {
            // Otherwise, apply the filter
            updateList(data, clickedTag); // Update the list based on the clicked tag
            document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('selected-tag')); // Remove selected class from all tags
            event.target.classList.add('selected-tag'); // Add selected class to the clicked tag
        }
    }
});

})();

      const filterFiles = (filter) => {
    filter = filter.toLowerCase();
    return (file) => {
        const filePath = file.path;
        const isMarkdown = (/.md$/).test(filePath);
        const isPdf = (/.pdf$/).test(filePath);
        const isImage = (/.(jpg|jpeg|png|gif)$/).test(filePath);
        const isNotLicense = filePath !== 'LICENSE.md';

        // Construct the key to fetch tags from metadata
        const key = filePath.split('/').pop(); // This gets the filename from the path.
        const tags = metadata[key] || [];
        const tagsString = tags.join(' ').toLowerCase();

        // Clean the filename for matching
        let fileName = filePath.toLowerCase().replace(/-/g, '');
        if (isMarkdown) fileName = fileName.replace('.md', '');
        if (isPdf) fileName = fileName.replace('.pdf', '');
        if (isImage) fileName = fileName.replace(/.(jpg|jpeg|png|gif)$/, '');

        // Check if all tokens in the filter match the filename or any of the tags
        const isInFilter = filter.split(' ')
            .every((token) => fileName.indexOf(token) !== -1 || tagsString.indexOf(token) !== -1);

        return (isMarkdown || isPdf || isImage) && isNotLicense && isInFilter;
    }
}


document.addEventListener('click', (event) => {
    console.log("Element clicked:", event.target);

    if (event.target.classList.contains('expand-collapse-btn')) {
        console.log("Expand/Collapse button clicked.");

        // Get the parent <h2> element, then get its next sibling (which should be the <ul> list)
        const list = event.target.parentElement.nextElementSibling;

        // Check the current state
        const isCollapsed = event.target.getAttribute('data-collapsed') === 'true';

        // Toggle the visibility of the list based on the current state
        if (isCollapsed) {
            list.style.display = 'block';
            event.target.textContent = '↓';
            event.target.setAttribute('data-collapsed', 'false');
        } else {
            list.style.display = 'none';
            event.target.textContent = '→';
            event.target.setAttribute('data-collapsed', 'true');
        }
    }
});

    // Render search result list
    const updateList = (data, filter = '') => {
    let mdHtmlString = '';
    let pdfHtmlString = '';
    let favPdfHtmlString = '';
    let drinkHtmlString = '';

    for (let file of data.filter(filterFiles(filter)).sort(sortFiles(filter))) {
    const filePath = file.path;
    const fileExtension = filePath.split('.').pop();
    const fileNameWithoutExtension = filePath.replace('.md', '').replace('.pdf', '').replace('.jpg', '').replace('home-tools/recipes/markdownRecipes/', '').replace('home-tools/recipes/PDFs/', '').replace('home-tools/recipes/favoriteMeals/', '').replace('home-tools/recipes/drinks/', '');
    const fileDisplayName = fileNameWithoutExtension.split('-').join(' ');

    // Fetch tags for the file from metadata
    const tags = metadata[filePath.split('/').pop()] || [];
    const tagsBadge = tags.map(tag => `<span class="tag-badge">${tag}</span>`).join(' ');

    let fileLink;
    if (filePath.includes('favoriteMeals')) {
        fileLink = 'favoriteMeals/' + fileNameWithoutExtension + (fileExtension !== 'md' ? '.' + fileExtension : '');
        favPdfHtmlString += `<li><a href="${fileLink}">${fileDisplayName}</a> ${tagsBadge}</li>`;
    } else if (filePath.includes('PDFs')) {
        fileLink = 'PDFs/' + fileNameWithoutExtension + (fileExtension !== 'md' ? '.' + fileExtension : '');
        pdfHtmlString += `<li><a href="${fileLink}">${fileDisplayName}</a> ${tagsBadge}</li>`;
    } else if (filePath.includes('drinks')) {
        fileLink = 'drinks/' + fileNameWithoutExtension + (fileExtension !== 'md' ? '.' + fileExtension : '');
        drinkHtmlString += `<li><a href="${fileLink}">${fileDisplayName}</a> ${tagsBadge}</li>`;
    } else {
        fileLink = 'markdownRecipes/' + fileNameWithoutExtension; // No extension for markdown files
        mdHtmlString += `<li><a href="${fileLink}">${fileDisplayName}</a> ${tagsBadge}</li>`;
    }
}

    document.getElementById('md_list').innerHTML = mdHtmlString;
    document.getElementById('pdf_list').innerHTML = pdfHtmlString;
    document.getElementById('fav_pdf_list').innerHTML = favPdfHtmlString;
    document.getElementById('drink_list').innerHTML = drinkHtmlString;
}
