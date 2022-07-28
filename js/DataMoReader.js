const fs = require('fs');

/**
 * The different readeable type known
 * @readonly
 * @enum {number}
 */
const ReadeableType = {
  // Monitoring
  SCALAR: 0, /**< A simple scalar */
  TENSOR: 1, /**< A tensor */

  // Metadata
  META_PROJECT: 2, /**< Meta tag that specify the project */
};

/**
 * Transform a data buffer into a "tensor"
 * @param {Buffer} buffer
 * @return {Tensor}
 */
function readTensorFromBuffer(buffer) {
  let cursor = 0;
  const order = buffer.subarray(0, 4).readInt32LE();
  cursor += 4;

  let n_entries = 1;
  const dims = [];
  while(dims.length < order) {
    const dim = buffer.subarray(cursor, cursor + 4).readInt16LE();
    dims.push(dim);
    cursor += 4;

    n_entries = n_entries * dim;
  }

  const raw_data = [];
  while(raw_data.length < n_entries) {
    raw_data.push(buffer.subarray(cursor, cursor + 8).readDoubleLE());
    cursor += 8;
  }

  return {
    order,
    dims,
    raw_data
  };
}


/**
 * @typedef {number} Scalar
 * @typedef {{order: number, dims: number[], raw_data: number[]}}  Tensor
 * @typedef {{ type: number, data: Array<[string, Scalar|Tensor]>}} Values
 * @typedef {Object.<string, Values>} Project
 * @typedef {Object.<string, Project>} ProjectHolder
 */

/**
 * A reader for a DataMo file
 */
class DataMoReader {

  /** @type {string?} */
  file = null

  /** @type {string} */
  selected = 'default'

  /** @type {ProjectHolder} */
  events = { }


  reading = false

  /** @type {((project: string, value: string) => void)?} */
  on_new_data_f = null;

  /**
   * Construct a new DataMoReader
   *
   * file is optional when constructing but MUST be set before
   * trying to read
   *
   * @param {string?} file
   */
  constructor(file) {
    this.file = file

    this.events['default'] = {}

    /**
     * @type {Buffer?}
     */
    this.current_header = null;
    /**
     * @type {Buffer?}
     */
    this.current_data = null;
  }

  /**
   * Read the file synchronously
   */
  sync_read() {
    if(this.file == null || !fs.existsSync(this.file)) throw new Error(`Cannot read the DataMo file in ${this.file}`)

    const file_content = fs.readFileSync(this.file, { flag: 'a+'})

    let offset = 0

    while(offset < file_content.length - 1) {
      let header = file_content.subarray(offset, offset + 64)
      offset += 64

      const size  = Number(header.subarray(56, 56 + 8).readBigInt64LE())
      let data = file_content.subarray(offset, offset + size)
      offset += size

      const chunkResult = this.chunkToObject(header, data)
      if(this.on_new_data_f && chunkResult != null) {
        this.on_new_data_f(chunkResult.project, chunkResult.value)
      }
    }
  }

  /**
   * Read the file asynchronously
   *
   * @param {boolean} watch If true, it will not stop and read any new data that would be appened to the file
   */
  async read(watch = true) {
    if(this.file == null || !fs.existsSync(this.file)) throw new Error(`Cannot read the DataMo file in ${this.file}`)

    const file_obj = await fs.promises.open(this.file, 'a+')
    this.reading = true;

    while(this.reading) {
      let header = Buffer.alloc(64);

      let header_reading = await file_obj.read(header, 0, 64);

      while(header_reading.bytesRead == 64) {
        const size  = Number(header.subarray(56, 56 + 8).readBigInt64LE());
        let data = Buffer.alloc(size);

        await file_obj.read(data, 0, size);

        const chunkResult = this.chunkToObject(header, data);
        if(this.on_new_data_f && chunkResult != null) {
          this.on_new_data_f(chunkResult.project, chunkResult.value)
        }
        header_reading = await file_obj.read(header, 0, 64);
      }

      if(!watch) {
        this.reading = false;
      } else {
        await new Promise((res) => setTimeout(res, 100));
      }
    }
  }

  /**
   * Only used in watch mode when reading asynchrnously
   *
   * Stop wathing the file
   */
  stop_reading() {
    this.reading = false;
  }

  /**
   * Callback to call when a new data is read
   *
   * In sync mode, it will be called for each line of each
   * pair (project, value)
   *
   * @param {(project: string, value: string) => void} f
   */
  on_new_data(f) {
    this.on_new_data_f = f
  }


  /**
   * Transform a chunk into event object and store it in ctx
   * @param {Buffer} header
   * @param {Buffer} data
   */
  chunkToObject(header, data) {
    const magicString = header.subarray(0, 6).toString();
    if(magicString !== 'DATAMO') {
      console.error("Malformed log file");
    }

    const type = header.subarray(30, 32).readInt16LE();
    const entry_name = header.subarray(32, 32 + 24).toString('utf-8', 0, 23).trim();

    if(type == ReadeableType.META_PROJECT) {
      this.selected = entry_name;
      if(this.events[this.selected] == null) {
        this.events[this.selected] = {}
      }

      return null
    }

    if(this.events[this.selected][entry_name] == null) {
      this.events[this.selected][entry_name] = {
        type: type,
        data: []
      };
    }

    let parsed_data;
    switch (type) {
      case ReadeableType.SCALAR: parsed_data = data.readDoubleLE(); break;
      case ReadeableType.TENSOR: parsed_data = readTensorFromBuffer(data); break;
      default: console.error(`Data type ${type} is unknown`); parsed_data = undefined;
    }

    this.events[this.selected][entry_name].data.push(
      [header.subarray(6, 6+24).toString(), parsed_data]
    );
    return { project: this.selected, value: entry_name }
  }
}

module.exports = {
  DataMoReader,
  ReadeableType
};