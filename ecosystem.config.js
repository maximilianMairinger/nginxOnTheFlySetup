module.exports = {
  apps: [{
    script: "server.js",
    name: "nginxOnTheFlySetup",
    exec_mode : "cluster",
    instances: 2,
    wait_ready: true,
    env: {
      port: 4400
    }
  }]
}