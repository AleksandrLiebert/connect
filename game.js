import { Field } from './field.js'
import { Records } from './records.js'

let keyLIsDown = false
let blockSize = 100
let fieldSize = 9
let score = 0
let panelHeight
let panelWidth
let turnsList = []
let hintActive = false
let timeStop = false
let time = 0
let backTimeTick = 0
let rotateActive = false
let rotateConnector
let field
let records
let currentSeed = ''
let gameSettings =
{
	mode: 9,
	records:
	[
		[999, 999],
		[999, 999],
		[999, 999],
		[999, 999],
		[999, 999],
		[999, 999]
	]
}

function readSettings() {
	let s = localStorage.getItem('connectSettings')
	if (s == null) {
		saveSettings()
	} else {
		gameSettings = JSON.parse(s)
		fieldSize = gameSettings.mode
	}
}

function saveSettings() {
	localStorage.setItem('connectSettings', JSON.stringify(gameSettings))
}

function setQueryParameter(name, value) {
	const url = new URL(window.location.href)
	url.searchParams.set(name, value)
	window.history.replaceState(null, '', url)
}

function createSeed() {
	const random = new Math.seedrandom(Date.now(), {entropy: true})
	currentSeed = ''
	for (let i = 0; i < 16; i++) currentSeed += String.fromCharCode(97 + Math.floor(random() * 26))
	setQueryParameter('seed', currentSeed)
}

function changeColorCursor(color) {
	let root = document.querySelector(':root')
	root.style.setProperty('--cursor-color', color)
}

function endAnimation() {
	const connector = rotateConnector.element
	rotateConnector.rotating = false
	if (connector.classList.contains('contacts-rotate-left')) {
		rotateConnector.rotateLeftConnector()
	} else {
		rotateConnector.rotateRightConnector()
	}
	connector.classList.remove('contacts-rotate-left')
	connector.classList.remove('contacts-rotate-right')
	if (connector.children.length == 1) {
		connector.children[0].classList.remove('device-rotate-left')
		connector.children[0].classList.remove('device-rotate-right')
	}
	field.refill()
	rotateActive = false
	endGame()
}

function blockClick(handle) {
	if (rotateActive) {
		return
	}
	const connector = this.element
	let lastTurn = [null, null]
	if (turnsList.length > 0) {
		lastTurn = turnsList[turnsList.length - 1]
	}
	if (handle.button == 1 || keyLIsDown && handle.button == 0) {
		if (lastTurn[0] == this && lastTurn[1] == 1) {
			turnsList.pop()
		} else {
			turnsList.push([this, 1])
		}
		this.locked = !this.locked
		connector.classList.toggle('block-lock', this.locked)
	} else if (handle.button == 0 && !this.locked && !this.hintLocked && this.contacts != '0000') {
		if (hintActive) {
			hintState(false)
			let original = this.originalContacts
			let ds = 0
			while (original != this.contacts) {
				this.rotateLeftConnector()
				ds++
			}
			if (ds == 3) {
				ds = 1
			}
			score += ds
			this.hintLocked = true
			connector.classList.add('block-hint-lock')
			let hintButton = document.getElementById('get-hint')
			hintButton.classList.remove('fa-active')
			hintButton.classList.add('fa-disable')
		} else {
			if (lastTurn[0] == this && lastTurn[1] == 2) {
				score--
				turnsList.pop()
			} else {
				score++
				turnsList.push([this, 0])
			}
			rotateActive = true
			this.rotating = true
			connector.classList.add('contacts-rotate-left')
			if (connector.children.length == 1) {
				connector.children[0].classList.add('device-rotate-left')
			}
			rotateConnector = this
			setTimeout(endAnimation, 150)
		}
		field.refill()
		drawTurns()
		if (this.hintLocked) endGame()
	} else if (handle.button == 2 && !this.locked && !this.hintLocked && this.contacts != '0000') {
		if (hintActive) {
			return
		}
		if (lastTurn[0] == this && lastTurn[1] == 0) {
			score--
			turnsList.pop()
		} else {
			score++
			turnsList.push([this, 2])
		}
		rotateActive = true
		this.rotating = true
		connector.classList.add('contacts-rotate-right')
		if (connector.children.length == 1) {
			connector.children[0].classList.add('device-rotate-right')
		}
		rotateConnector = this
		setTimeout(endAnimation, 150)
		field.refill()
		drawTurns()
	}
}

function cancelTurn() {
	if (rotateActive) return
	if (turnsList.length > 0) {
		let turn = turnsList.pop()
		let cell = turn[0]
		let connector = cell.element
		if (cell.hintLocked) {
			cancelTurn()
			return
		}
		if (turn[1] == 0) {
			score--
			rotateActive = true
			cell.rotating = true
			connector.classList.add('contacts-rotate-right')
			if (connector.children.length == 1) {
				connector.children[0].classList.add('device-rotate-right')
			}
			rotateConnector = cell
			setTimeout(endAnimation, 150)
			field.refill()
			drawTurns()
		} else if (turn[1] == 2) {
			score--
			rotateActive = true
			cell.rotating = true
			connector.classList.add('contacts-rotate-left')
			if (connector.children.length == 1) {
				connector.children[0].classList.add('device-rotate-left')
			}
			rotateConnector = cell
			setTimeout(endAnimation, 150)
			field.refill()
			drawTurns()
		} else if (turn[1] == 1) {
			cell.locked = !cell.locked
			connector.classList.toggle('block-lock', cell.locked)
		}
	}
}

