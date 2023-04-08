const express               = require('express')
const expressLayouts        = require('express-ejs-layouts');
const path                  = require('path');
const app                   = express()
const port                  = 3000
const mongoose              = require('mongoose');
const passport              = require('passport');
const session               = require('express-session');
const flash                 = require('connect-flash');
const async                 = require('async');

const bodyParser            = require('body-parser')
const methodOverride        = require('method-override');

// 게시글 관련 모듈
const postsRouter = require('./routes/posts');
app.use('/posts', postsRouter);

mongoose.connect(process.env.MONGO_DB);

var db = mongoose.connection;
db.once('open', function(){
  console.log('DB 연결')
})
db.on('error', function(err) {
  console.log('DBerror:', err);
})

// ===========================================
// 회원정보 관련
var userSchema = mongoose.Schema({
  email:        {type:String, required:true, unique:true},
  nickname:     {type:String, required:true},
  password:     {type:String, required:true},
  createdAt:    {type:Date, default:Date.now}
})
var User = mongoose.model('user', userSchema);

// ===========================================
// view setting
app.set('view engine', 'ejs');

// ===========================================
// set middlewares
app.use(express.static(path.join(__dirname, 'public')));    // public 폴더 내 요소들 사용
app.use('/public', express.static('public'))
app.use(bodyParser.json()); // 미들웨어 - json으로 데이터 분석.
app.use(bodyParser.urlencoded({extended:true}))   // JSON 데이터를 전송할 경우 받는 body parser
app.use(methodOverride("_method"));
app.use(flash());

app.use(session({secret:'MySecret'}));
app.use(passport.initialize())
app.use(passport.session());

passport.serializeUser(function(user, done){    // 현재 user 개체를 넘겨받아, user의 DB _id를 저장.
  done(null, user.id);
})
passport.deserializeUser(function(id, done){    // 위에서 저장한 id에서 user를 찾아 가져옴.
  User.findById(id)
    .then((err, user) => {
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
  new LocalStrategy({
    usernameField:          'email',
    passwordField:          'password',
    passReqToCallback:      true
  }, 
  function(req, email, password, done){
    User.findOne({'email': email})
      .then(user => {
        if (!user){
          req.flash('email', req.body.email);
          return done(null, false, req.flash('loginError', '존재하지 않는 아이디입니다.'))
        } 
        if (user.password != password){
          req.flash('email', req.body.email);
          return done(null, false, req.flash('loginError', '비밀번호가 틀렸습니다.'));
        }
        return done(null, user);
      })
      .catch(err => {
        if (err) return done(err);
      })
  })
)

// ===========================================
// home routes
app.get('/', function(req, res){
  res.redirect('/posts')
});

app.get('/login', function(req, res){
  res.render('login/login', {email:req.flash("email")[0], loginError: req.flash('loginError')})
});

app.post('/login', function(req, res, next){
  req.flash('email');
  if(req.body.email.length === 0 || req.body.password.length === 0){
    req.flash('email', req.body.email);
    req.flash('loginError', '이메일과 비밀번호를 입력해주세요.')
    res.redirect('/login');
  } else {
    next();
  }
}, passport.authenticate('local-login', {
    successRedirect:    '/posts',
    failureRedirect:    '/login',
    failureFlash:       true
  })
)

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

app.get('/users/new', function(req, res){   // 회원가입
  res.render('users/new', {
    formData:           req.flash('formData')[0],
    emailError:         req.flash('emailError')[0],
    nicknameError:      req.flash('nicknameError')[0],
    passwordError:      req.flash('passwordError')[0]
  })
})

app.post('/users', checkUserRegValidation, function(req, res, next){    // 회원가입 create
  User.create(req.body.user)
    .then(user => {
      res.redirect('/login')
    })
    .catch(err => {
      if (err) return res.json({success:false, message:err})
    })
})

app.get('/users/:id', function(req, res){   // 회원정보보기
  User.findById(req.params.id)
    .then(user => {
      res.render('users/show', {user:user});
    })
    .catch(err => {
      return res.json({success:false, message:err});
    })
})

app.get('/users/:id/edit', function(req, res){    // 회원정보 수정
  User.findById(req.params.id)
    .then(user => {
      res.render('users/edit', {
        user:             user,
        formData:         req.flash('formData')[0],
        emailError:       req.flash('emailError')[0],
        nicknameError:    req.flash('nicknameError')[0],
        passwordError:    req.flash('passwordError')[0]
      })
    })
})

app.put('/users/:id', checkUserRegValidation, function(req, res){
  User.findById(req.params.id, req.body.user)
    .then(user => {
      if(req.body.user.password == user.password){
        if (req.body.user.newPassword){
          req.body.user.password = req.body.user.newPassword
        } else {
          delete req.body.user.password;
        }
        User.findByIdAndUpdate(req.params.id, req.body.user)
          .then(user => {
            res.redirect('/users/' + req.params.id);
          })
          .catch(err => {
            return res.json({success:'false', message:err});
          })
      } else {
        req.flash('formData', req.body.user);
        req.flash('passwordError', '유효하지 않은 비밀번호')
        res.redirect('/users/'+ req.params.id + '/edit');
      }
    })
    .catch(err => {
      return res.json({success:'false', message:err})
    })
})

function checkUserRegValidation(req, res, next){
  var isValid = true;

  async.waterfall(
    [function(callback){
        User.findOne({email:req.body.user.email, _id: {$ne: new mongoose.Types.ObjectId(req.params.id)}})
          .then((err, user) => {
            if(user){
              isValid = false;
              req.flash('emailError', '이미 있는 아이디입니다.')
            }
            callback(null, isValid);
          })
      }, function(isValid, callback){
        User.findOne({nickname: req.body.user.nickname, _id: {$ne: new mongoose.Types.ObjectId(req.params.id)}})
          .then((err, user) => {
            if(user){
              isValid = false;
              req.flash('nicknameError', '이미 있는 닉네임입니다.')
            }
          })
      }
    ], function(err, isValid){
      if(err) return res.json({success:'false', message:err});
      if(isValid){
        return next();
      } else {
        req.flash('formData', req.body.user);
        res.redirect('back');
      }
    }
  )
}





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