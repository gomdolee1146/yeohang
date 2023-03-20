const express = require('express')
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const app = express()
const port = 3000
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const async = require('async');

const bodyParser = require('body-parser')
const methodOverride = require('method-override');

mongoose.connect(process.env.MONGO_DB);

var db = mongoose.connection;
db.once('open', function(){
  console.log('DB 연결')
})
db.on('error', function(err) {
  console.log('DBerror:', err);
})

// ===========================================
// 게시글 관련
var postSchema = mongoose.Schema({
  title:        {type:String, required:true},
  body:         {type:String, required:true},
  createdAt:    {type:Date, default:Date.now},
  updatedAt:    Date  
})
var Post = mongoose.model('post', postSchema);

// 회원정보 관련
var userSchema = mongoose.Schema({
  email:        {type:String, required:true, unique:true},
  nickname:     {type:String, required:true, unique:true},
  password:     {type:String, required:true},
  createdAt:    {type:Date, default:Date.now},
})
var User = mongoose.model('user', userSchema);

// ===========================================
// view setting
app.set('view engine', 'ejs');

// ===========================================
// set middlewares
app.use(express.static(path.join(__dirname, 'public')));    // public 폴더 내 요소들 사용
app.use(bodyParser.json()); // 미들웨어 - json으로 데이터 분석.
app.use(bodyParser.urlencoded({extended:true}))   // JSON 데이터를 전송할 경우 받는 body parser
app.use(methodOverride("_method"));
app.use(flash());

app.use(session({secret:'MySecret'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
  done(null, user.id);
});
passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user) {
    done(err, user);
  })
})

app.use(expressLayouts);
app.set('layout', 'layout');
app.set("layout extractScripts", true);

// ===========================================
// Login Strategy
var LocalStrategy = require('passport-local').Strategy;
passport.use('local-login', 
  new LocalStrategy(
    {
      usernameField:          'email',
      passwordField:          'password',
      passReqToCallback:      true
    },
    function(req, email, password, done){
      User.findOne({'email':email})
        .then(user => {
          if (!user) {
            req.flash('email', req,body.email);
            return done(null, false, req.flash('loginError', 'No User Found'));
          }

          if (user.password != password){
            req.flash('email', req.body.email);
            return done(null, false, req.flash('loginError', 'Password does not Match'));
          }
        })
        .catch(err => {
          return done(err);
        })
    }
  )
)

// ===========================================
// home routes
app.get('/', function(req, res){
  res.redirect('/posts')
});

// login routes
app.post('/login', function(req, res, next){
  req.flash('email');

  if (req.body.email.length === 0 || req.body.password.length === 0){
    req.flash('email', req.body.email);
    req.flash('loginError', 'Please enter both Email and password');
    res.redirect('/login');
  } else {
    next();
  }
}, passport.authenticate('local-login', {
  successRedirect: '/posts',
  failureRedirect: '/login',
  failureFlash: true
  })
)

// logout routes
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

// 회원가입 routes
app.get('/users/new', function(req, res){   // new
  res.render('users/new',
   {
    formData:       req.flash('formData')[0],
    emailError:     req.flash('emailError')[0],
    nicknameError:  req.flash('nicknameError')[0],
    passwordError:  req.flash('passwordError')[0]
   }
  )
})

// 회원가입 create
// 회원가입 show

// 게시판 routes
app.get('/posts', function(req, res) {    // index
  Post.find({}).sort('-createdAt')
    .then(posts => {
      res.render('posts/index', {data:posts})
    })
    .catch(err => {
      return res.json({success:false, message:err})
    })
})

app.get('/posts/new', function(req, res){   // new
  res.render('posts/new')
})

app.post('/posts', function(req, res){    // create
  Post.create(req.body.post)
    .then(post => {
      // return res.json({success:true, data:post}) // 확인용.
      res.redirect('/posts')
    })
    .catch(err => {
      return res.json({success:false, message:err})
    })
})

app.get('/posts/:id', function(req, res){    // show
  Post.findById(req.params.id)
    .then(post => {
      // return res.json({success:true, data:post})  
      return res.render('posts/show', {data:post});
    })
    .catch(err => {
      return res.json({success:false, message:err})
    })
})

app.get("/posts/:id/edit", function(req, res){    // edit
  Post.findById(req.params.id)
    .then(post => {
      res.render('posts/edit', {data:post})
    })
    .catch(err => {
      return res.json({success:false, message:err});
    })
})

app.post('/posts/:id', function(req, res){    // update
  req.body.post.updatedAt = Date.now();
  Post.findByIdAndUpdate(req.params.id, req.body.post)
    .then(post => {
      // return res.json({success:true, message:post._id+" updated"})
      res.redirect('/posts/'+req.params.id);
    })
    .catch(err => {
      return res.json({success:false, message:err});
    })
})

app.delete("/posts/:id", function(req, res){    // destroy (delete)
  Post.findByIdAndRemove(req.params.id)
    .then(post => {
      // return res.json({success:true, message:post._id+" deleted"})
      res.redirect('/posts')
    })
    .catch(err => {
      return res.json({success:false, message:err});
    })
})



var dataSchema = mongoose.Schema({
  name:         String,
  count:        Number
});
var Data = mongoose.model('data', dataSchema);

Data.findOne({name:'myData'}).exec()
  .then((data) => {
    if (!data) {
      data = Data.create({name: 'myData', count: 0});
    }
    return console.log('counter initialized:', data);
  })
  .catch((err, data) => {
    if (!data){
      if(err) return console.log('데이터 에러', err);
    }
    return console.log('데이터에러', err);
  })

var data = {count:0};   // 서버에 저장될 데이터

// get 신호받으면 get신호로 요청. count++ 하고, main 렌더. 
app.get('/', function (req, res) {
  data.count++;
  res.render('main', data);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})