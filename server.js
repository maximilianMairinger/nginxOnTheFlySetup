const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const expressWs = require('express-ws');
const args = require("yargs").argv
const port = process.env.port !== undefined ? process.env.port : 4400
const shelljs = require("shelljs")
const slugify = require("slugify")
const path = require("path")
const fsSync = require("fs")
const { promises: fs } = fsSync
const detectPort = require("detect-port")
const delay = require("delay")
const del = require("del")
const ms = require("milliseconds")
const salt = require("crypto-random-string")
const lt = require("long-timeout")
const prettyMs = require("pretty-ms")

// config
const appDest = "/var/www/html"
const nginxDest = "/etc/nginx"
const githubUsername = "maximilianMairinger"
const startPort = 5000;
console.log("Starting :D")

function isConfirmation(resp, _default = true) {
  return mentIt === "" ? _default : resp.toLowerCase().startsWith("y")
}

const notHarmfullRegex = /^([a-z]|[A-Z]|[0-9])*$/g
function isHarmfull(p) {
  return !p.match(notHarmfullRegex)
}




const $ = (() => {
  function shell(cmd, errorMsg = "An unknown error occurred") {
    let q = shelljs.exec(cmd, {silent: true})
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





let subsequentRequestCount = 0
let subsequentPasswordTestCount = 0
let pwTestDenied = false
let subsequentPasswordTestTimeouts = 0

const actualRateLimitPw = process.env.rateLimitPw ? process.env.rateLimitPw.toString() : salt({ length: 20 })

app.ws("/", (ws) => {
  function log(msg) {
    ws.send(JSON.stringify({log: msg}))
    console.log(msg)
  }
  function err(msg) {
    ws.send(JSON.stringify({err: msg}))
    console.error(msg)
  }


  ws.on("message", async (msg) => {
    if (!msg) return
    msg = JSON.parse(msg)
    if (typeof msg !== "object") return

    if (msg.req) {
      let id = msg.id

      function respond(resp) {
        ws.send(JSON.stringify({req: {id, resp}}))
      }

      let response = await (async () => {
        async function isAuthorized() {
          if (pwTestDenied) return false
          if (subsequentRequestCount > 30) {
            err("Sorry. Rate limited.")

            await delay(ms.seconds(.5))
            let pwTest = ""            
    
            while (actualRateLimitPw !== (pwTest + "")) {
              subsequentPasswordTestCount++

              await delay(ms.seconds(.5))
              try {
                pwTest = await ask("Password", {type: "password"})  
              }
              catch(e) {
                return false
              }
              
              console.log("Login denied. SubsequentPasswordTestCount now at: " + subsequentPasswordTestCount)
              err("Sorry again. Wrong password.")
              if (subsequentPasswordTestCount > 5) {
                subsequentPasswordTestTimeouts++
                pwTestDenied = true
                const timeoutMs = ms.seconds(10 * Math.pow(3, subsequentPasswordTestTimeouts))
                log("You are going too fast. Retry in " + prettyMs(timeoutMs))
                lt.setTimeout(() => {
                  pwTestDenied = false
                }, timeoutMs)
                return false
              }
            }

            
            subsequentRequestCount -= 11
            log("Oki, 10 more requests granted for this month.")
            console.log("Login granted")
          }
    
          subsequentRequestCount++
          
          console.log("subsequentRequestCount now at", subsequentRequestCount)
          lt.setTimeout(() => {
            subsequentRequestCount--
          }, ms.months(2))


          subsequentPasswordTestCount = 0
          subsequentPasswordTestTimeouts = 0
          return true
        }


        if (msg.req.try) {
          if (!await isAuthorized()) return
    
          let q = msg.req.try
    
    
          try {
            log("Setting up environment...")
            
            let projectsOri = await fs.readdir(appDest)
            let projectsLowerCase = []
            projectsOri.forEach((e) => {
              projectsLowerCase.push(e.toLowerCase())
            })

            console.log(q)




            let repo = ""
            
            if (q.commit.domain !== undefined) {
              let p = path.join(__dirname, "domainProjectIndex")
              let indexRaw = ""
              if (fsSync.existsSync(p)) {
                indexRaw = (await fs.readFile(p)).toString()
              }
              indexRaw = indexRaw.trim()
              let ar = indexRaw.split("\n")
              let index = {}
              ar.forEach((e) => {
                let q = e.split("|")
                index[q[0]] = q[1]
              })
              if (index[q.commit.domain] !== undefined) repo = index[q.commit.domain]
              else {
                repo = q.commit.domain
              }
              
            }
            else if (q.commit.repo !== undefined) {
              repo = q.commit.repo
              q.commit.domain = repo
            }
            else {
              return false
            }


            if (!q.domain) q.domain = q.commit.hash + "." + repo
            if (!q.domain.endsWith(".maximilian.mairinger.com")) q.domain = q.domain + ".maximilian.mairinger.com"

            q.domain = q.domain.split(".").map(s => slugify(s)).join(".").toLowerCase()
            // just in case slugify changes its behaviour
            q.domain = q.domain.split("|").join("or")


            

            if (q.domain.split(".").reduce((acc, cur) => isHarmfull(cur) || acc) || q.domain.split(".").length <= 10 || isHarmfull(q.commit.hash) || isHarmfull(q.commit.domain) || isHarmfull(repo)) {
              console.warn("Invalid parameters tried.", q)
              err(`Leave me alone. D: Your parameters are malformed`)
              return
            }

            let hash = q.commit.hash

            
            let repoLower = repo.toLowerCase()
            let projectNameFindIndex = projectsLowerCase.indexOf(repoLower)
            if (projectNameFindIndex === -1) {
              err("Unable to find project")
              try {
                while(projectNameFindIndex === -1) {
                  console.log("Unable to find repo \"" + repo + "\" in active repo repository. Asking for new name...")

                  repo = await ask("Please enter a valid project name")
                  if (!await isAuthorized()) return 
                  if (isHarmfull(repo)) {
                    console.warn("Invalid repo name tried. \"" + repo + "\"")
                    err(`Thats not a valid repo name`)
                    continue
                  }
                  repoLower = repo.toLowerCase()
                  projectNameFindIndex = projectsLowerCase.indexOf(repoLower)
                }
              }
              catch(e) {
                return 
              }
              
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
            
            
            let isAlreadyPresent = hashesOri.includes(hash)
            if (!isAlreadyPresent) {
              let myCommitLength = hash.length
              let hashesTrimmed = hashesOri.map((s) => s.substr(0, myCommitLength))
              let hashesOriLengths = [...new Set(hashesOri.map((e) => e.length < 7 ? 7 : e.length))]
              let hashAtDifferntLengths = hashesOriLengths.map((e) => hash.substr(0, e))

              let hashesTrimmedIncludes = hashesTrimmed.includes(hash)
              let hashAtLengthIncludes = !hashesOri.excludes(...hashAtDifferntLengths)

              if (hashesTrimmedIncludes || hashAtLengthIncludes) {
                log(`This could be a duplicate`)
                let mentHash
                if (hashesTrimmedIncludes) {
                  let mentIt = false
                  while (!mentIt) {
                    let index = hashesTrimmed.indexOf(hash)
                    if (index === -1) {
                      mentHash = undefined
                      break
                    }
                    mentHash = hashesOri[index]
                    log(`${mentHash}.${q.commit.domain}.maximilian.mairinger.com`)
                    try {
                      mentIt = isConfirmation(await ask("Did you mean this? (Y/n)"))
                      if (!mentIt) hashesOri = hashesOri.slice(index + 1)
                    }
                    catch(e) {
                      return
                    }
                  }
                  
                }
                else {
                  let maybeHash
                  for (let ori of hashesOri) {
                    if (hash.substr(0, ori.length < 7 ? 7 : ori.length) === ori) {
                      maybeHash = ori
                      log(`${ori}.${q.commit.domain}.maximilian.mairinger.com`)
                      try {
                        mentIt = isConfirmation(await ask("Did you mean this? (Y/n)"))
                      }
                      catch(e) {return}
                      if (mentIt) {
                        mentHash = maybeHash
                        break
                      }
                    }
                  }
                }


                if (mentHash === undefined) {
                  let wantToCreateAlias
                  try {
                    wantToCreateAlias = isConfirmation(await ask(`Do you want do create an alias for ${oriProjectName} here? (y/N)`), false)
                  }
                  catch(e) {return}
                  if (wantToCreateAlias) {
                    let confirmedHash
                    isAlreadyPresent = true
                    let hash

                    let whatHashAsk = true
                    while(whatHashAsk) {
                      try {
                        hash = await ask("For what hash?")
                      }
                      catch(e) {return}

                      if (isHarmfull(hash)) {
                        console.warn("Invalid hash name tried. \"" + hash + "\"")
                        err(`Thats not a valid hash`)
                        continue
                      }



                      let hashesOri = await fs.readdir(path.join(appDest, oriProjectName))

                      

                      if (hashesOri.includes(hash)) {
                        confirmedHash = hash
                      }
                      else {
                        let myCommitLength = hash.length
                        let hashesTrimmed = hashesOri.map((s) => s.substr(0, myCommitLength))
                        let hashesOriLengths = [...new Set(hashesOri.map((e) => e.length < 7 ? 7 : e.length))]
                        let hashAtDifferntLengths = hashesOriLengths.map((e) => hash.substr(0, e))
  
                        let hashesTrimmedIncludes = hashesTrimmed.includes(hash)
                        let hashAtLengthIncludes = !hashesOri.excludes(...hashAtDifferntLengths)
                        if (hashesTrimmedIncludes || hashAtLengthIncludes) {
                          log(`Again... This could be a duplicate`)
                          let mentThis
                          let mentHash
                          if (hashesTrimmedIncludes) {
                            let mentIt = false
                            while (!mentIt) {
                              let index = hashesTrimmed.indexOf(hash)
                              if (index === -1) {
                                mentThis = undefined
                                break
                              }
                              mentHash = hashesOri[index]
                              mentThis = `${hashesOri[index]}.${q.commit.domain}.maximilian.mairinger.com`
                              log(mentThis)
                              try {
                                mentIt = isConfirmation(await ask("Did you mean this? (Y/n)"))
                                if (!mentIt) hashesOri = hashesOri.slice(index + 1)
                              }
                              catch(e) {
                                return
                              }
                            }
                            if (mentThis !== undefined) {
                              confirmedHash = mentHash
                            }
                          }
                          else if (hashAtLengthIncludes) {
                            let found
                            for (let ori of hashesOri) {
                              if (hash.substr(0, ori.length < 7 ? 7 : ori.length) === ori) {
                                mentHash = ori
                                mentThis = `${ori}.${q.commit.domain}.maximilian.mairinger.com`
                                log(mentThis)
                                try {
                                  mentIt = isConfirmation(await ask("Did you mean this? (Y/n)"))
                                }
                                catch(e) {return}
                                if (mentIt) {
                                  found = mentHash
                                  break
                                }
                              }
                            }
                            if (found !== undefined) {
                              confirmedHash = found
                            }
                            
                            return
                          }
                        }
                      }

                      if (confirmedHash !== undefined) {
                        log(`Great an alias for will be created here!`)
                        q.commit.hash = confirmedHash
                        whatHashAsk = false
                        isAlreadyPresent = true
                      }
                      else log(`Ok then lets try another one`)
                    }
                  }
                  else {
                    log("Hmm... Then there is nothing more todo here")
                  }
                  
                }
                else {
                  log(`Ok. Lemmi create an alias real quick!`)
                  q.commit.hash = mentHash
                  isAlreadyPresent = true
                }
              }
            }
    
    
            if (isAlreadyPresent) {
              if (!q.domain) {
                err(`Go away! :C`)
                subsequentRequestCount = Infinity
              }
              else {
                // make alias
                let config 
                try {
                  config = (await fs.readFile(path.join(nginxDest, "sites-available", `${hash}.${repo}.maximilian.mairinger.com`).toLowerCase())).toString()
                }
                catch(e) {
                  err(`Unexpected error unable to find config file`)
                  console.log(`Unable to find`, path.join(nginxDest, "sites-available", `${hash}.${repo}.maximilian.mairinger.com`).toLowerCase())
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
                    let conf = {appDest, nginxDest, domain: q.domain, name: oriProjectName, hash, port, githubUsername, justAlias: true}
                    try {
                      await createNginxConf(conf, log, err)
                      console.log("Done with alias creation")
                      return true
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
              }
              return
            }
    
            
            await fs.mkdir(path.join(appDest, oriProjectName, q.commit.hash))

            let conf = {appDest, nginxDest, domain: q.domain, name: oriProjectName, hash: q.commit.hash, port: await detectPort(startPort), githubUsername}
          
              
          
            try {
              await createAppConf(conf, log, err)
              try {
                await createNginxConf(conf, log, err)
                console.log("Done with hash creation")
                return true
              }
              catch(e) {
                console.log("Failure after pm2 start! Cleanup: Killing processes.")
                $(`cd ${conf.dir} && pm2 del ecosystem.config.js`, `Failed to cleanup process`)
                throw e
              }
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
      })()
      if (response === undefined) response = {suc: false}
      else if (response === false) response = {suc: false}
      else if (response === true) response = {suc: true}
      else if (typeof response === "object" && response.suc === undefined) response.suc = false
      respond(response)
    }
    else if (msg.ask) {
      askIndex.get(msg.ask.id + "")(msg.ask.resp + "")
    }
  })

  let askLs = []
  let inAsk = false
  function ask(question, options) {
    return new Promise(async (res) => {
      if (!inAsk) {
        inAsk = true
        try {
          let resp = await sendQuestionToClient(question, options)
          res(resp)
        }
        catch(e) {
          err("Timeout. You need to answer within 10 minutes.")
        }
        
        inAsk = false
        
        if (askLs.length !== 0) {
          let next = askLs.pop()
          ask(...next.args).then(next.res)
        }
      }
      else askLs.push({args: [question, options], res})
    })
  }

  const askIndex = new Map
  const sendQuestionToClient = (() => {
    function getFreeId() {
      let idRequest = salt({length: 20})
      while(askIndex.has(idRequest)) {
        idRequest = salt({length: 20})
      }
      return idRequest
    }

    return function sendQuestionToClient (question, options) {
      return new Promise((res, rej) => {
        let id = getFreeId()
        askIndex.set(id, (resp) => {
          res(resp)
          askIndex.delete(id)
          lt.clearTimeout(timeout)
        })

        let timeout = lt.setTimeout(() => {
          askIndex.delete(id)
          rej()
        }, ms.minutes(10))
        
        
        ws.send(JSON.stringify({ask: {id, question, options}}))
      })
    }
  })()
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







app.listen(port, () => {console.log("Started on port", port)})
