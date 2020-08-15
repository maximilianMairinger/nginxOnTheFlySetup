const ws = new WebSocket("ws://" + location.host)




const gui = (() => {
  function saniHTML(html) {
    return sanitizeHtml(Autolinker.link(html), {
      allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
      allowedAttributes: {
        'a': [ 'href', "target" ]
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
    msg = saniHTML(msg)
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
        div.innerHTML = msg

        if (currentDots >= 3) {
          currentDots = 0
        }
      }, 333.4)

      onAnyLog = () => {
        clearInterval(interval)
        div.innerHTML = msgWithoutDots + "... Done!"
        onAnyLog = undefined
      }

    }
    else if (!(msg.endsWith(".") || msg.endsWith("!") || msg.endsWith("?"))) {
      msg = msg + "."
    }
    div.innerHTML = msg
    apd(div)
    apd(`<br><br>`)
  }

  let id = 0
  function inq(question, options = {}) {
    return new Promise((res) => {
      if (onAnyLog) onAnyLog()
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
let overshoot = subdomains.splice(0, 3);

gui.log(`View any version of any repository by going to <i>[version].[repo].${overshoot.reverse().join(".")}</i>`);


ws.addEventListener("message", async (msg) => {
  msg = JSON.parse(msg)
  if (msg.log) gui.log(msg)
  else if (msg.err) gui.err(msg)
});



ws.addEventListener("open", async () => {
  let hash
  let repo
  let domain
  if (subdomains.length < 2 || subdomains.length > 2) {
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
  }
  else {
    repo = subdomains[0]
    hash = subdomains[1]
  }

  ws.send(JSON.stringify({try: {
    commit: {
      repo,
      hash
    },
    domain
  }}))

})
