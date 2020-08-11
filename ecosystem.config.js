module.exports = {
  apps: [{
    script: "index.js",
    name: "nginxOnTheFlySetup",
    exec_mode : "cluster",
    instances: 2,
    wait_ready: true,
    args: "--port 4400"
  }]
}