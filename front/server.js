const express = require('express');
const { ArgumentParser } = require('argparse');
const { DataMoReader } = require('../js/DataMoReader');
const { Registration } = require('./src/back/Registration');
const { join } = require('path');
const  WebSocket = require('ws');

const argParser = new ArgumentParser({
  description: 'DataMo front server'
});

argParser.add_argument('-p', '--port', { default: 3000, type:'int', help: 'Port the server will listen on'});
argParser.add_argument('-w', '--wport', {default: 3010, type: 'int', help: 'Port the webserver socket will listen on'})
argParser.add_argument('logfile', { metavar: 'Log File', type: 'str', help: 'The log file to read from'});

const args = argParser.parse_args();


const records = new Registration()
const reader = new DataMoReader(args.logfile);
reader.on_new_data((project, value) => {
  if(records.registrations[project] != null && records.registrations[project][value] != null) {
    records.registrations[project][value].forEach((ws) => {
      const length = reader.events[project][value].data.length
      ws.send(JSON.stringify({
        project,
        value,
        new_data: reader.events[project][value].data[length - 1]
      }))
    })
  }
});
reader.read();

const wss = new WebSocket.Server({ port: args.wport });
const app = express();
app.get('/abstract', (_, res) => {
  console.log(JSON.stringify(reader.events));
  res.status(200).send('Ok');
});

app.get('/', (_, res) => res.redirect(302, '/index'));

app.get('/index/',                  (_, res) => res.status(200).sendFile(join(__dirname, 'src/front/index.html')));
app.get('/ressources/css',          (_, res) => res.status(200).sendFile(join(__dirname, 'src/front/index.css')));
app.get('/ressources/js',           (_, res) => res.status(200).sendFile(join(__dirname, 'src/front/dist/index.js')));
app.get('/ressources/index.js.map', (_, res) => res.status(200).sendFile(join(__dirname, 'src/front/dist/index.js.map')));
app.get('/project/?',               (_, res) => res.status(200).send(JSON.stringify(Object.keys(reader.events))));
app.get('/project/:project/?',      (req, res) => {
  const { project } = req.params;
  if(reader.events[project] == null) {
    res.sendStatus(404);
  } else {
    res.status(200).send(JSON.stringify(Object.keys(reader.events[project])))
  }
});
app.get('/project/:project/:value/?', (req, res) => {
  const { project, value } = req.params;
  if(reader.events[project] == null || reader.events[project][value] == null) {
    res.sendStatus(404);
  } else {
    res.status(200).send(JSON.stringify(reader.events[project][value]))
  }
})
app.get('/config/',                   (_, res) => res.status(200).send(JSON.stringify({ 'wss-port': args.wport })))


wss.on('connection', ws => {

  ws.on('message', (data) => {
    try {
      const parsed_data = JSON.parse(data)

      if(parsed_data.project != null && parsed_data.value != null) {
        const { project, value } = parsed_data;
        if(reader.events[project] != null && reader.events[project][value] != null) {
          const message = Object.assign({
            project, value
          }, reader.events[project][value])

          ws.send(JSON.stringify(message))
          records.register(project, value, ws)
        } else {
            ws.send('{ "err": "Cannot find project or value" }')
        }
      } else {
        ws.send('{ "err": "Malformed message, expecting `project` and `value` field" }')
      }
    } catch (error) {
      console.error(error)
      ws.send('{ "err": "Malformed message, expecting JSON" }')
    }
  });

  ws.on('close', () => {
    records.unregister(ws)
  })
});


app.listen(args.port, () => {
  console.log(`Server listening on port ${args.port}`);
  console.log(`WebSocket listening on port ${args.wport}`);
  console.log(`Rewinding file ${args.logfile}`);
});
