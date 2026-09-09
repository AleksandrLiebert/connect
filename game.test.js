const assert = require('node:assert')
const fs = require('node:fs')
const vm = require('node:vm')

const game = fs.readFileSync('game.js', 'utf8').split('\nreadSettings()')[0]

function test(points, expected, size = 5, server = [2, 2]) {
	const setup = `
		fieldSize = ${size}
		serverX = ${server[0]}
		serverY = ${server[1]}
		field = Array.from({length: fieldSize}, () => Array(fieldSize))
		for (let x = 0; x < fieldSize; x++) for (let y = 0; y < fieldSize; y++) {
			field[x][y] = {
				value: '0000',
				getAttribute() { return this.value },
				setAttribute(name, value) { this.value = value }
			}
		}
		for (const [x, y, contacts] of ${JSON.stringify(points)}) getConnector(x, y).value = contacts
		straightenPCPaths()
		assert.deepStrictEqual(${JSON.stringify(expected)}.map(([x, y]) => getConnector(x, y).value), ${JSON.stringify(expected)}.map(point => point[2]))
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

console.log('straightenPCPaths: ok')
