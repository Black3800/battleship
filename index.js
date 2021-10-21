const express = require('express')
const app = express()
const path = require('path')
const port = 3231
// const router = express.Router()

// router.get('/', (request, response) => {
//     response.sendFile(path.join(__dirname, 'public/battleship.html'))
// })

// app.use(router)
app.get('/', (request, response) => {
    response.sendFile(path.join(__dirname, 'public/battleship.html'))
})
app.use(express.static('public'))
app.listen(port, () => {
    console.log(`Battleship running on ${port}`)
})