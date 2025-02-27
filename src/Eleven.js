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
      if(arguments.length > 0 && typeof(arguments[0]) === 'string') arguments[0] = `${new Date().toLocaleString('de-CH', {timeZone:'Europe/Zurich'}).split(', ')[1]}.${Eleven.#stdoutms(new Date().getMilliseconds())}   ${arguments[0]}`;
      core.info.apply(Eleven, [inspect.apply(Eleven, arguments).slice(1,-1)]);
    }
  }

  static info(){
    if(arguments.length > 0 && typeof(arguments[0]) === 'string') arguments[0] = `${new Date().toLocaleString('de-CH', {timeZone:'Europe/Zurich'}).split(', ')[1]}.${Eleven.#stdoutms(new Date().getMilliseconds())}   ${arguments[0]}`;
    core.info.apply(Eleven, arguments);
  }

  static warning(){
    if(arguments.length > 0 && typeof(arguments[0]) === 'string') arguments[0] = `${new Date().toLocaleString('de-CH', {timeZone:'Europe/Zurich'}).split(', ')[1]}.${Eleven.#stdoutms(new Date().getMilliseconds())}   ${arguments[0]}`;
    core.warning.apply(Eleven, arguments);
  }

  static error(){
    if(arguments.length > 0 && typeof(arguments[0]) === 'string') arguments[0] = `${new Date().toLocaleString('de-CH', {timeZone:'Europe/Zurich'}).split(', ')[1]}.${Eleven.#stdoutms(new Date().getMilliseconds())}   ${arguments[0]}`;
    core.error.apply(Eleven, arguments);
  }

  static notice(){
    core.notice.apply(Eleven, arguments);
  }

  static memory(){
    const memoryUsage = process.memoryUsage();
    Eleven.debug(`RSS: ${memoryUsage.rss} Heap Total: ${memoryUsage.heapTotal} Heap Used: ${memoryUsage.heapUsed}`);
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

  static #stdoutms(ms){
    switch(String(ms).length){
      case 0: return('000');
      case 1: return(`00${ms}`);
      case 2: return(`0${ms}`);
      default: return(ms);
    }
  }
}

module.exports = Eleven.ref();