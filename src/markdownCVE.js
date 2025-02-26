const Eleven = require('./Eleven.js');
const Grype = require('./Grype.js');

module.exports = class markdownCVE{
  #CVEs = {};
  #markdown = [];

  constructor(opt){
    if(opt?.title){
      this.#markdown.push(opt.title);
    }
    if(opt?.text){
      this.#markdown.push(opt.text);
    }
    if(opt?.CVEs){
      for(const CVE of opt.CVEs){
        this.add(CVE);
      }
    }
    this.#markdown.push('| ID | Severity | Risk | Vector | Source |');
    this.#markdown.push('| --- | --- | --- | --- | --- |');
  }

  add(ID){
    if(!this.#CVEs[ID]){
      this.#CVEs[ID] = true;
    }
  }

  create(){
    const CVEs = [];
    for(const ID in this.#CVEs){
      const update = Grype.getCVE(ID);
      if(update && update.vector.length > 0){
        if(update.severity >= Grype.cutoff){
          CVEs.push(update);
        }else{
          Eleven.debug(`skipping ${ID} due to severity cutoff (${update.severity} < ${Grype.cutoff})`)
        }
      }else{
        Eleven.warning(`could not parse ${ID}, no proper result from grype database`);
      }
    }

    if(CVEs.length > 0){
      CVEs.sort((a, b) => {return(b.severity - a.severity)});
      for(const CVE of CVEs){
        this.#markdown.push(`| ${CVE.id} | ${this.#scoreToText(CVE.severity)} | ${this.#scoreToText(CVE.risk)} | [${CVE.vector}](https://www.first.org/cvss/calculator/3.1#${CVE.vector}) | [${CVE.id}](https://nvd.nist.gov/vuln/detail/${CVE.id}) |`);
      }
      return(this.#markdown.join("\r\n"));
    }else{
      Eleven.warning(`could not create report for ${this.#markdown[0]}`);
      return('');
    }
  }

  #scoreToText(severity){
    switch(true){
      case severity <= 0: return('none');
      case severity > 0 && severity <= 3.9: return('low');
      case severity >= 4 && severity <= 6.9: return('medium');
      case severity >= 7 && severity <= 8.9: return('high');
      case severity >= 9: return('critical');
    }
  }
}