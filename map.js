fetch('venues.json')
    .then(venues => venues.json())
    .then(venues => {
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
        const map = L.map('map', {
            center: L.latLng(0, 0),
            zoom: 3,
            wheelPxPerZoomLevel: 100,
            layers: [tiles],
        });

        const markers = L.markerClusterGroup();
        for (let venue of Object.values(venues.venues)) {
            const split = venue.coordinates.split(',');
            const title = venue.name;
            const marker = L.marker(new L.LatLng(split[0], split[1]), {title});
            marker.bindPopup(title);
            markers.addLayer(marker);
        }

        map.addLayer(markers);
    });
