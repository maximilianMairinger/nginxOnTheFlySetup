const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const WebSocket = require('ws');
const args = require("yargs").argv
const port = args.port !== undefined ? args.port : 4400
const shell = require("shelljs")
require("xrray")()
require("xtring")()
const slugify = require("slugify")

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


const wss = new WebSocket.Server({ port: port+1 });
let wsLs = []
wss.on('connection', (ws) => {
  wsLs.add(ws)
  ws.send({init: {id: wsLs.length}})
})

app.use(express.static('public'))


app.post("/try", ({body: q}, res) => {
  let r = shell.cd("/mnt/c/Users/Maximilian Mairinger/Desktop/test/")
  if (r.code !== 0) {
    res({err: "UnexpectedError"})
  }
  else {
    if (q.commit.repo !== undefined) {
      r = shell.exec(`git clone https://github.com/maximilianMairinger/${q.commit.repo}`, {silent: true})
      if (r.code !== 0) {
        res({err: "RepoNotFound"})
      }
      else if (q.commit.hash !== undefined) {
        r = shell.cd(q.commit.repo)
        if (r.code !== 0) {
          res({err: "UnexpectedError"})
        }
        else {
          r = shell.exec(`git checkout ${q.commit.hash}`, {silent: true})
          if (r.code !== 0) {
            res({err: "HashNotFound"})
          }
          else {
            r = shell.exec(`git reset --hard`, {silent: true})
            if (r.code !== 0) {
              res({err: "UnexpectedError"})
            }
            else {
              res({suc: true})
              startSetup(q)
            }
          }
        }
      }
      else {
        res({suc: true})
        startSetup(q)
      }
    }
    else {
      res()
    }
  }

  
})


function startSetup(q) {
  let ws = wsLs[q.id]
  if (q.name === undefined) q.name = q.commit.repo
  q.name = slugify(q.name.toLowerCase())
}




app.listen(port, () => {console.log("Started on port", port)})
