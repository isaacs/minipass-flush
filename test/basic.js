const Flush = require('../')
const t = require('tap')

t.test('flush option, ok, cb', t => {
  let flushCalled = false
  const f = new Flush((cb) => {
    t.equal(flushCalled, false, 'call flush one time')
    flushCalled = true
    return cb()
  })
  f.setEncoding('utf8')
  f.on('end', () => {
    t.equal(flushCalled, true, 'called flush before end event')
    t.equal(sawData, true, 'saw data')
    t.end()
  })
  let sawData = false
  f.on('data', d => {
    sawData = true
    t.equal(d, 'foo')
  })
  f.end('foo')
})

t.test('flush option, ok, promise', t => {
  let flushCalled = false
  const f = new Flush({
    encoding: 'utf8',
    flush () {
      t.equal(flushCalled, false, 'call flush one time')
      flushCalled = true
      return Promise.resolve(true)
    }
  })
  f.on('end', () => {
    t.equal(flushCalled, true, 'called flush before end event')
    t.equal(sawData, true, 'saw data')
    t.end()
  })
  let sawData = false
  f.on('data', d => {
    sawData = true
    t.equal(d, 'foo')
  })
  f.end('foo')
})

t.test('flush option, not ok, cb', t => {
  let flushCalled = false
  const poop = new Error('poop')
  // can override subclass's flush with an option
  const f = new (class extends Flush {
    flush (cb) {
      t.fail('should not call this flush function')
    }
  })({
    encoding: 'utf8',
    flush (cb) {
      t.equal(flushCalled, false, 'call flush one time')
      flushCalled = true
      return cb(poop)
    },
  })

  f.on('error', er => {
    t.equal(sawData, true, 'saw data')
    t.equal(flushCalled, true, 'called flush before error event')
    t.equal(er, poop, 'flush error was raised')
    t.end()
  })
  let sawData = false
  f.on('data', d => {
    sawData = true
    t.equal(d, 'foo')
  })
  f.end('foo')
})

t.test('flush option, not ok, promise', t => {
  let flushCalled = false
  const poop = new Error('poop')

  // extending a subclass with a flush() method works the same way
  const f = new (class extends Flush {
    flush () {
      t.equal(flushCalled, false, 'call flush one time')
      flushCalled = true
      return Promise.reject(poop)
    }
  })()
  f.setEncoding('utf8')

  f.on('error', er => {
    t.equal(flushCalled, true, 'called flush before error event')
    t.equal(er, poop, 'flush error was raised')
    t.equal(sawData, true, 'saw data')
    t.end()
  })
  let sawData = false
  f.on('data', d => {
    sawData = true
    t.equal(d, 'foo')
  })
  f.end('foo')
})

t.test('missing flush option throws', t => {
  t.throws(() => new Flush({}), {
    message: 'must provide flush function in options'
  })
  t.end()
})

t.test('only flush once', t => {
  const f = new (class extends Flush {
    flush (cb) {
      if (this.flushCalled)
        cb(new Error('called flush more than once'))
      this.flushCalled = true
      // why would you do this even, it's a very bad idea!
      this.emit('end')
      cb()
    }
  })

  f.end()

  let sawEnd = false
  f.on('end', () => {
    t.pass('re-emitted end')
    t.notOk(sawEnd, 'this should be the first time seeing end')
    sawEnd = true
  })
  t.ok(sawEnd, 'should have emitted the first time')
  f.on('end', () => {
    t.ok(sawEnd, 'this happens after')
    t.pass('re-emitted end again')
    t.end()
  })
})
