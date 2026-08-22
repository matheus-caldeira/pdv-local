declare module 'esc-pos-encoder' {
  export default class EscPosEncoder {
    constructor(options?: { width?: number });
    codepage(page: string): this;
    align(alignment: 'left' | 'center' | 'right'): this;
    line(text: string): this;
    bold(enabled: boolean): this;
    newline(): this;
    cut(): this;
    encode(): Uint8Array;
  }
}
