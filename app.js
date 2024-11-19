// Función para calcular la distancia de Levenshtein
function levenshtein(a, b) {
    const tmp = [];
    let i, j, alen = a.length, blen = b.length, ai, bj, cost;
    if (alen === 0) { return blen; }
    if (blen === 0) { return alen; }  
    for (i = 0; i <= alen; i++) { tmp[i] = [i]; }
    for (j = 0; j <= blen; j++) { tmp[0][j] = j; }
    for (i = 1; i <= alen; i++) {
        ai = a.charAt(i - 1);
        for (j = 1; j <= blen; j++) {
            bj = b.charAt(j - 1);
            cost = (ai === bj) ? 0 : 1;
            tmp[i][j] = Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + cost);
        }
    }
    return tmp[alen][blen];
}

// Función para calcular el porcentaje de similitud
function similarity(a, b) {
    const len = Math.max(a.length, b.length);
    const dist = levenshtein(a, b);
    return ((len - dist) / len) * 100;
}

// Función para extraer URLs de una cadena XML o texto plano
function extractItems(text) {
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    const items = [];

    // Verifica si el texto contiene estructura XML
    if (text.includes("<url>") || text.includes("<loc>")) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        const locElements = xml.getElementsByTagName("loc");
        const urlElements = xml.getElementsByTagName("url");

        for (let i = 0; i < locElements.length; i++) {
            items.push(locElements[i].textContent.trim());
        }

        for (let i = 0; i < urlElements.length; i++) {
            items.push(urlElements[i].textContent.trim());
        }
    } else {
        // Extrae URLs o divide el texto cuando no es XML
        const matches = text.match(urlPattern);
        if (matches) {
            items.push(...matches.map(url => url.trim()));
        } else {
            items.push(...text.split(/\r?\n/).map(item => item.trim()).filter(item => item));
        }
    }
    return items;
}

// Función para mostrar resultados
function showResults(elementId, items, showTotal = true) {
    const listElement = document.getElementById(elementId);
    listElement.innerHTML = ''; // Limpiar resultados anteriores

    if (showTotal) {
        const totalItem = document.createElement("li");
        totalItem.textContent = `Total de elementos: ${items.length}`;
        totalItem.classList.add('results-summary');
        listElement.appendChild(totalItem);
    }

    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        listElement.appendChild(li);
    });
}

// Función principal de comparación
function compareUrls() {
    const list1 = document.getElementById("list1").value;
    const list2 = document.getElementById("list2").value;

    const items1 = extractItems(list1);
    const items2 = extractItems(list2);

    const matchingItems = items1.filter(item => items2.includes(item));
    const uniqueItemsInFirstList = items1.filter(item => !items2.includes(item));
    const uniqueItemsInSecondList = items2.filter(item => !items1.includes(item));

    const partialMatches = [];
    items1.forEach(item1 => {
        items2.forEach(item2 => {
            const similarityPercentage = similarity(item1, item2);
            if (similarityPercentage >= 97 && similarityPercentage < 100) {
                partialMatches.push(`${item1} - ${item2} (${similarityPercentage.toFixed(2)}%)`);
            }
        });
    });

    showResults("matchingUrls", matchingItems);
    showResults("uniqueUrlsInFirstList", uniqueItemsInFirstList);
    showResults("uniqueUrlsInSecondList", uniqueItemsInSecondList);
    showResults("partialMatches", partialMatches);

    // Mostrar paneles
    document.querySelectorAll('.panel').forEach(panel => {
        if (panel.querySelector('.results-list').children.length > 0) {
            panel.classList.add('has-content');
        } else {
            panel.classList.remove('has-content');
        }
    });
}

// Inicializar acordeones
document.querySelectorAll('.accordion').forEach(accordion => {
    accordion.addEventListener('click', function() {
        this.classList.toggle('active');
        const panel = this.nextElementSibling;
        panel.classList.toggle('active');
    });
});

// Evento de comparación
document.getElementById('compareButton').addEventListener('click', compareUrls);


