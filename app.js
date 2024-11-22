// Utility function to create chunks of arrays
function chunks(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// Levenshtein distance calculation for similarity
function levenshtein(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 10) return Math.max(a.length, b.length);

    const tmp = [];
    let i, j, alen = a.length, blen = b.length;
    
    if (alen === 0) return blen;
    if (blen === 0) return alen;

    const row = new Uint16Array(blen + 1);
    for (j = 0; j <= blen; j++) row[j] = j;
    
    for (i = 1; i <= alen; i++) {
        let prev = i;
        const ai = a.charAt(i - 1);
        
        for (j = 1; j <= blen; j++) {
            const curr = prev;
            prev = row[j];
            const bj = b.charAt(j - 1);
            
            row[j] = Math.min(
                prev + 1,
                row[j - 1] + 1,
                curr + (ai === bj ? 0 : 1)
            );
        }
    }
    
    return row[blen];
}

// Calculate similarity percentage
function similarity(a, b) {
    const len = Math.max(a.length, b.length);
    if (len === 0) return 100;
    const dist = levenshtein(a, b);
    return ((len - dist) / len) * 100;
}

// Function to extract URLs from plain text
function extractURLs(text) {
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    return [...new Set(text.match(urlPattern) || [])];
}

// Function to extract URLs from XML
function extractXMLUrls(text) {
    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const urls = [];
        
        const urlTags = ['loc', 'url', 'link', 'href'];
        urlTags.forEach(tag => {
            Array.from(xml.getElementsByTagName(tag))
                .forEach(el => {
                    const url = el.textContent.trim();
                    const urlPattern = /^https?:\/\/[^\s<>"']+$/;
                    if (url && urlPattern.test(url)) {
                        urls.push(url);
                    }
                });
        });
        
        return [...new Set(urls)];
    } catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}

