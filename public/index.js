const ws = new WebSocket("ws://" + location.host + "/ws/")


const gui = (() => {
  function apd(q) {
    if (typeof q === "string") body.insertAdjacentHTML("beforeend", q)
    else if (q instanceof Element) body.append(q)
  }
  const body = document.querySelector("div.body")

  let onAnyLog

  function log(msg, type) {
    if (onAnyLog) onAnyLog()
    let div = document.createElement("div")
    div.classList.add("message")
    if (type) div.classList.add(type)
    
    if (msg.endsWith("...")) {
      let currentDots = 1
      let msgWithoutDots = msg.substring(0, msg.length - 3)
      msg = msgWithoutDots + "."
      let interval = setInterval(() => {
        currentDots++

        let dots = ""
        for (let i = 0; i < currentDots; i++) {
          dots += "."
        }
        msg = msgWithoutDots + dots
        div.innerText = msg

        if (currentDots >= 3) {
          currentDots = 0
        }
      }, 333.4)

      onAnyLog = () => {
        clearInterval(interval)
        div.innerText = msgWithoutDots + "... Done!"
        onAnyLog = undefined
      }

    }
    else if (!msg.endsWith(".")) {
      msg = msg + "."
    }
    div.innerText = msg
    apd(div)
    apd(`<br><br>`)
  }

  let id = 0
  function inq(question, options = {}) {
    return new Promise((res) => {
      if (onAnyLog) onAnyLog()
      if (!(question.endsWith("?") || question.endsWith(":")) && !options.nonoPostFix) question = question + ":"
      apd(`<div class="message"></div><input id="inp${id}" type="${options.type}" autocomplete="off"><br><br>`)
      let inputElem = document.getElementById("inp" + id)
      inputElem.focus()
      inputElem.addEventListener("keydown", ({key}) => {
        if (key === "Enter") {
          if (currentlyFine) {
            submit()
          }
        }
      })

      function submit(val = inputElem.value) {
        inputElem.setAttribute("disabled", true)
        if (!currentlyFine) val = lastFineText
        res(val)
      }

      onAnyLog = submit
      let textElem = inputElem.previousSibling
      textElem.innerText = question
      let currentlyFine = true
      if (options.replace) {
        inputElem.addEventListener("input", () => {
          inputElem.value = options.replace(inputElem.value)
        })
      }
      let lastFineText = null
      if (options.check !== undefined) {
        currentlyFine = options.check(inputElem.value)
        if (!currentlyFine) inputElem.style.color = "red"
        else {
          lastFineText = inputElem.value
          inputElem.style.color = ""
        }
        inputElem.addEventListener("input", () => {
          currentlyFine = options.check(inputElem.value)
          if (!currentlyFine) inputElem.style.color = "red"
          else {
            lastFineText = inputElem.value
            inputElem.style.color = ""
          }
        })  
      }
      id++
    })
    
  }

  return { log, inq, ask: inq }
})()


let id
ws.addEventListener("message", (msg) => {
  if (msg.init !== undefined) id = msg.init.id
  
})



let subdomains = location.host.split(".").reverse()
let overshoot = subdomains.splice(0, 3);

gui.log(`View any version of any repository by going to <version>.<repo>.${overshoot.reverse().join(".")}`);

(async () => {
  if (subdomains.length < 2) name()
  else if (subdomains.length > 2) name()
  else {

    let repo = subdomains[0]
    let hash = subdomains[1]

    gui.log(`Cloning ${repo}@${hash}...`)


    let res = await (await fetch("/try", {
      headers: new Headers({'Content-Type': 'application/json'}),
      method: "post",
      body: JSON.stringify({
        id,
        commit: {
          repo,
          hash
        }
      })
    })).json()
    

    if (res.err) {
      if (res.err === "RepoNotFound") gui.log(`Repository ${repo} not found.`, "err")
      else if (res.err === "UnexpectedError") gui.log(`An unexpected error occurred.`, "err")
      else if (res.err === "HashNotFound") gui.log(`Commit hash ${hash} not found for repository ${repo}.`, "err")

      
    }
    else {

    }

  }
})()

async function name() {
  console.log("qwe")
  gui.log(`You can link a repo at a specific commit hash under ${location.host}!`)
  let res = await gui.ask(`Repository`)
  let repo
  let hash
  if (res.includes("@")) {
    let split = res.split("@")
    repo = split[0]
    hash = split[1]
  }
  else {
    repo = split
  }
}


setTimeout(() => {
  gui.log("Cloning repo...")

  setTimeout(() => {
    gui.log("Npm install")
  }, 2000)
}, 1000)
