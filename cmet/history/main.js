let vehicleData = {}

let vehicleStats = {}

let stopInfo;

document.body.onload = async () => {
    let data = log.split("\n")
    let initialTimestamp = parseInt(data[0].split(" ")[2])
    let finalTimestamp = parseInt(data[data.length - 2].split(" ")[2])

    stopInfo = await fetch("https://api.carrismetropolitana.pt/v2/stops").then(r => r.json())

    console.log("RECEIVED " + ((finalTimestamp - initialTimestamp) / 1000 / 60 / 60).toFixed(3) + "h of data")
    map = L.map('map', {
        attributionControl: false,
        zoomControl: false,
        keepBuffer: 6,         // 🔥 preloads extra tile rows beyond view
        inertia: true,
        minZoom: 10,
        zoomSnap: 0
    }).setView([38.688171502465075, -9.316380024465618], 18.2) //.setView([38.81016045483458, -9.240360260009767], 12.);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        zoomOffset: 0,
        zoomSnap: 0,
        keepBuffer: 16,
        edgeBufferTiles: 2,
        updateWhenZooming: false,
        updateWhenIdle: true,
        detectRetina: false,
        reuseTiles: true
    }).addTo(map);

    map.createPane('linePane');
    map.getPane('linePane').style.zIndex = 399;

    let timeControl = document.getElementById("timeRange")
    timeControl.setAttribute("min", 4 * 60 * 2)
    timeControl.setAttribute("value", 4 * 60 * 2)
    timeControl.setAttribute("max", 4 * 60 * 2 - 1 + data.length / 2)

    timeControl.onchange = () => {
        let time = timeControl.value;

        let timeLabel = document.getElementById("time")
        timeLabel.innerHTML = secondsToHHMMSS(time * 30);
        updateMarkersForTime(time)
    }

    for (let i = 0; i < data.length; i += 2) {
        let timestamp = 4 * 60 * 2 + i / 2;
        let dataTs = data[i + 1].split("€").map(z => z.split("<"))
        dataTs.forEach(vec => {
            if (!vehicleData[timestamp]) vehicleData[timestamp] = {}
            vehicleData[timestamp][vec[0]] = [vec[1], vec[2], vec[5], vec[7]]
            if (vec[8]) {
                vehicleStats[vec[0]] = vec[8].split("_").slice(0, 3).join("_")
            }
            vehicleData[timestamp][vec[0]].push(vehicleStats[vec[0]] || "NULL")
        })
    }

}

let shortLines = ["1008", "1009", "1012", "1015", "1104", "1109", "1113", "1114", "1120", "1124", "1201", "1204", "1205", "1210", "1216", "1221", "1222", "1226", "1229", "1230", "1252", "1501", "1510", "1511", "1513", "1524"]

let currentMarkers = {}

let currentLines = {}

let stopIds = ["120787", "121297", "121235", "121272", "121291", "126234", "120729", "121270", "121187", "121188"]

function updateMarkersForTime(time) {
    const data = vehicleData[time];
    const activeIDs = new Set();

    document.getElementById("timeLabel").innerHTML = Object.keys(data).length + " veículos/vehicles"

    Object.keys(data).forEach(vehicle => {
        activeIDs.add(vehicle);

        if (currentMarkers[vehicle]) {
            // Move existing marker
            currentMarkers[vehicle].setLatLng([data[vehicle][0], data[vehicle][1]]);
            currentMarkers[vehicle].setIcon(L.divIcon({
                className: 'line ' + (shortLines.find(a => data[vehicle][4].startsWith(a)) ? "short" : (data[vehicle][4].startsWith("1998") ? "cp" : "long")) + (data[vehicle][3] === "OPEN" ? " open" : ""),
                html: `<div>${data[vehicle][4].replaceAll("1998", "CP").split("_")[0]}</div>`,
                iconSize: [30, 10],
            }))
                .bindPopup(vehicle + " - " + data[vehicle][2] + " " + data[vehicle][3]);

            let { lat, lon } = stopInfo.find(a => a.id === data[vehicle][2])

            let line = [[data[vehicle][0], data[vehicle][1]], [lat, lon]];

            let distance = flatDistanceMeters(line)

            if (!stopIds.includes(data[vehicle][2])) distance = 10000;

            if (distance < 800) {
                if (!currentLines[vehicle]) {
                    const line = L.polyline([currentMarkers[vehicle].getLatLng(), [lat, lon]], {
                        color: 'blue',
                        weight: 5,
                        pane: 'linePane',
                        opacity: 0.5 - (distance / 1600)
                    }).addTo(map);
                    currentLines[vehicle] = line;
                } else {
                    currentLines[vehicle].setStyle({ opacity: 0.5 - (distance / 1600) });
                    currentLines[vehicle].setLatLngs(line);
                }
            } else if (currentLines[vehicle]) {
                map.removeLayer(currentLines[vehicle])
                delete currentLines[vehicle]
            }
        } else {
            // Create new marker
            const marker = L.marker([data[vehicle][0], data[vehicle][1]], {
                icon: L.divIcon({
                    className: 'line ' + (shortLines.find(a => data[vehicle][4].startsWith(a)) ? "short" : (data[vehicle][4].startsWith("1998") ? "cp" : "long")) + (data[vehicle][3] === "OPEN" ? " open" : ""),
                    html: `<div>${data[vehicle][4].replaceAll("1998", "CP").split("_")[0]}</div>`,
                    iconSize: [30, 10]
                })
            })
                .addTo(map)
                .bindPopup(vehicle + " - " + data[vehicle][2] + " " + data[vehicle][3]);
            currentMarkers[vehicle] = marker;
            let { lat, lon } = stopInfo.find(a => a.id === data[vehicle][2])
            let distance = flatDistanceMeters([[data[vehicle][0], data[vehicle][1]], [lat, lon]])

            if (!stopIds.includes(data[vehicle][2])) distance = 10000;

            if (distance < 800) {
                const line = L.polyline([marker.getLatLng(), [lat, lon]], {
                    color: 'blue',
                    weight: 5,
                    pane: 'linePane',
                    opacity: 0.5 - (distance / 1600)
                }).addTo(map);
                currentLines[vehicle] = line;
            }

        }
    });

    // Remove markers that are no longer present
    Object.keys(currentMarkers).forEach(id => {
        if (!activeIDs.has(id)) {
            map.removeLayer(currentMarkers[id]);
            if(currentLines[id]) map.removeLayer(currentLines[id])
            delete currentMarkers[id];
            if(currentLines[id]) delete currentLines[id];
        }
    });
}

function secondsToHHMMSS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Pad with leading zeroes
    const pad = (num) => String(num).padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function flatDistanceMeters(c) {
    let coord1 = c[0].map(z => parseFloat(z))
    let coord2 = c[1]
    const R = 6371000; // Earth radius in meters
    const latDiff = (coord2[0] - coord1[0]) * Math.PI / 180;
    const lngDiff = (coord2[1] - coord1[1]) * Math.PI / 180;
    const avgLat = ((coord1[0] + coord2[0]) / 2) * Math.PI / 180;

    const x = lngDiff * Math.cos(avgLat);
    const y = latDiff;

    return Math.sqrt(x * x + y * y) * R;
}