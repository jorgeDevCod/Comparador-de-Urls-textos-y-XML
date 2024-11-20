// Función auxiliar para dividir arrays en chunks
function chunks(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// Función para calcular la distancia de Levenshtein optimizada
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

// Función para calcular el porcentaje de similitud
function similarity(a, b) {
    const len = Math.max(a.length, b.length);
    if (len === 0) return 100;
    const dist = levenshtein(a, b);
    return ((len - dist) / len) * 100;
}

// Función para extraer elementos según el tipo de comparación
function extractItems(text, type) {
    switch(type) {
        case 'url-url':
            return extractURLs(text);
        case 'url-xml':
            return extractXMLUrls(text);
        case 'text-text':
            return extractTextLines(text);
        default:
            return [];
    }
}

// Función para extraer URLs de texto plano
function extractURLs(text) {
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    return [...new Set(text.match(urlPattern) || [])];
}

// Función para extraer URLs de XML
function extractXMLUrls(text) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const urls = [];
    
    ['loc', 'url'].forEach(tag => {
        Array.from(xml.getElementsByTagName(tag))
            .forEach(el => {
                const url = el.textContent.trim();
                if (url) urls.push(url);
            });
    });
    
    return urls;
}

// Función para extraer líneas de texto
function extractTextLines(text) {
    return text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// Función para copiar resultados
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

// Función para mostrar resultados con scroll consistente
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

// Función para mostrar/ocultar el loading spinner
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

// Función para actualizar la barra de progreso
function updateProgress(percent) {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
}

// Función para procesar comparaciones en chunks
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
                        
                        // Ajustar criterios de similitud según el tipo de comparación
                        const similarityThreshold = comparisonType === 'text-text' ? 95 : 97;
                        
                        items2.some(item2 => {
                            const similarityPercent = similarity(item1, item2);
                            if (similarityPercent >= similarityThreshold && similarityPercent < 100) {
                                results.partial.push(`${item1} - ${item2} (${similarityPercent.toFixed(2)}%)`);
                                return true;
                            }
                            return false;
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

// Función para combinar resultados seleccionados
function combineSelectedResults() {
    const combinedItems = new Set();
    const checkboxes = document.querySelectorAll('.combine-checkbox input:checked');
    
    checkboxes.forEach(checkbox => {
        const sourceId = checkbox.getAttribute('data-source');
        const sourceList = document.getElementById(sourceId);
        const items = Array.from(sourceList.children)
            .filter(li => !li.classList.contains('results-summary'))
            .map(li => li.textContent);
        
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

// Función para exportar a Excel
function exportToExcel() {
    const combinedList = document.getElementById('combinedResults');
    if (!combinedList || !combinedList.children.length) {
        alert('No hay datos para exportar.');
        return;
    }

    const rows = Array.from(combinedList.children)
        .filter(li => !li.classList.contains('results-summary'))
        .map(li => [li.textContent.trim()])
        .filter(row => row[0]);

    if (rows.length === 0) {
        alert('No hay datos válidos para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Resultado'], ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados Combinados');
    XLSX.writeFile(wb, 'resultados_combinados.xlsx');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Contador en vivo para los textareas
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

    // Manejo de acordeones con altura consistente
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

    // Botón de comparar
    document.getElementById('compareButton').addEventListener('click', async function() {
        const comparisonType = document.getElementById('comparisonType').value;
        const list1 = extractItems(document.getElementById('list1').value, comparisonType);
        const list2 = extractItems(document.getElementById('list2').value, comparisonType);
        
        if (!list1.length || !list2.length) {
            alert('Por favor, ingrese elementos en ambos listados.');
            return;
        }
        
        toggleLoading(true);
        const results = await processComparisons(list1, list2, comparisonType);
        
        showResults('matchingUrls', results.matching);
        showResults('uniqueUrlsInFirstList', results.uniqueInFirst);
        showResults('uniqueUrlsInSecondList', results.uniqueInSecond);
        showResults('partialMatches', results.partial);
        
        toggleLoading(false);

        // Activar y mostrar los paneles de resultados
        document.querySelectorAll('.panel').forEach(panel => {
            if (panel.querySelector('.results-list')) {
                panel.classList.add('active');
                panel.style.maxHeight = '400px';
                panel.previousElementSibling.classList.add('active');
            }
        });
    });

    // Botón de combinar
    document.getElementById('combineButton').addEventListener('click', combineSelectedResults);

    // Botón de exportar a Excel
    document.querySelector('.export-excel-btn').addEventListener('click', exportToExcel);
});