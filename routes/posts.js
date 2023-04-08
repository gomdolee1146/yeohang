const express 										= require('express')
const router 											= express.Router()
const mongoose 										= require('mongoose');
const app 												= express()
const bodyParser									= require('body-parser')
const methodOverride       				= require('method-override');

var postSchema = mongoose.Schema({
	title: 				{ type: String, required: true },
	body: 				{ type: String, required: true },
	createdAt: 		{ type: Date, default: Date.now },
	updatedAt: 		Date
})
var Post = mongoose.model('post', postSchema);


router.use(bodyParser.json()); // 미들웨어 - json으로 데이터 분석.
router.use(bodyParser.urlencoded({ extended: true }))   // JSON 데이터를 전송할 경우 받는 body parser
router.use(methodOverride("_method"));


// 게시판 routes
router.get('/', function (req, res) {    // index
	Post.find({}).sort('-createdAt')
		.then(posts => {
			res.render('posts/index', { data: posts, user: req.user })
		})
		.catch(err => {
			return res.json({ success: false, message: err })
		})
})

router.get('/new', function (req, res) {   // new
	res.render('posts/new')
})

router.post('/', function (req, res) {    // create
	Post.create(req.body.post)
		.then(post => {
			// return res.json({success:true, data:post}) // 확인용.
			res.redirect('/posts')
		})
		.catch(err => {
			return res.json({ success: false, message: err })
		})
})

router.get('/:id', function (req, res) {    // show
	Post.findById(req.params.id)
		.then(post => {
			// return res.json({success:true, data:post})  
			return res.render('posts/show', { data: post });
		})
		.catch(err => {
			return res.json({ success: false, message: err })
		})
})

router.get("/:id/edit", function (req, res) {    // edit
	Post.findById(req.params.id)
		.then(post => {
			res.render('posts/edit', { data: post })
		})
		.catch(err => {
			return res.json({ success: false, message: err });
		})
})

router.post('/:id', function (req, res) {    // update
	req.body.post.updatedAt = Date.now();
	Post.findByIdAndUpdate(req.params.id, req.body.post)
		.then(post => {
			// return res.json({success:true, message:post._id+" updated"})
			res.redirect('/posts/' + req.params.id);
		})
		.catch(err => {
			return res.json({ success: false, message: err });
		})
})

router.delete("/:id", function (req, res) {    // destroy (delete)
	Post.findByIdAndRemove(req.params.id)
		.then(post => {
			// return res.json({success:true, message:post._id+" deleted"})
			res.redirect('/posts')
		})
		.catch(err => {
			return res.json({ success: false, message: err });
		})
})

module.exports = router