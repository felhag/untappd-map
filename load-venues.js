const jsdom = require("jsdom");
const fs = require('fs');

const COOKIE = "< get cookie from browser >";
const username = 'TonnyTorpedo'
const filePath = 'venues.json';


function headers() {
    return {
        "x-requested-with": "XMLHttpRequest",
        "cookie": COOKIE,
    }
}

function extractVenue(item) {
    const venue = item.querySelector('[href^="/v/"]');
    return venue ? parseInt(venue.href.split("/").pop()) : undefined;
}

function parseCheckin(item) {
    return {
        id: item.dataset?.checkinId,
        venue: extractVenue(item),
        date: new Date(item.querySelector('a.time').innerHTML),
    }
}

async function getRecursive(id, checkins) {
    return await fetch(`https://untappd.com/profile/more_feed/${username}/${id}?v2=true`, {
        "headers": headers(),
        "body": null,
        "method": "GET"
    })
        .then(r => r.text())
        .then(html => {
            const dom = new jsdom.JSDOM(html);
            const doc = dom.window.document;
            const items = Array.from(doc.getElementsByClassName('item')).map(ci => parseCheckin(ci));
            const allVenues = checkins.concat(items);
            const next = items[24]?.id;
            if (next) {
                console.log(`Loading checkin from ${next}: ${allVenues.length} checkins loaded `)
                return getRecursive(next, allVenues);
            } else {
                console.log('done!');
                return allVenues;
            }
        });
}

async function getItems() {
    return await fetch('https://untappd.com/user/' + username)
        .then(r => r.text())
        .then(html => {
            const dom = new jsdom.JSDOM(html);
            const doc = dom.window.document;
            return Array.from(doc.querySelectorAll('.item[data-checkin-id]')).map(item => parseCheckin(item));
        });
}

async function getAddress(venue) {
    return await fetch(`https://untappd.com/v/v/${venue}`, {"headers": headers()})
        .then(r => r.text())
        .then(html => {
            const dom = new jsdom.JSDOM(html);
            const doc = dom.window.document;
            const name = doc.querySelector('.venue-name h1').textContent;
            const href = doc.querySelector('.address a').href;
            const searchParams = URL.parse(href).searchParams;
            const coordinates = searchParams.get('near') || searchParams.get('q');
            return {venue, name, coordinates};
        });
}

async function run() {
    console.log(`Updating ${filePath} for ${username}`);
    const json = fs.existsSync(filePath) ? fs.readFileSync('venues.json', 'utf8') : '{}';
    const data = JSON.parse(json);
    if (!data.checkins) {
        const items = await getItems();
        const last = items[items.length - 1];
        data.checkins = await getRecursive(last.id, items);
    } else {
        const last = data.checkins[0];
        const items = await getItems();
        const idx = items.findIndex(item => item.id === last.id);
        if (idx === 0) {
            // no action needed
        } else if (idx > 0) {
            items.slice(0, idx).reverse().forEach(item => data.checkins.unshift(item));
        } else {
            // gap
            items.slice(0, idx).reverse().forEach(item => data.checkins.unshift(item));
        }
    }

    fs.writeFileSync('venues.json', JSON.stringify(data), 'utf8');

    if (!data.venues) {
        data.venues = {};
    }

    const todo = [...new Set(data.checkins.map(ci => ci.venue).filter(id => !!id).filter(id => !data.venues[id]))];
    for (let venue of todo) {
        console.log(`Venue ${todo.indexOf(venue) + 1}/${todo.length}`);
        data.venues[venue] = await getAddress(venue).catch(e => console.log('Krak!', e));
    }
    fs.writeFileSync('venues.json', JSON.stringify(data), 'utf8');
}

run().then(() => console.log('done!'));
