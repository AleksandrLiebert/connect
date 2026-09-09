import { Block, DIRECTION_NAMES } from './block.js'

const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3

function reverseDirection(direction) {
	return (direction + 2) % 4
}

function getPointDirection(x, y, direction) {
	switch (direction) {
		case UP: return [x, y - 1]
		case RIGHT: return [x + 1, y]
		case DOWN: return [x, y + 1]
		case LEFT: return [x - 1, y]
	}
}

function generateConnector(field, connectorGenList) {
	const nxy = field.rand(connectorGenList.length)
	const [x, y] = connectorGenList.splice(nxy, 1)[0]
	const block = field.getBlock(x, y)
	let allowBlocks = block.getFreeNeighborsCount()
	if (allowBlocks == 4) {
		allowBlocks = 3
	} else if (allowBlocks == 3) {
		allowBlocks = 2
	} else if (allowBlocks == 0) {
		return
	}
	allowBlocks = field.rand(allowBlocks) + 1
	const realConnections = []
	let allowConnections = [UP, DOWN, RIGHT, LEFT]
	for (let direction = 0; direction < 4; direction++) {
		if (block[DIRECTION_NAMES[direction]].getConnectionsCount()) {
			allowConnections = allowConnections.filter(value => value != direction)
		}
	}

	while (allowBlocks != 0) {
		const direction = allowConnections[field.rand(allowConnections.length)]
		realConnections.push(direction)
		allowConnections = allowConnections.filter(value => value != direction)
		allowBlocks--
		block.addConnection(direction)
		block[DIRECTION_NAMES[direction]].addConnection(reverseDirection(direction))
	}

	for (const direction of realConnections) {
		connectorGenList.push(getPointDirection(x, y, direction))
	}
}

function straightenPCPaths(field, serverX, serverY) {
	const clockwiseDirections = [RIGHT, DOWN, LEFT, UP]
	const directionToNext = function(i, step) {
		return step == 1 ? clockwiseDirections[i] : reverseDirection(clockwiseDirections[(i + 3) % 4])
	}

	for (let y = 0; y < field.blocks.length; y++) {
		for (let x = 0; x < field.blocks.length; x++) {
			const points = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
			const cells = points.map(point => field.getBlock(point[0], point[1]))

			for (let junctionIndex = 0; junctionIndex < 4; junctionIndex++) {
				for (const step of [1, -1]) {
					const corner1Index = (junctionIndex + step + 4) % 4
					const corner2Index = (junctionIndex + step * 2 + 8) % 4
					const pcIndex = (junctionIndex + step * 3 + 12) % 4
					const junction = cells[junctionIndex]
					const corner1 = cells[corner1Index]
					const corner2 = cells[corner2Index]
					const pc = cells[pcIndex]
					const junctionToCorner = directionToNext(junctionIndex, step)
					const junctionToPC = directionToNext(junctionIndex, -step)
					const corner1ToJunction = directionToNext(corner1Index, -step)
					const corner1ToCorner2 = directionToNext(corner1Index, step)
					const corner2ToCorner1 = directionToNext(corner2Index, -step)
					const corner2ToPC = directionToNext(corner2Index, step)
					const pcToCorner2 = directionToNext(pcIndex, -step)
					const pcToJunction = directionToNext(pcIndex, step)
					const contacts = [junction, corner1, corner2, pc].map(cell => cell.contacts)
					const removesServer = [corner1Index, corner2Index, pcIndex].some(function(i) {
						return (points[i][0] + field.blocks.length) % field.blocks.length == serverX
							&& (points[i][1] + field.blocks.length) % field.blocks.length == serverY
					})

					if (!removesServer
						&& junction.getConnectionsCount() == 3
						&& corner1.getConnectionsCount() == 2
						&& corner2.getConnectionsCount() == 2
						&& pc.getConnectionsCount() == 1
						&& contacts[0][junctionToCorner] == '1' && contacts[0][junctionToPC] == '0'
						&& contacts[1][corner1ToJunction] == '1' && contacts[1][corner1ToCorner2] == '1'
						&& contacts[2][corner2ToCorner1] == '1' && contacts[2][corner2ToPC] == '1'
						&& contacts[3][pcToCorner2] == '1') {
						junction.contacts = junction.contacts.slice(0, junctionToCorner) + '0' + junction.contacts.slice(junctionToCorner + 1)
						junction.addConnection(junctionToPC)
						corner1.contacts = '0000'
						corner2.contacts = '0000'
						pc.contacts = '0000'
						pc.addConnection(pcToJunction)
					}
				}
			}
		}
	}
}

