import { Context, DataMoStringToDate, ReadableType } from "../utils";
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

function tensorToHeatmap(item: {order: number, dims: number[], raw_data: number[]}) {
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

  currentSelection: { project: string, value: string, current_index: number}

  constructor(
    hostComponent: HTMLElement,
    context: Context
  ) {
    this.hostComponent = hostComponent;
    this.chartElement = hostComponent.querySelector('.canvas')
    if(this.chartElement == undefined) {
      throw new Error("Malformed html")
    }
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
          this.mode = button.value;
          this.updateGraph(true)
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

  updateGraph(clear = false): void {
    // If data is filled
    if(this.ctx.data[this.ctx.project]
      && this.ctx.data[this.ctx.project][this.ctx.value]
      && this.ctx.data[this.ctx.project][this.ctx.value].type != null) {

      switch(this.ctx.data[this.ctx.project][this.ctx.value].type) {
        case ReadableType.SCALAR:
          this.buttons.forEach((button) => button.hidden = !(button.value === GraphMode.HIST || button.value === GraphMode.PLOT))
          if(this.mode !== GraphMode.HIST && this.mode !== GraphMode.PLOT) this.mode = undefined;
          break;
        case ReadableType.TENSOR:
          this.buttons.forEach((button) => button.hidden = !(button.value === GraphMode.TENSOR_WEIGHT))
          if(this.mode !== GraphMode.TENSOR_WEIGHT) this.mode = undefined;
          break;
      }

      // If selection changed
      if(this.ctx.project != this.currentSelection.project || this.ctx.value != this.currentSelection.value) {

        // default selection
        this.currentSelection = {
          project: this.ctx.project,
          value: this.ctx.value,
          current_index: 0
        }

        switch(this.ctx.data[this.currentSelection.project][this.currentSelection.value].type) {
          case ReadableType.SCALAR: this.mode = GraphMode.PLOT; break;
          case ReadableType.TENSOR: this.mode = GraphMode.TENSOR_WEIGHT; break;
        }

        // Reinit chart
        this.resetChart();
        Plotly.addTraces(this.chartElement, {
          text: this.ctx.data[this.currentSelection.project][this.currentSelection.value].data.map(x => x[0])
            .map(DataMoStringToDate)
            .map((_ : Date) => _.toISOString()),
          y: this.ctx.data[this.currentSelection.project][this.currentSelection.value].data.map(x => x[1]),
          type: 'scatter'
        })
        Plotly.relayout(this.chartElement, { title: `${this.currentSelection.project} : ${this.currentSelection.value}` })
        this.currentSelection.current_index = this.ctx.data[this.currentSelection.project][this.currentSelection.value].data.length
      }

      // Just update of the current selection
      if(this.ctx.project == this.currentSelection.project && this.ctx.value == this.currentSelection.value) {
        const data = this.ctx.data[this.currentSelection.project][this.currentSelection.value].data.map(x => x[1])
        const labels = this.ctx.data[this.currentSelection.project][this.currentSelection.value].data.map(x => x[0])
          .map(DataMoStringToDate)
          .map((_ : Date) => _.toISOString())

        if(clear) {
          this.resetChart();
          switch(this.mode) {
            case GraphMode.HIST:
              Plotly.addTraces(this.chartElement, {
                type: 'histogram',
                x: data,
              })
              Plotly.relayout(this.chartElement, { title: `${this.currentSelection.project} : ${this.currentSelection.value}` })
              break
            case GraphMode.PLOT:
              Plotly.addTraces(this.chartElement, {
                y: data,
                text: labels,
                type: 'scatter'
              })
              Plotly.relayout(this.chartElement, { title: `${this.currentSelection.project} : ${this.currentSelection.value}` })
              break
            case GraphMode.TENSOR_WEIGHT:
              Plotly.addTraces(this.chartElement, {
                z: tensorToHeatmap(data[data.length - 1]),
                type: 'heatmap'
              })
              Plotly.relayout(this.chartElement, { title: `${this.currentSelection.project} : ${this.currentSelection.value}` })
              break
          }
        } else {
          switch(this.mode) {
            case GraphMode.HIST:
              Plotly.extendTraces(this.chartElement, {
                x: [data.slice(this.chart.data[0].x.length)],
              }, [0])
              break
            case GraphMode.PLOT:
              Plotly.extendTraces(this.chartElement, {
                y:    [data.slice(this.chart.data[0].y.length)],
                text: [labels.slice(this.chart.data[0].y.length)]
              }, [0])
              break
            case GraphMode.TENSOR_WEIGHT:
              this.resetChart()
              console.log(data[data.length - 1])
              Plotly.addTraces(this.chartElement, {
                z: tensorToHeatmap(data[data.length - 1]),
                type: 'heatmap'
              })
              Plotly.relayout(this.chartElement, { title: `${this.currentSelection.project} : ${this.currentSelection.value}` })
              break
          }
        }
      }
    }
  }
}