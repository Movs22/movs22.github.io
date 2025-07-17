const stopMap = {
    "oeiras": {
        "stops": [ "121270", "121188", "121187", "120787", "126234", "121297", "121291", "121235", "121272"  ],
        "excludes_patterns": [ "1523_0_1", "1613_0_1", "1998_0_2", "1998_1_2" ],
        "display_name": "Oeiras - Terminal Rodoviário"
    }
}

let url = window.location.href.split("/cmet/")[1]

window.stopInfo = stopMap[Object.keys(stopMap).find(a => url.startsWith(a))]

window._departures = {}

window.stopInfo.stops.forEach(stop => {
    window._departures[stop] = fetch("https://api.carrismetropolitana.pt/v2/arrivals/by_stop/" + stop)
})