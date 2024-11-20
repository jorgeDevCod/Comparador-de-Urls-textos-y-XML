// Función para procesar grandes conjuntos de datos en chunks
function* chunks(array, size) {
    for (let i = 0; i < array.length; i += size) {
        yield array.slice(i, i + size);
    }
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

// Función para extraer URLs de una cadena XML o texto plano
function extractItems(text) {
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    const items = new Set();

    if (text.includes("<url>") || text.includes("<loc>")) {
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            
            ['loc', 'url'].forEach(tag => {
                Array.from(xml.getElementsByTagName(tag))
                    .forEach(el => items.add(el.textContent.trim()));
            });
        } catch (e) {
            console.error('Error parsing XML:', e);
            const matches = text.match(urlPattern);
            if (matches) matches.forEach(url => items.add(url.trim()));
        }
    } else {
        const matches = text.match(urlPattern);
        if (matches) {
            matches.forEach(url => items.add(url.trim()));
        } else {
            text.split(/\r?\n/)
                .map(item => item.trim())
                .filter(item => item)
                .forEach(item => items.add(item));
        }
    }
    
    return Array.from(items);
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

// Función para mostrar resultados
function showResults(elementId, items, showTotal = true) {
    const listElement = document.getElementById(elementId);
    listElement.innerHTML = '';

    if (showTotal) {
        const totalItem = document.createElement("li");
        totalItem.textContent = `Total de elementos: ${items.length}`;
        totalItem.classList.add('results-summary');
        listElement.appendChild(totalItem);
    }

    // Añadir botón de copiar
    if (!listElement.parentElement.querySelector('.copy-btn')) {
        const copyButton = document.createElement("button");
        copyButton.textContent = "📋";
        copyButton.classList.add('copy-btn');
        copyButton.setAttribute('data-target', elementId);
        copyButton.addEventListener('click', copyResults);
        listElement.parentElement.insertBefore(copyButton, listElement);
    }


    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        listElement.appendChild(li);
    });
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
async function processComparisons(items1, items2) {
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
                        
                        items2.some(item2 => {
                            const similarityPercent = similarity(item1, item2);
                            if (similarityPercent >= 97 && similarityPercent < 100) {
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
        combinedPanel.classList.add('active');
    }
}

// Función para exportar a Excel
function exportToExcel() {
    const combinedList = document.getElementById('combinedResults');
    if (!combinedList || !combinedList.children.length) {
        alert('No hay resultados para exportar');
        return;
    }

    const items = Array.from(combinedList.children)
        .filter(li => !li.classList.contains('results-summary'))
        .map(li => [li.textContent]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['URLs/Textos'], ...items]);
    XLSX.utils.book_append_sheet(wb, ws, "Resultados Combinados");
    XLSX.writeFile(wb, "resultados_combinados.xlsx");
}

// Función principal de comparación asíncrona
async function compareUrls() {
    try {
        toggleLoading(true);
        
        // Limpiar resultados previos
        document.getElementById('combinedResults').innerHTML = '';
        document.querySelectorAll('.combine-checkbox input').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        const list1 = document.getElementById("list1").value;
        const list2 = document.getElementById("list2").value;
        
        // Extraer y procesar items en segundo plano
        const items1 = await new Promise(resolve => {
            setTimeout(() => resolve(extractItems(list1)), 0);
        });
        const items2 = await new Promise(resolve => {
            setTimeout(() => resolve(extractItems(list2)), 0);
        });
        
        // Procesar comparaciones en chunks
        const results = await processComparisons(items1, items2);
        
        // Mostrar resultados
        document.querySelectorAll('.copy-btn').forEach(btn => btn.remove());
        
        showResults("matchingUrls", results.matching);
        showResults("uniqueUrlsInFirstList", results.uniqueInFirst);
        showResults("uniqueUrlsInSecondList", results.uniqueInSecond);
        showResults("partialMatches", results.partial);
        
        // Actualizar visibilidad de paneles
        document.querySelectorAll('.panel').forEach(panel => {
            if (panel.querySelector('.results-list').children.length > 0) {
                panel.classList.add('has-content');
            } else {
                panel.classList.remove('has-content');
            }
        });
    } catch (error) {
        console.error('Error en la comparación:', error);
        alert('Ocurrió un error durante la comparación. Por favor, revisa la consola para más detalles.');
    } finally {
        toggleLoading(false);
    }
}

// Inicializar acordeones y event listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar acordeones
    document.querySelectorAll('.accordion').forEach(accordion => {
        accordion.addEventListener('click', function() {
            this.classList.toggle('active');
            const panel = this.nextElementSibling;
            panel.classList.toggle('active');
        });
    });

    // Event listeners principales
    document.getElementById('compareButton').addEventListener('click', compareUrls);
    document.getElementById('combineButton').addEventListener('click', combineSelectedResults);
    
    // Event listener para exportar a Excel
    const exportButton = document.querySelector('.export-excel-btn');
    if (exportButton) {
        exportButton.addEventListener('click', function(e) {
            e.stopPropagation();
            exportToExcel();
        });
    }
});