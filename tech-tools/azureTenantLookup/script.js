document.addEventListener('DOMContentLoaded', () => {
  // Dark mode toggle logic
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
  } else {
    themeToggle.textContent = '☀️';
  }
  
  themeToggle.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    this.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });
  
  // Reset button functionality
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => {
    document.getElementById('lookup-form').reset();
    document.getElementById('search-input').value = '';
    hideAllMessages();
    document.getElementById('results').style.display = 'none';
    document.getElementById('openid-config-content').style.display = 'none';
    document.getElementById('toggle-openid').classList.remove('expanded');
  });

  // Azure AD instance endpoints
  const endpoints = {
    worldwide: 'https://login.microsoftonline.com',
    usgov: 'https://login.microsoftonline.us',
    china: 'https://login.chinacloudapi.cn'
  };

  // Extract domain from email or use as-is
  function extractTenantIdentifier(input) {
    const trimmed = input.trim();
    
    // Check if it's a GUID (tenant ID)
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidPattern.test(trimmed)) {
      return trimmed;
    }
    
    // Check if it's an email address
    if (trimmed.includes('@')) {
      return trimmed.split('@')[1];
    }
    
    // Otherwise, use as domain/tenant name
    return trimmed;
  }

  // Determine Azure AD Instance display format
  function getAzureADInstance(environment) {
    const instanceMap = {
      'worldwide': 'Azure AD Global',
      'usgov': 'Azure AD Government: Arlington',
      'china': 'Azure AD China'
    };
    return instanceMap[environment] || 'Unknown';
  }

  // Determine tenant scope (GCC High, Commercial, etc.)
  function determineTenantScope(tenantId, environment) {
    // Normalize environment to lowercase for comparison
    const env = (environment || '').toLowerCase();
    if (env === 'usgov') {
      return 'GCC High';
    }
    if (env === 'china') {
      return 'China';
    }
    return 'Commercial';
  }

  // Determine tenant region scope from OpenID config
  function getTenantRegionScope(environment, openIdConfig) {
    // First, try to get region from OpenID config if available
    // The tenant_region_scope field directly tells us the region
    if (openIdConfig && openIdConfig.tenant_region_scope) {
      const regionScope = openIdConfig.tenant_region_scope.toUpperCase();
      if (regionScope === 'EU' || regionScope.includes('EU')) {
        return 'European Union (EU)';
      }
      if (regionScope === 'NA' || regionScope.includes('NA') || regionScope.includes('NORTH AMERICA')) {
        return 'North America (NA)';
      }
      if (regionScope === 'ASIA' || regionScope.includes('ASIA')) {
        return 'Asia';
      }
      // Return the value as-is if it's a format we don't recognize
      return openIdConfig.tenant_region_scope;
    }
    
    // Fallback to environment-based mapping if OpenID config doesn't have the field
    const scopeMap = {
      'worldwide': 'North America (NA)', // Default for worldwide, but may be overridden by tenant_region_scope
      'usgov': 'US Government (USGov)',
      'china': 'China'
    };
    return scopeMap[environment] || 'Unknown';
  }

  // Determine tenant region sub scope from OpenID config
  function getTenantRegionSubScope(environment, openIdConfig) {
    // First, try to get the value directly from OpenID config
    // This is the most reliable source as it comes from Microsoft
    if (openIdConfig && openIdConfig.tenant_region_sub_scope) {
      const subScope = openIdConfig.tenant_region_sub_scope;
      // The value might be "GCC", "DODCON", "DOD", etc.
      // Format it appropriately
      if (subScope.toUpperCase() === 'DODCON') {
        return 'DODCON (GCC High)';
      }
      if (subScope.toUpperCase() === 'DOD') {
        return 'DOD';
      }
      if (subScope.toUpperCase() === 'GCC') {
        return 'GCC';
      }
      // Return as-is if it's already formatted
      return subScope;
    }
    
    // Fallback to environment-based logic if OpenID config doesn't have the field
    if (environment === 'usgov') {
      // Default fallback for US Gov if tenant_region_sub_scope is not available
      return 'GCC';
    }
    if (environment === 'china') {
      return 'China';
    }
    return 'Commercial';
  }

  // Fetch default domain (the .onmicrosoft.com domain)
  async function fetchTenantDetails(tenantId, environment, originalSearch, openIdConfig) {
    const baseUrl = endpoints[environment];
    
    let defaultDomain = null; // This should be the .onmicrosoft.com domain
    
    try {
      // Try to get default domain from Microsoft Graph API
      // Note: This typically requires authentication, but we'll try anyway
      // Some endpoints might work for basic tenant info
      const graphUrl = environment === 'worldwide' ? 'https://graph.microsoft.com' :
                      environment === 'usgov' ? 'https://graph.microsoft.us' :
                      'https://microsoftgraph.chinacloudapi.cn';
      
      // Try domains endpoint to get default domain (the .onmicrosoft.com domain)
      if (tenantId) {
        try {
          const domainsResponse = await fetch(`${graphUrl}/v1.0/domains`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (domainsResponse.ok) {
            const domainsData = await domainsResponse.json();
            if (domainsData.value && domainsData.value.length > 0) {
              // Find the default/initial domain (usually ends with .onmicrosoft.com or is marked as default)
              const defaultDomainObj = domainsData.value.find(d => d.isDefault || (d.id && d.id.endsWith('.onmicrosoft.com')));
              if (defaultDomainObj && defaultDomainObj.id) {
                defaultDomain = defaultDomainObj.id;
              } else {
                // Look for any .onmicrosoft.com domain
                const onmicrosoftDomain = domainsData.value.find(d => d.id && d.id.endsWith('.onmicrosoft.com'));
                if (onmicrosoftDomain && onmicrosoftDomain.id) {
                  defaultDomain = onmicrosoftDomain.id;
                }
              }
            }
          }
        } catch (e) {
          // Expected to fail without auth for most tenants
          // This is normal for browser-only tools
        }
      }
      
      return {
        defaultDomain: defaultDomain
      };
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      return {
        defaultDomain: defaultDomain
      };
    }
  }

  // Check for unsupported tenant scenarios
  function checkUnsupportedTenant(tenantId, environment, tenantDomain) {
    // This is a simplified check - real implementation would need more context
    // GCC tenants in Government, GCC High/DOD in Global, etc.
    // For now, we'll just return null as we don't have enough info to determine this
    return null;
  }

  // Perform tenant lookup
  async function lookupTenant(tenantIdentifier, environment) {
    const baseUrl = endpoints[environment];
    const url = `${baseUrl}/${tenantIdentifier}/v2.0/.well-known/openid-configuration`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { found: false, error: 'Tenant not found' };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Determine the actual environment from the issuer URL
      // This is more reliable than trusting which endpoint we queried
      let actualEnvironment = environment;
      if (data.issuer) {
        if (data.issuer.includes('login.microsoftonline.us')) {
          actualEnvironment = 'usgov';
        } else if (data.issuer.includes('login.chinacloudapi.cn') || data.issuer.includes('login.partner.microsoftonline.cn')) {
          actualEnvironment = 'china';
        } else if (data.issuer.includes('login.microsoftonline.com')) {
          actualEnvironment = 'worldwide';
        }
      }
      
      // Check if the input was already a GUID
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let tenantId = null;
      
      if (guidPattern.test(tenantIdentifier)) {
        // User provided a GUID, use it directly
        tenantId = tenantIdentifier;
      } else {
        // Extract tenant ID from issuer or authorization_endpoint
        // The issuer format is: https://login.microsoftonline.com/{tenantId}/v2.0
        if (data.issuer) {
          const match = data.issuer.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
          if (match) {
            tenantId = match[1];
          }
        }
        
        // If no tenant ID in issuer, try authorization_endpoint
        if (!tenantId && data.authorization_endpoint) {
          const match = data.authorization_endpoint.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
          if (match) {
            tenantId = match[1];
          }
        }
      }

      return {
        found: true,
        tenantId: tenantId || tenantIdentifier,
        tenantDomain: tenantIdentifier,
        environment: actualEnvironment, // Use the actual environment from issuer
        data: data
      };
    } catch (error) {
      console.error('Lookup error:', error);
      return { found: false, error: error.message };
    }
  }

  // Fetch MX records for a domain using Cloudflare DNS over HTTPS
  async function fetchMXRecords(domain) {
    try {
      // Use Cloudflare's DNS over HTTPS API
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
        method: 'GET',
        headers: {
          'Accept': 'application/dns-json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.Answer && data.Answer.length > 0) {
          // Parse MX records from DNS response
          const mxRecords = data.Answer
            .filter(record => record.type === 15) // MX record type
            .map(record => {
              // MX record format: "10 mail.example.com" or "priority exchange"
              const parts = record.data.split(' ');
              return {
                priority: parseInt(parts[0]) || 10,
                exchange: parts.slice(1).join(' ').trim()
              };
            })
            .sort((a, b) => a.priority - b.priority); // Sort by priority
          
          return mxRecords;
        }
      }
    } catch (error) {
      console.error('Error fetching MX records:', error);
    }
    
    return null;
  }

  // Display results
  async function displayResults(result, searchString, environment, tenantDetails = null) {
    hideAllMessages();
    
    if (!result.found) {
      document.getElementById('error-message').style.display = 'block';
      return;
    }

    const azureADInstance = getAzureADInstance(result.environment);
    const tenantScope = determineTenantScope(result.tenantId, result.environment);
    const tenantRegionScope = getTenantRegionScope(result.environment, result.data);
    const tenantRegionSubScope = getTenantRegionSubScope(result.environment, result.data);
    
    // Get default domain (.onmicrosoft.com domain) from tenant details
    // This should only be the .onmicrosoft.com domain, not the searched domain
    const defaultDomain = tenantDetails?.defaultDomain || null;
    
    // Extract searched domain for MX records lookup (not for default domain display)
    let searchedDomain = null;
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidPattern.test(searchString) && !searchString.includes('@')) {
      // It's likely a domain
      searchedDomain = searchString;
    } else if (searchString.includes('@')) {
      // Extract domain from email
      searchedDomain = searchString.split('@')[1];
    }

    const resultsBody = document.getElementById('results-body');
    resultsBody.innerHTML = '';

    const rows = [
      { property: 'Search String', value: searchString },
      { property: 'Tenant ID', value: result.tenantId || 'N/A' },
      { property: 'Azure AD Instance', value: azureADInstance },
      { property: 'Tenant Scope', value: tenantScope },
      { property: 'Tenant Region Scope', value: tenantRegionScope },
      { property: 'Tenant Region Sub Scope', value: tenantRegionSubScope }
    ];

    // Add MX Records if we have a searched domain (use the actual domain, not the .onmicrosoft.com domain)
    if (searchedDomain && !searchedDomain.endsWith('.onmicrosoft.com')) {
      const mxRecords = await fetchMXRecords(searchedDomain);
      if (mxRecords && mxRecords.length > 0) {
        rows.push({ 
          property: 'MX Records', 
          value: mxRecords.map(mx => `${mx.exchange} - ${mx.priority}`).join('\n') 
        });
      }
    }

    rows.forEach(row => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = row.property;
      const td = document.createElement('td');
      // Handle multi-line values (like MX Records)
      if (row.value && row.value.includes('\n')) {
        td.innerHTML = row.value.split('\n').map(line => line + '<br>').join('');
      } else {
        td.textContent = row.value;
      }
      tr.appendChild(th);
      tr.appendChild(td);
      resultsBody.appendChild(tr);
    });

    // Display OpenID configuration
    if (result.data) {
      const openidConfigJson = document.getElementById('openid-config-json');
      openidConfigJson.textContent = JSON.stringify(result.data, null, 2);
    }

    document.getElementById('results').style.display = 'block';
  }

  // Toggle OpenID configuration section
  document.getElementById('toggle-openid').addEventListener('click', () => {
    const content = document.getElementById('openid-config-content');
    const toggle = document.getElementById('toggle-openid');
    const isExpanded = content.style.display !== 'none';
    
    content.style.display = isExpanded ? 'none' : 'block';
    toggle.classList.toggle('expanded', !isExpanded);
  });

  // Hide all messages
  function hideAllMessages() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('warning-message').style.display = 'none';
  }

  // Copy results to clipboard
  document.getElementById('copy-results').addEventListener('click', () => {
    const resultsBody = document.getElementById('results-body');
    const rows = resultsBody.querySelectorAll('tr');
    let text = 'Azure Tenant Lookup Results\n';
    text += '='.repeat(30) + '\n\n';
    
    rows.forEach(row => {
      const property = row.querySelector('th').textContent;
      const value = row.querySelector('td').textContent;
      text += `${property}: ${value}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-results');
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  });

  // Handle form submission
  document.getElementById('lookup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const searchInput = document.getElementById('search-input').value.trim();

    if (!searchInput) {
      alert('Please enter a tenant identifier');
      return;
    }

    // Hide previous results and show loading
    hideAllMessages();
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    const tenantIdentifier = extractTenantIdentifier(searchInput);
    
    // Try all environments in parallel for faster lookup
    const environments = ['worldwide', 'usgov', 'china'];
    const lookupPromises = environments.map(env => lookupTenant(tenantIdentifier, env));
    
    const results = await Promise.allSettled(lookupPromises);
    
    // Collect all successful results
    // A tenant should only exist in ONE environment, so we should only have one result
    // But we validate by checking the issuer URL to determine the actual environment
    let result = { found: false };
    let foundEnvironment = 'worldwide';
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value.found) {
        // Use the environment determined from the issuer URL (more reliable)
        const resultEnv = results[i].value.environment;
        result = results[i].value;
        foundEnvironment = resultEnv;
        // A tenant should only exist in one environment, so break after first valid result
        break;
      }
    }

    document.getElementById('loading').style.display = 'none';
    
    if (result.found) {
      // Ensure the result has the correct environment set
      result.environment = foundEnvironment;
      // Fetch additional tenant details
      const tenantDetails = await fetchTenantDetails(result.tenantId, result.environment, searchInput, result.data);
      displayResults(result, searchInput, result.environment, tenantDetails);
    } else {
      displayResults(result, searchInput, foundEnvironment);
    }
  });
});

