const os = require('os');
const { inspect } = require('node:util');
const core = require('@actions/core');

class Eleven{
  static arguments = [];

  static #debug = false;
  static #config = {
    verbose:false,
  };

  static set(x, v){
    Eleven.#config[x] = v;
    Eleven.debug(`Eleven.set(${x}, ${v})`);
  }

  static get(x){
    return(Eleven.#config[x]);
  }

  static environment(e){
    switch(true){
      case /development|dev/ig.test(e):
        Eleven.#debug = true;
        Eleven.set('debug', true);
        break;
    }
  }

  static debug(){
    if(Eleven.#debug){
      core.info.apply(Eleven, [inspect.apply(Eleven, arguments).slice(1,-1)]);
    }
  }

  static info(){
    core.info.apply(Eleven, arguments);
  }

  static warning(){
    core.warning.apply(Eleven, arguments);
  }

  static error(){
    core.error.apply(Eleven, arguments);
  }

  static notice(){
    core.notice.apply(Eleven, arguments);
  }

  static ref(){
    if(!global.Eleven){
      Eleven.arguments = process.argv.slice(2);
      if(Array.isArray(Eleven.arguments) && Eleven.arguments.length > 0 && String(Eleven.arguments[0]).toLowerCase() === 'development'){
        Eleven.#debug = true;
        Eleven.set('debug', true);
      }
      global.Eleven = Eleven;
    }
    return(global.Eleven);
  }
}

module.exports = Eleven.ref();