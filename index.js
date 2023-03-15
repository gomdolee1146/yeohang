const express = require('express')
const path = require('path');
const app = express()
const port = 3000
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_DB);

var db = mongoose.connection;
db.once('open', function(){
  console.log('DB 연결')
})
db.on('error', function(err) {
  console.log('DBerror:', err);
})

var dataSchema = mongoose.Schema({
  name: String,
  count: Number
});
var Data = mongoose.model('data', dataSchema);

// Data.findOne({name:'myData'}, (err, data) => { 
//   if(err) return console.log('데이터 에러', err);
//   if(!data){
//     Data.create({name:'myData', count:0}, function(err, data){
//       if(err) return console.log('데이터에러', err);
//       console.log('counter initialized:', data);
//     })
//   }
// })
Data.findOne({name:'myData'}).exec()
  .then((data) => {
    return console.log('counter initialized:', data);
  })
  .then((err) => {
    return console.log('데이터 에러', err);
  })
  .then((data) => {
    if(!data){
      Data.create({name:'myData', count:0})
      return console.log('카운트 시작:', data);
    }
  })
  .catch((err) => {
    return console.log('데이터에러', err);
  })

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'views')));

var data = {count:0};   // 서버에 저장될 데이터

// get 신호받으면 get신호로 요청. count++ 하고, main 렌더. 
app.get('/', function (req, res) {
  data.count++;
  res.render('main', data);
});

// get 신호받으면 count를 0으로, data를 main 렌더
app.get('/reset', function(req, res) {
  data.count = 0;
  res.render('main', data);
});

/** 
 *  /set/count루트에 get 신호받으면, count query 확인. data.count에 대입.
 *  쿼리 스트링으로 된 주소를 서버에서 받기.
 */
app.get('/set/count', function(req, res) {
  if (req.query.count) data.count=req.query.count;
  res.render('main', data);
});

/**
 *  루트에 콜론이 오면, 주소줄을 변수로 선언. 
 *  parameter로 저장.
 *  위쪽 주소랑 대입하면
 *  >> /set/count?count=num으로 변경됨
 */
app.get('/set/:num', function(req, res) {
  data.count=req.params.num;
  res.render('main', data);
})


app.get('/', (req, res) => {
  res.render('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})