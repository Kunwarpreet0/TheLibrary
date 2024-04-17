const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const app = express();
const port = 3000;
const methodOverride = require('method-override');
const path = require('path');

app.use(express.static('public'));


app.set('view engine', 'ejs');


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images'); 
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); 
  }
});
const upload = multer({ storage: storage });

// Connecting to SQLite
const db = new sqlite3.Database('./Project3.db', err => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

//  routes
app.get('/', (req, res) => {
  const sql = `SELECT * FROM books`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    res.render('add_book', { books: rows });
  });
});

// Handle form submission with file upload
app.post('/add', upload.single('image'), (req, res) => {
  const { book_name, author } = req.body;
  const image = req.file.filename; 
  const sql = `INSERT INTO books (image, book_name, author) VALUES (?, ?, ?)`;
  db.run(sql, [image, book_name, author], function (err) {
    if (err) {
      return console.error(err.message);
    }
    res.redirect('/');
  });
});

app.use(methodOverride('_method'));


app.delete('/books/:id', (req, res) => {
  const id = req.params.id;
  
  const sqlSelectImage = `SELECT image FROM books WHERE id = ?`;
  db.get(sqlSelectImage, id, (err, row) => {
    if (err) {
      return console.error(err.message);
    }

    // Delete the record from the database
    const sqlDeleteBook = `DELETE FROM books WHERE id = ?`;
    db.run(sqlDeleteBook, id, function (err) {
      if (err) {
        return console.error(err.message);
      }

      // Delete the image file from the specified directory
      const imagePath = `./public/images/${row.image}`;
      fs.unlink(imagePath, (err) => {
        if (err) {
          return console.error(err.message);
        }
        res.redirect('/');
      });
    });
  });
});

// Define route to render update form
app.get('/update/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM books WHERE id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    res.render('update_book', { book: row });
  });
});

// Handle update request
app.post('/update/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { book_name, author } = req.body;
  let image = req.file ? req.file.filename : req.body.current_image;
  const sqlSelectImage = `SELECT image FROM books WHERE id = ?`;

  db.get(sqlSelectImage, [id], (err, row) => {
    if (err) {
      return console.error(err.message);
    }

    const oldImage = row.image;

    const sqlUpdateBook = `UPDATE books SET image = ?, book_name = ?, author = ? WHERE id = ?`;
    db.run(sqlUpdateBook, [image, book_name, author, id], function (err) {
      if (err) {
        return console.error(err.message);
      }

      if (req.file && oldImage) {
        // Delete old image if a new image was uploaded
        const oldImagePath = `./public/images/${oldImage}`;
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            return console.error(err.message);
          }
        });
      }

      res.redirect('/');
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
