class Battleship {

    constructor() {
        this._ORIENTATION_HORIZONTAL = 0
        this._ORIENTATION_VERTICAL = 1
        this.board = {
            size: 0,
            shipCount: 0,
            shipSize: 0,
            ships: [],
            state: [],
            shots: 0,
            score: {
                max: 0,
                current: 0
            },
            isReady: false,
            error: 0
        }
        this.mersenne = null
    }

    initialize(config) {
        if (!this.isConfigValid(config))
        {
            if (config.hasOwnProperty('banner'))
            {
                this.board.banner = config.banner
                this.updateBanner('Your config is invalid!', 'warning')
            }
            return
        }
        this.board.isReady = false
        this.board.table = config && config.table ? config.table : document.getElementById('board-table')
        this.board.banner = config && config.banner ? config.banner : document.getElementById('board-banner')
        this.board.size = config ? config.size : 10
        this.board.shipCount = config && config.shipCount ? config.shipCount : 6
        this.board.shipSize = config && config.shipSize ? config.shipSize : [2, 3, 4]
        this.board.table.innerHTML = 'Generating your game...'
        this.updateBanner('Enter row and column or click on the cell to play!', 'primary')
        this.randomShips().then((ships) => {
            this.board.ships = ships;
            this.board.state = []
            for (let i = 0; i < this.board.size; i++) {
                let arr = new Array(this.board.size).fill(0)
                this.board.state.push(arr)
            }
            this.board.score.max = 0
            this.board.score.current = 0
            this.board.ships.forEach((ship, c) => {
                let d = this.getShipDimension(ship)
                let fill = new Array(d.s).fill(1)
                if (d.o === this._ORIENTATION_HORIZONTAL)
                {
                    let j = d.y[0]
                    for (let i = d.x[0]; i < d.x[0] + d.s; i++)
                    {
                        this.board.state[i-1][j-1] = c+1
                    }
                }
                else
                {
                    let i = d.x[0]
                    for (let j = d.y[0]; j < d.y[0] + d.s; j++)
                    {
                        this.board.state[i-1][j-1] = c+1
                    }
                }
                this.board.score.max += d.s
            })
            this.board.isReady = true
            this.board.isActive = true
            this.drawTable()
            console.log('done')
        })
        this.board.shots = config && config.shots ? config.shots : 24
    }

    isConfigValid(config) {
        let keys = Object.keys(config)
        // debugger;
        if (keys.includes('size'))
        {
            if (config.size < 1) return false
            if (config.size < config.shipSize[config.shipSize.length - 1]) return false
            if (keys.includes('shipCount') && keys.includes('shipSize'))
            {
                if (config.shipCount * config.shipSize[0] > config.size * config.size) return false
            }
        }
        if (keys.includes('shipCount'))
        {
            if (config.shipCount < 1) return false
        }
        if (keys.includes('shipSize'))
        {
            if (!Array.isArray(config.shipSize)) return false
            if (config.shipSize.length < 1) return false
            if (config.shipSize[0] < 1) return false
            if (config.shipSize[config.shipSize.length - 1] < 1) return false
            if (config.shipSize[0] > config.shipSize[config.shipSize.length - 1]) return false
        }
        if (keys.includes('shots'))
        {
            if (config.shots < 1) return false
        }
        
        return true
    }

    drawTable() {
        this.board.table.innerHTML = ""
        for (let i = 0; i < this.board.size + 1; i++)
        {
            let row = this.board.table.insertRow()
            for (let j = 0; j < this.board.size + 1; j++)
            {
                let col = row.insertCell()
                col.setAttribute('data-x', i)
                col.setAttribute('data-y', j)
                col.className = "board-coord-data"
                // col.innerHTML = `(${i}, $d{j})`
            }
            row.cells[0].innerHTML = i
            row.cells[0].className = "board-coord-identifier"
        }
        for (let i = 0; i < this.board.size + 1; i++)
        {
            let cell = this.board.table.rows[0].cells[i]
            cell.innerHTML = i
            cell.className = "board-coord-identifier"
        }
        Array.from(document.getElementsByClassName("board-coord-data")).forEach((e) => {
            e.addEventListener('click', () => {
                if (!this.board.isActive) return
                let isShip = this.shoot(parseInt(e.getAttribute('data-y')), parseInt(e.getAttribute('data-x')))
                if (isShip)
                {
                    e.className = 'board-coord-data success'
                }
                else if(isShip === false)
                {
                    e.className = 'board-coord-data fail'
                }
            })
        })
    }

