export class Block {
  constructor(index, hash, nonce, timestamp) {
    this.index = index;
    this.hash = hash;
    this.nonce = nonce;
    this.timestamp = timestamp;
  }
}

export class Blockchain {
  constructor() {
    this.chain = [
      new Block(0, "0000000000000000000000000000000000000000000000000000000000000000", 0, Date.now())
    ];
  }
}
