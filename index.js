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
        return res.redirect('/home');
    }
    next();
}
// END OF CUSTOM MIDDLEWARE

// ROOT PAGE
app.get('/', ifNotLoggedin, (req,res,next) => {
    dbConnection.execute("SELECT `name` FROM `accounts` WHERE `id`=?",[req.session.userID])
    .then(([rows]) => {
        res.render('home',{
            name:rows[0].name
        });
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

                    res.redirect('/');
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

// UPLOAD Mirror
app.post('/addMirror', function(req, res) {
  var mirror = req.body;
  var file = req.files.mirror_img;
	var img_name= file.name;
	if(file.mimetype == "image/jpeg" ||file.mimetype == "image/png"||file.mimetype == "image/jpg" ){
      file.mv('images/'+file.name, function(err) {
        if (err)
          return res.status(500).send(err);
				var sql = "INSERT INTO `mirrors`(`name`,`color`,`bulbsnumber`,`price`,`img`) VALUES ('" + mirror.mirror_name + "','" +
        mirror.mirror_color + "','" + mirror.mirror_bulbs + "','" + mirror.mirror_price + "','" + img_name + "')";
				var query = db.query(sql, function(err, result) {
          console.log("1 image inserted");
          res.render('addMirror');
				});
	   });
 }
});

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
