'use babel'
/* global atom */

import {CompositeDisposable} from 'atom'
import commands from './commands'

export default {
  atomView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'atom:toggle': () => this.toggle(),
        ...commands
      })
    )
  },

  deactivate() {
    this.subscriptions.dispose()
  },

  serialize() {
    return {}
  }
}
