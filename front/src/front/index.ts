import { GraphManager, GraphMode } from "./component/graph";
import { ReadableType, Context } from "./utils";

// Crawl the html
const project_selector = document.getElementById('project-selector');
const project = document.getElementById('project');

const value_selector = document.getElementById('value-selector');
const value = document.getElementById('value');

const graph = document.getElementById('graph');
const raw = document.getElementById('raw')

if(!(project_selector instanceof HTMLDivElement) || !(project instanceof HTMLSelectElement)) {
  throw 'Malformed html'
}

if(!(value_selector instanceof HTMLDivElement) || !(value instanceof HTMLSelectElement)) {
  throw 'Malformed html'
}


const ctx = new Context();

// Initialize cache
const cache = {}
ctx.data = cache;

const gManager = new GraphManager(graph, ctx);

function update_content(context: Context) {
  const {project, value} = context
  raw.innerText = ""
  if(cache[project] && cache[project][value] && cache[project][value].data) {
    cache[project][value].data.forEach((entry) => {
      if(cache[project][value].type === ReadableType.SCALAR) {
        raw.innerText += `${entry[0]} : ${entry[1]}\n`
      } else if (cache[project][value].type === ReadableType.TENSOR) {
        raw.innerText += `${entry[0]} : Tensor(${entry[1].dims})\n`
      }
    })
  }
}

// Initialize websocket
const socket = new WebSocket(`ws://${location.hostname}:3010`)

socket.addEventListener('message', (event) => {
  const reicv_obj = JSON.parse(event.data)

  if(Object.keys(reicv_obj).find(_ => _ === 'type') != null) {
    // registration event
    cache[reicv_obj.project][reicv_obj.value] = {
      type: reicv_obj.type,
      data: reicv_obj.data
    }
  } else if (Object.keys(reicv_obj).find(_ => _ === 'new_data')) {
    // new data event
    cache[reicv_obj.project][reicv_obj.value].data.push(reicv_obj.new_data)
  }

  update_content(ctx)
  gManager.updateGraph()
})


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
  if(socket.readyState != socket.OPEN) {
    console.error(`Websocket not yet oppened, currently in ${socket.readyState} state`)
  }

  if(cache[project.value][value.value] == null) {
    cache[project.value][value.value] = {}
    socket.send(JSON.stringify({
      project: project.value,
      value: value.value
    }));
  }
  ctx.project = project.value;
  ctx.value = value.value;

  update_content(ctx);
  gManager.updateGraph();
})