    async randomSingleShip(delay) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.mersenne = new MersenneTwister()
                let size = this.board.shipSize[Math.floor(this.mersenne.random() * this.board.shipSize.length)]
                let random = {
                    x: Math.floor(this.mersenne.random() * (this.board.size - size + 1) + 1),
                    y: Math.floor(this.mersenne.random() * (this.board.size - size + 1) + 1),
                    o: Math.round(this.mersenne.random()),
                    s: size
                }
                resolve(random);
            }, delay);
        })
    }

    async randomShips() {
        let ships = []
        for (let i = 0; i < this.board.shipCount; i++)
        {
            let m = new MersenneTwister()
            let delay = m.random() * 50 + 20
            let random = await this.randomSingleShip(delay)
            let shipIsValid = null
            for (let ship of ships)
            {
                // console.log(`this.compareShip({${ship.x}, ${ship.y}, ${ship.o}}, {${random.x}, ${random.y}, ${random.o}})`)
                if (this.compareShip(ship, random))
                {
                    shipIsValid = false
                    break
                }
            }
            shipIsValid = shipIsValid === null ? true : false
            if (shipIsValid)
            {
                ships.push(random)
            }
            else
            {
                i--
                console.log('collision found, retrying...')
            }
        }

        return Promise.resolve(ships)
    }

    compareShip(s1, s2) {
        /***
         * true  : invalid - ship overlap
         * false : valid - ship not overlap
         */
        let ship1 = this.getShipDimension(s1)
        let ship2 = this.getShipDimension(s2)

        return (ship1.x.some((a) => ship2.x.includes(a)) && ship1.y.some((a) => ship2.y.includes(a)))
            || (ship2.x.some((a) => ship1.x.includes(a)) && ship2.y.some((a) => ship1.y.includes(a)))
    }

    getShipDimension(ship) {
        let dimension = JSON.parse(JSON.stringify(ship))
        if (ship.o === this._ORIENTATION_VERTICAL)
        {
            dimension.x = [ship.x]
            dimension.y = this.generateRange(ship.y, ship.y + ship.s)
        }
        else
        {
            dimension.y = [ship.y]
            dimension.x = this.generateRange(ship.x, ship.x + ship.s)
        }
        return dimension
    }

    generateRange(from, to) {
        if(from === to) return [from]
        let arr = []
        for (let i = from; i < to; i++)
        {
            arr.push(i)
        }
        return arr
    }

    shoot(x, y) {
        if(!this.board.isActive) return
        let s = this.board.state[x - 1][y - 1]
        if (s === -1)
        {
            return null
        }
        else
        {
            this.board.shots--
            this.board.state[x - 1][y - 1] = -1
            if (s === 0)
            {
                this.updateBanner(`Ammo left: ${this.board.shots}`, 'info')
            }
            else
            {
                this.board.score.current++
                this.updateBanner(`Ammo left: ${this.board.shots}<br/>Amazing!`, 'info')
            }
            if (this.board.score.current === this.board.score.max)
            {
                this.win()
            }
            else if (this.board.shots === 0)
            {
                this.lose()
            }
            return s !== 0
        }
    }

    updateBanner(text, style) {
        this.board.banner.innerHTML = text
        this.board.banner.className = `card card-body text-${style} border-${style}`
    }

    win() {
        this.board.isActive = false
        this.updateBanner('You won!!', 'success')
        this.show()
    }

    lose() {
        this.board.isActive = false
        this.updateBanner('You ran out of ammo :(', 'danger')
        this.show()
    }

    giveup() {
        this.board.isActive = false
        this.updateBanner('Game over!', 'danger')
        this.show()
    }

    show() {
        this.board.ships.forEach((ship, c) => {
            if (ship.o === this._ORIENTATION_HORIZONTAL)
            {
                for (let i = 0; i < ship.s; i++)
                {
                    this.board.table.rows[ship.y].cells[ship.x + i].innerHTML = c + 1
                    if (!this.board.table.rows[ship.y].cells[ship.x + i].className.includes('success'))
                    {
                        this.board.table.rows[ship.y].cells[ship.x + i].className = 'board-coord-data giveup'
                    }
                }
            }
            else
            {
                for (let i = 0; i < ship.s; i++)
                {
                    this.board.table.rows[ship.y + i].cells[ship.x].innerHTML = c + 1
                    if (!this.board.table.rows[ship.y + i].cells[ship.x].className.includes('success'))
                    {
                        this.board.table.rows[ship.y + i].cells[ship.x].className = 'board-coord-data giveup'
                    }
                }
            }
        })
    }
}