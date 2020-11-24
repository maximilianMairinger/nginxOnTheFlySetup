const fs = require("fs")
const path = require("path")


const rateLimitPwPath = path.join(__dirname, "rateLimitPw")

module.exports = {
  apps: [{
    script: "server.js",
    name: "nginxOnTheFlySetup",
    exec_mode : "cluster",
    max_restarts: 50,
    instances: 2,
    wait_ready: true,
    env: {
      port: 4400,
      rateLimitPw: fs.existsSync(rateLimitPwPath) ? fs.readFileSync(rateLimitPwPath) : undefined
    }
  }]
}