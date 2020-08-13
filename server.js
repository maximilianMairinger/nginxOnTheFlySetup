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
const path = require("path")
const { promises: fs } = require("fs")
const detectPort = require("detect-port")
const sanitizeFilename = require("sanitize-filename")

// config
const appDest = "/var/www/html"
const nginxDest = "/etc/nginx"
const githubUsername = "maximilianMairinger"
const startPort = 5000



app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


const wss = new WebSocket.Server({ port: port+1 });
let wsLs = []
wss.on('connection', (ws) => {
  wsLs.add(ws)
  ws.send({init: {id: wsLs.length}})
})

app.use(express.static('public'))



/*
{
  id: number,
  commit: {
    repo: string,
    hash: string
  },
  domain?: string
}
*/
app.post("/try", async ({body: q}, res) => {
  try {

    let old = q.commit.repo
    q.commit.repo = sanitizeFilename(old)
    if (old !== q.commit.repo) {
      res({err: "Go away! :c"})
      return
    }
    old = undefined

    let repoPath = path.join(appDest, q.commit.repo)
    try {
      await fs.access(repoPath)
    }
    catch(e) {
      res({err: `${q.commit.repo} is not an active repository.`})
      return
    }


    if (!q.domain) q.domain = q.commit.hash + "." + q.commit.repo


    if (!q.domain.endsWidth(".maximilian.mairinger.com")) q.domain = q.domain + ".maximilian.mairinger.com"
    q.domain = slugify(q.domain.toLowerCase())


    
    let ws = wsLs[q.id]




    let createAppConf
    let createNginxConf
    try {
      createAppConf = require("./../nginxCdSetup/app/createAppConf.js")
      createNginxConf = require("./../nginxCdSetup/app/createNginxConf.js")
    }
    catch(e) {
      console.log("Unable to find peer dependency at './../nginxCdSetup/app/createAppConf.js'. Make sure https://github.com/maximilianMairinger/nginxCdSetup is installed in the neighboring folder.")
      res({err: "Unable to find peer dependencies. Check logs for additional infos."})
      return
    }


    

    
    let conf = {appDest, nginxDest, domain: q.domain, name: q.commit.repo, hash: q.commit.hash, port: await detectPort(startPort), githubUsername}

    function updateClient(msg) {
      ws.send({log: msg})
    }

    try {
      await createAppConf(conf, updateClient)
      await createNginxConf(conf, updateClient)
      res({log: "Done"})
      console.log("Done")
    } catch (e) {
      res({err: e.message})
      console.log("Error: " + e.message)
      console.log("Cmd: " + e.cmd)
      console.log("Stderr: " + e.stderr)
    }

    
    
    




  }
  catch(e) {
    console.log("Unexpected error in /try call: ", e)
  }

  
})







app.listen(port, () => {console.log("Started on port", port)})
