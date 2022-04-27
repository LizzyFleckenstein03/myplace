const socket = io()
const width = 50
const colors = ["red", "orange", "yellow", "green", "blue", "violet", "black", "white"]
let color = colors[0]
let timeout, id

socket.on("timeout", to => {
	timeout = to
})

socket.on("size", size => {
	const parent = document.getElementById("canvas")

	for (let x = 0; x < size.x; x++)
	for (let y = 0; y < size.y; y++) {
		const elem = parent.appendChild(document.createElement("div"))
		elem.id = x + "+" + y
		elem.classList.add("pixel")
		elem.style.position = "absolute"
		elem.style.top = x * width + "px"
		elem.style.left = y * width + "px"
		elem.style.width = width + "px"
		elem.style.height = width + "px"
		elem.style.backgroundColor = "white"

		elem.addEventListener("click", _ => {
			socket.emit("place", {x, y, id, color})
		})
	}
})

socket.on("place", data => {
	for (let x in data)
	for (let y in data[x])
		document.getElementById(x + "+" + y).style.backgroundColor = data[x][y]
})

init = i => {
	socket.emit("join", id = i)

	let selected
	const dotWidth = (innerWidth / colors.length)
	for (let i = 0; i < colors.length; i++) {
		const elem = document.body.appendChild(document.createElement("div"))
		elem.style.borderRadius = "50%"
		elem.style.borderStyle = "solid"
		elem.style.boxShadow = i == 0 ? "0 0 0 10px black inset" : "0 0 0 5px black inset"
		elem.style.backgroundColor = colors[i]
		elem.style.width = parseInt(dotWidth * 0.8) + "px"
		elem.style.height = parseInt(dotWidth * 0.8) + "px"
		elem.style.bottom = parseInt(dotWidth * 0.1) + "px"
		elem.style.left = parseInt(dotWidth * (0.1 + i)) + "px"
		elem.style.position = "fixed"

		if (i == 0)
			selected = elem

		elem.addEventListener("click", _ => {
			color = colors[i]

			if (selected)
				selected.style.boxShadow = "0 0 0 5px black inset"
			selected = elem
			selected.style.boxShadow = "0 0 0 10px black inset"
		})
	} 
}
