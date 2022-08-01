import { Context, DataMoStringToDate, ReadableType, TensorDesc } from "../utils";

function scalarDataToString(data: [string, number]): string {
    return `${DataMoStringToDate(data[0]).toISOString()} : ${data[1]}`
}

function tensorDataToString(data: [string, TensorDesc]): string {
  return `${DataMoStringToDate(data[0]).toISOString()} : Tensor(${data[1].dims})`
}

export class RawManager {
  raw_board: HTMLElement;
  raw_log: HTMLUListElement;
  ctx: Context;

  selection: {
    project?: string,
    value?: string,
  }

  constructor(board: HTMLElement, context: Context) {
    this.raw_board = board
    const rl = this.raw_board.querySelector<HTMLUListElement>('.raw-log')
    if(rl == null) throw new Error('Malformed HTML')
    this.raw_log = rl
    this.ctx = context
    this.selection = {}
  }

  updateRaw(options: { new_project?: string, new_value?: string }) {
    if(this.ctx.data == null) {
      console.warn('No data yet in ctx')
      return
    }

    if (this.selection.project == null && options.new_project == null) {
      console.warn("Cannot update the raw data without selecting a pair project value")
      return
    }

    if(options.new_project && options.new_value ) {

      const project = options.new_project
      const value = options.new_value

      if(
        this.ctx.data[project]
        && this.ctx.data[project][value]
        && this.ctx.data[project][value].type != null
      ) {
        while(this.raw_log.firstElementChild) {
          if(this.raw_log.lastElementChild)
            this.raw_log.removeChild(this.raw_log.lastElementChild)
        }

        this.ctx.data[project][value].data
          .map((data) => {
            switch(this.ctx.data?.[project][value].type) {
              case ReadableType.SCALAR:
                return scalarDataToString(data)
              case ReadableType.TENSOR:
                return tensorDataToString(data)
            }
          }).forEach((_ : string) => this.raw_log.appendChild(document.createElement('li')).textContent = _)

        this.selection = { project, value }

      } else {
        console.info(`It seems that ${project} : ${value} does not exist yet in the context`)
      }
    } else if (options.new_project || options.new_value) {
      console.warn("Project or value is null, cannot update raw")
      return
    } else {
      const lc = this.raw_log.children.length
      const { project, value } = this.selection;
      if(project == null || value == null) {
        console.warn('Cannot update while you have not picked a project, value pair')
        return
      }
      this.ctx.data[project][value].data.slice(lc)
          .map((data) => {
            switch(this.ctx.data?.[project][value].type) {
              case ReadableType.SCALAR:
                return scalarDataToString(data)
              case ReadableType.TENSOR:
                return tensorDataToString(data)
            }
          }).forEach((_ : string) => {
            const li = this.raw_log.appendChild(document.createElement('li'))
            li.textContent = _
            li.scrollIntoView({
              block: 'end',
              behavior: 'smooth',
            })
          })
    }
  }
}