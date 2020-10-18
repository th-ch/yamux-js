export class Header {
    public version: number; // sizeof(uint8)
    public type: number; // sizeof(uint8)
    public flags: number; // sizeof(uint16)
    public streamID: number; // sizeof(uint32)
    public length: number; // sizeof(uint32)

    public static LENGTH = 12;

    constructor(version: number, type: number, flags: number, streamID: number, length: number) {
        this.version = version;
        this.type = type;
        this.flags = flags;
        this.streamID = streamID;
        this.length = length;
    }

    public static parse(buffer: Buffer): Header {
        const version = buffer.readUInt8(0);
        const type = buffer.readUInt8(1);
        const flags = buffer.readUInt16BE(2);
        const streamID = buffer.readUInt32BE(4);
        const length = buffer.readUInt32BE(8);

        return new Header(version, type, flags, streamID, length);
    }

    public encode(): Buffer {
        var header = Buffer.alloc(Header.LENGTH);

        header.writeUInt8(this.version, 0);
        header.writeUInt8(this.type, 1);
        header.writeUInt16BE(this.flags, 2);
        header.writeUInt32BE(this.streamID, 4);
        header.writeUInt32BE(this.length, 8);

        return header;
    }
}
