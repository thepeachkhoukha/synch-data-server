const express = require('express');
const { database } = require('../config/helpers');
const router = express.Router();


//Get a single product
router.get('/', (req, res) => {
    let productId = req.body.id;
    console.log(productId);
    database.table('products')
    .withFields(['id', 'title', 'quantity', 'price'])
    .filter({id: productId})
    .getAll()
    .then(products => {
        if(products.length > 0) {
            res.json(products);
        } else {
            res.json({message: "No product found..."})
        }
    })
})

//Get all products
router.get('/all', (req, res) => {
    database.table('products')
    .withFields(['id', 'title', 'quantity', 'price'])
    .sort({id: -1})
    .getAll()
    .then( prods => {
        res.send(prods);
    })
    .catch(err => console.log(err));
});

//add a new product
router.post('/', (req, res) => {
    database.table('products')
    .insert({
        title: req.body.title,
        image: req.body.image,
        description: req.body.description,
        price: req.body.price,
        quantity: req.body.quantity,
        short_desc: req.body.short_desc,
        cat_id: req.body.cat_id
    }).then(prod => { res.json({message: "product inserted successfully", id: prod["insertId"]})})
    .catch(err => res.json({message: "Please retry inserting a new product later again!"}));
});

//edit a product
router.patch('/', async (req, res) => {
    let productId = req.body.id;
    let product = await database.table('products').filter({id: productId}).get();

    if(product) {
        let title = req.body.title;
        let description = req.body.description;
        let image = req.body.image;
        let price = req.body.price;
        let quantity = req.body.quantity;
        let short_desc = req.body.short_desc;
        let cat_id = req.body.cat_id;

        database.table('products').filter({id: productId}).update({
            title: title !== undefined ? title : product.title,
            description: description !== undefined ? description : product.description,
            image: image !== undefined ? image : product.image,
            price: price !== undefined ? price : product.price,
            quantity: quantity !== undefined ? quantity : product.quantity,
            short_desc: short_desc !== undefined ? short_desc: product.short_desc,
            cat_id: cat_id !== undefined ? cart_id : product.cart_id
        }).then(result => res.json('Product updated successfully')).catch(err => res.json(err));
    }
});


router.delete('/', (req, res) => {
    let productId = req.body.id;
    console.log(productId);
    database.table('products')
   .filter({id: productId})
   .remove()
   .then(res => {res.json({message: "product deleted successfully"})})
   .catch(err => res.json({message: "Please retry deleting a product later again!", error: err}));
});
module.exports = router;