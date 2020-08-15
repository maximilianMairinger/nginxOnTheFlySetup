const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const expressWs = require('express-ws');
const args = require("yargs").argv
const port = args.port !== undefined ? args.port : 4400
const shell = require("shelljs")
const slugify = require("slugify")
const path = require("path")
const { promises: fs } = require("fs")
const detectPort = require("detect-port")
const sanitizeFilename = require("sanitize-filename")
const delay = require("delay")

// config
const appDest = "/var/www/html"
const nginxDest = "/etc/nginx"
const githubUsername = "maximilianMairinger"
const startPort = 5000

let wsApp = expressWs(app)

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.ws("/", (ws) => {
  function log(msg) {
    ws.send(JSON.stringify({log: msg}))
  }
  function err(msg) {
    ws.send(JSON.stringify({err: msg}))
  }


  ws.on("message", async (mes) => {
    msg = JSON.parse(msg)
    if (mes.try) {
      let q = mes.try


      try {
    
        await delay(1000)
        log("Working...")
        await delay(1000)
        log("YAS")
    
        throw new Error("testing")
        let old = q.commit.repo
        q.commit.repo = sanitizeFilename(old)
        if (old !== q.commit.repo) {
          err("Go away! :c")
          return
        }
        old = undefined
    
        let repoPath = path.join(appDest, q.commit.repo)
        try {
          await fs.access(repoPath)
        }
        catch(e) {
          err(`${q.commit.repo} is not an active repository.`)
          return
        }
    
        let hashPath = path.join(repoPath, q.commit.hash)
        try {
          await fs.access(hashPath)
        }
        catch(e) {
          err(`Go away! :c`)
          return
        }
        await fs.mkdir(hashPath)
    
    
        if (!q.domain) q.domain = q.commit.hash + "." + q.commit.repo
    
    
        if (!q.domain.endsWidth(".maximilian.mairinger.com")) q.domain = q.domain + ".maximilian.mairinger.com"
        q.domain = slugify(q.domain.toLowerCase())
    
    
        
        // let ws = wsLs[q.id]
    
    
    
    
        let createAppConf
        let createNginxConf
        try {
          let o = require("./../nginxCdSetup/dist/nginxCdSetup.js")
          createAppConf = o.createAppConf
          createNginxConf = o.createNginxConf
        }
        catch(e) {
          console.log("Unable to find peer dependency at './../nginxCdSetup/app/createAppConf.js'. Make sure https://github.com/maximilianMairinger/nginxCdSetup is installed in the neighboring folder.")
          err("Unable to find peer dependencies. Check logs for additional infos.")
          return
        }
    
    
        
    
        
        let conf = {appDest, nginxDest, domain: q.domain, name: q.commit.repo, hash: q.commit.hash, port: await detectPort(startPort), githubUsername}
    
        
    
        try {
          await createAppConf(conf, log)
          await createNginxConf(conf, log)
          log("Done")
          console.log("Done")
        } catch (e) {
          err(e.message)
          console.log("Error: " + e.message)
          console.log("Cmd: " + e.cmd)
          console.log("Stderr: " + e.stderr)
        }
    
        
        
        
    
    
    
    
      }
      catch(e) {
        console.log("Unexpected error in try: ", e)
        err("Internal error")
      }
    }
  })
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
  

  
})







app.listen(port, () => {console.log("Started on port", port)})
