let shortLines = ["1008", "1009", "1012", "1015", "1109", "1113", "1114", "1120", "1124", "1201", "1204", "1205", "1210", "1216", "1221", "1222", "1226", "1229", "1230", "1252", "1501", "1510", "1511", "1513", "1524"]

let markersCache = {}

let markers;

document.body.onload = async () => {
    let stops = await fetch("/cmetropolitana/stops.json").then(r => r.json())

    map = L.map("map").setView([38.7033459, -9.1638052], 12); // Latitude and Longitude, and Zoom Level

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 9,
        attribution: '© OpenStreetMap',
        useCache: true,
        saveToCache: true,
        useOnlyCache: false
    }).addTo(map);


    markers = L.markerClusterGroup({
        maxClusterRadius: 100,
        minClusterRadius: 10,
        spiderfyDistanceMultiplier: 1,
        iconCreateFunction: function(cluster) {
            var clusterSize = "small";
            if (cluster.getChildCount() >= 10) {
                clusterSize = "medium";
            }
            if (cluster.getChildCount() >= 250) {
                clusterSize = "large";
            }
            return new L.DivIcon({
                html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                className: 'marker-cluster marker-cluster-' + clusterSize,
                iconSize: [80, 80]
            });
        }
    })

    let stopIcon = L.icon({
        iconUrl: "/assets/icon-set/blob.png",
        iconAnchor: [16, 16],
        popupAnchor: [0, -20]
    });
    stops.forEach(stop => {
        var marker = L.marker(stop.pos, {
            icon: stopIcon
        })
        let lines = stop.lines.reduce((acc, value) => acc + "<span class=\" line\" style=\"background-color:" + (shortLines.includes(value) ? "#3D85C6" : (value === "CP" ? "#2A9057" : "#C61D23")) + "; color: white;\">" + value + "</span>", "")

        const popupContent = `
        <div class="stop-popup" style="text-align: center;">
            <p>${stop.name}</p>
            <p class="lines">${lines}</p>
            <button onclick="window.location.href = '/cmetropolitana/stop/${stop.id}'">Ver mais</button>
        </div>
    `;

        marker.bindPopup(popupContent);
        markers.addLayer(marker)
        markersCache[stop.id] = marker;
    })

    map.addLayer(markers)
}