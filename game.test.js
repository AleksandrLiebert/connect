const assert = require('node:assert')
const fs = require('node:fs')
const vm = require('node:vm')

const block = fs.readFileSync('block.js', 'utf8').replaceAll('export ', '')
const fieldClass = fs.readFileSync('field.js', 'utf8')
	.replace("import { Block, DIRECTION_NAMES } from './block.js'", '')
	.replaceAll('export ', '')
const recordsClass = fs.readFileSync('records.js', 'utf8').replaceAll('export ', '')
const game = block + fieldClass + recordsClass + fs.readFileSync('game.js', 'utf8')
	.replace("import { Field } from './field.js'", '')
	.replace("import { Records } from './records.js'", '')
	.split('\nreadSettings()')[0]

vm.runInNewContext(game + `
	assert.strictEqual(String.prototype.replaceAt, undefined)
	const block = new Block(null)
	assert.strictEqual(block.contacts, '0000')
	assert.strictEqual(block.active, false)
	block.contacts = '1000'
	assert.strictEqual(block.randomRotate(() => 2), 2)
	assert.strictEqual(block.contacts, '0010')
	const classes = new Set()
	block.element = {
		style: {},
		children: [],
		classList: {
			add(value) { classes.add(value) },
			remove(value) { classes.delete(value) }
		}
	}
	block.draw()
	assert.ok(block.element.style.backgroundImage.includes('%23d3d3d3'))
`, {assert})

vm.runInNewContext(game + `
	const block = new Block(null, 2, 3)
	block.isPC = true
	block.relateFieldAndDiv()
	assert.strictEqual(document.requestedId, 'connector-2-3')
	assert.strictEqual(block.element.innerHTML, '<div class="pc pc-off"></div>')
`, {
	assert,
	document: {requestedId: null, getElementById(id) { this.requestedId = id; return {innerHTML: ''} }}
})

vm.runInNewContext(game + `
	fieldSize = 3
	field = new Field(fieldSize)
	field.rand = () => 0
	field.generateField()
	assert.ok(field instanceof Field)
	assert.strictEqual(field.blocks.length, fieldSize)
	assert.strictEqual(field.blocks[0].length, fieldSize)
	field.getBlock(field.serverX, field.serverY).fill()
	for (const block of field.blocks.flat()) {
		block.contacts = '0000'
		block.active = false
	}
	const block = field.getBlock(0, 0)
	assert.strictEqual(block.up, field.getBlock(0, 2))
	assert.strictEqual(block.right, field.getBlock(1, 0))
	assert.strictEqual(block.down, field.getBlock(0, 1))
	assert.strictEqual(block.left, field.getBlock(2, 0))
	block.contacts = '1000'
	block.up.contacts = '0010'
	assert.strictEqual(block.canConnect(UP), true)
	block.fill()
	assert.strictEqual(block.active, true)
	assert.strictEqual(block.up.active, true)
	assert.strictEqual(block.up.getConnectionsCount(), 1)
	assert.strictEqual(block.getFreeNeighborsCount(), 3)
	block.addConnection(RIGHT)
	assert.strictEqual(block.contacts, '1100')
`, {assert})

vm.runInNewContext(game + `
	const makeRand = () => {
		let value = 1
		return n => (value = value * 48271 % 2147483647) % n
	}
	const first = new Field(5)
	const second = new Field(5)
	first.rand = makeRand()
	second.rand = makeRand()
	first.generateField()
	second.generateField()
	assert.deepStrictEqual(
		first.blocks.flat().map(block => block.contacts),
		second.blocks.flat().map(block => block.contacts)
	)
`, {assert})

vm.runInNewContext(game + `
	const elements = {}
	document = {
		getElementById(id) {
			if (!elements[id]) {
				const classes = new Set()
				elements[id] = {
					classList: {
						add(value) { classes.add(value) },
						remove(value) { classes.delete(value) },
						contains(value) { return classes.has(value) }
					}
				}
			}
			return elements[id]
		}
	}
	let hidden = false
	let saved = false
	const values = [[999, 999], [999, 999]]
	const recordsView = new Records(values, () => hidden = true, () => saved = true)
	recordsView.show()
	assert.strictEqual(elements['end-time-5'].innerText, 999)
	assert.strictEqual(elements['end-turns-7'].innerText, 999)
	assert.ok(!elements.records.classList.contains('hide'))
	assert.ok(recordsView.newRecord(12, 3, 5))
	assert.deepStrictEqual(values, [[12, 3], [999, 999]])
	assert.ok(saved)
	assert.ok(!recordsView.newRecord(13, 3, 5))
	recordsView.hide()
	assert.ok(elements.records.classList.contains('hide'))
	assert.ok(hidden)
`, {assert})

