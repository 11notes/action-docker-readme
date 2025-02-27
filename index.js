const Eleven = require('./src/Eleven.js');

process
  .on('unhandledRejection', (e, p) => {
    Eleven.debug(e);
    Eleven.error(e.toString());
  })
  .on('uncaughtException', e => {
    Eleven.debug(e);
    Eleven.error(e.toString());
  });

(async()=>{
  const README = require('./src/README.js');
  const readme = new README();
  await readme.init();
})();