export class Field {
	constructor(size) {
		this.blocks = Array.from({length: size}, (_, x) => Array.from({length: size}, (_, y) => new Block(null, x, y)))
		this.serverX = parseInt(size / 2 - 0.5)
		this.serverY = this.serverX
		this.random = Math.random
		this.signalTimer = null
	}

	getBlock(x, y) {
		const size = this.blocks.length
		return this.blocks[(x % size + size) % size][(y % size + size) % size]
	}

	allBlocks(functionName, ...args) {
		const results = []
		for (let y = 0; y < this.blocks.length; y++) {
			for (let x = 0; x < this.blocks.length; x++) {
				results.push(this.blocks[x][y][functionName](...args))
			}
		}
		return results
	}

	refill() {
		this.allBlocks('clearSignal')
		this.allBlocks('clearActive')
		this.getBlock(this.serverX, this.serverY).fill()
		this.allBlocks('draw')
	}

	rand(n) {
		return Math.floor(this.random() * n)
	}

	sendSignal() {
		const visited = new Set()
		const travel = (block, from = null) => {
			if (!block.active || visited.has(block)) return
			visited.add(block)
			if (block.isPC) {
				block.signal(from, null)
				return
			}
			const directions = DIRECTION_NAMES.map((name, direction) => direction).filter(direction => {
				const neighbor = block[DIRECTION_NAMES[direction]]
				return block.contacts[direction] == '1'
					&& direction != from
					&& !(neighbor.active
						&& neighbor.contacts[(direction + 2) % 4] == '1'
						&& visited.has(neighbor))
			})
			if (!directions.length) return
			const to = directions[this.rand(directions.length)]
			const next = block[DIRECTION_NAMES[to]]
			block.signal(from, to, () => {
				if (block.active && next.active && !visited.has(next)
					&& block.contacts[to] == '1'
					&& next.contacts[(to + 2) % 4] == '1') {
					travel(next, (to + 2) % 4)
				}
			})
		}
		travel(this.getBlock(this.serverX, this.serverY))
	}

	startSignals() {
		this.stopSignals()
		this.sendSignal()
		this.signalTimer = setInterval(() => this.sendSignal(), 10000)
	}

	stopSignals() {
		if (this.signalTimer !== null) clearInterval(this.signalTimer)
		this.signalTimer = null
		this.allBlocks('clearSignal')
	}

	generateField() {
		const size = this.blocks.length
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const block = this.getBlock(x, y)
				block.up = this.getBlock(x, y - 1)
				block.right = this.getBlock(x + 1, y)
				block.down = this.getBlock(x, y + 1)
				block.left = this.getBlock(x - 1, y)
			}
		}

		const connectorGenList = [[this.serverX, this.serverY]]
		while (connectorGenList.length) generateConnector(this, connectorGenList)
		straightenPCPaths(this, this.serverX, this.serverY)
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const block = this.getBlock(x, y)
				if ((x != this.serverX || y != this.serverY) && block.getConnectionsCount() == 1) {
					block.isPC = true
				}
			}
		}
		return this
	}

	createField(seed, clickHandler) {
		this.random = new Math.seedrandom(seed)
		this.generateField()
		document.getElementById('field').innerHTML = this.allBlocks('getHTML', this.blocks.length).join('')
		this.allBlocks('relateFieldAndDiv')
		this.getBlock(this.serverX, this.serverY).element.innerHTML = '<div class="server"></div>'
		const rotations = this.allBlocks('randomRotate', this.rand.bind(this)).reduce((sum, value) => sum + value, 0)
		this.refill()
		this.allBlocks('bindClick', clickHandler)
		return rotations
	}
}
