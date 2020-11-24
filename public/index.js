const ws = new WebSocket("ws://" + location.host)


const gui = (() => {
  function stripHTML(html) {
    return sanitizeHtml(html, {allowedTags: []})
  }
  let titleElem = document.querySelector("title")
  function setTitle(html) {
    titleElem.innerText = stripHTML(html)
  }



  function saniHTML(html) {
    return sanitizeHtml(Autolinker.link(html), {
      allowedTags: [ 'b', 'i', 'em', 'strong', 'a', "span" ],
      allowedAttributes: {
        'a': [ 'href', "target", "title" ],
        'span': [ "title" ],
        "b": [ "title" ],
        "i": [ "title" ],
        "em": [ "title" ],
        "strong": [ "title" ],
      },
      disallowedTagsMode: "escape",
    })
  }
  
  function apd(q) {
    if (typeof q === "string") body.insertAdjacentHTML("beforeend", q)
    else if (q instanceof Element) body.append(q)
  }
  const body = document.querySelector("div.body")

  let onAnyLog

  function log(msg, type) {
    setTitle(msg)
    msg = saniHTML(msg)
    if (onAnyLog) onAnyLog(type)
    let div = document.createElement("div")
    div.classList.add("message")
    if (type) div.classList.add(type)
    let interval
    
    function messageAllocation(msg) {
      if (msg.endsWith("...")) {
        let currentDots = 1
        let msgWithoutDots = msg.substring(0, msg.length - 3)
        msg = msgWithoutDots + "."
        interval = setInterval(() => {
          currentDots++
  
          let dots = ""
          for (let i = 0; i < currentDots; i++) {
            dots += "."
          }
          msg = msgWithoutDots + dots
          div.innerHTML = msg
          setTitle(msg)
  
          if (currentDots >= 3) {
            currentDots = 0
          }
        }, 333.4)
  
        onAnyLog = (type) => {
          clearInterval(interval)
          if (type === "err") div.innerHTML = msgWithoutDots + "... Error!"
          else div.innerHTML = msgWithoutDots + "... Done!"
          onAnyLog = undefined
        }
  
      }
      else if (!(msg.endsWith(".") || msg.endsWith("!") || msg.endsWith("?"))) {
        msg = msg + "."
      }

      div.innerHTML = msg
    }
    messageAllocation(msg)

    
    apd(div)
    apd(`<br><br>`)

    return function update(msg) {
      setTitle(msg)
      msg = saniHTML(msg)
      if (interval) clearInterval(interval)
      messageAllocation(msg)
      return update
    }
  }

  let id = 0
  function inq(question, options = {}) {
    return new Promise((res) => {
      setTitle(question)
      if (onAnyLog) onAnyLog("inq")
      if (!(question.endsWith("?") || question.endsWith(":")) && !options.nonoPostFix) question = question + ":"
      apd(`<div class="message">${saniHTML(question)}</div><input id="inp${id}" type="${options.type}" autocomplete="off"><br><br>`)
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
      inputElem.addEventListener("input", () => {
        setTitle(question + " " + inputElem.value)
      })
      id++
    })


  }

  function err(msg) {    
    log(msg, "err")
  }

  function warn(msg) {    
    log(msg, "warn")
  }
  return { log, inq, ask: inq, err, warn }
})()


let subdomains = location.host.split(".").reverse()
let overshoot = subdomains.splice(0, 3).reverse();

gui.log(`View any version of any repository by going to <i><a href="[version].[repo].${overshoot.join(".")}">[version].[repo].${overshoot.join(".")}</a></i>`);


ws.addEventListener("message", async ({data: msg}) => {
  msg = JSON.parse(msg)
  if (msg.log) {
    if (msg.log.toLowerCase() === "done") {
      
      gui.log("Done")
      let timer = 10000
      setTimeout(() => {
        location.reload()
      }, timer)
      let updateReloading = gui.log("Reloading in " + timer + "ms")
      
      let lastTime = Date.now()
      let f = () => {
        requestAnimationFrame(f)

        let curTime = Date.now()
        let timeDelta = curTime - lastTime
        timer -= timeDelta

        updateReloading("Reloading in " + timer + "ms")

        lastTime = curTime
      }
      requestAnimationFrame(f)
      return
    }
    gui.log(msg.log)
    
  }
  else if (msg.err) {
    if (msg.err === "NOT_ACTIVE") {
      gui.err("Unable to find " + lastAskRepoName + " in active repository registry.")
      let o = await askName()
      sendTry(o)
    }
    else gui.err(msg.err)
  }
});

async function askName() {
  let repo, hash, domain
  gui.log(`You may link a repo under this alias <i>${location.host}</i>!`)
  let r = await gui.ask(`Repository`)
  if (r.includes("@")) {
    let split = r.split("@")
    repo = split[0]
    hash = split[1]
  }
  else {
    repo = r
    hash = await gui.ask(`Commit hash`)
  }
  domain = location.host

  return {commit: {repo, hash}, domain}
}


ws.addEventListener("open", async () => {
  let o
  if (subdomains.length < 2 || subdomains.length > 2) {
    o = await askName()
  }
  else {
    o = {
      commit: {
        repo: subdomains[0],
        hash: subdomains[1]
      }
    }
  }

  sendTry(o)
})

let lastAskRepoName
function sendTry(o) {
  console.log("sendTry", o)
  lastAskRepoName = o.commit.repo
  return ws.send(JSON.stringify({try: o}))
}


