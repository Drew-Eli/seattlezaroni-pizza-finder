const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const db = require('./database'); // Import database connection

const app = express();

// Set the port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// Security and Logging
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "images.unsplash.com"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(morgan('combined'));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to get average rating
const getTopPlaces = (limit, callback) => {
    const query = `
        SELECT p.*, AVG(r.rating) as avg_rating 
        FROM pizza_places p 
        LEFT JOIN reviews r ON p.id = r.place_id 
        GROUP BY p.id 
        ORDER BY avg_rating DESC 
        LIMIT ?
    `;
    db.all(query, [limit], (err, rows) => {
        if (err) {
            console.error(err.message);
            callback(err, null);
        } else {
            // Round the rating to 1 decimal place
            rows.forEach(row => {
                row.avg_rating = row.avg_rating ? row.avg_rating.toFixed(1) : 'N/A';
            });
            callback(null, rows);
        }
    });
};

// Landing page route
app.get('/', (req, res) => {
    getTopPlaces(3, (err, topPicks) => {
        if (err) {
            return res.status(500).send("Database error");
        }
        res.render('index', {
            title: 'SeattleZaroni - Best Pizza in Seattle',
            page: 'home',
            topPicks: topPicks
        });
    });
});

// Rankings page route
app.get('/rankings', (req, res) => {
    const query = `
        SELECT p.*, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
        FROM pizza_places p 
        LEFT JOIN reviews r ON p.id = r.place_id 
        GROUP BY p.id 
        ORDER BY avg_rating DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database error");
        }
        rows.forEach(row => {
            row.avg_rating = row.avg_rating ? row.avg_rating.toFixed(1) : 'N/A';
        });
        res.render('rankings', {
            title: 'SeattleZaroni - Full Rankings',
            page: 'rankings',
            places: rows
        });
    });
});

// Place detail route
app.get('/place/:id', (req, res) => {
    const placeId = req.params.id;
    const placeQuery = `SELECT * FROM pizza_places WHERE id = ?`;
    const reviewsQuery = `SELECT * FROM reviews WHERE place_id = ? ORDER BY created_at DESC`;

    db.get(placeQuery, [placeId], (err, place) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database error");
        }
        if (!place) {
            return res.status(404).send("Place not found");
        }

        db.all(reviewsQuery, [placeId], (err, reviews) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("Database error");
            }
            
            // Calculate average for display
            let avgRating = 0;
            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
                avgRating = (sum / reviews.length).toFixed(1);
            } else {
                avgRating = 'N/A';
            }

            res.render('place', {
                title: `${place.name} - SeattleZaroni`,
                page: 'place',
                place: place,
                reviews: reviews,
                avgRating: avgRating
            });
        });
    });
});

// Add review route
app.post('/place/:id/review', (req, res) => {
    const placeId = req.params.id;
    const { reviewer_name, rating, comment } = req.body;
    
    // Basic validation
    if (!reviewer_name || !rating || !comment) {
        return res.status(400).send("Missing fields");
    }

    const query = `INSERT INTO reviews (place_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)`;
    db.run(query, [placeId, reviewer_name, rating, comment], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database error");
        }
        res.redirect(`/place/${placeId}`);
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
