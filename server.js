const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const expressWs = require('express-ws');
const args = require("yargs").argv
const port = args.port !== undefined ? args.port : 4400
const shelljs = require("shelljs")
const slugify = require("slugify")
const path = require("path")
const { promises: fs } = require("fs")
const detectPort = require("detect-port")
const delay = require("delay")
const del = require("del")

// config
const appDest = "/var/www/html"
const nginxDest = "/etc/nginx"
const githubUsername = "maximilianMairinger"
const startPort = 5000;



const $ = (() => {
  function shell(cmd, errorMsg = "An unknown error occurred") {
    let q = shelljs.exec(cmd)
    if (q.code !== 0) throw new ShellError(errorMsg, q.stderr, cmd)
    return q.stdout
  }
  shell.ShellError = class ShellError extends Error {
    constructor(msg, stderr, cmd) {
      super(msg)
      this.stderr = stderr
      this.cmd = cmd
    }
  }

  return shell
})()


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


  ws.on("message", async (msg) => {
    msg = JSON.parse(msg)
    if (msg.try) {
      let q = msg.try


      try {
        log("Setting up environment...")
        
        let projectsOri = await fs.readdir(appDest)
        let projectsLowerCase = []
        projectsOri.forEach((e) => {
          projectsLowerCase.push(e.toLowerCase())
        })
        let repoLower = q.commit.repo.toLowerCase()
        let projectNameFindIndex = projectsLowerCase.indexOf(repoLower)
        if (projectNameFindIndex === -1) {
          err(`NOT_ACTIVE`)
          return
        }
                
        let oriProjectName = projectsOri[projectNameFindIndex]

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


        let hashesOri = await fs.readdir(path.join(appDest, oriProjectName))
        if (hashesOri.includes(q.commit.hash)) {
          if (!q.domain) {
            err(`Go away! :C`)
            return
          }
          else {
            // make alias
            let config 
            try {
              config = (await fs.readFile(path.join(nginxDest, "sites-available", `${q.commit.hash}.${q.commit.repo}.maximilian.mairinger.com`).toLowerCase())).toString()
            }
            catch(e) {
              err(`Unexpected error unable to find config file`)
              console.log(`Unable to find`, path.join(nginxDest, "sites-available", `${q.commit.hash}.${q.commit.repo}.maximilian.mairinger.com`).toLowerCase())
              return
            }
            
            config = config.trimLeft().toLowerCase()
            const begin = "upstream nodejs_upstream_"
            if (!config.startsWith(begin)) {
              err(`Unable to parse config, alias creation failed`)
              console.log(`Unable to parse config, alias creation failed. Wrong beginning`)
            }
            else {
              let port = parseInt(config.substr(begin.length, 6))
              if (isNaN(port)) {
                err(`Unable to parse config, alias creation failed`)
                console.log(`Unable to parse config, alias creation failed. Unable to parse port`)
              }
              else {
                let conf = {appDest, nginxDest, domain: q.domain, name: oriProjectName, hash: q.commit.hash, port, githubUsername}
                try {
                  await createNginxConf(conf, log)
                }
                catch(e) {
                  err(e.message)
                  console.log("Error: " + e.message)
                  console.log("Cmd: " + e.cmd)
                  console.log("Stderr: " + e.stderr)
                  console.log("----")
                }
                

              }
            }
            

            return
          }
        }

        
        await fs.mkdir(path.join(appDest, oriProjectName, q.commit.hash))
    
    
        if (!q.domain) q.domain = q.commit.hash + "." + q.commit.repo
  
  
        if (!q.domain.endsWith(".maximilian.mairinger.com")) q.domain = q.domain + ".maximilian.mairinger.com"
        q.domain = slugify(q.domain.toLowerCase())

    
        
        let conf = {appDest, nginxDest, domain: q.domain, name: oriProjectName, hash: q.commit.hash, port: await detectPort(startPort), githubUsername}
      
          
      
        try {
          await createAppConf(conf, log)
          try {
            await createNginxConf(conf, log)
          }
          catch(e) {
            console.log("Failure after pm2 start! Cleanup: Killing processes.")
            $(`cd ${conf.dir} && pm2 del ecosystem.config.js`, `Filed to cleanup process`)
            throw e
          }
          log("Done")
          console.log("Done")
        } catch (e) {
          err(e.message)
          console.log("Error: " + e.message)
          console.log("Cmd: " + e.cmd)
          console.log("Stderr: " + e.stderr)
          console.log("-----")
          console.log("Late failure, removing potentially corrupted folder: ", path.join(appDest, oriProjectName, q.commit.hash))
          await del(path.join(appDest, oriProjectName, q.commit.hash), {force: true})
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
