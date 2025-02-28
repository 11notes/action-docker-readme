const Eleven = require('./src/Eleven.js');

process
  .on('unhandledRejection', (reason, p) => {
    Eleven.warning('unhandledRejection', reason, p);
  })
  .on('uncaughtException', e => {
    Eleven.warning('uncaughtException', e);
  });

(async()=>{
  try{
    const README = require('./src/README.js');
    const instance = new README();
    await instance.init();
  }catch(e){
    Eleven.warning('global exception', e);
  }
})();