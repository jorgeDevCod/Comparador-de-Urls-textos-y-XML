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

// Función para mostrar resultados con scroll consistente
function showResults(elementId, items, showTotal = true) {
    const listElement = document.getElementById(elementId);
    listElement.innerHTML = '';

    // Asegurar que el contenedor tenga la clase para el scroll
    listElement.classList.add('results-list');

    if (showTotal) {
        const totalItem = document.createElement("li");
        totalItem.textContent = `Total de elementos: ${items.length}`;
        totalItem.classList.add('results-summary');
        listElement.appendChild(totalItem);
    }

    // Añadir botón de copiar
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

    // Asegurar que el panel tenga altura máxima consistente
    const panel = listElement.closest('.panel');
    if (panel) {
        if (panel.classList.contains('active')) {
            panel.style.maxHeight = '400px'; // Altura fija para todos los paneles
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

    // Filtrar elementos relevantes
    const rows = Array.from(combinedList.children)
        .filter(li => !li.classList.contains('results-summary')) // Ignorar resúmenes
        .map(li => [li.textContent.trim()]) // Convertir a formato para Excel
        .filter(row => row[0]); // Ignorar filas vacías

    if (rows.length === 0) {
        alert('No hay datos válidos para exportar.');
        return;
    }

    // Crear archivo Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['URL'], ...rows]); // Agregar encabezado "URL"
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados Combinados');
    XLSX.writeFile(wb, 'resultados_combinados.xlsx');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Contador en vivo para los textareas
    const textareas = [document.getElementById('list1'), document.getElementById('list2')];
    
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            const items = extractItems(this.value);
            const counterId = this.id + 'Count';
            const counterElement = document.getElementById(counterId);
            if (counterElement) {
                counterElement.textContent = `Total de URLs o Textos: ${items.length}`;
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
                // Establecer altura fija para los paneles de resultados
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
        const list1 = extractItems(document.getElementById('list1').value);
        const list2 = extractItems(document.getElementById('list2').value);
        
        if (!list1.length || !list2.length) {
            alert('Por favor, ingrese URLs o texto en ambos campos.');
            return;
        }
        
        toggleLoading(true);
        const results = await processComparisons(list1, list2);
        
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

// Estilos CSS necesarios (añadir al archivo CSS o en una etiqueta style)
const styles = `
/* Estilos para los contenedores de resultados */
.results-list {
    max-height: 350px;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid #ddd;
    border-radius: 4px;
}

/* Estilo para el scroll */
.results-list::-webkit-scrollbar {
    width: 8px;
}

.results-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

.results-list::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

.results-list::-webkit-scrollbar-thumb:hover {
    background: #555;
}

/* Estilos para los elementos de la lista */
.results-list li {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
}

.results-list li:last-child {
    border-bottom: none;
}

/* Estilo para el resumen de resultados */
.results-summary {
    background-color: #f8f9fa;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 1;
}

/* Ajustes para el panel */
.panel {
    transition: max-height 0.3s ease-out;
    overflow: hidden;
}

.panel.active {
    overflow-y: auto;
}

/* Ajuste para el botón de copiar */
.copy-btn {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 2;
}
`;

// Añadir estilos al documento
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);