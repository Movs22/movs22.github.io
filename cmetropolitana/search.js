let open = false;

let input = document.getElementById("searchInput")

let btn = document.getElementById("searchButton");

let mapBtn = document.getElementById("mapButton");

let autocoplete = document.getElementById('autocomplete');

if(mapBtn) mapBtn.onclick = () => window.location.href = "/cmetropolitana/"

let selMarker;

btn.onclick = () => {
    if(open) { 
        input.classList.add("hidden")
        btn.classList.remove('rotated'); 
    } else {
        input.classList.remove("hidden")
        btn.classList.add('rotated'); 
    }
    open = !open
}

let stops;

fetch("/cmetropolitana/stops.json").then(async r => {
    stops = await r.json()
})

input.addEventListener('input', function() {
    const query = input.value.toLowerCase();
    autocomplete.innerHTML = ''; // Clear previous suggestions

    if (query.length > 0) {
        autocoplete.classList.remove("hidden")
        const filteredSuggestions = stops.filter(item => item.name.toLowerCase().includes(query) || item.id.includes(query));
        filteredSuggestions.sort((a, b) => {
            if(a.name.toLowerCase().startsWith(query.toLowerCase()) && b.name.toLowerCase().startsWith(query.toLowerCase())) return a.name.localeCompare(b.name);
            if(a.name.toLowerCase().startsWith(query.toLowerCase()) && !b.name.toLowerCase().startsWith(query.toLowerCase())) return -1;
            if(!a.name.toLowerCase().startsWith(query.toLowerCase()) && b.name.toLowerCase().startsWith(query.toLowerCase())) return 1;
            return a.name.localeCompare(b.name);
        })
        let b = true;
        // Add filtered suggestions to the DOM
        filteredSuggestions.forEach(item => {
            b = !b
            const suggestionItem = document.createElement('div');
            if(b) suggestionItem.classList.add("a") 
            suggestionItem.textContent = item.name;
            suggestionItem.addEventListener('click', async () => {
                input.value = item.name; // Set input value to clicked suggestion
                autocomplete.innerHTML = ''; // Clear suggestions after selecting
                map.setView(item.pos, 18)
                let marker = markersCache[item.id];
                selMarker = markers.getVisibleParent(marker)
                setTimeout(() => {
                    selMarker.spiderfy(); 
                    marker.openPopup()
                }, 500)
                marker.openPopup()
            });
            autocomplete.appendChild(suggestionItem);
        });
    } else {
        autocoplete.classList.add("hidden")
    }
});

// Optional: Close suggestions when clicking outside of input/suggestions
document.addEventListener('click', (event) => {
    if (!autocomplete.contains(event.target) && !input.contains(event.target)) {
        autocomplete.innerHTML = ''; // Clear suggestions if clicked outside
    }
});
