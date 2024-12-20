let url = window.location.href.split("?id=")
let stopId = url[1]

window.location.href = "https://horarios-lx.github.io/partidas/?p=" + stopId;

/*return;

let vehicles;

let stopInfo;

let vehiclesEndpoint = (true ? "https://api.carrismetropolitana.pt/vehicles" : "/data/vehicles.json")
let resEndpoint = (true ? ("https://api.carrismetropolitana.pt/stops/" + stopId + "/realtime") : "/data/realtime.json")

window.ignoreCollapseCall;

let interval;

let colorCache = {}

let patternsCache = {};

let notesCache = {};

let routeCache = {};

document.body.onload = async () => {
    fetch("https://api.carrismetropolitana.pt/stops/" + stopId).then(r => (!r.ok ? {} : r.json())).then(r => {
        document.querySelector("link[rel*='icon']").href = "/assets/cm-icon.png";
        if (Object.keys(r).length === 0) return window.location.href = "/cmetropolitana/"
        window.stopInfo = r;
        document.getElementById("header").innerHTML = "<strong>" + r.name + "</strong><div class=\"lines\" id=\"lines\"></div>"
        //document.getElementById("speaker").onclick = () => document.getElementById("audio").play()
        document.title = "Horários em tempo real - " + r.name
        let lines = ""
        for (const line of r.lines) {
            lines = lines + "<span class=\"line"  + (line.startsWith("1") ? "" : " disabled") + "\" style=\"background-color: " + (shortLines.includes(line) ? "#3D85C6" : (line === "CP" ? "#2A9057" : "#C61D23")) + "; color: #ffffff\">" + line + "</span>"
            colorCache[line] = (shortLines.includes(line) ? "#3D85C6" : (line === "CP" ? "#2A9057" : "#C61D23"));
        }
        document.getElementById("lines").innerHTML = lines;
        document.getElementById("info").innerHTML = "<p><strong>Linhas: </strong>" + lines + "</p><p><strong>Concelho: </strong>" + (r.municipality_name || "Por definir") + "</p><p>A informação apresentada relativa ao estado dos veículos <strong>não</strong> é oficial, sendo fornecida pelos diversos utilizadores da CMetropolitana.</p><p>Este site <strong>não</strong> pertence à CMetropolitana. Saiba mais <a href=\"/cmetropolitana/about/\">na página inicial</a>.</p>"

        let debug = false;

        debug = window.location.host === "localhost:8080"

        fetchBuses(stopId, debug, true)
        interval = setInterval(async () => {
            await fetchBuses(stopId, debug)
        }, 60 * 1000)
    }).catch(error => {
        document.getElementById("info").innerHTML = error;
        window.location.href = "/cmetropolitana/?error=" + error
    });
}

document.body.onclose = interval ? clearInterval(interval) : true

let map;

let selectedVec;
let prevSelected;


async function fetchBuses(id, debug) {
    if(map) {
        prevMap = {center: map.getCenter(), zoom: map.getZoom()}
    }
    let scrollTop
    if (prevSelected && document.getElementById("stops-" + prevSelected.getAttribute("trip-id"))) {
        scrollTop = document.getElementById("stops-" + prevSelected.getAttribute("trip-id")).scrollTop;
    }
    vehicles = await fetch(vehiclesEndpoint).then(r => r.json())
    routeCache = null;
    let now = Date.now() / 1000
    let res = await fetch(resEndpoint).then(r => r.json())
    res = res.filter(a => (a.estimated_arrival_unix > (now - 30 * 60) || a.scheduled_arrival_unix > (now - 30 * 60)) && !a.observed_arrival_unix)

    res.sort((a, b) => (a.estimated_arrival_unix ? a.estimated_arrival_unix : a.scheduled_arrival_unix) - (b.estimated_arrival_unix ? b.estimated_arrival_unix : b.scheduled_arrival_unix))

    res = res.slice(0, 60)

    let fetchPromises = [];



    for (let b in res) {
        if (patternsCache[res[b].pattern_id] || !res[b].pattern_id.startsWith("1")) continue;
        patternsCache[res[b].pattern_id] = {}
        let f = fetch("../patterns/" + res[b].pattern_id + ".json").then(r => {
            if(r.ok) return r;
            r.json = () => {}
            return r;
        }).then(r => r.json()).then(p => patternsCache[res[b].pattern_id] = p)
        fetchPromises.push(f);
    }

    await Promise.all(fetchPromises)

    res.forEach(bus => {
        let vehicle = vehicles.find(a => a.trip_id === bus.trip_id || a.id === bus.vehicle_id)
        if(!bus.pattern_id.startsWith("1")) return;
        if (vehicle) {
            bus.currentLocation = vehicle.stop_id;
            if (!bus.estimated_arrival) {
                let route = patternsCache[vehicle.pattern_id]
                if(!route) return;
                let rS = route.path.indexOf(route.path.find(a => a.id === vehicle.stop_id && a.index <= bus.stop_sequence))
                let rE = route.path.indexOf(route.path.find(a => a.id === id && a.index === bus.stop_sequence))
                bus.currentStopIndex = rS;
                if (rE < rS || rS < 0) bus.observed_arrival_unix = Date.now()
                let section = route.path.filter(a => route.path.indexOf(a) >= rS && route.path.indexOf(a) <= rE)
                let time = 0;
                section.forEach(arr => time += arr.schedule.travel_time)
                if (rS > 0) {
                    bus.estimated_arrival_unix = vehicle.timestamp + time * 60;
                    bus.estimated_arrival = (new Date(bus.estimated_arrival_unix * 1000).toTimeString().split(' ')[0])
                }
                bus.vehicle_id = vehicle.id
            }
            bus.lat = vehicle.lat;
            bus.lon = vehicle.lon;
            bus.orientation = vehicle.bearing;
        }
    })

    res = res.filter(a => (a.estimated_arrival_unix > (now) || a.scheduled_arrival_unix > (now)) && !a.observed_arrival_unix)
    res = res.slice(0, 25)
    res.sort((a, b) => (a.estimated_arrival_unix ? a.estimated_arrival_unix : a.scheduled_arrival_unix) - (b.estimated_arrival_unix ? b.estimated_arrival_unix : b.scheduled_arrival_unix))

    routeCache = res;

    let notes = (await fetch(CLOUDFLARED + "notes/", { mode: "cors", method: "POST", headers: { "Content-Type": "application/json"}, body: JSON.stringify({vehicles: res.map(a => a.vehicle_id)})}).then(r => r.json()));

    notes.forEach(n => {
        res.find(a => a.vehicle_id === n.id).notes = n.notes;
        notesCache[n.id] === n.notes;
    })

    document.getElementById("services").innerHTML = ""
    res.forEach(bus => {
        let arrival = "";
        let delay = "";
        if(!bus.pattern_id.startsWith("1")) bus.estimated_arrival = null;
        let arrivalSpan = "scheduled"; 
        if (bus.estimated_arrival) {
            let dif = bus.estimated_arrival_unix - Date.now() / 1000
            dif = Math.floor(dif / 60)
            if (dif < 1) {
                arrival = "A chegar | "
            } else {
                if (dif > 59) {
                    dif = Math.floor(dif / 60)
                    arrival = dif + " h" + (dif === 1 ? "" : "s") + " | "
                } else {
                    arrival = dif + " min" + (dif === 1 ? "" : "s") + " | "
                }
            }
            let dif2 = bus.estimated_arrival_unix - bus.scheduled_arrival_unix
            dif2 = Math.floor(dif2 / 60)

            if (dif2 === 0) {
                delay = "No horário previsto"
                arrivalSpan = "ontime"
            } else {
                delay = Math.abs(dif2) + " minuto" + (Math.abs(dif2) === 1 ? " " : "s ") + (dif2 < 0 ? "adiantado" : "atrasado")
                arrivalSpan = dif2 < 0 ? "early" : "delayed"
                arrival = arrival + "<span class=\"prevTime\">" + bus.scheduled_arrival.split(":").slice(0, -1).join(":") + "</span> "
            }
        } else if (bus.stop_sequence === 1 && bus.vehicle_id !== null) {
            delay = "Partida"
            arrivalSpan = "ontime";
        } else if (bus.currentStopIndex === 0 && bus.vehicle_id !== null) {
            arrivalSpan = "ontime";
            delay = "No horário previsto"
        } else {
            delay = "Planeado"
        }
        arrival += "<span class=\"" + arrivalSpan + "\">" + (bus.estimated_arrival ? bus.estimated_arrival.split(":").slice(0, -1).join(":") : bus.scheduled_arrival.split(":").slice(0, -1).join(":")) + "</span>";
        arrival = arrival.replaceAll("24:", "(+1) 00:").replaceAll("25:", "(+1) 01:").replaceAll("26:", "(+1) 02:").replaceAll("27:", "(+1) 03:")
        let div = document.createElement("div")
        div.classList.add("service")
        div.setAttribute("trip-id", bus.trip_id + "&" + bus.stop_sequence)
        div.setAttribute("route-id", bus.pattern_id)
        div.setAttribute("stop-sequence", bus.stop_sequence)
        div.setAttribute("current-stop", bus.currentLocation)
        div.setAttribute("current-stop-index", bus.currentStopIndex)
        div.onclick = () => {
            if (window.ignoreCollapseCall) return;
            if (div.classList.contains("selected")) {
                div.classList.remove("selected");
                prevSelected = undefined
                selectedVec = undefined
            } else {
                prevSelected ? prevSelected.classList.remove("selected") : null
                div.classList.add("selected")
                prevSelected = div;
                selectedVec = bus.trip_id + "&" + bus.stop_sequence
                if (document.getElementById("currentStop")) document.getElementById("currentStop").removeAttribute("id")
                loadRoute(div, scrollTop, debug, undefined, bus)
            }
        }



        serviceUpper = "<p class=\"dest\"><span class=\"line" + (bus.pattern_id.startsWith("1") ? "" : " disabled") + "\" style=\"background-color: " + colorCache[bus.line_id] + "; color: #ffffff\">" + bus.line_id + "</span><strong>" + bus.headsign + "</strong></p><p class=\"arrival\">" + arrival + "</p>";
        serviceLower = "<p class=\"desc\">" + (getVehicle(bus.vehicle_id) !== "Desconhecido" ? "Tipo de veículo: <strong>" + getVehicle(bus.vehicle_id) + "</strong>" : "") + "</p><p class=\"delay\">" + delay + "</p></div><div class=\"route\" id=\"route-" + bus.trip_id + "&" + bus.stop_sequence + "\"><div class=\"routePattern\"><div class=\"stops\" id=\"stops-" + bus.trip_id + "&" + bus.stop_sequence + "\"></div><div class=\"map\" id=\"map-" + bus.trip_id + "&" + bus.stop_sequence + "\">Loading...</div></div>";
        
        
        if (debug) {
            serviceLower = "<p class=\"desc\">" + "CurStop: " + bus.currentLocation + "| VecID: " + bus.vehicle_id + " | TripID: " + bus.trip_id + "</p></div><div class=\"route\" id=\"route-" + bus.trip_id + "&" + bus.stop_sequence + "\"><div class=\"stops\" id=\"stops-" + bus.trip_id + "&" + bus.stop_sequence + "\"></div><div class=\"map\" id=\"map-" + bus.trip_id + "&" + bus.stop_sequence + "\">Loading...</div>"
        }
        if(!bus.pattern_id.startsWith("1")) {
            serviceLower = "";
            div.onclick = () => {}
            div.classList.add("disabled")
        } else {
            serviceLower = "<div class=\"serviceLower\">" + serviceLower + "</div>";
        }

        let warnings = "";
        if(bus.notes && bus.notes.length > 0) {
            warnings = "<div class=\"warnings\">" + bus.notes.map(a => "<p>⚠️ " + a + "</p>") + "</div>"
        }

        div.innerHTML = "<div class=\"serviceUpper\">" + serviceUpper + "</div>" + serviceLower + warnings
        document.getElementById("services").appendChild(div)
        if (bus.trip_id + "&" + bus.stop_sequence === selectedVec && div) {

            selectedVec = bus.trip_id + "&" + bus.stop_sequence
            if (document.getElementById("currentStop")) document.getElementById("currentStop").removeAttribute("id")
            div.classList.add("selected");
            prevSelected = div;
            loadRoute(div, scrollTop, debug, prevMap, bus)
        }
    });
    if (res.length === 0) document.getElementById("services").innerHTML = "Não existem serviços para este dia."
}

function getVehicle(id) {
    if (!id) return "Desconhecido"
    if (id.startsWith("41|3") || id.startsWith("41|5") || id.startsWith("41|72") || id.startsWith("41|76")) return "Autocarro com 2 portas"
    if (id.startsWith("41|17") || id.startsWith("41|8") || id.startsWith("41|73") || id.startsWith("41|74")) return "Carrinha"
    if (id.startsWith("41|1") && id.length === 7) return "Autocarro com 3 portas"
    return "UNKNOWN (ID: " + id + ")"
}




async function loadRoute(div, scrollTop, debug, prevMap, vehicle) {
    if (!div) return;
    if (div.getAttribute("loaded")) return;
    div.setAttribute("loaded", "true")
    r = patternsCache[div.getAttribute("route-id")]
    let stopsDiv = document.getElementById("stops-" + div.getAttribute("trip-id"))
    let mapDiv = document.getElementById("map-" + div.getAttribute("trip-id"))

    mapDiv.addEventListener('mousedown', () => {
        window.ignoreCollapseCall = true;
    });

    mapDiv.addEventListener('mouseup', () => {
        setTimeout(() => {
            window.ignoreCollapseCall = false;
        }, 100)
    });

    mapDiv.onclick = () => {
        window.ignoreCollapseCall = true;
        setTimeout(() => {
            window.ignoreCollapseCall = false;
        }, 100)
    }

    if(!prevMap || !prevMap.center) prevMap = {center: {}}
    map = L.map("map-" + div.getAttribute("trip-id")).setView([prevMap.center.lat || parseFloat(window.stopInfo.lat), prevMap.center.lng || parseFloat(window.stopInfo.lon)], prevMap.zoom || 16); // Latitude and Longitude, and Zoom Level

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 9,
        attribution: '© OpenStreetMap',
        useCache: true,
        saveToCache: true,
        useOnlyCache: false 
    }).addTo(map);

    let data = await fetch("/cmetropolitana/shapes/" + r.shape_id + ".json").then(r => r.json())

    L.geoJSON({
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "LineString",
            "coordinates": data.points
        }
    }, {
        style: function(feature) {
            return { color: r.color, weight: 5 };
        }
    }).addTo(map);

    var selectedIcon = L.icon( {
        iconUrl: (r.color === "#C61D23" ? "/assets/icon-set/selLong.png" : "/assets/icon-set/selShort.png"),
        iconAnchor: [12, 41],
        popupAnchor: [0, -40]
    })

    var stopIcon = L.divIcon( {
        className: "stopBlob",
        iconUrl: ("/assets/icon-set/blob.png"),
        iconSize: [15, 15]
    })

    function createBusmarker(lat, lng, rotation) {

        let svg = `<svg width="32" height="72" xmlns="http://www.w3.org/2000/svg" >
<circle cx="16" cy="16" r="16" fill="#ffdd01" />
<rect x="0" y="16" width="32" height="56" fill="#ffdd01" />
<polygon points="0,72 16,57 32,72" fill="black" />
<rect x="12" y="28" width="8" height="16" fill="white" />
</svg>`

    var busIcon = L.divIcon({
        className: "marker",
        html: "<div class=\"marker2\" style=\"rotate(" + rotation + "deg) scale(50%)\">" + svg + "</div>",
        iconSize: [8, 8], // Size of the icon
        iconAnchor: [0, 0] // The point of the icon which will correspond to marker's location
    });
    var marker = L.marker([lat, lng], {
        icon: busIcon
    }).addTo(map);

    return marker;
}


    var marker = L.marker([parseFloat(window.stopInfo.lat), parseFloat(window.stopInfo.lon)], {icon: selectedIcon}).addTo(map)
        .bindPopup("<strong>" + window.stopInfo.name + "</strong>");

    !prevMap.zoom ? marker.openPopup() : null;

    setTimeout(() => {
        map.invalidateSize()
    }, 50)

    let routeDiv = document.getElementById("route-" + div.getAttribute("trip-id"))
    routeDiv.innerHTML = "<p class=\"routeTitle\">" + r.long_name + "</p>";
    let routeInfoDiv = document.createElement("div")
    routeInfoDiv.classList.add("routePattern")
    routeInfoDiv.appendChild(stopsDiv)
    routeInfoDiv.appendChild(mapDiv)
    routeDiv.appendChild(routeInfoDiv)
    if (!stopsDiv) alert("FAILED")
    let route = routeCache.find(a => a.trip_id + "&" + a.stop_sequence === div.getAttribute("trip-id"))
    let time = route.estimated_arrival || route.scheduled_arrival;
    let time2 = route.scheduled_arrival.split(":");
    time = time.split(":")
    let h = parseInt(time[0])
    let m = parseInt(time[1])
    if(h < 4) h += 24;
    let h2 = parseInt(time2[0])
    let m2 = parseInt(time2[1])
    if(h2 < 4) h2 += 24;
    let stop_sequence = parseInt(div.getAttribute("stop-sequence"))
    let current_stop = r.path.indexOf(r.path.find(a => a.id === div.getAttribute("current-stop"))) + 1
    let delay = (route.estimated_arrival_unix || 0) - route.scheduled_arrival_unix
    delay = Math.floor(delay / 60) * 60
    let sect = r.path.filter(a => a.index >= current_stop && a.index <= stop_sequence)
    sect = sect.reduce((acc, i) => acc + i.schedule.travel_time, 0)
    if (current_stop === -1) sect = 0;
    if (current_stop === 0) delay = 0;
    m -= sect;
    m2 -= sect;
    if (m < 0) {
        m += 60;
        h--;
    }
    if (m2 < 0) {
        m2 += 60;
        h2--;
    }


    await r.path.forEach(stop => {
        stopDiv = document.createElement("div")
        let arrival = "";

        if(stop.schedule.stop_id !== window.stopInfo.id && (stop.index === 1 || stop.index === r.path.length)) L.marker([parseFloat(stop.lat), parseFloat(stop.lon)], {icon: stopIcon}).addTo(map).bindPopup("<strong>" + stop.name + "</strong>");

        if (stop.index < (current_stop > -1 ? current_stop : stop_sequence + 1)) {
            arrival = ""
        } else {
            if (stop.index === stop_sequence) {
                stopDiv.id = "currentStop";
                stopDiv.classList.add("selectedStop");
            }
            m += stop.schedule.travel_time
            m2 += stop.schedule.travel_time
            if (m > 59) {
                h += 1
                m -= 60
            }
            if (m2 > 59) {
                h2 += 1
                m2 -= 60
            }
            let arrivalSpan;
            if ((delay === 0 && route.estimated_arrival) || div.getAttribute("current-stop-index") === "0") {
                arrivalSpan = "ontime";
            } else if (route.estimated_arrival) {
                arrivalSpan = delay < 0 ? "early" : "delayed"
                arrival = arrival + "<span class=\"prevTime\">" + (h2 < 10 ? "0" + h2 : (h2 > 23 ? ("(+1) 0" + (h2 - 24)) : h2)) + ":" + (m2 < 10 ? "0" + m2 : m2) + "</span> "
            }
            if (stop.index === current_stop) {
                arrival = arrival + "<span class=\"ontime\">" + (stop.index === 1 ? "Partida" : "A chegar") + "</span> | ";
                stopDiv.classList.add("approaching");
            } else {
                arrival = arrival + "<span class=\"" + arrivalSpan + "\">" + (h < 10 ? "0" + h : (h > 23 ? ("(+1) 0" + (h - 24)) : h)) + ":" + (m < 10 ? "0" + m : m) + "</span> | "
            }
        }
        if (debug) {
            arrival = arrival + " " + stop.index + " | " + stop.schedule.travel_time + "mins | " + current_stop + " | " + stop_sequence + " | ID: " + stop.id + " | "
        }
        stopDiv.innerHTML = "<p class=\"\">" + arrival + stop.name + /*lines +*//* "</p>"
        stopDiv.classList.add("stop")
        stopsDiv.appendChild(stopDiv)
    })
    let stopsBefore = window.getComputedStyle(stopsDiv, '::before');
    let totalScrollHeight = stopsDiv.scrollHeight;
    stopsDiv.style.setProperty('--line-height', `${totalScrollHeight}px`);
    stopsDiv.style.setProperty('--pattern-color', r.color);

    if(vehicle.lat) createBusmarker(vehicle.lat, vehicle.lon, vehicle.orientation)

    if (document.getElementById("currentStop")) {
        document.getElementById("currentStop").scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
    if (scrollTop) {
        stopsDiv.scrollTop = scrollTop;
    }
}
*/