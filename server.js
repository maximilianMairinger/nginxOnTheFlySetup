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
const cliCmdParser = require("cli-cmd-ast")
const { constrImageWeb } = require("image-web")
const { josmFsAdapter } = require("josm-fs-adapter")
const Fuse = require("fuse.js")
const argon2 = require("argon2")
const sani = require("sanitize-against").default


const saniMsg = sani({req: {
  "try?": {
    deviceToken: ""
  }
}, id: Number})

// config
const appDest = "/var/www/html"
const nginxDest = "/etc/nginx"
const githubUsername = "maximilianMairinger"
const startPort = 5000;
console.log("Starting :DD")

function isConfirmation(resp, _default = true) {
  return resp === "" ? _default : resp.toLowerCase().startsWith("y")
}

const notHarmfullRegex = /^([a-z]|[A-Z]|[0-9])*$/g
function isHarmfull(p) {
  return !p.match(notHarmfullRegex)
}









async function getAvailableRepos() {
  let repos = await fs.readdir(appDest)
  return repos
}



async function getAlreadyUsedUrls() {
  // parse the nginx config files and get all urls
  let nginxConfigs = await fs.readdir(path.join(nginxDest, "sites-available"))

  let allUrls = []
  let proms = []
  for (const nginxConfig of nginxConfigs) {
    proms.push(fs.readFile(path.join(nginxDest, "sites-available", nginxConfig), "utf8").then((config) => {
      let urlDeclarations = config.match(/(?<=server_name )( *([a-z]|[A-Z]|[0-9]|\.|\-)*)*(?=;)/g)
      if (urlDeclarations) {
        let urls = []
        for (let urlsString of urlDeclarations) {
          urlsString = urlsString.trim()
          urls.push(...urlsString.split(/ +/g))
        }
        allUrls.push(...urls)
      }
    }))
  }
  await Promise.all(proms)
  return allUrls
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




const initPw = salt({ length: 30 })
console.log("Init password:", initPw)

const authDBProm = josmFsAdapter("auth.json", () => {
  return {
    authorizedDevices: {},
    pw: ""
  }
})

app.ws("/", (ws) => {

  async function wsSend(msg) {
    try {
      await ws.send(JSON.stringify(msg))
    }
    catch(e) {
      console.error("Failed to send. ReadyState:", ws.readyState)
    }
  }
  function log(msg) {
    wsSend({log: msg})
    console.log(msg)
  }
  function err(msg) {
    wsSend({err: msg})
    console.error(msg)
  }


  ws.on("message", async (msg) => {
    if (!msg) return
    msg = JSON.parse(msg)
    

    if (msg.req) {
      try {
        msg = saniMsg(msg)
      }
      catch(e) {
        console.error("Invalid message:", msg)
        return
      }
      
      let id = msg.id

      

      async function respond(resp) {
        wsSend({req: {id, resp}})
      }

      let response = await (async () => {

        const authDB = await authDBProm



        async function isAuthorized(deviceToken) {

          function sendNewDeviceToken() {
            const newDeviceToken = salt({ length: 30 })
            authDB.authorizedDevices({[newDeviceToken]: true})
            wsSend({newDeviceToken})
          }

          if (authDB.authorizedDevices[deviceToken]) {
            return true
          }
          else {
            if (deviceToken !== undefined) {
              err("Unauthorized device token!")
              return false
            }
            else {
              if (authDB.pw.get() === "") {
                for (let i = 0; i < 5; i++) {
                  const tryPw = await ask("Initial Password", {type: "password"})
                  if (tryPw === initPw) {
                    authDB.pw.set(await argon2.hash(await ask("New password", {type: "password"})))
                    log("Password set!")
                    const trust = isConfirmation(await ask("Trust this device? (Y/n)"))
                    if (trust) sendNewDeviceToken()

                    return true
                  }
                  else {
                    err("Wrong password!", i)
                  }
                }
                return false
              }
              else {
                for (let i = 0; i < 5; i++) {
                  const pw = await ask("Password", {type: "password"})
                  if (await argon2.verify(authDB.pw.get(), pw)) {
                    const trust = isConfirmation(await ask("Trust this device? (Y/n)"))
                    if (trust) sendNewDeviceToken()
                    return true
                  }
                  else {
                    err("Wrong password!", i)
                  }
                }
                return false
              }
            }
          }
        }




        if (msg.req.try) {
          let tryReq = msg.req.try
 
          

          if (!await isAuthorized(tryReq.deviceToken)) return
    
          let q = {commit: {}}


            
    
          try {
            log("Setting up environment...")




            const availableRepos = await getAvailableRepos() // as string[]


            const alreadyUsedUrls = (availableRepos).map((s) => s.toLowerCase())

            let repo 
            let hash
            let domain

            
            let wantsHTTPS
            try {
              
              const repo = await ask("Github repo", availableRepos)
              hash = await ask("Commit hash/branch name")  
              
              let isAlreadyUsed = true
              let tryDomain
              while(isAlreadyUsed) {
                tryDomain = await ask("Domain", {defaultVal: `${hash.toLowerCase()}.${repo.toLowerCase()}.maximilian.mairinger.com`})
                isAlreadyUsed = alreadyUsedUrls.includes(tryDomain.toLowerCase())
                if (isAlreadyPresent) {
                  err("Domain already in use")
                }
              }
              domain = tryDomain

              wantsHTTPS = isConfirmation(await ask("Is https needed? (Y/n)"), true)
            }
            catch(e) {
              console.error("error while asking questions", e)
              return false
            }


            q.commit.domain = repo
            q.commit.hash = hash
            q.domain = domain


            if (!q.domain.endsWith(".maximilian.mairinger.com")) q.domain = q.domain + ".maximilian.mairinger.com"

            q.domain = q.domain.split(".").map(s => slugify(s)).join(".").toLowerCase()


            let isAnySubdomainHarmfull = false
            for (let sub of q.domain.split(".")) {
              if (isHarmfull(sub)) {
                isAnySubdomainHarmfull = true
                break
              }
            }

            if (isAnySubdomainHarmfull || q.domain.split(".").length >= 8 || isHarmfull(q.commit.hash) || isHarmfull(q.commit.domain) || isHarmfull(repo)) {
              console.warn("Invalid parameters tried.", q)
              err(`Leave me alone. D: Your parameters are malformed`)
              return
            }



            

                    
            let oriProjectName = q.commit.domain
    
            let createAppConf
            let createNginxConf
            try {
              let o = require("./../nginxCdSetup/dist/nginxCdSetup.js")
              createAppConf = o.createAppConf
              createNginxConf = o.createNginxConf
            }
            catch(e) {
              console.error("Unable to find peer dependency at './../nginxCdSetup/app/createAppConf.js'. Make sure https://github.com/maximilianMairinger/nginxCdSetup is installed in the neighboring folder.")
              err("Unable to find peer dependencies. Check logs for additional infos.")
              return
            }
    
    
            let hashesOri = await fs.readdir(path.join(appDest, oriProjectName))
            
            
            let isAlreadyPresent = hashesOri.includes(hash)
            if (!isAlreadyPresent) {
              let myCommitLength = hash.length
              let hashesTrimmed = hashesOri.map((s) => s.substring(0, myCommitLength-1))
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
                      if (!mentIt) hashesOri.splice(index, 1)
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
                console.log("ment hash", mentHash)


                if (mentHash === undefined) {
                  let wantToCreateAlias
                  try {
                    wantToCreateAlias = isConfirmation(await ask(`Do you want do create an alias for ${oriProjectName} here? (y/N)`), false)
                  }
                  catch(e) {return}
                  if (wantToCreateAlias) {
                    let confirmedHash
                    isAlreadyPresent = true
                    let newHash

                    let whatHashAsk = true
                    while(whatHashAsk) {
                      try {
                        newHash = await ask("For what hash?")
                      }
                      catch(e) {return}

                      if (isHarmfull(newHash)) {
                        console.warn("Invalid hash name tried. \"" + newHash + "\"")
                        err(`Thats not a valid hash`)
                        continue
                      }



                      let hashesOri = await fs.readdir(path.join(appDest, oriProjectName))

                      

                      if (hashesOri.includes(newHash)) {
                        confirmedHash = newHash
                      }
                      else {
                        let myCommitLength = newHash.length
                        let hashesTrimmed = hashesOri.map((s) => s.substr(0, myCommitLength))
                        let hashesOriLengths = [...new Set(hashesOri.map((e) => e.length < 7 ? 7 : e.length))]
                        let hashAtDifferntLengths = hashesOriLengths.map((e) => newHash.substr(0, e))
  
                        let hashesTrimmedIncludes = hashesTrimmed.includes(newHash)
                        let hashAtLengthIncludes = !hashesOri.excludes(...hashAtDifferntLengths)
                        if (hashesTrimmedIncludes || hashAtLengthIncludes) {
                          log(`Again... This could be a duplicate`)
                          let mentThis
                          let mentHash
                          if (hashesTrimmedIncludes) {
                            let mentIt = false
                            while (!mentIt) {
                              let index = hashesTrimmed.indexOf(newHash)
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
                              if (newHash.substr(0, ori.length < 7 ? 7 : ori.length) === ori) {
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
                        hash = q.commit.hash = confirmedHash
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
                  hash = q.commit.hash = mentHash
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
                console.log("make alias")
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
                    let conf = {dontSsl: !wantsHTTPS, appDest, nginxDest, domain: q.domain, name: oriProjectName, hash, port, githubUsername, justAlias: true}
                    try {
                      await createNginxConf(conf, log, err)
                      console.log("Done with alias creation")
                      return conf.domain
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

            let conf = {dontSsl: !wantsHTTPS, appDest, nginxDest, domain: q.domain, name: oriProjectName, hash: q.commit.hash, port: await detectPort(startPort), githubUsername}
          
              
          
            try {
              await createAppConf(conf, log, err)

              log(`Compressing preview images...`)
              try {
                const myAppPath = path.resolve(path.join(conf.appDest, conf.name, conf.hash))
                let pack
                try {
                  pack = JSON.parse(await fs.readFile(path.join(myAppPath, "package.json"), "utf8"))
                }
                catch(e) {
                  console.error(`No package.json found. myAppPath: ${myAppPath}`)
                }


                
                if (pack.scripts !== undefined) {
                  if (pack.scripts.compressImages !== undefined) {
                    const cmd = pack.scripts.compressImages
                    const ast = cliCmdParser.toAst(cmd)
                    const alg = ast.args.algorithms.includes("webp") ? ["webp"] : (ast.args.algorithms.includes("jpg") ? ["jpg"] : undefined)
                    if (alg === undefined) throw new Error("No webp or jpg algorithm defined")

                    const resArg = ast.args.resolutions.split(/,| /).map(e => e.toUpperCase().trim()).filter(e => e.length > 0)
                    const prevRes = resArg.includes("PREV") ? "PREV" : resArg.includes("TINY") ? "TINY" : resArg.includes("LD") ? "LD" : resArg.includes("SD") ? "SD" : "PREV"
                    const bigRes = resArg.includes("FHD") ? "FHD" : resArg.includes("HD") ? "HD" : resArg.includes("QHD") ? "QHD" : resArg.includes("UHD") ? "UHD" : "FHD"

                    const res = [prevRes]

                    const src = ast.cmds[1]
                    if (!src) throw new Error("No src defined")
                    const dest = ast.cmds[2]
                    if (!dest) throw new Error("No dest defined")
                    
                    try {
                      await constrImageWeb(alg, res)(path.join(myAppPath, src), path.join(myAppPath, dest), { silent: false }).then(() => {
                        log(`Successfully compressed preview images, compressing fully sized images in the background. This may take some time to complete, but you can use the app already.`)
                        constrImageWeb(alg, [bigRes])(path.join(myAppPath, src), path.join(myAppPath, dest), { silent: false })
                      })
                    }
                    catch(e) {
                      throw new Error(`Failed during compression. Setup was ok. Args: alg: ${alg}, res: ${res}, src: ${src}, dest: ${dest}. Error: ${e.message}`)
                    }
                  }
                  else throw new Error("No compressImages script defined")
                }
                else throw new Error("No scripts defined")
              }
              catch(e) {
                err(`Failed to build preview images. Continuing anyway.`)
                console.error(e)
              }
              




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
      else if (typeof response === "string") response = {suc: response}
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
          if (options instanceof Array) if (!options.includes(resp)) {
            err("Invalid response: ", resp, "Expected one of: ", options)
            // rej("Invalid response")
          }
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
      else askLs.push({args: [question, options, defaultVal], res})
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
        
        wsSend({ask: {id, question, options}})
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



