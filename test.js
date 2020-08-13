const shell = require("shelljs");
let repoName = "labAuth"
let commit = "e191245aafb9fb8b2986cbc8b9c4dbc30b099094";

(async () => {
  shell.cd("/mnt/c/Users/Maximilian Mairinger/Desktop/test/")

  if (repoName !== undefined) {
    let r = shell.exec(`git clone https://github.com/maximilianMairinger/${repoName}`, {silent: true})
    if (r.code !== 0) {
      console.log("Repo not found")
    }
    else if (commit !== undefined) {
      shell.cd(repoName)
      r = shell.exec(`git checkout ${commit}`, {silent: true})
      if (r.code !== 0) {
        console.log("Commit not found")
      }
      else {
        r = shell.exec(`git reset --hard`, {silent: true})
        if (r.code !== 0) {
          console.log("Unexpected Error")
        }
        else {
          console.log("suc: Repo & commit")
        }
      }
  
    }
    else {
      console.log("suc: Repo")
    }
  }
  else {
    console.log("Nothing todo")
  }
  
  

  console.log("done")
})()