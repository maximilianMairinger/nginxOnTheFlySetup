const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const args = require("yargs").argv
const port = args.port !== undefined ? args.port : console.log("Serving on port 443\n") || 443

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());




app.get("/", (req, res) => {
  res.send(req.subdomains)
})





app.listen(port, () => {console.log("Started on port", port)})
