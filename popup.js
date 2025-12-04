let currentData = {};
 
document.getElementById('checkBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "getSettings" }, (response) => {
      if (response) {
        currentData = response;
        const selectedTier = document.getElementById('categorySelect').value;
        const useExtras = document.getElementById('incentiveBillingBox').checked;
 
        // Get base features for the selected tier
        let featuresToDisplay = { ...response.tiers[selectedTier] };
 
        // If checkbox is checked, merge the extra fields
        if (useExtras && response.extras) {
          featuresToDisplay = { ...featuresToDisplay, ...response.extras };
        }
 
        displayResults(featuresToDisplay);
      } else {
        document.getElementById('errorLog').innerText = "No data found. Try refreshing the page.";
      }
    });
  });
});
 
document.getElementById('exportBtn').addEventListener('click', () => {
  const selectedTier = document.getElementById('categorySelect').value;
  if (!currentData.tiers) {
    alert("Please scan the page first.");
    return;
  }
 
  // Reconstruct the currently viewed data
  const useExtras = document.getElementById('incentiveBillingBox').checked;
  let featuresToExport = { ...currentData.tiers[selectedTier] };
  if (useExtras && currentData.extras) {
    featuresToExport = { ...featuresToExport, ...currentData.extras };
  }
 
  const rows = ["Tier,Feature,Expected,Actual"];
  for (const [feature, states] of Object.entries(featuresToExport)) {
    rows.push(`"${selectedTier}","${feature}","${states.expected}","${states.actual}"`);
  }
 
  const blob = new Blob([rows.join("\n")], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loft_loyalty_${selectedTier}.csv`;
  a.click();
});
 
function displayResults(features) {
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const errorLog = document.getElementById('errorLog');
 
  progressContainer.style.display = 'block';
  errorLog.innerHTML = '';
 
  let totalChecks = 0;
  let passedChecks = 0;
  let errorsHTML = '';
  let infoHTML = ''; // For "Report" type fields
 
  for (const [name, states] of Object.entries(features)) {
    totalChecks++;
   
    // Normalize values for comparison
    const expected = String(states.expected).trim();
    const actual = String(states.actual).trim();
   
    // If expected is "Report", we just show it (blue), count as pass
    if (expected === "Report") {
        passedChecks++;
        infoHTML += `
        <div class="error-item info-item">
            <span class="error-title">${name}</span>
            <div class="error-detail">Value: <b>${actual}</b></div>
        </div>`;
    }
    // If expected is strict
    else if (expected.toLowerCase() === actual.toLowerCase()) {
      passedChecks++;
    } else {
      // Mismatch
      errorsHTML += `
        <div class="error-item">
            <span class="error-title">${name}</span>
            <div class="error-detail">Expected: <b>${expected}</b> | Actual: <b>${actual}</b></div>
        </div>`;
    }
  }
 
  const percentage = totalChecks === 0 ? 0 : Math.round((passedChecks / totalChecks) * 100);
  progressBar.style.width = percentage + '%';
  progressBar.innerText = percentage + '% Match';
  progressBar.className = '';
 
  if (percentage < 50) progressBar.classList.add('low-score');
  else if (percentage < 100) progressBar.classList.add('mid-score');
 
  // Display Information first, then Errors
  let resultHTML = "";
  if (errorsHTML) {
      resultHTML += `<h3>Mismatches Found:</h3>${errorsHTML}`;
  } else if (percentage === 100) {
      resultHTML += '<p style="color:green; text-align:center; font-weight:bold;">All Validations Passed!</p>';
  }
 
  if (infoHTML) {
      resultHTML += `<h3>Scraped Info:</h3>${infoHTML}`;
  }
 
  errorLog.innerHTML = resultHTML;
}