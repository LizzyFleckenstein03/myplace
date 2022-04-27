const mongodb = require("mongodb")
const cors = require("cors")
const morgan = require("morgan")
const hcaptcha = require("express-hcaptcha")
const express = require("express")
const socketIO = require("socket.io")
const httpError = require("http-errors")
const parseColor = require("color-parse")

const max_size = 1000

const app = require("express")()
const server = require("http").createServer(app)
const mongoClient = new mongodb.MongoClient("mongodb://database:27017/myplace")
const io = new socketIO.Server(server)

const hcaptchaValidate = hcaptcha.middleware.validate(process.env.HCAPTCHA_SECRET_KEY)

app.use(morgan("tiny"))
app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(express.static("node_modules/qrcode/build"))
app.use(express.urlencoded({extended: true}))

const getRoom = id => mongoClient.db().collection("rooms")
	.findOne({_id: new mongodb.ObjectID.createFromHexString(id)})

const parseCoord = (size, max) => {
	const x = parseInt(size.x)
	const y = parseInt(size.y)

	if (isNaN(x) || isNaN(y))
		return

	if (x < 0 || y < 0)
		return

	if (x >= max.x || y >= max.y)
		return

	return {x, y}
}

app.get("/", cors(), (req, res) => {
	res.render("create", {
		max_size,
		hcaptcha_site_key: process.env.HCAPTCHA_SITE_KEY,
	})
})

app.get("/room/:id/", (req, res) => getRoom(req.params.id).then(room => {
	if (!room)
		throw httpError(404)

	res.render("room", {id: room._id.toHexString()})
}))

app.use("/create", (req, res, next) => {
	req.body.token = req.body["h-captcha-response"]
	next()
})

app.post("/create", hcaptchaValidate, (req, res) => {
	const timeout = parseInt(req.body.timeout)
	const size = parseCoord({x: req.body.width, y: req.body.height}, {y: max_size, x: max_size})

	if (isNaN(timeout) || timeout < 0)
		throw httpError(400, "Invalid timeout")

	if (!size)
		throw httpError(400, "Invalid width or height")
	
	mongoClient.db().collection("rooms")
		.insertOne({
			timeout, size,
			data: {},
		}).then(result => {
			const id = result.insertedId.toHexString()
			const link = `${req.protocol}://${req.get("host")}/room/${id}/`
			
			res.render("created", {id, link})
		})
})

io.on("connection", socket => {
	socket.on("join", id => getRoom(id).then(room => {
		if (!room)
			return

		socket.emit("timeout", room.timeout)
		socket.emit("size", room.size)
		socket.emit("place", room.data)
		socket.join(room._id.toHexString())
	}))

	socket.on("place", ({id, x, y, color}) => getRoom(id).then(room => {
		if (!room)
			return

		if (!color || !parseColor(color))
			return

		const pos = parseCoord({x, y}, room.size)

		if (!pos)
			return

		mongoClient.db().collection("rooms")
			.updateOne({_id: room._id},
				{"$set": {[`data.${pos.x}.${pos.y}`]: color}})
		io.sockets.in(room._id.toHexString()).emit("place", {[pos.x]: {[pos.y]: color}})
	}))
})

mongoClient.connect().then(_ => {
	server.listen(23430, _ => {
		const address = server.address()
		console.log("Listening on " + address.address + ":" + address.port)
	})
})
