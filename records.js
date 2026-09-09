export class Records {
	constructor(values, onHide, onChange) {
		this.values = values
		this.onHide = onHide
		this.onChange = onChange
	}

	hide() {
		document.getElementById('panels').classList.remove('hide')
		document.getElementById('game').classList.remove('blur')
		document.getElementById('records').classList.add('hide')
		this.onHide()
	}

	show() {
		document.getElementById('panels').classList.add('hide')
		document.getElementById('game').classList.add('blur')
		document.getElementById('records').classList.remove('hide')
		for (let i = 0; i < this.values.length; i++) {
			const size = i * 2 + 5
			document.getElementById(`end-time-${size}`).innerText = this.values[i][0]
			document.getElementById(`end-turns-${size}`).innerText = this.values[i][1]
		}
	}

	newRecord(time, score, fieldSize) {
		const level = parseInt((fieldSize - 4) / 2 - 0.5)
		if (this.values[level][1] > score
			|| this.values[level][1] == score && this.values[level][0] > time) {
			this.values[level] = [time, score]
			this.onChange()
			return true
		}
		return false
	}
}
