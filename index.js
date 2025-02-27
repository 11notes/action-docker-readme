const Eleven = require('./src/Eleven.js');

(async()=>{
  Eleven.info('starting action-docker-readme');
  try{
    const README = require('./src/README.js');
    const readme = new README();
    await readme.init();
  }catch(e){
    Eleven.info(e);
  }
})();