function createGameState() {
	turnsList = []
	if (currentSeed === null) {
		createSeed()
	}
	if (field) field.stopSignals()
	field = new Field(fieldSize)
	score = -field.createField(currentSeed, blockClick)
	field.startSignals()
	backTimeTick = Date.now()
	time = 0
}

function hintState(state) {
	hintActive = state
	if (state) {
		changeColorCursor('rgba(0, 255, 0, 0.3)')
	} else {
		changeColorCursor('rgba(255, 255, 255, 0.3)')
	}
}

function getHint() {
	if (this.classList.contains('fa-disable')) {
		return
	}
	if (hintActive) {
		hintState(false)
		this.classList.remove('fa-active')
		this.classList.add('fa-click')
	} else {
		hintState(true)
		this.classList.remove('fa-click')
		this.classList.add('fa-active')
	}
}

function initHint() {
	hintState(false)
	const hintButton = document.getElementById('get-hint')
	hintButton.classList.remove('fa-active')
	hintButton.classList.remove('fa-disable')
	hintButton.classList.add('fa-click')
}

function startGame() {
	initHint()
	createGameState()
	drawTurns()
	resizeField()
}

function drawTurns() {
	const turns = document.getElementById('turns')
	turns.innerText = score
	if (score <= 0) {
		turns.style.color = '#6c6'
	} else {
		turns.style.color = '#c66'
	}
}

function resizeField() {
	const width = window.innerWidth
	const height = window.innerHeight
	if (width < height) {
		blockSize = parseInt(width / fieldSize)
			panelWidth = parseInt(width / 9) * 2
			panelHeight = parseInt(width / 9)
	} else {
		blockSize = parseInt(height / fieldSize)
			panelWidth = parseInt(height / 9) * 2
			panelHeight = parseInt(height / 9)
	}
	const panelRadius = parseInt(panelHeight / 2) + 'px'

	let blocks = document.getElementsByClassName('block')
	for (let i = 0; i < blocks.length; i++) {
		blocks[i].style.width = blockSize
		blocks[i].style.height = blockSize
	}

	const field = document.getElementById('field')
	field.style.marginTop = parseInt((height - blockSize * fieldSize) / 2)
	field.style.marginLeft = parseInt((width - blockSize * fieldSize) / 2)

	const score = document.getElementById('score')
	score.style.width = panelWidth
	score.style.height = panelHeight
	score.style.borderTopLeftRadius = panelRadius

	const turnsPanel = document.getElementsByClassName('turns')[0]
	turnsPanel.style.width = panelWidth
	turnsPanel.style.height = panelHeight
	turnsPanel.style.borderTopRightRadius = panelRadius

	const turns = document.getElementById('turns')
	turns.style.fontSize = parseInt(panelHeight / 3) + 'px'
	turns.style.bottom = parseInt((panelHeight - turns.offsetHeight) / 2)
	turns.style.left = panelHeight + 10 + parseInt((panelHeight - 20 - turns.offsetWidth) / 2)

	const panelLeft = document.getElementsByClassName('panel-left')[0]
	panelLeft.style.width = panelWidth
	panelLeft.style.height = panelHeight
	panelLeft.style.borderBottomRightRadius = panelRadius

	const panelRight = document.getElementsByClassName('panel-right')[0]
	panelRight.style.width = panelWidth
	panelRight.style.height = panelHeight
	panelRight.style.borderBottomLeftRadius = panelRadius

	let panelTexts = document.getElementsByClassName('panel-text')
	for (let i = 0; i < panelTexts.length; i++) {
		panelTexts[i].style.fontSize = (panelHeight - 20) + 'px'
	}

	let fars = document.getElementsByClassName('far')
	for (let i = 0; i < fars.length; i++) {
		fars[i].style.fontSize = panelHeight - 20
	}

	fars = document.getElementsByClassName('fas')
	for (let i = 0; i < fars.length; i++) {
		fars[i].style.fontSize = panelHeight - 20
	}

	let mods = document.getElementsByClassName('modes')[0]
	let modHeight
	if (width > height) {
		modHeight = parseInt(height / 7)
	} else {
		modHeight = parseInt(width / 7)
	}
	mods.style.width = modHeight * 5
	mods.style.height = modHeight * 5
	mods.style.marginTop = parseInt(height / 2 - modHeight * 2.5)
	mods.style.marginLeft = parseInt(width / 2 - modHeight * 2.5)

	let modeList = document.getElementsByClassName('mode')
	for (let i = 0; i < modeList.length; i++) {
		modeList[i].style.width = modHeight * 5 - parseInt(modHeight * 0.4)
		modeList[i].style.height = modHeight - parseInt(modHeight * 0.4)
		modeList[i].style.fontSize = parseInt(modHeight * 0.5) + 'px'
		modeList[i].style.padding = parseInt(modHeight * 0.1) + 'px'
		modeList[i].style.margin = parseInt(modHeight * 0.1) + 'px'
	}
}

