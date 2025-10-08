const jsdom = require("jsdom");

function extractVenue(item) {
    const venue = item.querySelector('[href^="/v/"]');
    return venue ? parseInt(venue.href.split("/").pop()) : undefined;
}

async function getRecursive(id, venues) {
    return await fetch(`https://untappd.com/profile/more_feed/TonnyTorpedo/${id}?v2=true`, {
        "headers": {
            "x-requested-with": "XMLHttpRequest",
            "cookie": < get cookie from browser >
        },
        "body": null,
        "method": "GET"
    })
        .then(r => r.text())
        .then(html => {
            const dom = new jsdom.JSDOM(html);
            const doc = dom.window.document;
            const items = Array.from(doc.getElementsByClassName('item'));
            const newVenues = items.map(item => extractVenue(item)).filter(v => !!v);
            const allVenues = venues.concat(newVenues);
            const next = doc.getElementsByClassName('item')[24]?.dataset?.checkinId;
            if (next) {
                console.log(`getNext: ${next}, venues: ${newVenues.length}`);
                return getRecursive(next, allVenues);
            } else {
                // done!
                console.log('done!');
                return allVenues;
            }
        });
}

async function getAll() {
    return await fetch('https://untappd.com/user/TonnyTorpedo')
        .then(r => r.text())
        .then(html => {
            const dom = new jsdom.JSDOM(html);
            const doc = dom.window.document;
            const item = doc.getElementsByClassName('item')[0];
            const venue = extractVenue(item);
            const venues = venue ? [venue] : [];
            return getRecursive(item.dataset.checkinId, venues);
        });
}

getAll().then(venues => {
    console.log(venues);
    console.log(JSON.stringify(venues));
});
