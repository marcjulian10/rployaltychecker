// Configuration for the different tiers
const featureMapping = {
 free: {
   // General Info
   "OWNER": { expected: "Report" },
   "MANAGEMENT": { expected: "Report" },
   "NAME": { expected: "Report" },
   "MARKET": { expected: "Report" },
   "UNIT COUNT": { expected: "Report" },
   "AB COMMUNITY ID": { expected: "Report" },
   "STATUS": { expected: "Report" },
   "ADDRESS": { expected: "Report" },
   "COUNTRY": { expected: "Report" },
   // Requested Info Fields
   "API PROVIDER": { expected: "Report" },
   "API OBJECT": { expected: "Report" },
   "IMPORT RESIDENTS": { expected: "Report" },
   "CR LITE": { expected: "Report" },
   "LOYALTY": { expected: "Report" },
   "MONTHLY FEE": { expected: "Report" },
   // Validations
   "BILLING PRE PAID": { expected: "YES" }
 },
 plus: {
   "OWNER": { expected: "Report" },
   "API PROVIDER": { expected: "Report" },
   "API OBJECT": { expected: "Report" },
   "IMPORT RESIDENTS": { expected: "Report" },
   "CR LITE": { expected: "Report" },
   "LOYALTY": { expected: "Report" },
   "MONTHLY FEE": { expected: "Report" },
   "BILLING PRE PAID": { expected: "TBD" }
 },
 community_rewards: {
   "OWNER": { expected: "Report" },
   "API PROVIDER": { expected: "Report" },
   "API OBJECT": { expected: "Report" },
   "IMPORT RESIDENTS": { expected: "Report" },
   "CR LITE": { expected: "Report" },
   "LOYALTY": { expected: "Report" },
   "MONTHLY FEE": { expected: "Report" },
   "BILLING PRE PAID": { expected: "TBD" }
 }
};
const extraFields = {
 "CUSTOM INCENTIVE BILLING EMAIL": { expected: "Report" },
 "Prepay From Dashboard": { expected: "YES" }
};
/**
* INTELLIGENT VALUE FINDER
*/
function getMainState(element, featureName) {
 if (!element) return "Not Found";
 const extractFromInput = (container) => {
   const checkbox = container.querySelector('input[type="checkbox"], input[type="radio"]');
   if (checkbox) return checkbox.checked ? "YES" : "NO";
   const textInput = container.querySelector('input[type="text"], input:not([type]), textarea');
   if (textInput) return textInput.value.trim() === "" ? "Blank" : textInput.value.trim();
   const select = container.querySelector('select');
   if (select) return select.options[select.selectedIndex]?.text.trim() || select.value;
   const toggleDiv = container.querySelector('.toggle, .switch, [role="switch"]');
   if (toggleDiv) {
       const classString = toggleDiv.className.toLowerCase();
       if (classString.includes('on') || classString.includes('checked') || classString.includes('active')) {
           return "YES";
       }
       return "NO";
   }
   return null;
 };
 const nameUpper = featureName.toUpperCase();
 // --- STRATEGY A: VERTICAL CHECK (For API & Import fields) ---
 const verticalFields = ["API PROVIDER", "API OBJECT", "IMPORT RESIDENTS"];
 if (verticalFields.some(f => nameUpper.includes(f))) {
     const cell = element.closest('th, td');
     const table = cell?.closest('table');
     if (cell && table) {
         const colIndex = cell.cellIndex;
         const firstDataRow = table.querySelector('tbody tr');
         if (firstDataRow) {
             const targetCell = firstDataRow.cells[colIndex];
             if (targetCell) {
                 return extractFromInput(targetCell) || targetCell.innerText.replace(/\n/g, ' ').trim();
             }
         }
     }
 }
 // --- STRATEGY B: CUSTOM VALUE COLUMN CHECK ---
 const customValueFields = ["CR LITE", "LOYALTY", "MONTHLY FEE", "PREPAY DASHBOARD", "PREPAY FROM DASHBOARD"];
 if (customValueFields.some(f => nameUpper.includes(f))) {
     const row = element.closest('tr');
     const table = row?.closest('table');
     if (row && table) {
         const allHeaders = Array.from(table.querySelectorAll('th'));
         const customHeader = allHeaders.find(h => h.innerText.trim().toLowerCase().includes('custom value'));
         if (customHeader) {
             const colIndex = customHeader.cellIndex;
             const targetCell = row.cells[colIndex];
             if (targetCell) {
                 return extractFromInput(targetCell) || targetCell.innerText.replace(/\n/g, ' ').trim();
             }
         }
     }
 }
 // --- STANDARD STRATEGIES ---
 const cell = element.closest('td, th');
 if (cell) {
   const nextCell = cell.nextElementSibling;
   if (nextCell) {
     const inputVal = extractFromInput(nextCell);
     if (inputVal !== null) return inputVal;
     return nextCell.innerText.replace(/\n/g, ' ').trim() || "Blank";
   }
 }
 const parent = element.parentElement;
 if (parent) {
    const inputVal = extractFromInput(parent);
    if (inputVal !== null) return inputVal;
 }
 let sibling = element.nextElementSibling;
 while (sibling && (sibling.innerText.trim() === ":" || sibling.tagName === "BR")) {
     sibling = sibling.nextElementSibling;
 }
 if (sibling) {
     const inputVal = extractFromInput(sibling);
     if (inputVal !== null) return inputVal;
     return sibling.innerText.replace(/\n/g, ' ').trim();
 }
 return "Not Found";
}
function getSettings() {
 const results = { free: {}, plus: {}, community_rewards: {} };
 // 1. Scan Standard Fields
 for (const [tier, features] of Object.entries(featureMapping)) {
   for (const [feature, details] of Object.entries(features)) {
     const element = [...document.querySelectorAll('td, th, label, dt, span.label, strong, b, div')]
       .find(el => {
            const text = el.innerText.trim().toLowerCase().replace(':', '');
            return text === feature.toLowerCase();
       });
     const actualState = element ? getMainState(element, feature) : "Not Found";
     results[tier][feature] = { expected: details.expected, actual: actualState };
   }
 }
 // 2. Scan Extra Fields
 const extras = {};
 for (const [feature, details] of Object.entries(extraFields)) {
     const element = [...document.querySelectorAll('td, th, label, dt, span.label, strong, b, div')]
       .find(el => {
            const text = el.innerText.trim().toLowerCase().replace(':', '');
            return text === feature.toLowerCase();
       });
     const actualState = element ? getMainState(element, feature) : "Not Found";
     extras[feature] = { expected: details.expected, actual: actualState };
 }
 return { tiers: results, extras: extras };
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
 if (request.action === "getSettings") {
   sendResponse(getSettings());
 }
});