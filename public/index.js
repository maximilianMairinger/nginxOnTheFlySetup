const domain = location.origin
console.log("domain", domain)



const ws = new WebSocket(domain);
 
ws.on('open', function open() {
  console.log("open")
  ws.send('something');
});
 
ws.on('message', function incoming(data) {
  console.log(data);
});