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
      core.info(Eleven.#argumentsToPrintableString.apply(Eleven, arguments));
    }
  }

  static info(){
    core.info(Eleven.#argumentsToPrintableString.apply(Eleven, arguments));
  }

  static warning(){
    core.warning(Eleven.#argumentsToPrintableString.apply(Eleven, arguments));
  }

  static error(){
    core.error(Eleven.#argumentsToPrintableString.apply(Eleven, arguments));
  }

  static notice(){
    core.notice(Eleven.#argumentsToPrintableString.apply(Eleven, arguments));
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

  static #argumentsToPrintableString(){
    const a = [];
    const at = `${new Date().toLocaleString('de-CH', {timeZone:'Europe/Zurich'}).split(', ')[1]}.${Eleven.#stdoutms(new Date().getMilliseconds())}`;
    for(const i in arguments){
      a.push([
        at,
        (typeof(arguments[i]) === 'string' || typeof(arguments[i]) === 'number')
          ? arguments[i]
          : inspect(arguments[i]
        ,{showHidden:false, depth:null, colors:true}),
      ].join('   '));
    }
    return(a.join("\r\n"));
  }
}

module.exports = Eleven.ref();