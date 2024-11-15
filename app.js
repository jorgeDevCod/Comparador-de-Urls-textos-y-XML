// Función para calcular la distancia de Levenshtein entre dos cadenas
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

// Función para calcular el porcentaje de similitud basado en la distancia de Levenshtein
function similarity(a, b) {
    const len = Math.max(a.length, b.length);
    const dist = levenshtein(a, b);
    return ((len - dist) / len) * 100; // Retorna el porcentaje de similitud
}

// Función para extraer URLs de una cadena XML (sitemap.xml) o texto plano
function extractItems(text) {
    const urlPattern = /https?:\/\/[^\s<>"']+/g; // Patrón para detectar URLs
    const items = [];

    // Verifica si el texto contiene estructura XML (como sitemap.xml)
    if (text.includes("<url>") || text.includes("<loc>")) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        // Extrae URLs desde etiquetas <loc> para sitemaps o <url> para listas de URLs
        const locElements = xml.getElementsByTagName("loc");
        const urlElements = xml.getElementsByTagName("url");

        // Agrega URLs desde <loc>
        for (let i = 0; i < locElements.length; i++) {
            items.push(locElements[i].textContent.trim());
        }

        // Agrega URLs desde <url>
        for (let i = 0; i < urlElements.length; i++) {
            items.push(urlElements[i].textContent.trim());
        }
    } else {
        // Extrae URLs o divide el texto en párrafos cuando no es XML
        const matches = text.match(urlPattern);
        if (matches) {
            items.push(...matches.map(url => url.trim()));
        } else {
            items.push(...text.split(/\r?\n/).map(item => item.trim()).filter(item => item));
        }
    }
    return items;
}

// Función principal para comparar las URLs
function compareUrls() {
    // Obtener los valores de los campos de texto
    let list1 = document.getElementById("list1").value;
    let list2 = document.getElementById("list2").value;

    // Limpiar los resultados previos
    document.getElementById("matchingUrls").innerHTML = '';
    document.getElementById("uniqueUrlsInFirstList").innerHTML = '';
    document.getElementById("uniqueUrlsInSecondList").innerHTML = '';
    document.getElementById("partialMatches").innerHTML = '';

    // Convertir las listas de texto en arrays de URLs
    let items1 = extractItems(list1);
    let items2 = extractItems(list2);

    // Crear arrays para elementos coincidentes y únicos en cada lista
    let matchingItems = [];
    let uniqueItemsInFirstList = [];
    let uniqueItemsInSecondList = [];
    let partialMatches = [];

    // Filtrar y comparar elementos
    items1.forEach(item => {
        if (items2.includes(item)) {
            matchingItems.push(item);
        } else {
            uniqueItemsInFirstList.push(item);
        }
    });

    // Agregar elementos restantes de la segunda lista que no están en la primera
    items2.forEach(item => {
        if (!items1.includes(item) && !matchingItems.includes(item)) {
            uniqueItemsInSecondList.push(item);
        }
    });

    // Coincidencias parciales (95% a 99% de similitud)
    items1.forEach(item1 => {
        items2.forEach(item2 => {
            const similarityPercentage = similarity(item1, item2);
            if (similarityPercentage >= 97 && similarityPercentage < 100) {
                partialMatches.push(`${item1} - ${item2} (${similarityPercentage.toFixed(2)}%)`);
            }
        });
    });

    // Mostrar resultados
    showResults("matchingUrls", matchingItems);
    showResults("uniqueUrlsInFirstList", uniqueItemsInFirstList);
    showResults("uniqueUrlsInSecondList", uniqueItemsInSecondList);
    showResults("partialMatches", partialMatches);

    // Mostrar acordeones
    document.querySelectorAll(".accordion").forEach(button => {
        button.style.display = "block";
    });
    document.querySelectorAll(".panel").forEach(panel => {
        panel.style.display = "block";
    });
}

// Función para mostrar los resultados en la interfaz (sin números de fila)
function showResults(elementId, items) {
    const listElement = document.getElementById(elementId);
    // Añadir un texto con el total de filas al principio
    const totalText = `Total de elementos: ${items.length}`;
    let totalItem = document.createElement("li");
    totalItem.textContent = totalText;
    totalItem.className = 'list-item';
    listElement.appendChild(totalItem);
    
    // Agregar las URLs sin los números
    items.forEach(item => {
        let li = document.createElement("li");
        li.textContent = item; // Solo el texto de la URL
        li.className = 'list-item';
        listElement.appendChild(li);
    });
}

// Funcionalidad de acordeón
const accordions = document.getElementsByClassName("accordion");
for (let i = 0; i < accordions.length; i++) {
    accordions[i].addEventListener("click", function() {
        this.classList.toggle("active");
        const panel = this.nextElementSibling;
        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    });
}
