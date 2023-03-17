const express = require('express')
const path = require('path');
const app = express()
const port = 3000
const mongoose = require('mongoose');
const bodyParser = require('body-parser')

mongoose.connect(process.env.MONGO_DB);

var db = mongoose.connection;
db.once('open', function(){
  console.log('DB 연결')
})
db.on('error', function(err) {
  console.log('DBerror:', err);
})

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.json()); // 미들웨어 - json으로 데이터 분석.

var postSchema = mongoose.Schema({
  title:        {type:String, required:true},
  body:         {type:String, required:true},
  createdAt:    {type:Date, default:Date.now},
  updatedAt:    Date  
})
var Post = mongoose.model('post', postSchema);

app.get('/posts', function(req, res) {    // index
  Post.find({}).sort('-createdAt')
    .then(posts => {
      // return res.json({success:true, data:posts});  
      return res.render('posts/index', {data:posts})
    })
    .catch(err => {
      return res.json({success:false, message:err})
    })
})

app.post('/posts', function(req, res){    // create
  Post.create(req.body.post)
    .then(post => {
      return res.json({success:true, data:post})
    })
    .catch(err => {
      return res.json({success:false, message:err})
    })
})

app.get('/posts/:id', function(req, res){    // show
  Post.findById(req.params.id)
    .then(post => {
      // return res.json({success:true, data:post})  
      return res.render('post/show', {data:post});
    })
    .catch(err => {
      return res.json({success:false, message:err})
    })
})

app.put('/posts/:id', function(req, res){    // update
  req.body.post.updatedAt = Date.now();
  Post.findByIdAndUpdate(req.params.id, req.body.post)
    .then(post => {
      return res.json({success:true, message:post._id+" updated"})
    })
    .catch(err => {
      return res.json({success:false, message:err});
    })
})

app.delete("/posts/:id", function(req, res){
  Post.findByIdAndRemove(req.params.id)
    .then(post => {
      return res.json({success:true, message:post._id+" deleted"})
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