// Function to extract text lines
function extractTextLines(text) {
    return text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// Function to extract items with flexible parsing
function extractItems(text, type) {
    try {
        // Trim and normalize text
        text = text.trim();

        // Helper function to check if text looks like XML
        function isXML(str) {
            return str.trim().startsWith('<') && str.trim().endsWith('>');
        }

        // Detect XML content
        const isFirstXML = isXML(text);

        switch(type) {
            case 'url-url':
            case 'url-xml':
                // URL extraction pattern
                const urlPattern = /https?:\/\/[^\s<>"']+/g;
                const xmlUrlPattern = /^https?:\/\/[^\s<>"']+$/;

                // If text is XML, try to extract URLs from it
                if (isXML(text)) {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(text, "text/xml");
                    const urlTags = ['loc', 'url', 'link', 'href'];
                    const extractedUrls = [];
                    
                    urlTags.forEach(tag => {
                        Array.from(xml.getElementsByTagName(tag))
                            .forEach(el => {
                                const url = el.textContent.trim();
                                if (url && xmlUrlPattern.test(url)) {
                                    extractedUrls.push(url);
                                }
                            });
                    });

                    return [...new Set(extractedUrls)];
                }

                // If not XML, extract URLs from text
                return [...new Set((text.match(urlPattern) || []).filter(url => xmlUrlPattern.test(url)))
                ]

            case 'xml-xml':
                // Ensure both inputs are XML
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, "text/xml");
                const urlTags = ['loc', 'url', 'link', 'href'];
                const extractedUrls = [];
                
                urlTags.forEach(tag => {
                    Array.from(xml.getElementsByTagName(tag))
                        .forEach(el => {
                            const url = el.textContent.trim();
                            const urlPattern = /^https?:\/\/[^\s<>"']+$/;
                            if (url && urlPattern.test(url)) {
                                extractedUrls.push(url);
                            }
                        });
                });
                
                return [...new Set(extractedUrls)];

            case 'text-text':
                return extractTextLines(text);

            default:
                return [];
        }
    } catch (error) {
        console.error('Error extracting items:', error);
        return [];
    }
}

// Function to copy results
function copyResults(event) {
    const targetId = event.target.getAttribute('data-target');
    const resultsList = document.getElementById(targetId);
    const items = Array.from(resultsList.children)
        .filter(li => !li.classList.contains('results-summary'))
        .map(li => li.textContent);

    navigator.clipboard.writeText(items.join('\n')).then(() => {
        event.target.textContent = '✓';
        setTimeout(() => {
            event.target.textContent = '📋';
        }, 2000);
    });
}

// Function to show results with consistent scroll
function showResults(elementId, items, showTotal = true) {
    const listElement = document.getElementById(elementId);
    listElement.innerHTML = '';

    listElement.classList.add('results-list');

    if (showTotal) {
        const totalItem = document.createElement("li");
        totalItem.textContent = `Total de elementos: ${items.length}`;
        totalItem.classList.add('results-summary');
        listElement.appendChild(totalItem);
    }

    const parentPanel = listElement.closest('.panel');
    if (!parentPanel.querySelector('.copy-btn')) {
        const copyButton = document.createElement("button");
        copyButton.textContent = "📋";
        copyButton.classList.add('copy-btn');
        copyButton.setAttribute('data-target', elementId);
        copyButton.addEventListener('click', copyResults);
        parentPanel.insertBefore(copyButton, listElement);
    }

    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        listElement.appendChild(li);
    });

    const panel = listElement.closest('.panel');
    if (panel) {
        if (panel.classList.contains('active')) {
            panel.style.maxHeight = '400px';
        }
    }
}

// Function to show/hide loading spinner
function toggleLoading(show) {
    const loadingEl = document.getElementById('loadingSpinner');
    if (show) {
        if (!loadingEl) {
            const spinner = document.createElement('div');
            spinner.id = 'loadingSpinner';
            spinner.className = 'loading-spinner';
            spinner.innerHTML = `
                <div class="spinner"></div>
                <div class="loading-text">Procesando datos...</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            `;
            document.body.appendChild(spinner);
        } else {
            loadingEl.style.display = 'flex';
        }
    } else if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// Function to update progress bar
function updateProgress(percent) {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
}

// Function to process comparisons in chunks
async function processComparisons(items1, items2, comparisonType) {
    const CHUNK_SIZE = 1000;
    const results = {
        matching: [],
        uniqueInFirst: [],
        uniqueInSecond: [],
        partial: []
    };
    
    const items2Set = new Set(items2);
    let processedItems = 0;
    const totalItems = items1.length;
    
    for (const chunk of chunks(items1, CHUNK_SIZE)) {
        await new Promise(resolve => {
            setTimeout(() => {
                chunk.forEach(item1 => {
                    if (items2Set.has(item1)) {
                        results.matching.push(item1);
                    } else {
                        results.uniqueInFirst.push(item1);
                        
                        // Adjust similarity threshold based on comparison type
                        const similarityThreshold = comparisonType === 'text-text' ? 70 : 99;
                        
                        items2.forEach(item2 => {
                            const similarityPercent = similarity(item1, item2);
                            if (similarityPercent >= 70 && similarityPercent < 99) {
                                results.partial.push(`${item1} - ${item2} (${similarityPercent.toFixed(2)}%)`);
                            }
                        });
                    }
                });
                
                processedItems += chunk.length;
                const progress = (processedItems / totalItems) * 100;
                updateProgress(progress);
                
                resolve();
            }, 0);
        });
    }
    
    results.uniqueInSecond = items2.filter(item => !items1.includes(item));
    return results;
}

// Function to combine selected results
function combineSelectedResults() {
    const urlPattern = /^https?:\/\/[^\s<>"']+$/;
    const combinedItems = new Set();
    const checkboxes = document.querySelectorAll('.combine-checkbox input:checked');
    
    checkboxes.forEach(checkbox => {
        const sourceId = checkbox.getAttribute('data-source');
        const sourceList = document.getElementById(sourceId);
        const items = Array.from(sourceList.children)
            .filter(li => !li.classList.contains('results-summary'))
            .map(li => li.textContent.trim())
            .filter(url => urlPattern.test(url));
        
        items.forEach(item => combinedItems.add(item));
    });

    const combinedArray = Array.from(combinedItems);
    showResults("combinedResults", combinedArray);
    
    const combinedAccordion = document.getElementById('combinedResultsAccordion');
    const combinedPanel = document.getElementById('combinedResultsPanel');
    if (combinedAccordion && combinedPanel) {
        combinedAccordion.classList.add('active');
        combinedPanel.style.maxHeight = '400px';
        combinedPanel.classList.add('active');
    }
}

// Function to export to Excel
function exportToExcel() {
    const combinedList = document.getElementById('combinedResults');
    if (!combinedList || !combinedList.children.length) {
        alert('No hay datos para exportar.');
        return;
    }

    const urlPattern = /^https?:\/\/[^\s<>"']+$/;
    const rows = Array.from(combinedList.children)
        .filter(li => !li.classList.contains('results-summary'))
        .map(li => li.textContent.trim())
        .filter(url => urlPattern.test(url))
        .map(url => [url]);

    if (rows.length === 0) {
        alert('No hay URLs válidas para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['URL'], ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'URLs Combinadas');
    XLSX.writeFile(wb, 'urls_combinadas.xlsx');
}

// Event Listeners initialization
document.addEventListener('DOMContentLoaded', function() {
    // Live counter for textareas
    const textareas = [document.getElementById('list1'), document.getElementById('list2')];
    const comparisonTypeSelect = document.getElementById('comparisonType');
    
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            const comparisonType = comparisonTypeSelect.value;
            const items = extractItems(this.value, comparisonType);
            const counterId = this.id + 'Count';
            const counterElement = document.getElementById(counterId);
            if (counterElement) {
                counterElement.textContent = `Total de ${comparisonType}: ${items.length}`;
            }
        });
    });

    // Accordion handling with consistent height
    document.querySelectorAll('.accordion').forEach(accordion => {
        accordion.addEventListener('click', function() {
            const panel = this.nextElementSibling;
            const icon = this.querySelector('.accordion-icon');
            
            this.classList.toggle('active');
            panel.classList.toggle('active');
            
            if (panel.classList.contains('active')) {
                if (panel.querySelector('.results-list')) {
                    panel.style.maxHeight = '400px';
                } else {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }
            } else {
                panel.style.maxHeight = "0";
            }
        });
    });

    // Compare button event listener
    document.getElementById('compareButton').addEventListener('click', async function() {
        const comparisonType = document.getElementById('comparisonType').value;
        const list1 = extractItems(document.getElementById('list1').value, comparisonType);
        const list2 = extractItems(document.getElementById('list2').value, comparisonType);
        
        if (!list1.length || !list2.length) {
            alert('Por favor, ingrese listados correctos en ambos campos según la opción de comparación seleccionada.');
            return;
        }
        
        toggleLoading(true);
        const results = await processComparisons(list1, list2, comparisonType);
        
        showResults('matchingUrls', results.matching);
        showResults('uniqueUrlsInFirstList', results.uniqueInFirst);
        showResults('uniqueUrlsInSecondList', results.uniqueInSecond);
        showResults('partialMatches', results.partial);
        
        toggleLoading(false);

        // Activate and display result panels
        document.querySelectorAll('.panel').forEach(panel => {
            if (panel.querySelector('.results-list')) {
                panel.classList.add('active');
                panel.style.maxHeight = '400px';
                panel.previousElementSibling.classList.add('active');
            }
        });
    });

    // Combine button event listener
    document.getElementById('combineButton').addEventListener('click', combineSelectedResults);

    // Export to Excel button event listener
    document.querySelector('.export-excel-btn').addEventListener('click', exportToExcel);
});