function showSelectMode() {
	document.getElementById('select-mode').classList.remove('hide')
	document.getElementById('panels').classList.add('hide')
	document.getElementById('game').classList.add('blur')
}

function hideSelectMode() {
	document.getElementById('select-mode').classList.add('hide')
	document.getElementById('panels').classList.remove('hide')
	document.getElementById('game').classList.remove('blur')
	drawTime()
	drawTurns()
}

function selectGameMode(size) {
	fieldSize = size
	gameSettings.mode = fieldSize
	saveSettings()
	setQueryParameter('size', fieldSize)
	hideSelectMode()
	startGame()
}

function pauseHandler() {
	if (this.classList.contains('fa-click')) {
		timeStop = true
		document.getElementById('game').classList.add('hide')
		document.getElementById('background-stub').classList.remove('hide')
		document.getElementsByClassName('panel-left')[0].classList.add('hide')
		document.getElementsByClassName('panel-right')[0].classList.add('hide')
		document.getElementsByClassName('turns')[0].classList.add('hide')
		this.classList.remove('fa-click')
		this.classList.add('fa-active')
	} else {
		timeStop = false
		document.getElementById('background-stub').classList.add('hide')
		document.getElementById('game').classList.remove('hide')
		document.getElementsByClassName('panel-left')[0].classList.remove('hide')
		document.getElementsByClassName('panel-right')[0].classList.remove('hide')
		document.getElementsByClassName('turns')[0].classList.remove('hide')
		this.classList.remove('fa-active')
		this.classList.add('fa-click')
		drawTurns()
	}
}

function endGame() {
	if (field.allBlocks('isInactivePC').some(Boolean)) return
	let endTime = parseInt(time / 1000)
	if (endTime > 999) endTime = 999
	if (score < 0) score = 0
	const isNewRecord = records.newRecord(endTime, score, fieldSize)
	document.getElementById('panels').classList.add('hide')
	document.getElementById('game').classList.add('blur')
	changeColorCursor('rgba(0, 0, 0, 0)')
	document.getElementById('game-over').classList.remove('hide')
	document.getElementById('end-time').innerText = endTime
	document.getElementById('end-turns').innerText = score
	document.getElementsByClassName('fa-long-arrow-alt-up')[0].style.display = isNewRecord ? 'inline-block' : 'none'
}

function afterEndGame() {
	document.getElementById('panels').classList.remove('hide')
	document.getElementById('game').classList.remove('blur')
	document.getElementById('game-over').classList.add('hide')
	createSeed()
	startGame()
}

function timeTick() {
	let delta = Date.now() - backTimeTick
	backTimeTick += delta
	if (!timeStop) {
		time += delta
	}
	drawTime()
}

function drawTime() {
	const timeView = document.getElementById('time')
	timeView.innerText = time / 1000 < 1000 ? parseInt(time / 1000) : '999'
	timeView.style.fontSize = parseInt(panelHeight / 3) + 'px'
	timeView.style.bottom = parseInt((panelHeight - timeView.offsetHeight) / 2)
	timeView.style.right = panelHeight + 10 + parseInt((panelHeight - 20 - timeView.offsetWidth) / 2)
}

function setEvents() {
	document.getElementById('new-game').onclick = function() {
		createSeed()
		startGame()
	}
	document.getElementById('game-over').onclick = afterEndGame
	document.getElementById('show-records').onclick = records.show.bind(records)
	document.getElementById('records').onclick = records.hide.bind(records)
	window.onresize = resizeField
	document.getElementById('change-mode').onclick = showSelectMode
	document.getElementsByClassName('close-select-mode')[0].onclick = hideSelectMode
	let modes = document.getElementsByClassName('mode')
	for (let i = 0; i < modes.length; i++)
		modes[i].onclick = function() {selectGameMode(parseInt(this.getAttribute('value')))}
	document.getElementById('cancel-turn').onclick = cancelTurn
	document.getElementById('get-hint').onclick = getHint
	document.getElementById('pause').onclick = pauseHandler
	setInterval(timeTick, 100)
	document.fonts.ready.then(resizeField)
	document.onkeydown = function(e) {
		if (e.code == 'KeyZ' && e.ctrlKey) cancelTurn()
		if (e.code == 'KeyL') keyLIsDown = true
	}
	document.onkeyup = function(e) {
		if (e.code == 'KeyL') keyLIsDown = false
	}
	document.oncontextmenu = function () {return false}
}

function getSizeFromUrl() {
	const size = new URLSearchParams(window.location.search).get('size')
	if (size !== null)
		return parseInt(size)
	setQueryParameter('size', gameSettings.mode)
	return gameSettings.mode
}

readSettings()
records = new Records(gameSettings.records, function() {
	drawTime()
	drawTurns()
}, saveSettings)
setEvents()
//get seed from url
currentSeed = new URLSearchParams(window.location.search).get('seed')
fieldSize = getSizeFromUrl()
startGame()
