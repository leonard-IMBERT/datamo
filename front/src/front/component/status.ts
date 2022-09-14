import { Context, ReadableType } from "../utils";


enum STATUS {
  UNSELECTED,
  UNDEFINED,
  TRAINING = "training",
  EVALUATING = "evaluating",
  FINISHED = "finished",
}


export class StatusManager {
  status: HTMLSpanElement;
  statusText: HTMLSpanElement;

  ctx: Context;

  curStatus: STATUS;

  constructor(
    status: HTMLSpanElement,
    statusText: HTMLSpanElement,
    context: Context
  ) {
    this.status = status;
    this.statusText = statusText,

    this.ctx = context;
    this.curStatus = STATUS.UNSELECTED;
  }

  updateStatus() {
    if(this.ctx.project == null) {
      this.curStatus = STATUS.UNSELECTED;
    } else if(this.ctx.data == null
      || this.ctx.data[this.ctx.project] == null
      || this.ctx.data[this.ctx.project]['status'] == null
      || this.ctx.data[this.ctx.project]['status'].type != ReadableType.STRING
      || this.ctx.data[this.ctx.project]['status'].data.length == 0) {
      this.curStatus = STATUS.UNDEFINED;
    } else {
      const datas = this.ctx.data[this.ctx.project]['status'].data
      const status = datas[datas.length - 1][1]

      switch (status) {
        case STATUS.TRAINING: this.curStatus = STATUS.TRAINING; break;
        case STATUS.EVALUATING: this.curStatus = STATUS.EVALUATING; break;
        case STATUS.FINISHED: this.curStatus = STATUS.FINISHED; break;
        default:
          console.warn(`Unrecognized status ${status}`);
          this.curStatus = STATUS.UNDEFINED;
      }
    }

    this.status.classList.forEach(_ => this.status.classList.remove(_))

    switch (this.curStatus) {
      case STATUS.UNSELECTED:
        this.statusText.innerText = "Unselected"
        this.status.classList.add('status-grey');
        break;
      case STATUS.UNDEFINED:
        this.statusText.innerText = "Undefined"
        this.status.classList.add('status-grey');
        break;
      case STATUS.TRAINING:
        this.statusText.innerText = "Training"
        this.status.classList.add('status-orange');
        break;
      case STATUS.EVALUATING:
        this.statusText.innerText = "Evaluating"
        this.status.classList.add('status-orange');
        break;
      case STATUS.FINISHED:
        this.statusText.innerText = "Finished"
        this.status.classList.add('status-green');
        break;
    }
  }
}
