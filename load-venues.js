const jsdom = require("jsdom");
const fs = require('fs');

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

async function getAddress(venue) {
    return await fetch(`https://untappd.com/v/v/${venue}`, {
        "headers": {
            "x-requested-with": "XMLHttpRequest",
                "cookie": < get cookie from browser >
        }
    })
        .then(r => r.text())
        .then(html => {
            const dom = new jsdom.JSDOM(html);
            const doc = dom.window.document;
            const name = doc.querySelector('.venue-name h1').textContent;
            const href = doc.querySelector('.address a').href;
            const coordinates = URL.parse(href).searchParams.get('near');
            return {venue, name, coordinates};
        });
}

getAll().then(venues => {
    fs.readFile('venues.json', 'utf8', async (err, json) => {
        if (err) {
            console.log(err);
        } else {
            const deduped = [...new Set(venues)];
            const data = JSON.parse(json);
            const todo = deduped.filter(d => !data[d]);
            for (let venue of todo) {
                const result = await getAddress(venue);
                data[result.venue] = result;
                fs.writeFile('venues.json', JSON.stringify(data), 'utf8', () => {
                    console.log('updated');
                });
            }
        }
    });
});
