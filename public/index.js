if (location.host !== slugify(location.host)) {
  location.href = slugify(location.host)
  throw new Error("RELAODASD")
}


const ws = new WebSocket(normalizeWsUrlProtocol());




function normalizeWsUrlProtocol(url = "") {
  
  if (url.startsWith("ws://")) return url
  else if (url.startsWith("wss://")) return url
  else if (url.startsWith("http://")) return "ws://" + url.slice(7)
  else if (url.startsWith("https://")) return "wss://" + url.slice(8)
  else {
    if (!url.startsWith("/")) url = "/" + url
    try {
      return normalizeWsUrlProtocol(`${location.origin}${url}`)
    }
    catch(e) {
      throw new Error("Please provide a valid fully qualified url (starting with wss://). Got: " + url)
    }
    
  }
}




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
    const logLine = document.createElement("log-line")
    let div = document.createElement("div")
    logLine.append(div)
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

    
    apd(logLine)

    return function update(msg) {
      setTitle(msg)
      msg = saniHTML(msg)
      if (interval) clearInterval(interval)
      messageAllocation(msg)
      return update
    }
  }


  function isSafe(str) {
    // matches only common char
    return /^[a-zA-Z0-9-_. ]*$/.test(str)
  }

  let id = 0
  const defaultOptions = {nonoPostFix: false, type: "text", replace: undefined, check: undefined, defaultVal: "", select: undefined}
  function inq(question, options = defaultOptions) {
    return new Promise((res) => {
      setTitle(question)
      if (onAnyLog) onAnyLog("inq")
      if (!(question.endsWith("?") || question.endsWith(":") || question.endsWith(")")) && !options.nonoPostFix) question = question + ":"

      
      if (options instanceof Array) {
        let select = options
        options = Object.create(null)
        for (const key in defaultOptions) options[key] = defaultOptions[key]
        options.select = select

        options.check = (val) => options.select.includes(val)
      }
      else for (const key in defaultOptions) if (options[key] === undefined) options[key] = defaultOptions[key]



      if (!isSafe(options.type)) throw new Error("Invalid type")
      if (!isSafe(options.defaultVal)) throw new Error("Invalid default value")
      apd(`<log-line id=i${id}><div class="message">${saniHTML(question)}</div><input-body><input type="${options.type}" value="${options.defaultVal}" autocomplete="off">${options.select === undefined ? "" : `<auto-complete></auto-complete>`}</input-body></log-line>`)
      const logLineElem = document.querySelector(`#i${id}`)
      const inputElem = logLineElem.querySelector(`input`)
      

      inputElem.focus()
      if (!options.select) {
        inputElem.addEventListener("keydown", ({key}) => {
          if (key === "Enter") {
            if (currentlyFine) {
              submit()
            }
          }
        })
      }
      else {
        const autoCompleteElem = logLineElem.querySelector(`auto-complete`)
        const fuse = new Fuse(options.select, {
          includeMatches: true
        })

        const maxLen = 3
        

        // .search(inputElem.value).forEach(({item}) => {
        let matches
        let fireAutoCompleteOnInputFunc = () => {}
        inputElem.addEventListener("input", fireAutoCompleteOnInputFunc = () => {
          const val = inputElem.value

          matches = fuse.search(val)
          matches.length = maxLen
          autoCompleteElem.innerHTML = "<auto-complete-elem>" + matches.map(({item, matches}) => {
            let str = ""
            let lastEndIndex = 0
            matches[0].indices.forEach(([start, end]) => {
              str += item.substring(lastEndIndex, start)
              str += `<b>${item.substring(start, end + 1)}</b>`
              lastEndIndex = end + 1
            })
            str += item.substring(lastEndIndex)
            return str
          }).join("</auto-complete-elem><auto-complete-elem>") + "</auto-complete-elem>"

        })

        

        inputElem.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            if (currentlyFine) {
              submit(matches[0].item)
            }
            else {
              if (matches.length > 0) {
                inputElem.value = matches[0].item
                fireCheckOnInputFunc()
                fireAutoCompleteOnInputFunc()
              }
            }
          }
          else if (e.key === "Tab") {
            e.preventDefault()
            if (matches.length > 0) {
              inputElem.value = matches[0].item
              fireCheckOnInputFunc()
              fireAutoCompleteOnInputFunc()
            }
          }
        })


        const ogSubmit = submit
        submit = (val) => {
          logLineElem.style.paddingBottom = getComputedStyle(autoCompleteElem).height
          ogSubmit(val)
        }
      }

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

      let fireCheckOnInputFunc = () => {}
      let lastFineText = null
      if (options.check !== undefined) {
        currentlyFine = options.check(inputElem.value)
        if (!currentlyFine) inputElem.style.color = "red"
        else {
          lastFineText = inputElem.value
          inputElem.style.color = ""
        }
        inputElem.addEventListener("input", fireCheckOnInputFunc = () => {
          currentlyFine = options.check(inputElem.value)
          if (!currentlyFine) inputElem.style.color = "red"
          else {
            lastFineText = inputElem.value
            inputElem.style.color = ""
          }
        })  
      }
      if (options.type !== "password") {
        inputElem.addEventListener("input", () => {
          setTitle(question + " " + inputElem.value)
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
let overshoot = subdomains.splice(0, 3).reverse();


ws.addEventListener("message", async ({data: msg}) => {
  msg = JSON.parse(msg)
  console.log(msg)
  if (msg.log) {
    gui.log(msg.log)
  }
  else if (msg.err) {
    gui.err(msg.err)
  }
  else if (msg.ask) {
    ws.send(JSON.stringify({ask: {id: msg.ask.id, resp: await gui.ask(msg.ask.question, msg.ask.options)}}))
  }
  else if (msg.req) {
    reqIndex.get(msg.req.id)(msg.req.resp)
  }
  else if (msg.newDeviceToken) {
    localStorage.deviceToken = msg.newDeviceToken
  }
}); 

async function askName() {
  let repo, hash
  let r = await gui.ask(`Repository`)
  repo = r
  hash = await gui.ask(`Commit hash`)

  return {commit: {repo, hash}}
}

async function askDomain({commit}) {
  const domain = await gui.ask(`Domain for ${commit.repo}#${commit.hash}`)
  return {commit, domain}
}


ws.addEventListener("open", async () => {
  
  let resp = await sendRequest({try: { deviceToken: localStorage.deviceToken }})
  if (resp.redirect) {
    location.href = resp.redirect
  }
  else if (resp.suc) {
    gui.log("Done :D")
    const redirect = typeof resp.suc === "string"
    let timer = 10000
    setTimeout(() => {
      if (!redirect) location.reload()
      else location.href = resp.suc
    }, timer)

    const logBegin = `${redirect ? "Redirecting" : "Reloading"} in `
    let updateReloading = gui.log(logBegin + timer + "ms")
    
    let lastTime = Date.now()
    let f = () => {
      requestAnimationFrame(f)

      let curTime = Date.now()
      let timeDelta = curTime - lastTime
      timer -= timeDelta

      updateReloading(logBegin + timer + "ms")

      lastTime = curTime
    }
    requestAnimationFrame(f)
  }
  else {
    gui.err("Hmpf. Exited with error :/")
  }
})



let reqIndex = new Map
const sendRequest = (() => {
  
  function getFreeId() {
    let idRequest = 0
    while(reqIndex.has(idRequest)) {
      idRequest++
    }
    return idRequest
  }
  return function sendRequest(req) {
    return new Promise((res, rej) => {
      let id = getFreeId()
      reqIndex.set(id, (resp) => {
        res(resp)
        reqIndex.delete(id)
        clearTimeout(timeout)
      })

      let timeout = setTimeout(() => {
        reqIndex.delete(id)
        rej()
      }, 10 * 1000 * 60)
      
      
      ws.send(JSON.stringify({req, id}))
    })
  }
})()
