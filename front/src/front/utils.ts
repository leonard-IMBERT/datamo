import { GraphMode } from "./component/graph";
import { ProjectHolder } from '../../../js/DataMoReader'
export const ReadableType = {
  SCALAR:0,
  TENSOR: 1,
  STRING: 3,
}

export class Context {
  project?: string = undefined;
  value?: string = undefined;
  mode?: GraphMode = undefined
  data?: ProjectHolder = undefined;
}


export function DataMoStringToDate(str: string) {
  const res = str.trim().match(/^(?<Day>[0-9]{2})\/(?<Month>[0-9]{2})\/(?<Year>[0-9]{4})~(?<Hour>[0-9]{2}):(?<Min>[0-9]{2}):(?<Sec>[0-9]{2})::(?<Milli>[0-9]{3})$/m)
  if(res) {
    const date = new Date()
    date.setFullYear(
      Number(res.groups?.Year),
      Number(res.groups?.Month),
      Number(res.groups?.Day)
    )
    date.setHours(
      Number(res.groups?.Hour),
      Number(res.groups?.Min),
      Number(res.groups?.Sec),
      Number(res.groups?.Milli)
    )

    return date
  }

  console.warn(`Cannot understand the date: ${str}`)
  return new Date(Date.now())
}


export type TensorDesc = {order: number, dims: number[], raw_data: number[]}

export function isTensorDesc(x: any): x is TensorDesc {
  return typeof x === 'object'
   && x['order'] != null && typeof x.order === 'number'
   && x['dims'] != null && x.dims instanceof Array && x.dims.every(_ => typeof _ === 'number')
   && x['raw_data'] != null && x.raw_data instanceof Array && x.raw_data.every(_ => typeof _ === 'number')
}

export function isArrayOf<A, T>(arr: Array<A | T>, test_t: (x: any) => x is T): arr is Array<T> {
  return arr.every(test_t)
}

export function isNumberArray(arr: Array<any>): arr is number[] {
  return arr.every(_ => typeof _ === 'number')
}
