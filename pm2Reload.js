const pm2 = require("pm2")
const fs = require("fs")
const { deepEqual: equals } = require("fast-equals")
const ecosystemConfig = require("./ecosystem.config.js")
const ecosystemCacheFileName = "./.ecosystemCache"


function then(cb_keyword = () => {}) {
  if (typeof cb_keyword === "string" | cb_keyword instanceof Array) {
    if (cb_keyword === "end") cb_keyword = ["dump", "disconnect"]

    return function(error, ...a) {
      if (error) {console.log("err", error); process.exit(2)}
      if (cb_keyword instanceof Array) {
        function rec() {
          if (cb_keyword[0]) pm2[cb_keyword[0]](then(() => {
            cb_keyword.splice(0, 1);
            rec()
          }))
        }
        rec()
      }
      else pm2[cb_keyword](then())
      
    }
  }

  else return function(error, ...a) {
    if (error) {console.log("err", error); process.exit(2)}
    cb_keyword(...a)
  }
}



let lastEcosystemConfigString = fs.existsSync(ecosystemCacheFileName) ? fs.readFileSync(ecosystemCacheFileName).toString() : "{}"
let lastEcosystemConfig = JSON.parse(lastEcosystemConfigString)

/*{
  script: "replServer/dist/server.js",
  name: "$[ branch / hash ].$[ name ]",
  exec_mode : "cluster",
  instances: 2,
  wait_ready: true,
  args: "--port $[ port ]"
}*/

pm2.connect(then(() => {
  pm2.list(then((list) => {
    let nameList = []
    list.forEach((e) => {
      nameList.push(e.name)
    })

    if (equals(ecosystemConfig, lastEcosystemConfig)) {
      if (nameList.includes(ecosystemConfig.name)) pm2.reload(ecosystemConfig.name, then("end"))
      else pm2.start(ecosystemConfig, then("end"))
    }
    else {
      if (nameList.includes(lastEcosystemConfig.name)) {
        pm2.delete(lastEcosystemConfig.name, then(() => {
          pm2.start(ecosystemConfig, then("end"))
        }))
      }
      else {
        pm2.start(ecosystemConfig, then("end"))
      }
    }

    fs.writeFileSync(ecosystemCacheFileName, JSON.stringify(ecosystemConfig))
  }))
}))
