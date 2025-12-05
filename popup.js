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
document.getElementById('viewReportBtn').addEventListener('click', () => {
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
 generateAndOpenHTMLReport(selectedTier, featuresToExport);
});
function generateAndOpenHTMLReport(tier, features) {
 let infoRows = '';
 let checkRows = '';
 let matchCount = 0;
 let totalChecks = 0;
 for (const [name, states] of Object.entries(features)) {
   const expected = String(states.expected).trim();
   const actual = String(states.actual).trim();
   if (expected === "Report") {
       infoRows += `
<tr>
<td>${name}</td>
<td>${actual}</td>
</tr>`;
   } else {
       totalChecks++;
       const isMatch = expected.toLowerCase() === actual.toLowerCase();
       if (isMatch) matchCount++;
       const statusClass = isMatch ? 'pass' : 'fail';
       const statusIcon = isMatch ? 'PASS' : 'FAIL';
       checkRows += `
<tr class="${statusClass}">
<td>${name}</td>
<td>${expected}</td>
<td>${actual}</td>
<td>${statusIcon}</td>
</tr>`;
   }
 }
 const score = totalChecks === 0 ? 0 : Math.round((matchCount / totalChecks) * 100);
 // Create the HTML Document
 const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<title>Loft Loyalty Report - ${tier.toUpperCase()}</title>
<style>
           body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333; }
           h1 { color: #2c3e50; }
           .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
           .score-box { float: right; font-size: 24px; font-weight: bold; color: ${score === 100 ? 'green' : (score > 50 ? 'orange' : 'red')}; }
           table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
           th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
           th { background-color: #f8f9fa; font-weight: 600; color: #555; }
           tr:hover { background-color: #f1f1f1; }
           h2 { font-size: 18px; margin-top: 30px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
           .pass td { color: #155724; background-color: #d4edda; }
           .fail td { color: #721c24; background-color: #f8d7da; font-weight: bold; }
</style>
</head>
<body>
<div class="header">
<div class="score-box">Score: ${score}%</div>
<h1>Loft Loyalty Inspection Report</h1>
<p><strong>Tier:</strong> ${tier.toUpperCase()}</p>
<p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
</div>
<h2>Scraped Information</h2>
<table>
<thead><tr><th>Field</th><th>Value Found</th></tr></thead>
<tbody>${infoRows || '<tr><td colspan="2">No info fields found</td></tr>'}</tbody>
</table>
<h2>Validation Results</h2>
<table>
<thead><tr><th>Setting</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>
<tbody>${checkRows || '<tr><td colspan="4">No validation checks performed</td></tr>'}</tbody>
</table>
</body>
</html>
 `;
 // Open in new tab
 const blob = new Blob([htmlContent], { type: 'text/html' });
 const url = URL.createObjectURL(blob);
 chrome.tabs.create({ url: url });
}
function displayResults(features) {
 const progressBar = document.getElementById('progressBar');
 const progressContainer = document.getElementById('progressContainer');
 const errorLog = document.getElementById('errorLog');
 progressContainer.style.display = 'block';
 errorLog.innerHTML = '';
 let totalChecks = 0;
 let passedChecks = 0;
 let errorsHTML = '';
 let infoHTML = '';
 for (const [name, states] of Object.entries(features)) {
   const expected = String(states.expected).trim();
   const actual = String(states.actual).trim();
   if (expected === "Report") {
       infoHTML += `
<div class="error-item info-item">
<span class="error-title">${name}</span>
<div class="error-detail">Value: <b>${actual}</b></div>
</div>`;
   }
   else {
       totalChecks++;
       if (expected.toLowerCase() === actual.toLowerCase()) {
           passedChecks++;
       } else {
           errorsHTML += `
<div class="error-item">
<span class="error-title">${name}</span>
<div class="error-detail">Expected: <b>${expected}</b> | Actual: <b>${actual}</b></div>
</div>`;
       }
   }
 }
 const percentage = totalChecks === 0 ? 0 : Math.round((passedChecks / totalChecks) * 100);
 progressBar.style.width = percentage + '%';
 progressBar.innerText = percentage + '% Match';
 progressBar.className = '';
 if (percentage < 50) progressBar.classList.add('low-score');
 else if (percentage < 100) progressBar.classList.add('mid-score');
 let resultHTML = "";
 if (errorsHTML) {
     resultHTML += `<h3>Mismatches:</h3>${errorsHTML}`;
 } else if (percentage === 100) {
     resultHTML += '<p style="color:green; text-align:center; font-weight:bold;">All Validations Passed!</p>';
 }
 if (infoHTML) {
     resultHTML += `<h3>Scraped Info:</h3>${infoHTML}`;
 }
 errorLog.innerHTML = resultHTML;
}