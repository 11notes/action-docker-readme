const Eleven = require('./src/Eleven.js');

(async()=>{
  try{
    const README = require('./src/README.js');
    const readme = new README();
    await readme.init();
  }catch(e){
    Eleven.warning(e);
    Eleven.debug(e);
  }
})();