(async()=>{
  const README = require('./src/README.js');
  const readme = new README();
  await readme.init();
})();