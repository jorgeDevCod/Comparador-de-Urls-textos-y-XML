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

function compareUrls() {
    // Obtener los valores de los campos de texto
    let list1 = document.getElementById("list1").value;
    let list2 = document.getElementById("list2").value;

    // Limpiar los resultados previos
    document.getElementById("matchingUrls").innerHTML = '';
    document.getElementById("uniqueUrlsInFirstList").innerHTML = '';
    document.getElementById("uniqueUrlsInSecondList").innerHTML = '';

    // Convertir las listas de texto en arrays de URLs
    let items1 = extractItems(list1);
    let items2 = extractItems(list2);

    // Crear arrays para elementos coincidentes y únicos en cada lista
    let matchingItems = [];
    let uniqueItemsInFirstList = [];
    let uniqueItemsInSecondList = [];

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

    // Mostrar elementos iguales con enumeración
    matchingItems.forEach((item, index) => {
        let li = document.createElement("li");
        li.textContent = `${index + 1}. ${item}`;
        li.className = 'list-item';
        document.getElementById("matchingUrls").appendChild(li);
    });

    // Mostrar elementos únicos en el primer listado con enumeración
    uniqueItemsInFirstList.forEach((item, index) => {
        let li = document.createElement("li");
        li.textContent = `${index + 1}. ${item}`;
        li.className = 'list-item';
        document.getElementById("uniqueUrlsInFirstList").appendChild(li);
    });

    // Mostrar elementos únicos en el segundo listado con enumeración
    uniqueItemsInSecondList.forEach((item, index) => {
        let li = document.createElement("li");
        li.textContent = `${index + 1}. ${item}`;
        li.className = 'list-item';
        document.getElementById("uniqueUrlsInSecondList").appendChild(li);
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
