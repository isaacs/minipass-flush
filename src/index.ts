import { Minipass } from 'minipass'
const _flush = Symbol('_flush')
const _flushed = Symbol('_flushed')
const _flushing = Symbol('_flushing')

export type FlushFunction = (cb: (er?: unknown) => unknown) => unknown

export type MinipassFlushOptions<R> = Minipass.Options<R> & {
  flush?: FlushFunction
}

export const isPromiseLike = (o: unknown): o is Promise<unknown> =>
  !!o &&
  typeof o === 'object' &&
  'then' in o &&
  typeof o.then === 'function'

export class Flush<
  R,
  W = R,
  E extends Minipass.Events<R> = Minipass.Events<R>,
> extends Minipass<R, W, E> {
  [_flushing] = false;
  [_flushed] = false;
  [_flush]: FlushFunction

  constructor(opt: MinipassFlushOptions<R>) {
    //oxlint-disable-next-line ban-ts-comment
    //@ts-ignore complicated type inference puzzle to unraveled someday
    super(opt)

    const { flush = (this as { flush?: FlushFunction }).flush } = opt

    // or extend this class and provide a 'flush' method in your subclass
    if (typeof flush !== 'function') {
      throw new TypeError('must provide flush function in options')
    }

    this[_flush] = flush
  }

  emit<Event extends keyof E>(ev: Event, ...data: E[Event]) {
    if ((ev !== 'end' && ev !== 'finish') || this[_flushed]) {
      return super.emit(ev, ...data)
    }

    if (this[_flushing]) {
      return true
    }

    this[_flushing] = true

    const afterFlush = (er?: unknown) => {
      this[_flushed] = true
      if (er) {
        super.emit('error', er)
      } else {
        super.emit('end')
      }
    }

    const ret = this[_flush](afterFlush)
    if (isPromiseLike(ret)) {
      ret.then(
        () => afterFlush(),
        er => afterFlush(er),
      )
    }
    return true
  }
}
