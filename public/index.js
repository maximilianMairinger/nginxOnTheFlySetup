let subdomains = location.host.split(".").reverse()
subdomains.splice(0, 3)


const ws = new WebSocket("ws://" + location.host + "/ws/");
 
ws.addEventListener('open', function open() {
  console.log("open")
  ws.send('something');
});
 
ws.addEventListener('message', function incoming(data) {
  console.log(data);
});



const { log, inq } = (() => {
  function apd(q) {
    body.insertAdjacentHTML("beforeend", q)
  }
  const body = document.querySelector("div.body")
  function log(msg) {
    apd(`<div class="message">${msg}</div><br>`)
  }

  let id = 0
  function inq(question, type = "text", nonoPostFix = false) {
    return new Promise((res) => {
      if (!(question.endsWith("?") || question.endsWith(":")) && !nonoPostFix) question = question + ":"
      apd(`<div class="message">${question}</div><input id="inp${id}" type="${type}" autocomplete="off"><br>`)
      let inputElem = document.getElementById("inp" + id)
      inputElem.focus()
      inputElem.addEventListener("keydown", ({key}) => {
        if (key === "Enter") {
          inputElem.setAttribute("disabled", true)
          res(inputElem.value)
        }
      })
      id++
    })
    
  }

  return { log, inq }
})()

setTimeout(() => {
  log("Hello")
  inq("What")
}, 1000)