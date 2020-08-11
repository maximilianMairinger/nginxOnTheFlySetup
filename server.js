const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const WebSocket = require('ws');
const args = require("yargs").argv
const port = args.port !== undefined ? args.port : console.log("Serving on port 443\n") || 443

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


const wss = new WebSocket.Server({ port });
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log("qwe", message)
  })

  
 
  ws.send('something');
})

app.use(express.static('public'))





app.listen(port, () => {console.log("Started on port", port)})
