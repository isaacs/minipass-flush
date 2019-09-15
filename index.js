const Minipass = require('minipass')
const _flush = Symbol('_flush')
class Flush extends Minipass {
  constructor (opt = {}) {
    if (typeof opt === 'function')
      opt = { flush: opt }

    super(opt)

    // or extend this class and provide a 'flush' method in your subclass
    if (typeof opt.flush !== 'function' && typeof this.flush !== 'function')
      throw new TypeError('must provide flush function in options')

    this[_flush] = opt.flush || this.flush
  }

  emit (ev, ...data) {
    if (ev !== 'end')
      return super.emit(ev, ...data)

    const afterFlush = er => er ? super.emit('error', er) : super.emit('end')

    const ret = this[_flush](afterFlush)
    if (ret && ret.then)
      ret.then(() => afterFlush(), er => afterFlush(er))
  }
}

module.exports = Flush
