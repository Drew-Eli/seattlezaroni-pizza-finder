const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'seattlezaroni.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Create pizza_places table
        db.run(`CREATE TABLE IF NOT EXISTS pizza_places (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            neighborhood TEXT,
            address TEXT,
            website TEXT,
            image_url TEXT,
            description TEXT
        )`);

        // Create reviews table
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            place_id INTEGER,
            reviewer_name TEXT,
            rating INTEGER,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(place_id) REFERENCES pizza_places(id)
        )`);

        // Check if data exists, if not, seed it
        db.get("SELECT count(*) as count FROM pizza_places", (err, row) => {
            if (err) {
                console.error(err.message);
                return;
            }
            if (row.count === 0) {
                console.log("Seeding database...");
                seedData();
            }
        });
    });
}

function seedData() {
    const places = [
        {
            name: "Delancey",
            neighborhood: "Ballard",
            address: "1415 NW 70th St, Seattle, WA 98117",
            website: "https://delanceyseattle.com/",
            image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            description: "Wood-fired pizza with a focus on local ingredients.",
            reviews: [
                { reviewer: "PizzaLover1", rating: 10, comment: "Absolutely the best crust in Seattle." },
                { reviewer: "SeattleFoodie", rating: 9, comment: "Great toppings, but a bit pricey." }
            ]
        },
        {
            name: "The Masonry",
            neighborhood: "Queen Anne",
            address: "20 Roy St, Seattle, WA 98109",
            website: "https://themasonryseattle.com/",
            image_url: "https://images.unsplash.com/photo-1595854341625-f33ee10432fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            description: "Wood-fired pizza and a massive beer selection.",
            reviews: [
                { reviewer: "BeerGeek", rating: 9, comment: "Excellent beer pairing with the pizza." },
                { reviewer: "LocalGal", rating: 9, comment: "Love the atmosphere." }
            ]
        },
        {
            name: "Serious Pie",
            neighborhood: "Downtown",
            address: "316 Virginia St, Seattle, WA 98101",
            website: "https://seriouspieseattle.com/",
            image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            description: "Rectangle pizzas with blistered crusts.",
            reviews: [
                { reviewer: "Tourist123", rating: 9, comment: "A must-visit when in Seattle." },
                { reviewer: "CritiqueMaster", rating: 8, comment: "Good, but crowded." }
            ]
        },
        {
            name: "Cornelly",
            neighborhood: "Capitol Hill",
            address: "601 Summit Ave E, Seattle, WA 98102",
            website: "https://www.cornellyseattle.com/",
            image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            description: "Sourdough pizza, pasta, and natural wine.",
            reviews: [
                { reviewer: "HipsterEats", rating: 10, comment: "The sourdough crust is life-changing." }
            ]
        },
        {
            name: "Moto",
            neighborhood: "West Seattle",
            address: "4526 42nd Ave SW, Seattle, WA 98116",
            website: "https://motopizza.com/",
            image_url: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            description: "Detroit-style pizza with Filipino flavors.",
            reviews: [
                { reviewer: "DeepDishFan", rating: 9, comment: "Unique flavors and great crunch." }
            ]
        }
    ];

    const stmtPlace = db.prepare("INSERT INTO pizza_places (name, neighborhood, address, website, image_url, description) VALUES (?, ?, ?, ?, ?, ?)");
    const stmtReview = db.prepare("INSERT INTO reviews (place_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)");

    places.forEach(place => {
        stmtPlace.run(place.name, place.neighborhood, place.address, place.website, place.image_url, place.description, function(err) {
            if (err) {
                console.error(err.message);
                return;
            }
            const placeId = this.lastID;
            place.reviews.forEach(review => {
                stmtReview.run(placeId, review.reviewer, review.rating, review.comment);
            });
        });
    });

    stmtPlace.finalize();
    stmtReview.finalize();
    console.log("Database seeded.");
}

module.exports = db;
