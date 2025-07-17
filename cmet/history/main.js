let vehicleData = {}

let vehicleStats = {}

document.body.onload = async () => {
    let data = log.split("\n")
    let initialTimestamp = parseInt(data[0].split(" ")[2])
    let finalTimestamp = parseInt(data[data.length - 2].split(" ")[2])
    console.log("RECEIVED " + ((finalTimestamp - initialTimestamp) / 1000 / 60 / 60).toFixed(3) + "h of data")
    map = L.map('map', {
        attributionControl: false,
        zoomControl: false,
        keepBuffer: 6,         // 🔥 preloads extra tile rows beyond view
        inertia: true,
        minZoom: 10
    }).setView([38.6932977, -9.3146746], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
        maxNativeZoom: 18,
        maxZoom: 19,
        detectRetina: false,
        reuseTiles: true,
        tileSize: 256,
    }).addTo(map);

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
            vehicleData[timestamp][vec[0]] = [vec[1], vec[2]]
            if (vec[8]) {
                vehicleStats[vec[0]] = vec[8].split("_").slice(0, 3).join("_")
            }
            vehicleData[timestamp][vec[0]].push(vehicleStats[vec[0]] || "NULL")
        })
    }

}

let currentMarkers = {}

function updateMarkersForTime(time) {
    const data = vehicleData[time];
    const activeIDs = new Set();

    document.getElementById("timeLabel").innerHTML = "Time - " + Object.keys(data).length + " vehicles"

    Object.keys(data).forEach(vehicle => {
        activeIDs.add(vehicle);

        if (currentMarkers[vehicle]) {
            // Move existing marker
            currentMarkers[vehicle].setLatLng([data[vehicle][0], data[vehicle][1]]);
            currentMarkers[vehicle].setIcon(L.divIcon({
                className: 'line',
                html: `<div>${data[vehicle][2]}</div>`,
                iconSize: [80, 15],
            }));
        } else {
            // Create new marker
            const marker = L.marker([data[vehicle][0], data[vehicle][1]], {
                icon: L.divIcon({
                    className: 'line',
                    html: `<div>${data[vehicle][2]}</div>`,
                    iconSize: [80, 15]
                })
            })
                .addTo(map)
                .bindPopup(vehicle);
            currentMarkers[vehicle] = marker;
        }
    });

    // Remove markers that are no longer present
    Object.keys(currentMarkers).forEach(id => {
        if (!activeIDs.has(id)) {
            map.removeLayer(currentMarkers[id]);
            delete currentMarkers[id];
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