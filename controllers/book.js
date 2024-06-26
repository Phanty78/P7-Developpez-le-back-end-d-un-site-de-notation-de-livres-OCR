const Book = require('../models/Book')
const fs = require('fs');

exports.getBooks = (req, res, next) => {
    Book.find()
      .then((books) => {res.status(200).json(books)})
      .catch((error) => {res.status(400).json({error: error})})
  }

  exports.getBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
      .then((book) => res.status(200).json(book))
      .catch(error => res.status(404).json({ error }))
  }

  exports.getBestRating = (req, res, next) => {
    Book.find()
      .then((books) => {
          const bestBooksRating = books.sort((a, b) => b.averageRating - a.averageRating).slice(0, 3)
          res.status(200).json(bestBooksRating)
      })
      .catch((error) => {res.status(400).json({error: error})})
  }

  exports.saveNewBook = (req, res, next) => {
    const bookObject = JSON.parse(req.body.book)
    delete bookObject._id
    delete bookObject._userId
    const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/${req.file.name}`
    })
    book.save()
    .then(() => { res.status(201).json({message: 'Livre enregistré !'})})
    .catch(error => { res.status(400).json( { error })})
  }

  exports.deleteBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id})
      .then(book =>{
        if (book.userId != req.auth.userId) {
          res.status(401).json({ message: 'Not authorized' })
        } else{
          const filename = book.imageUrl.split('/images/')[1]
          fs.unlink(`images/${filename}`, () => {
            Book.deleteOne({ _id: req.params.id})
              .then(() => { res.status(200).json({ message: 'Livre supprimé !'})})
              .catch(error => res.status(401).json({ error }))
          })
        }
      })
      .catch(error => { res.status(500).json({ error })})
  }

  exports.updateBook = (req, res, next) => {
    const bookObject = req.file ? {
      ...JSON.parse(req.body.book),
      imageUrl: `${req.protocol}://${req.get('host')}/${req.file.name}`
    } : { ...req.body }

    delete bookObject.userId

    Book.findOne({ _id: req.params.id })
      .then(book => {
        if (book.userId != req.auth.userId) {
          res.status(401).json({ message: 'Not authorized' })
        } else{
          Book.updateOne({ _id: req.params.id}, { ...bookObject, _id : req.params.id})
            .then(() => res.status(200).json({ message: 'Livre modifié !'}))
            .catch(error => res.status(401).json({ error }))
        }
      })
      .catch(error => res.status(500).json({ error }))
  }

  exports.ratingBook = (req, res, next) => {

    Book.findOne({ _id: req.params.id })
      .then(book => {
        if (!book) {
          return res.status(404).json({ message: 'Livre non trouvé.' })
        }

        const existingRating = book.ratings.find(rating => rating.userId === req.auth.userId)
        if (existingRating) {
          return res.status(403).json({ message: 'Vous avez déjà noté ce livre, modification de la note interdite.' })
        }

        const newRating = {
          userId: req.auth.userId,
          grade: req.body.rating
        };

        const updatedRatings = [...book.ratings, newRating]
        const averageRating = Math.round(updatedRatings.reduce((acc, curr) => acc + curr.grade, 0) / updatedRatings.length)

        Book.findOneAndUpdate(
          { _id: req.params.id }, 
          { $push: { ratings: newRating }, $set: { averageRating: averageRating } }, 
          {
            new: true
          }
        )
          .then((book) => res.status(200).json(book))
          .catch(error => res.status(500).json({ error }))
      })
      .catch(error => res.status(500).json({ error }))
}

