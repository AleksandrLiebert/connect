export const DIRECTION_NAMES = ['up', 'right', 'down', 'left']
const SIGNAL_POINTS = [[50, 0], [100, 50], [50, 100], [0, 50]]

export class Block {
	constructor(element, x, y) {
		this.contacts = '0000'
		this.active = false
		this.originalContacts = '0000'
		this.rotating = false
		this.locked = false
		this.hintLocked = false
		this.isPC = false
		this.drawnContacts = null
		this.drawnActive = null
		this.element = element
		this.x = x
		this.y = y
		this.up = null
		this.right = null
		this.down = null
		this.left = null
	}

	rotateLeftConnector() {
		this.contacts = this.contacts.slice(1) + this.contacts.slice(0, 1)
	}

	rotateRightConnector() {
		this.contacts = this.contacts.slice(3) + this.contacts.slice(0, 3)
	}

	getConnectionsCount() {
		let sum = 0
		for (let i = 0; i < this.contacts.length; i++) sum += parseInt(this.contacts[i])
		return sum
	}

	addConnection(direction) {
		this.contacts = this.contacts.slice(0, direction) + '1' + this.contacts.slice(direction + 1)
	}

	canConnect(direction) {
		const neighbor = this[DIRECTION_NAMES[direction]]
		return this.contacts[direction] == '1'
			&& neighbor.contacts[(direction + 2) % 4] == '1'
			&& !neighbor.active
			&& !this.rotating
			&& !neighbor.rotating
	}

	fill() {
		this.active = true
		for (let direction = 0; direction < DIRECTION_NAMES.length; direction++) {
			if (this.canConnect(direction)) this[DIRECTION_NAMES[direction]].fill()
		}
	}

	getFreeNeighborsCount() {
		let free = 4
		for (const direction of DIRECTION_NAMES) {
			if (this[direction].getConnectionsCount() != 0) free--
		}
		return free
	}

	randomRotate(rand) {
		const contacts = this.contacts
		if (contacts == '0000') return 0
		this.originalContacts = contacts
		this.rotating = false
		if (contacts == '0101' || contacts == '1010') {
			if (rand(2) == 0) {
				this.rotateRightConnector()
				return 1
			}
			return 0
		}
		const rotations = rand(4)
		if (rotations == 1) this.rotateRightConnector()
		if (rotations == 2) {
			this.rotateRightConnector()
			this.rotateRightConnector()
		}
		if (rotations == 3) this.rotateLeftConnector()
		return rotations == 3 ? 1 : rotations
	}

	getHTML(fieldSize) {
		const lineBreak = this.x == fieldSize - 1 ? '<br />' : ''
		return `<div id="block-${this.x}-${this.y}" class="block"><div id="connector-${this.x}-${this.y}" class="connector"></div></div>${lineBreak}`
	}

	relateFieldAndDiv() {
		this.element = document.getElementById(`connector-${this.x}-${this.y}`)
		if (this.isPC) this.element.innerHTML = '<div class="pc pc-off"></div>'
	}

	clearActive() {
		this.active = false
	}

	bindClick(handler) {
		this.element.onmousedown = handler.bind(this)
	}

	isInactivePC() {
		return this.isPC && !this.active
	}

	clearSignal() {
		if (!this.element || !this.element.parentElement) return
		for (const signal of this.element.parentElement.querySelectorAll('.signal-beam')) signal.remove()
	}

	signal(fromDirection, toDirection, onEnd) {
		const from = fromDirection === null ? [50, 50] : SIGNAL_POINTS[fromDirection]
		const to = toDirection === null ? [50, 50] : SIGNAL_POINTS[toDirection]
		const signal = document.createElement('div')
		signal.className = 'signal-beam'
		signal.innerHTML = `<svg viewBox="0 0 100 100"><path pathLength="100" d="M ${from.join(' ')} L 50 50 L ${to.join(' ')}" /></svg>`
		let continued = false
		const continueSignal = () => {
			if (continued || !onEnd || !signal.isConnected) return
			continued = true
			onEnd()
		}
		this.element.parentElement.appendChild(signal)
		const handoffTimer = onEnd ? setTimeout(continueSignal, 240) : null
		signal.addEventListener('animationend', () => {
			continueSignal()
			if (handoffTimer !== null) clearTimeout(handoffTimer)
			signal.remove()
		}, {once: true})
	}

	draw() {
		if (this.contacts == this.drawnContacts && this.active == this.drawnActive) return
		this.drawnContacts = this.contacts
		this.drawnActive = this.active
		if (this.contacts == '0000') {
			this.element.style.backgroundImage = ''
		} else {
			const color = !this.active ? '%23d3d3d3' : '%2387cefa'
			const up = this.contacts[0] === '1' ? 'L 41 41 L 41 -5 L 59 -5 L 59 41' : ''
			const right = this.contacts[1] === '1' ? 'L 59 41 L 105 41 L 105 59 L 59 59' : ''
			const down = this.contacts[2] === '1' ? 'L 59 59 L 59 105 L 41 105 L 41 59' : ''
			const left = this.contacts[3] === '1' ? 'L 41 59 L -5 59 L -5 41 L 41 41' : ''
			this.element.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100px' height='100px'%3E %3Cpath fill='${color}' d='M 41 41 ${up} L 59 41 ${right} L 59 59 ${down} L 41 59 ${left} Z' /%3E %3C/svg%3E")`
		}
		if (this.isPC) {
			if (!this.active) {
				this.element.children[0].classList.add('pc-off')
				this.element.children[0].classList.remove('pc-on')
			} else {
				this.element.children[0].classList.add('pc-on')
				this.element.children[0].classList.remove('pc-off')
			}
		}
	}
}
