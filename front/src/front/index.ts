import { GraphManager, GraphMode } from "./component/graph";
import { RawManager } from "./component/raw";
import { StatusManager } from "./component/status";
import { ReadableType, Context } from "./utils";

// Crawl the html
const project_selector = document.getElementById('project-selector');
const project = document.getElementById('project');

const value_selector = document.getElementById('value-selector');
const value = document.getElementById('value');

const graph = document.getElementById('graph');
const raw = document.getElementById('raw');

const status = document.querySelector<HTMLSpanElement>('#status span');
const status_text = document.querySelector<HTMLSpanElement>('#status span .text');

const emptyMessage = document.getElementById('empty-message');

if(!(project_selector instanceof HTMLDivElement) || !(project instanceof HTMLSelectElement)) {
  throw 'Malformed html'
}

if(!(value_selector instanceof HTMLDivElement) || !(value instanceof HTMLSelectElement)) {
  throw 'Malformed html'
}

if(graph == null || raw == null) throw new Error("Malformed html")



const ctx = new Context();

// Initialize cache
const cache = {}
ctx.data = cache;

const gManager = new GraphManager(graph, ctx);
const rManager = new RawManager(raw, ctx)
const sManager = new StatusManager(status, status_text, ctx);

let socket: WebSocket | undefined = undefined

fetch('/config/', { method: 'GET' }).then(_ => _.json()).then((obj) => {
  if(obj['wss-port'] == null) throw 'Malformed json from /config/'

  // Initialize websocket
  socket = new WebSocket(`ws://${location.hostname}:${obj['wss-port']}`)
  console.log(`WS listening on ${obj['wss-port']}`)

  socket.addEventListener('message', (event) => {
    const reicv_obj = JSON.parse(event.data)

    if(Object.keys(reicv_obj).find(_ => _ === 'type') != null) {
      // registration event
      cache[reicv_obj.project][reicv_obj.value] = {
        type: reicv_obj.type,
        data: reicv_obj.data

      }
      gManager.updateGraph({ new_project: ctx.project, new_value: ctx.value })
      rManager.updateRaw({ new_project: ctx.project, new_value: ctx.value })
      sManager.updateStatus();
    } else if (Object.keys(reicv_obj).find(_ => _ === 'new_data')) {
      // new data event
      cache[reicv_obj.project][reicv_obj.value].data.push(reicv_obj.new_data)
      gManager.updateGraph({})
      rManager.updateRaw({})
      sManager.updateStatus();
    }
  })
}).catch(console.error)

// Initialize projects selection
fetch('/project', {
  method: 'GET'
}).then(_ => _.json()).then((projects) => {
  if(Array.isArray(projects) && projects.every((item) => typeof item === 'string')) {
    projects.forEach((item: string) => {
      const new_opt = document.createElement('option');
      new_opt.value = item;
      new_opt.innerText = item;
      project.add(new_opt);
    });
    value.value = ""
    project.dispatchEvent(new Event('change'));
  } else throw 'Malformed response from request (/project)'
}).catch(console.error);

// On project selection, update possibles values
project.addEventListener('change', () => {
  value.disabled = true;

  if(cache[project.value] == null) cache[project.value] = {}

  fetch(`/project/${project.value}`, {
    method: 'GET'
  }).then(_ => _.json()).then((values) => {
    if(Array.isArray(values) && values.every((item) => typeof item  === 'string')) {
      while(value.options.length > 1) {
        value.options.remove(1)
      }

      values.forEach((item) => {
        const new_opt = document.createElement('option');
        new_opt.value = item;
        new_opt.innerText = item;
        value.add(new_opt);
      })
    } else throw `Malformed response from /project/${project.value}`
  }).then(() => value.disabled = false)
    .catch(console.error);
});

value.addEventListener('change', () => {
  if(socket == null || socket.readyState != socket.OPEN) {
    console.warn(`Websocket not yet oppened`)
  } else {
    if(cache[project.value][value.value] == null) {
      cache[project.value][value.value] = {}
      socket.send(JSON.stringify({
        project: project.value,
        value: value.value
      }));
    }
    ctx.project = project.value;
    ctx.value = value.value;

    gManager.updateGraph({new_project: project.value, new_value: value.value});
    rManager.updateRaw({new_project: project.value, new_value: value.value});
    sManager.updateStatus();

    graph.hidden = false;
    emptyMessage.hidden = true;
  }
})


