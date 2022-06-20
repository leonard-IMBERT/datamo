import { Context, DataMoStringToDate, isArrayOf, isTensorDesc, ReadableType, TensorDesc } from "../utils";
import Plotly from 'plotly.js/dist/plotly'
import { reshape } from 'mathjs'

export enum GraphMode {
  HIST = 'hist',
  PLOT = 'plot',
  TENSOR_WEIGHT = 'tensor-weight'
}

function isGM(str: string): str is GraphMode {
  return str === GraphMode.HIST
    || str === GraphMode.PLOT
    || str === GraphMode.TENSOR_WEIGHT
}


function tensorToHeatmap(item: TensorDesc) {
  const {order, dims, raw_data} = item;
  if(order > 2) {
    throw new Error("Cannot handle tensor of order > 2")
  }

  if(dims.length < 2) {
    return reshape(raw_data, [1, dims[0]])
  }

  return reshape(raw_data, dims)
}

export class GraphManager {
  hostComponent: HTMLElement;
  chartElement: HTMLElement;
  //chart: Chart;
  chart: Plotly.PlotlyHTMLElement;

  buttons: Array<HTMLButtonElement>;

  mode: GraphMode;
  ctx: Context

  currentSelection: { project?: string, value?: string, current_index?: number}

  constructor(
    hostComponent: HTMLElement,
    context: Context
  ) {
    this.hostComponent = hostComponent;
    const canvas = hostComponent.querySelector<HTMLElement>('.canvas')
    if(canvas == null) throw new Error("Malformed html")
    this.chartElement = canvas

    // this.chart = new Chart(this.chartElement, {
      // type: 'line',
      // data: { datasets: [] },
      // options: {}
    // })
    Plotly.newPlot(this.chartElement, [])
      .then((elem) => this.chart = elem)


    this.buttons = [];
    hostComponent.querySelectorAll('nav>button').forEach((elem) => {
      if(elem instanceof HTMLButtonElement) this.buttons.push(elem)
    });

    this.buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if(isGM(button.value)) {
          this.updateGraph({ new_mode: button.value})
        }
      })
    })

    this.ctx = context;

    this.mode = GraphMode.HIST;
    this.currentSelection = {
      project: undefined,
      value: undefined,
      current_index: 0,
    }

  }

  resetChart() {
    while(this.chart && this.chart.data.length > 0) {
      Plotly.deleteTraces(this.chartElement, 0)
    }
  }

  updateGraph(option: { new_project?: string, new_value?: string, new_mode?:GraphMode }) {
    if(this.ctx.data == null ) { console.warn("Trying to update the graph without data"); return; }

    if(
      (option.new_project == null && this.currentSelection.project == null)
      || (option.new_value == null && this.currentSelection.value == null)
    ) {
      console.warn("You never selected a pair project value, cannot update")
      return
    }

    if(option.new_project && option.new_project !== this.currentSelection.project && option.new_value == null) {
      console.warn("Cannot change project without selctioning a new value")
      return
    }

    // Switching Prject and value
    if(option.new_value && option.new_value !== this.currentSelection.value) {

      const project = option.new_project
      const value = option.new_value

      if(!project) return
      if(!value) return
      // Check for that the data is here
      if(this.ctx.data[project]
        && this.ctx.data[project][value]
        && this.ctx.data[project][value].type != null) {

        this.resetChart()

        const data: Array<number | TensorDesc>  = this.ctx.data[project][value].data.map(_ => _[1])
        const time: Array<Date> = this.ctx.data[project][value].data.map(x => x[0])
          .map(DataMoStringToDate)

        switch(this.ctx.data[project][value].type) {
          case ReadableType.SCALAR:
            this.buttons.forEach((button) => button.hidden = !(button.value === GraphMode.HIST || button.value === GraphMode.PLOT))
            this.mode = GraphMode.PLOT

            Plotly.addTraces(this.chartElement, {
              text: time.map((_ : Date) => _.toISOString()),
              y: this.ctx.data[project][value].data.map(x => x[1]),
              type: 'scatter'
            })

            break;
          case ReadableType.TENSOR:
            this.buttons.forEach((button) => button.hidden = !(button.value === GraphMode.TENSOR_WEIGHT))
            this.mode = GraphMode.TENSOR_WEIGHT

            if(!isArrayOf(data, isTensorDesc)) { throw new Error("Corrupted data") }

            Plotly.addTraces(this.chartElement, {
              z: tensorToHeatmap(data[data.length - 1]),
              type: 'heatmap'
            })

            break;
        }

        Plotly.relayout(this.chartElement, { title: `${project} : ${value}` })
        this.currentSelection.current_index = data.length


        } else {
          console.info(`It seems that ${project} : ${value} does not exist yet in the context`)
          return
        }

        this.currentSelection.project = option.new_project
        this.currentSelection.value = option.new_value
    }

    // New graph type
    if(option.new_mode && option.new_mode !== this.mode) {
      const { project , value } = this.currentSelection;

      if(project == null || value == null) return

      if(!(this.ctx.data[project][value].type === ReadableType.SCALAR && (option.new_mode === GraphMode.HIST || option.new_mode === GraphMode.PLOT))
        && !(this.ctx.data[project][value].type === ReadableType.TENSOR && option.new_mode === GraphMode.TENSOR_WEIGHT))
      {
        console.warn('Asking for illegal graph type and data type combination')
        return
      }

      const data : Array<number | TensorDesc> = this.ctx.data[project][value].data.map(x => x[1])
      const time : Array<Date> = this.ctx.data[project][value].data.map(x => x[0])
        .map(DataMoStringToDate)

      this.resetChart()

      this.mode = option.new_mode

      switch(this.mode) {
        case GraphMode.PLOT:
          Plotly.addTraces(this.chartElement, {
            text: time.map((_ : Date) => _.toISOString()),
            y: this.ctx.data[project][value].data.map(x => x[1]),
            type: 'scatter'
          })

          break;
        case GraphMode.HIST:
          Plotly.addTraces(this.chartElement, {
            type: 'histogram',
            x: data,
          })

          break;

        case GraphMode.TENSOR_WEIGHT:
          if(isArrayOf(data, isTensorDesc)) {
            Plotly.addTraces(this.chartElement, {
              z: tensorToHeatmap(data[data.length - 1]),
              type: 'heatmap'
            })
          }

          break;
      }

      this.currentSelection.current_index = data.length

    }

    // New data
    if(option.new_mode == null && option.new_project == null && option.new_value == null) {
      const { project, value } = this.currentSelection

      if(!project) return
      if(!value) return

      const data : Array<number | TensorDesc> = this.ctx.data[project][value].data.map(x => x[1])
      const time : Array<Date> = this.ctx.data[project][value].data.map(x => x[0])
        .map(DataMoStringToDate)

      switch(this.mode) {
        case GraphMode.HIST:
          Plotly.extendTraces(this.chartElement, {
            x: [data.slice(this.currentSelection.current_index)],
          }, [0])
          break
        case GraphMode.PLOT:
          Plotly.extendTraces(this.chartElement, {
            y:    [data.slice(this.currentSelection.current_index)],
            text: [time.slice(this.currentSelection.current_index).map(_ => _.toISOString())]
          }, [0])
          break
        case GraphMode.TENSOR_WEIGHT:
          this.resetChart()

          if(isArrayOf(data, isTensorDesc)) {
            Plotly.addTraces(this.chartElement, {
              z: tensorToHeatmap(data[data.length - 1]),
              type: 'heatmap'
            })
            }
          break
      }

      this.currentSelection.current_index = data.length
    }
  }
}