vm.runInNewContext(game + `
	const makeClassList = () => ({add() {}, remove() {}})
	const makeElement = () => {
		const element = {style: {}, children: [], classList: makeClassList()}
		Object.defineProperty(element, 'innerHTML', {
			get() { return this.html || '' },
			set(value) {
				this.html = value
				this.children = value ? [{classList: makeClassList()}] : []
			}
		})
		return element
	}
	const elements = {field: makeElement()}
	let usedSeed
	Math.seedrandom = function(seed) { usedSeed = seed; return () => 0 }
	document = {
		getElementById(id) {
			if (!elements[id]) elements[id] = makeElement()
			return elements[id]
		}
	}
	const testField = new Field(3)
	const rotations = testField.createField('test-seed', function() {})
	assert.strictEqual(usedSeed, 'test-seed')
	assert.strictEqual(typeof rotations, 'number')
	assert.ok(elements.field.innerHTML.includes('connector-0-0'))
	assert.strictEqual(testField.getBlock(testField.serverX, testField.serverY).element.innerHTML, '<div class="server"></div>')
	assert.ok(testField.allBlocks('getConnectionsCount').every(Number.isInteger))
`, {assert})

function test(points, expected, size = 5, server = [2, 2]) {
	const setup = `
		fieldSize = ${size}
		serverX = ${server[0]}
		serverY = ${server[1]}
		field = new Field(fieldSize)
		for (const [x, y, contacts] of ${JSON.stringify(points)}) field.getBlock(x, y).contacts = contacts
		straightenPCPaths(field, serverX, serverY)
		assert.deepStrictEqual(${JSON.stringify(expected)}.map(([x, y]) => field.getBlock(x, y).contacts), ${JSON.stringify(expected)}.map(point => point[2]))
	`
	vm.runInNewContext(game + setup, {assert})
}

test(
	[[0, 0, '1101'], [1, 0, '0011'], [1, 1, '1001'], [0, 1, '0100']],
	[[0, 0, '1011'], [1, 0, '0000'], [1, 1, '0000'], [0, 1, '1000']]
)

test(
	[[4, 4, '1101'], [0, 4, '0011'], [0, 0, '1001'], [4, 0, '0100']],
	[[4, 4, '1011'], [0, 4, '0000'], [0, 0, '0000'], [4, 0, '1000']]
)

test(
	[[0, 0, '1011'], [0, 1, '1100'], [1, 1, '1001'], [1, 0, '0010']],
	[[0, 0, '1101'], [0, 1, '0000'], [1, 1, '0000'], [1, 0, '0001']]
)

test(
	[[0, 0, '1101'], [1, 0, '0011'], [1, 1, '1001'], [0, 1, '0100']],
	[[0, 0, '1101'], [1, 0, '0011'], [1, 1, '1001'], [0, 1, '0100']],
	5,
	[1, 0]
)

vm.runInNewContext(game + `
	const makeClassList = () => {
		const classes = new Set()
		return {
			add(value) { classes.add(value) },
			remove(value) { classes.delete(value) },
			contains(value) { return classes.has(value) }
		}
	}
	const cell = new Block({children: [], classList: makeClassList()})
	cell.contacts = '0100'
	cell.originalContacts = '1000'
	document.getElementById = () => ({classList: makeClassList()})
	hintState = state => hintActive = state
	drawTurns = () => {}
	field = {refill() {}}
	let endCalls = 0
	endGame = () => endCalls++
	hintActive = true
	blockClick.call(cell, {button: 0})
	assert.strictEqual(endCalls, 1)
`, {assert, document: {}})

vm.runInNewContext(game + `
	rotateActive = true
	turnsList = [['connector-0-0', 0]]
	score = 3
	cancelTurn()
	assert.strictEqual(turnsList.length, 1)
	assert.strictEqual(score, 3)
`, {assert})

vm.runInNewContext(game + `
	field = new Field(2)
	const html = field.allBlocks('getHTML', 2)
	assert.strictEqual(html[0], '<div id="block-0-0" class="block"><div id="connector-0-0" class="connector"></div></div>')
	assert.strictEqual(html[1], '<div id="block-1-0" class="block"><div id="connector-1-0" class="connector"></div></div><br />')
	for (const block of field.blocks.flat()) {
		block.active = true
		block.element = {style: {}, children: []}
	}
	field.refill()
	assert.strictEqual(field.getBlock(field.serverX, field.serverY).active, true)
	assert.strictEqual(field.blocks.flat().filter(block => block.active).length, 1)
`, {assert})

vm.runInNewContext(game + `
	let changedUrl = null
	let usedTime = null
	let usedEntropy = null
	window.history = {replaceState(state, title, url) { changedUrl = url.toString() }}
	Date.now = () => 123456
	Math.seedrandom = function(time, options) {
		usedTime = time
		usedEntropy = options.entropy
		return () => 0
	}
	createSeed()
	assert.strictEqual(usedTime, 123456)
	assert.strictEqual(usedEntropy, true)
	assert.strictEqual(currentSeed, 'aaaaaaaaaaaaaaaa')
	assert.strictEqual(changedUrl, 'https://example.com/game?size=9&seed=aaaaaaaaaaaaaaaa#board')
`, {
	assert,
	URL,
	window: {
		location: {href: 'https://example.com/game?size=9#board'}
	}
})

console.log('game tests: ok')
