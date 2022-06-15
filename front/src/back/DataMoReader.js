const fs = require('fs');

/**
 * The different readeable type known
 */
const ReadeableType = {
  // Monitoring
  SCALAR: 0, /**< A simple scalar */
  TENSOR:1, /**< A tensor */

  // Metadata
  META_PROJECT: 2, /**< Meta tag that specify the project */
};

/**
 * Transform a data buffer into a "tensor"
 * @param {Buffer} buffer
 */
function readTensorFromBuffer(buffer) {
  let cursor = 0;
  const order = buffer.slice(0, 4).readInt32LE();
  cursor += 4;

  let n_entries = 1;
  const dims = [];
  while(dims.length < order) {
    const dim = buffer.slice(cursor, cursor + 4).readInt16LE();
    dims.push(dim);
    cursor += 4;

    n_entries = n_entries * dim;
  }

  const raw_data = [];
  while(raw_data.length < n_entries) {
    raw_data.push(buffer.slice(cursor, cursor + 8).readDoubleLE());
    cursor += 8;
  }

  return {
    order,
    dims,
    raw_data
  };
}

/**
 * A reader for a DataMo file
 */
class DataMoReader {
  constructor(file) {
    this.file = file;
    this.selected = 'default';
    this.events = {
      'default': {}
    };

    /**
     * @type {Buffer?}
     */
    this.current_header = null;
    /**
     * @type {Buffer?}
     */
    this.current_data = null;

    this.reading = false;

    this.on_new_data_f = null;
  }

  async read() {
    this.file_obj = await fs.promises.open(this.file, 'a+')
    this.reading = true;

    while(this.reading) {
      let header = Buffer.alloc(64);

      let header_reading = await this.file_obj.read(header, 0, 64);

      while(header_reading.bytesRead == 64) {
        const size  = Number(header.slice(56, 56 + 8).readBigInt64LE());
        let data = Buffer.alloc(size);

        await this.file_obj.read(data, 0, size);

        const chunkResult = this.chunkToObject(header, data);
        if(this.on_new_data_f && chunkResult != null) {
          this.on_new_data_f(chunkResult.project, chunkResult.value)
        }
        header_reading = await this.file_obj.read(header, 0, 64);
      }

      await new Promise((res) => setTimeout(res, 100));
    }
  }

  stop_reading() {
    this.reading = false;
  }

  on_new_data(f) {
    this.on_new_data_f = f
  }


  /**
   * Transform a chunk into event object and store it
   * @param {Buffer} header
   * @param {Buffer} data
   */
  chunkToObject(header, data) {
    const magicString = header.slice(0, 6).toString();
    if(magicString !== 'DATAMO') {
      console.error("Malformed log file");
    }

    const type = header.slice(30, 32).readInt16LE();
    const entry_name = header.slice(32, 32 + 24).toString('utf-8', 0, 23).trim();

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
      [header.slice(6, 6+24).toString(), parsed_data]
    );
    return { project: this.selected, value: entry_name }
  }
}

module.exports = {
  DataMoReader
};