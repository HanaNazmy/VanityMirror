const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const dbConnection = require('./database');
const { body, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const fileupload = require("express-fileupload");

const app = express();

app.use(express.urlencoded({extended:false}));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(fileupload());
// SET OUR VIEWS AND VIEW ENGINE
app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');

// APPLY COOKIE SESSION MIDDLEWARE
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge:  3600 * 1000 // 1hr
}));

// DECLARING CUSTOM MIDDLEWARE
const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('login-register');
    }
    next();
}

const ifLoggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
      // hardcoded it
      //console.log(user_email);
        return res.redirect('/home');
    }
    next();
}
// END OF CUSTOM MIDDLEWARE

// ROOT PAGE
app.get('/', ifNotLoggedin, (req,res,next) => {
    dbConnection.execute("SELECT `name`,`email`  FROM `accounts` WHERE `id`=?",[req.session.userID])
    .then(([rows]) => {
      // hardcoded it
      console.log(rows[0]);
      if(rows[0].email == 'test@test.com')
      {
        console.log('entered check of if');
        res.render('managerHome');
      }else{
        console.log('entered check of else');
        res.render('home',{
          name:rows[0].name
        });
      }

    });

});// END OF ROOT PAGE


// REGISTER PAGE
app.post('/register', ifLoggedin,
// post data validation(using express-validator)
[
    body('user_email','Invalid email address!').isEmail().custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `accounts` WHERE `email`=?', [value])
        .then(([rows]) => {
            if(rows.length > 0){
                return Promise.reject('This E-mail already in use!');
            }
            return true;
        });
    }),
    body('user_name','Username is Empty!').trim().not().isEmpty(),
    body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
],// end of post data validation
(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_name, user_pass, user_email} = req.body;
    // IF validation_result HAS NO ERROR
    if(validation_result.isEmpty()){
        // password encryption (using bcryptjs)
        bcrypt.hash(user_pass, 12).then((hash_pass) => {
            // INSERTING USER INTO DATABASE
            dbConnection.execute("INSERT INTO `accounts`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
            .then(result => {
                res.send(`your account has been created successfully, Now you can <a href="/">Login</a>`);
            }).catch(err => {
                // THROW INSERTING USER ERROR'S
                if (err) throw err;
            });
        })
        .catch(err => {
            // THROW HASING ERROR'S
            if (err) throw err;
        })
    }
    else{
        // COLLECT ALL THE VALIDATION ERRORS
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH VALIDATION ERRORS
        res.render('login-register',{
            register_error:allErrors,
            old_data:req.body
        });
    }
});// END OF REGISTER PAGE

