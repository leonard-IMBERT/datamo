export type Scalar = number;
export type Tensor = {
    order: number;
    dims: number[];
    raw_data: number[];
};
export type Values = {
    type: number;
    data: Array<[string, Scalar | Tensor]>;
};
export type Project = {
    [x: string]: Values;
};
export type ProjectHolder = {
    [x: string]: Project;
};
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
export class DataMoReader {
    /**
     * Construct a new DataMoReader
     *
     * file is optional when constructing but MUST be set before
     * trying to read
     *
     * @param {string?} file
     */
    constructor(file: string | null);
    /** @type {string?} */
    file: string | null;
    /** @type {string} */
    selected: string;
    /** @type {ProjectHolder} */
    events: ProjectHolder;
    reading: boolean;
    /** @type {((project: string, value: string) => void)?} */
    on_new_data_f: (project: string, value: string) => void;

    /**
     * Read the file synchronously
     */
    sync_read(): void;
    /**
     * Read the file asynchronously
     *
     * @param {boolean} watch If true, it will not stop and read any new data that would be appened to the file
     */
    read(watch?: boolean): Promise<void>;
    /**
     * Only used in watch mode when reading asynchrnously
     *
     * Stop wathing the file
     */
    stop_reading(): void;
    /**
     * Callback to call when a new data is read
     *
     * In sync mode, it will be called for each line of each
     * pair (project, value)
     *
     * @param {(project: string, value: string) => void} f
     */
    on_new_data(f: (project: string, value: string) => void): void;
    /**
     * Transform a chunk into event object and store it in ctx
     * @param {Buffer} header
     * @param {Buffer} data
     */
    chunkToObject(header: Buffer, data: Buffer): {
        project: string;
        value: any;
    };
}
/**
 * The different readeable type known
 */
export type ReadeableType = number;
export namespace ReadeableType {
    const SCALAR: number;
    const TENSOR: number;
    const META_PROJECT: number;
}