// LOGIN PAGE
app.post('/', ifLoggedin, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `accounts` WHERE `email`=?', [value])
        .then(([rows]) => {

            if(rows.length == 1){
                return true;

            }
            return Promise.reject('Invalid Email Address!');

        });
    }),
    body('user_pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {user_pass, user_email} = req.body;
    if(validation_result.isEmpty()){

        dbConnection.execute("SELECT * FROM `accounts` WHERE `email`=?",[user_email])
        .then(([rows]) => {
            bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;
                    // need to check a certain userID of admin
                    // hardcoded it
                    if(user_email == 'test@test.com')
                    {
                      res.render('managerHome');
                    }
                    else{
                      res.redirect('/');
                    }
                }
                else{
                    res.render('login-register',{
                        login_errors:['Invalid Password!']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });


        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // RENDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
        res.render('login-register',{
            login_errors:allErrors
        });
    }
});
// END OF LOGIN PAGE

//Manager VIEW
app.post('/managerHome', function(req, res) {
  res.render('managerHome.ejs');
});
//END OF MANAGER VIEW

//View Products page
app.post('/viewProduct', function(req, res) {
  var sql = "SELECT * FROM `mirrors`";
  dbConnection.execute(sql).then(([rows]) => {
    console.log(rows);
    res.render('viewProduct');
  }).catch(err => {
    throw err;
  });
  res.render('viewProduct.ejs');
});
//END OF Add Product page

//Add Product page
app.post('/addProduct', function(req, res) {
  res.render('addProduct.ejs');
});
//END OF Add Product page

//UPDATE A PRODUCT
app.post('/updateProduct', function(req, res) {
  res.render('updateProduct.ejs');
});
//END OF UPDATE PRODUCT

//DELETE A PRODUCT
app.post('/deleteProduct', function(req, res) {
  res.render('deleteProduct.ejs');
});
//END OF DELETE PRODUCT

//ADD A MIRROR
app.post('/addMirror', function(req, res) {
  res.render('addMirror.ejs');
});
//END OF ADD A MIRROR

//ADD A Corner
app.post('/addCorner', function(req, res) {
  res.render('addCorner.ejs');
});
//END OF ADD Corner

//ADD A SET
app.post('/addSet', function(req, res) {
  res.render('addSet.ejs');
});
//END OF ADD A SET

//ADD A SHELF
app.post('/addShelf', function(req, res) {
  res.render('addShelf.ejs');
});
//END OF ADD A SHELF

//ADD A STAND
app.post('/addStand', function(req, res) {
  res.render('addStand.ejs');
});
//END OF ADD A STAND

//DELETE A MIRROR
app.post('/deleteMirror', function(req, res) {
  res.render('deleteMirror.ejs');
});
//END OF DELETE A MIRROR

//DELETE A CORNER
app.post('/deleteCorner', function(req, res) {
  res.render('deleteCorner.ejs');
});
//END OF DELETE A CORNER

//DELETE A SHELF
app.post('/deleteShelf', function(req, res) {
  res.render('deleteShelf.ejs');
});
//END OF DELETE A SHELF

//DELETE A SET
app.post('/deleteSet', function(req, res) {
  res.render('deleteSet.ejs');
});
//END OF DELETE A SET

//DELETE A STAND
app.post('/deleteStand', function(req, res) {
  res.render('deleteStand.ejs');
});
//END OF DELETE A STAND

// UPLOAD Mirror
app.post('/displayMirror', function(req, res) {
  if (!req.files)
  return res.status(400).send({"status":"false", "data":"Image Not Found"});

  var mirror = req.body;
  var name = mirror.mirror_name;
  var color = mirror.mirror_color;
  var bulbs = mirror.mirror_bulbs;
  var price = mirror.mirror_price;
  var length = mirror.mirror_length;
  var width = mirror.mirror_width;
  var thickness = mirror.mirror_thickness;
  var file = req.files.mirror_img;
  var img_path = 'public\\images\\uploaded_images\\'+file.name;

  // console.log("1 image is read");
	if(file.mimetype == "image/jpeg" ||file.mimetype == "image/png"||file.mimetype == "image/jpg" ){
      file.mv(img_path, function(err) {
        if (err)
          return res.status(500).send(err);
          // var canvas = imageConversion.imagetoCanvas(file);
          // canvastoFile(canvas) → {Promise(Blob)}
          var sql = "INSERT INTO `mirrors`(`name`,`color`,`bulbsnumber`,`price`,`length`,`width`,`thickness`,`img`) VALUES ('" + name + "','" +color + "','" + bulbs + "','" + price + "','" + length+ "','" +width+ "','" +thickness+ "','" +  img_path + "')";

          dbConnection.execute(sql).then(result => {
            res.render('displayMirror');
          }).catch(err => {
               if (err.code === 'ER_DUP_ENTRY') {
                 res.send(`Mirror already exists!`);
                 res.render('displayMirror');
                   //handleHttpErrors(SYSTEM_ERRORS.USER_ALREADY_EXISTS);
               }
              // THROW INSERTING USER ERROR'S
              else throw err;
          });
	   });
 }else {
   message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
   res.render('addMirror.js',{message: message});
 }
});
//END OF UPLOAD MIRROR

// // UPLOAD CORNER
app.post('/displayCorner', function(req, res) {
  if (!req.files)
  return res.status(400).send({"status":"false", "data":"Image Not Found"});

  var corner = req.body;
  var name = corner.corner_name;
  var color = corner.corner_color;
  var price = corner.corner_price;
  var length = corner.corner_length;
  var width = corner.corner_width;
  var thickness = corner.corner_thickness;
  var file = req.files.corner_img;
  var img_path = 'public\\images\\uploaded_images\\'+file.name;

  // console.log("1 image is read");
	if(file.mimetype == "image/jpeg" ||file.mimetype == "image/png"||file.mimetype == "image/jpg" ){
      file.mv(img_path, function(err) {
        if (err)
          return res.status(500).send(err);
          // var canvas = imageConversion.imagetoCanvas(file);
          // canvastoFile(canvas) → {Promise(Blob)}
          var sql = "INSERT INTO `corners`(`name`,`color`,`price`,`length`,`width`,`thickness`,`img`) VALUES ('" + name + "','" +color + "','" + price + "','" + length+ "','" +width+ "','" +thickness+ "','" +  img_path + "')";

          dbConnection.execute(sql).then(result => {
            res.render('displayCorner');
          }).catch(err => {
               if (err.code === 'ER_DUP_ENTRY') {
                 res.send(`Corner already exists!`);
                 res.render('displayCorner');
                   //handleHttpErrors(SYSTEM_ERRORS.USER_ALREADY_EXISTS);
               }
              // THROW INSERTING USER ERROR'S
              else throw err;
          });
	   });
 }else {
   message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
   res.render('addCorner.js',{message: message});
 }
});
//END OF UPLOAD CORNER

// UPLOAD SHELF
app.post('/displayShelf', function(req, res) {
  if (!req.files)
  return res.status(400).send({"status":"false", "data":"Image Not Found"});

  var shelf = req.body;
  var name = shelf.shelf_name;
  var color = shelf.shelf_color;
  var price = shelf.shelf_price;
  var length = shelf.shelf_length;
  var width = shelf.shelf_width;
  var thickness = shelf.shelf_thickness;
  var file = req.files.shelf_img;
  var img_path = 'public\\images\\uploaded_images\\'+file.name;

  // console.log("1 image is read");
	if(file.mimetype == "image/jpeg" ||file.mimetype == "image/png"||file.mimetype == "image/jpg" ){
      file.mv(img_path, function(err) {
        if (err)
          return res.status(500).send(err);
          // var canvas = imageConversion.imagetoCanvas(file);
          // canvastoFile(canvas) → {Promise(Blob)}
          var sql = "INSERT INTO `shelves`(`name`,`color`,`price`,`length`,`width`,`thickness`,`img`) VALUES ('" + name + "','" +color + "','" + price + "','" + length+ "','" +width+ "','" +thickness+ "','" +  img_path + "')";

          dbConnection.execute(sql).then(result => {
            res.render('displayShelf');
          }).catch(err => {
               if (err.code === 'ER_DUP_ENTRY') {
                 res.send(`Shelf already exists!`);
                 res.render('displayShelf');
                   //handleHttpErrors(SYSTEM_ERRORS.USER_ALREADY_EXISTS);
               }
              // THROW INSERTING USER ERROR'S
              else throw err;
          });
	   });
 }else {
   message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
   res.render('addShelf.js',{message: message});
 }
});
//END OF UPLOAD SHELF

// UPLOAD SET
app.post('/displaySet', function(req, res) {
  if (!req.files)
  return res.status(400).send({"status":"false", "data":"Image Not Found"});

  var set = req.body;
  var name = set.set_name;
  var color = set.set_color;
  var price = set.set_price;
  var length = set.set_length;
  var width = set.set_width;
  var thickness = set.set_thickness;
  var file = req.files.set_img;
  var img_path = 'public\\images\\uploaded_images\\'+file.name;

  // console.log("1 image is read");
	if(file.mimetype == "image/jpeg" ||file.mimetype == "image/png"||file.mimetype == "image/jpg" ){
      file.mv(img_path, function(err) {
        if (err)
          return res.status(500).send(err);
          // var canvas = imageConversion.imagetoCanvas(file);
          // canvastoFile(canvas) → {Promise(Blob)}
          var sql = "INSERT INTO `sets`(`name`,`color`,`price`,`length`,`width`,`thickness`,`img`) VALUES ('" + name + "','" +color + "','" + price + "','" + length+ "','" +width+ "','" +thickness+ "','" +  img_path + "')";

          dbConnection.execute(sql).then(result => {
            res.render('displaySet');
          }).catch(err => {
               if (err.code === 'ER_DUP_ENTRY') {
                 res.send(`Set already exists!`);
                 res.render('displaySet');
                   //handleHttpErrors(SYSTEM_ERRORS.USER_ALREADY_EXISTS);
               }
              // THROW INSERTING USER ERROR'S
              else throw err;
          });
	   });
 }else {
   message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
   res.render('addSet.js',{message: message});
 }
});
//END OF UPLOAD SET

// UPLOAD STAND
app.post('/displayStand', function(req, res) {
  if (!req.files)
  return res.status(400).send({"status":"false", "data":"Image Not Found"});

  var stand = req.body;
  var name = stand.stand_name;
  var color = stand.stand_color;
  var price = stand.stand_price;
  var length = stand.stand_length;
  var width = stand.stand_width;
  var thickness = stand.stand_thickness;
  var file = req.files.stand_img;
  var img_path = 'public\\images\\uploaded_images\\'+file.name;

  // console.log("1 image is read");
	if(file.mimetype == "image/jpeg" ||file.mimetype == "image/png"||file.mimetype == "image/jpg" ){
      file.mv(img_path, function(err) {
        if (err)
          return res.status(500).send(err);
          // var canvas = imageConversion.imagetoCanvas(file);
          // canvastoFile(canvas) → {Promise(Blob)}
          var sql = "INSERT INTO `stands`(`name`,`color`,`price`,`length`,`width`,`thickness`,`img`) VALUES ('" + name + "','" +color + "','" + price + "','" + length+ "','" +width+ "','" +thickness+ "','" +  img_path + "')";

          dbConnection.execute(sql).then(result => {
            res.render('displayStand');
          }).catch(err => {
               if (err.code === 'ER_DUP_ENTRY') {
                 res.send(`Stand already exists!`);
                 res.render('displayStand');
                   //handleHttpErrors(SYSTEM_ERRORS.USER_ALREADY_EXISTS);
               }
              // THROW INSERTING USER ERROR'S
              else throw err;
          });
	   });
 }else {
   message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
   res.render('addStand.js',{message: message});
 }
});
//END OF UPLOAD STAND

// LOGOUT
app.get('/logout',(req,res)=>{
    //session destroy
    req.session = null;
    res.redirect('/');
});
// END OF LOGOUT

app.use('/', (req,res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

app.listen(3000, () => console.log("Server is Running..."));
